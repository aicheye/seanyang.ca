// One-time helper: prints a SPOTIFY_REFRESH_TOKEN for /api/spotify/now-playing.
//
// 1. Add http://127.0.0.1:8888/callback as a redirect URI in the Spotify app.
// 2. SPOTIFY_CLIENT_ID=... SPOTIFY_CLIENT_SECRET=... node scripts/spotify-refresh-token.mjs
// 3. Open the printed URL, approve, and copy the token into Vercel's env vars.
import { createServer } from 'node:http'

const { SPOTIFY_CLIENT_ID: id, SPOTIFY_CLIENT_SECRET: secret } = process.env
if (!id || !secret) {
  console.error('Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET')
  process.exit(1)
}

const redirectUri = 'http://127.0.0.1:8888/callback'
const authUrl = new URL('https://accounts.spotify.com/authorize')
authUrl.search = new URLSearchParams({
  client_id: id,
  response_type: 'code',
  redirect_uri: redirectUri,
  scope: 'user-read-currently-playing user-read-recently-played',
}).toString()

const server = createServer(async (req, res) => {
  const code = new URL(req.url, redirectUri).searchParams.get('code')
  if (!code) return res.writeHead(400).end('No code in callback')

  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  })
  const json = await tokenRes.json()
  if (!json.refresh_token) {
    console.error(json)
    res.writeHead(500).end('Token exchange failed; see terminal')
  } else {
    console.log(`\nSPOTIFY_REFRESH_TOKEN=${json.refresh_token}`)
    res.end('Done. The refresh token is in your terminal.')
  }
  server.close()
})

server.listen(8888, '127.0.0.1', () => console.log(`Open this URL:\n${authUrl}`))
