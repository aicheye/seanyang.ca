let cachedToken: { token: string; expiresAt: number } | null = null

// Search results for a title/artist pair don't change, so found URLs are kept
// for the instance's lifetime. Misses are not cached so a failed search retries.
const LINK_CACHE_MAX = 500
const linkCache = new Map<string, string>()

async function getSpotifyToken(): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  if (!clientId || !clientSecret) return null
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) return null

  const json = await res.json()
  cachedToken = { token: json.access_token, expiresAt: Date.now() + (json.expires_in - 60) * 1000 }
  return cachedToken.token
}

async function findSpotifyTrackUrl(title: string, artist: string): Promise<string | null> {
  const key = `${title}\n${artist}`.toLowerCase()
  const hit = linkCache.get(key)
  if (hit) return hit

  try {
    const token = await getSpotifyToken()
    if (!token) return null

    const q = `track:${title} artist:${artist}`
    const res = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=1`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    )
    if (!res.ok) return null

    const json = await res.json()
    const url: string | undefined = json.tracks?.items?.[0]?.external_urls?.spotify
    if (!url) return null
    // Map keeps insertion order, so the first key is the oldest entry.
    if (linkCache.size >= LINK_CACHE_MAX) linkCache.delete(linkCache.keys().next().value!)
    linkCache.set(key, url)
    return url
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get('title') ?? ''
  const artist = searchParams.get('artist') ?? ''

  const fallback = title
    ? `https://open.spotify.com/search/${encodeURIComponent(`${title} ${artist}`)}`
    : 'https://open.spotify.com/user/apexblu'

  const found = title ? await findSpotifyTrackUrl(title, artist) : null
  // Found links are cached on the CDN for a day; the search fallback is not,
  // so a failed lookup is retried on the next click.
  return new Response(null, {
    status: 302,
    headers: {
      Location: found ?? fallback,
      'Cache-Control': found ? 'public, max-age=0, s-maxage=86400' : 'no-store',
    },
  })
}
