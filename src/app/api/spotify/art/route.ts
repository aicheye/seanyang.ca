import { IMAGE_CACHE_CONTROL } from '@/lib/cache'
import { corsHeaders } from '@/lib/cors'

// Proxy Spotify album art so canvas can read pixels without CORS issues
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const imgUrl = searchParams.get('url')
  if (!imgUrl) return new Response('', { status: 400 })

  try {
    const parsed = new URL(imgUrl)
    if (!parsed.hostname.endsWith('.scdn.co') && !parsed.hostname.endsWith('.spotifycdn.com')) {
      return new Response('', { status: 403 })
    }
    const res = await fetch(imgUrl)
    const data = await res.arrayBuffer()
    return new Response(data, {
      headers: {
        'Content-Type': res.headers.get('Content-Type') ?? 'image/jpeg',
        'Cache-Control': IMAGE_CACHE_CONTROL,
        ...corsHeaders(req),
      },
    })
  } catch {
    return new Response('', { status: 502 })
  }
}
