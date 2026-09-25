import { getCache } from '@vercel/functions'
import { corsHeaders } from '@/lib/cors'

// Every open tab polls this route every 3s. The response is cached in this
// instance's memory, in Vercel's Runtime Cache (shared by every instance in
// the region) and on Vercel's CDN (s-maxage), so Spotify sees about one
// request per CACHE_MS per region no matter how many visitors or instances
// there are, plus one when a song ends (see endedSinceFetch).
const CACHE_MS = 3_000
// While nothing is playing the response only changes when playback starts,
// so it is kept longer. Playback that starts shows up to 15s late.
const IDLE_CACHE_MS = 15_000

const cacheMs = (data: NowPlaying) => (data.isPlaying ? CACHE_MS : IDLE_CACHE_MS)

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
interface Cached {
  data: NowPlaying
  at: number
}

let cached: Cached | null = null
let inFlight: Promise<NowPlaying> | null = null
// Set from Retry-After on a 429; Spotify is not called again until then.
// Capped at MAX_BLOCK_MS: Spotify has sent Retry-After values of several
// hours for limits that it lifted within minutes.
const MAX_BLOCK_MS = 5 * 60_000
let blockedUntil = 0

// Runtime Cache keys. Without the shared copies, each new instance calls
// Spotify on its first request, and after a 429 gets another 429.
const CACHED_KEY = 'spotify-now-playing'
const BLOCKED_KEY = 'spotify-now-playing-blocked-until'

// A failed read counts as a miss, so the route still works without the cache.
async function readShared<T>(key: string): Promise<T | null> {
  try {
    return (await getCache().get(key)) as T | null
  } catch (err) {
    console.error('now-playing: runtime cache read failed', err)
    return null
  }
}

async function writeShared(key: string, value: unknown, ttlMs: number): Promise<void> {
  try {
    await getCache().set(key, value, { ttl: Math.ceil(ttlMs / 1000) })
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

const isFresh = (c: Cached, now: number) => now - c.at < cacheMs(c.data) && !endedSinceFetch(c, now)

async function getNowPlaying(): Promise<NowPlaying | null> {
  const now = Date.now()
  if (cached && isFresh(cached, now)) return cached.data
  if (now < blockedUntil) return cached?.data ?? null

  const [shared, sharedBlock] = await Promise.all([
    readShared<Cached>(CACHED_KEY),
    readShared<number>(BLOCKED_KEY),
  ])
  if (shared && (!cached || shared.at > cached.at)) cached = shared
  if (cached && isFresh(cached, now)) return cached.data
  // A block further out than MAX_BLOCK_MS was written before the cap existed
  // and is ignored.
  const until = Number(sharedBlock) || 0
  blockedUntil = until <= now + MAX_BLOCK_MS ? until : 0
  if (now < blockedUntil) return cached?.data ?? null

  // Concurrent requests on one instance share a single Spotify call.
  inFlight ??= fetchNowPlaying()
    .then(async (data) => {
      cached = { data, at: Date.now() }
      await writeShared(CACHED_KEY, cached, cacheMs(data))
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
      const blockMs = Math.min(err.retryAfterSec * 1000, MAX_BLOCK_MS)
      blockedUntil = Date.now() + blockMs
      await writeShared(BLOCKED_KEY, blockedUntil, blockMs)
    }
    return cached?.data ?? null
  }
}

export async function GET(req: Request) {
  const headers = corsHeaders(req)
  const data = await getNowPlaying()
  if (!data) return Response.json({ error: 'spotify error' }, { status: 502, headers })
  return Response.json(data, {
    headers: { ...headers, 'Cache-Control': `public, max-age=0, s-maxage=${cacheMs(data) / 1000}` },
  })
}
