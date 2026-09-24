import { corsHeaders } from '@/lib/cors'
import { SITE_DOMAIN } from '@/data/site'

// Time-synced lyrics for the now-playing card, from LRCLIB (lrclib.net), a
// free lyrics database that needs no API key. Results are kept per track for
// the instance's lifetime and on Vercel's CDN, so LRCLIB sees about one
// request per song rather than one per visitor.

interface LyricLine {
  // Start of the line, in ms from the start of the track.
  timeMs: number
  text: string
}

interface LrclibResult {
  duration: number
  syncedLyrics: string | null
}

// LRCLIB lists several uploads per song, often of different edits. One whose
// duration is within this many seconds of Spotify's is taken to be the same
// recording; otherwise the lines would be out of sync.
const MAX_DURATION_DIFF_S = 3

const CACHE_MAX = 500
const cache = new Map<string, LyricLine[]>()

// "[mm:ss.xx] text" rows. LRC metadata tags like [ar:...] don't match and are skipped.
function parseLrc(lrc: string): LyricLine[] {
  const lines: LyricLine[] = []
  for (const row of lrc.split('\n')) {
    const m = /^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/.exec(row.trim())
    if (!m) continue
    const timeMs = Math.round((Number(m[1]) * 60 + Number(m[2])) * 1000)
    lines.push({ timeMs, text: m[3].trim() })
  }
  return lines.toSorted((a, b) => a.timeMs - b.timeMs)
}

async function fetchLyrics(title: string, artist: string, durationS: number): Promise<LyricLine[]> {
  const params = new URLSearchParams({ track_name: title, artist_name: artist })
  const res = await fetch(`https://lrclib.net/api/search?${params}`, {
    headers: { 'User-Agent': SITE_DOMAIN },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`lrclib ${res.status}`)

  const results: LrclibResult[] = await res.json()
  let best: string | null = null
  let bestDiff = Infinity
  for (const r of results) {
    const diff = Math.abs(r.duration - durationS)
    if (r.syncedLyrics && diff <= MAX_DURATION_DIFF_S && diff < bestDiff) {
      best = r.syncedLyrics
      bestDiff = diff
    }
  }
  return best ? parseLrc(best) : []
}

export async function GET(req: Request) {
  const headers = corsHeaders(req)
  const { searchParams } = new URL(req.url)
  const title = searchParams.get('title') ?? ''
  // The now-playing route joins artists with ", ". LRCLIB finds nothing for
  // the joined string, so only the first artist is searched.
  const artist = (searchParams.get('artist') ?? '').split(', ')[0]
  const durationS = Number(searchParams.get('durationMs')) / 1000
  if (!title || !artist || !durationS) {
    return Response.json({ error: 'missing title, artist or durationMs' }, { status: 400, headers })
  }

  const key = `${title}\n${artist}\n${Math.round(durationS)}`.toLowerCase()
  let lines = cache.get(key)
  if (!lines) {
    try {
      lines = await fetchLyrics(title, artist, durationS)
    } catch (err) {
      console.error('lyrics: LRCLIB request failed', err)
      return Response.json({ error: 'lrclib error' }, { status: 502, headers })
    }
    // Map keeps insertion order, so the first key is the oldest entry.
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!)
    cache.set(key, lines)
  }

  // Lyrics for a recording don't change. A miss is cached on the CDN for an
  // hour only, since LRCLIB may get an upload for the song later.
  const sMaxAge = lines.length ? 86400 : 3600
  return Response.json(
    { lines },
    { headers: { ...headers, 'Cache-Control': `public, max-age=0, s-maxage=${sMaxAge}` } },
  )
}
