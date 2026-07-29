let cachedToken: { token: string; expiresAt: number } | null = null

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
    return json.tracks?.items?.[0]?.external_urls?.spotify ?? null
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

  const url = title ? ((await findSpotifyTrackUrl(title, artist)) ?? fallback) : fallback
  return Response.redirect(url, 302)
}
