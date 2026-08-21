import { corsHeaders } from '@/lib/cors'

// Proxy Last.fm album art so canvas can read pixels without CORS issues
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const imgUrl = searchParams.get('url')
  if (!imgUrl) return new Response('', { status: 400 })

  try {
    const parsed = new URL(imgUrl)
    if (!parsed.hostname.endsWith('fastly.net') && !parsed.hostname.endsWith('last.fm')) {
      return new Response('', { status: 403 })
    }
    const res = await fetch(imgUrl)
    const data = await res.arrayBuffer()
    return new Response(data, {
      headers: {
        'Content-Type': res.headers.get('Content-Type') ?? 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
        ...corsHeaders(req),
      },
    })
  } catch {
    return new Response('', { status: 502 })
  }
}
