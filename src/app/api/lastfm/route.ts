const LASTFM_BASE = 'https://ws.audioscrobbler.com/2.0'
const USERNAME = 'aicheyeaaa'

export async function GET() {
  const apiKey = process.env.LASTFM_API_KEY
  if (!apiKey) return Response.json({ error: 'no api key' }, { status: 500 })

  const url = `${LASTFM_BASE}?method=user.getrecenttracks&user=${USERNAME}&api_key=${apiKey}&format=json&limit=1`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return Response.json({ error: 'lastfm error' }, { status: 502 })

  const json = await res.json()
  const tracks = json.recenttracks?.track
  const track = Array.isArray(tracks) ? tracks[0] : tracks

  if (!track) return Response.json({ isPlaying: false, title: '', artist: '', timestamp: null })

  const isPlaying = track['@attr']?.nowplaying === 'true'
  const timestamp = isPlaying ? null : parseInt(track.date?.uts ?? '0', 10) || null

  const images: { '#text': string; size: string }[] = track.image ?? []
  const bySize = new Map(images.map((i) => [i.size, i['#text']]))
  const pick = (...names: string[]) => names.map((n) => bySize.get(n)).find(Boolean) || null

  return Response.json({
    isPlaying,
    title: track.name ?? '',
    artist: track.artist?.['#text'] ?? track.artist ?? '',
    timestamp,
    albumArt: pick('extralarge', 'large', 'medium'),
  })
}
