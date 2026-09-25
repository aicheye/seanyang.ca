import { getCache } from '@vercel/functions'
import { corsHeaders } from '@/lib/cors'

// Every open tab polls this route every 3s. The response is cached for 3s both
// in this instance's memory and on Vercel's CDN (s-maxage), so Spotify sees at
// most one request per 3s per instance no matter how many visitors there are,
// plus one when a song ends (see endedSinceFetch).
const CACHE_MS = 3_000

interface NowPlaying {
  isPlaying: boolean
  title: string
  artist: string
  timestamp: number | null
  albumArt: string | null
  url: string | null
  // Playback position of the current track, measured at asOf (epoch ms).
  // null for the last played track.
  progressMs: number | null
  durationMs: number | null
  asOf: number | null
}

interface SpotifyTrack {
  name: string
  duration_ms: number
  artists: { name: string }[]
  album: { images: { url: string }[] }
  external_urls: { spotify?: string }
}

const EMPTY: NowPlaying = {
  isPlaying: false,
  title: '',
  artist: '',
  timestamp: null,
  albumArt: null,
  url: null,
  progressMs: null,
  durationMs: null,
  asOf: null,
}

let accessToken: { token: string; expiresAt: number } | null = null
let cached: { data: NowPlaying; at: number } | null = null
let inFlight: Promise<NowPlaying> | null = null
// Set from Retry-After on a 429; Spotify is not called again until then.
let blockedUntil = 0
// blockedUntil is also stored in Vercel's Runtime Cache, which every instance
// in the region reads. Without it, each new instance calls Spotify once and
// gets another 429.
const BLOCKED_KEY = 'spotify-now-playing-blocked-until'

async function sharedBlockedUntil(): Promise<number> {
  try {
    return Number(await getCache().get(BLOCKED_KEY)) || 0
  } catch (err) {
    console.error('now-playing: runtime cache read failed', err)
    return 0
  }
}

async function shareBlock(until: number, ttlSec: number): Promise<void> {
  try {
    await getCache().set(BLOCKED_KEY, until, { ttl: ttlSec })
  } catch (err) {
    console.error('now-playing: runtime cache write failed', err)
  }
}

class RateLimited extends Error {
  constructor(readonly retryAfterSec: number) {
    super('spotify rate limited')
  }
}

async function getAccessToken(): Promise<string> {
  if (accessToken && accessToken.expiresAt > Date.now()) return accessToken.token

  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN
  if (!clientId || !clientSecret || !refreshToken) throw new Error('missing spotify env')

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`spotify token ${res.status}`)

  const json = await res.json()
  accessToken = { token: json.access_token, expiresAt: Date.now() + (json.expires_in - 60) * 1000 }
  return accessToken.token
}

async function spotifyGet(path: string): Promise<Response> {
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${await getAccessToken()}` },
    cache: 'no-store',
  })
  if (res.status === 429) throw new RateLimited(Number(res.headers.get('Retry-After')) || 30)
  if (res.status === 401) accessToken = null // revoked or expired early; refresh next call
  return res
}

function toNowPlaying(
  track: SpotifyTrack,
  isPlaying: boolean,
  timestamp: number | null,
  progressMs: number | null,
): NowPlaying {
  return {
    isPlaying,
    title: track.name,
    artist: track.artists.map((a) => a.name).join(', '),
    timestamp,
    albumArt: track.album.images[0]?.url ?? null,
    url: track.external_urls.spotify ?? null,
    progressMs,
    durationMs: progressMs === null ? null : track.duration_ms,
    asOf: progressMs === null ? null : Date.now(),
  }
}

async function fetchNowPlaying(): Promise<NowPlaying> {
  // 204 means no active device. item is null during ads and is an episode
  // for podcasts; all of those fall through to the last played track.
  const current = await spotifyGet('/me/player/currently-playing')
  if (current.status === 200) {
    const json = await current.json()
    if (json.currently_playing_type === 'track' && json.item)
      return toNowPlaying(json.item, json.is_playing === true, null, json.progress_ms ?? null)
  } else if (current.status !== 204) {
    throw new Error(`spotify currently-playing ${current.status}`)
  }

  const recent = await spotifyGet('/me/player/recently-played?limit=1')
  if (!recent.ok) throw new Error(`spotify recently-played ${recent.status}`)
  const item = (await recent.json()).items?.[0]
  if (!item) return EMPTY
  return toNowPlaying(
    item.track,
    false,
    Math.floor(Date.parse(item.played_at) / 1000) || null,
    null,
  )
}

// True when the cached response was fetched before its playing track should
// have ended and that time has passed. The client fetches again just after a
// song ends, so this makes that request reach Spotify. It only applies to a
// response fetched before the end, so if Spotify still reports the old track,
// the result is cached as usual.
function endedSinceFetch({ data, at }: { data: NowPlaying; at: number }, now: number): boolean {
  if (!data.isPlaying || data.progressMs === null || data.durationMs === null || data.asOf === null)
    return false
  const endsAt = data.asOf + data.durationMs - data.progressMs
  return at < endsAt && now >= endsAt
}

async function getNowPlaying(): Promise<NowPlaying | null> {
  const now = Date.now()
  if (cached && now - cached.at < CACHE_MS && !endedSinceFetch(cached, now)) return cached.data
  if (now < blockedUntil) return cached?.data ?? null
  blockedUntil = await sharedBlockedUntil()
  if (now < blockedUntil) return cached?.data ?? null

  // Concurrent requests on one instance share a single Spotify call.
  inFlight ??= fetchNowPlaying()
    .then((data) => {
      cached = { data, at: Date.now() }
      return data
    })
    .finally(() => {
      inFlight = null
    })

  try {
    return await inFlight
  } catch (err) {
    console.error('now-playing: spotify request failed', err)
    if (err instanceof RateLimited) {
      blockedUntil = Date.now() + err.retryAfterSec * 1000
      await shareBlock(blockedUntil, err.retryAfterSec)
    }
    return cached?.data ?? null
  }
}

export async function GET(req: Request) {
  const headers = corsHeaders(req)
  const data = await getNowPlaying()
  if (!data) return Response.json({ error: 'spotify error' }, { status: 502, headers })
  return Response.json(data, {
    headers: { ...headers, 'Cache-Control': `public, max-age=0, s-maxage=${CACHE_MS / 1000}` },
  })
}
