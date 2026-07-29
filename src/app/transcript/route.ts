import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 60

const UPSTREAM = 'https://docs.seanyang.me/Sean_Yang_transcript/Sean_Yang_transcript.pdf'

export async function GET(req: NextRequest) {
  const upstreamRes = await fetch(UPSTREAM, {
    next: { revalidate: 60 },
    headers: {
      'user-agent': req.headers.get('user-agent') ?? 'seanyang.me-proxy',
      accept: req.headers.get('accept') ?? 'application/pdf',
    },
  })

  if (!upstreamRes.ok) {
    return new NextResponse(`Upstream fetch error: ${upstreamRes.status}`, {
      status: upstreamRes.status,
    })
  }

  const filename = UPSTREAM.split('/').pop()
  const contentType = upstreamRes.headers.get('content-type') ?? 'application/pdf'

  return new NextResponse(upstreamRes.body, {
    headers: {
      'content-disposition': `inline; filename="${filename}"`,
      'content-type': contentType,
    },
  })
}
