import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_HOST = 'nbescpowbgfqiuctqcfp.supabase.co'

// GET /api/img?url=<encoded-supabase-storage-url>
// Proxies Supabase storage images for mobile dev — simulator's TLS stack
// rejects Supabase cert, so images route through this HTTP proxy instead.
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('url')
  if (!raw) {
    return NextResponse.json({ error: 'url param required' }, { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 })
  }

  if (parsed.hostname !== ALLOWED_HOST) {
    return NextResponse.json({ error: 'Forbidden host' }, { status: 403 })
  }

  try {
    const upstream = await fetch(raw, {
      headers: { 'User-Agent': 'ChapterNew-ImageProxy/1.0' },
    })

    if (!upstream.ok) {
      return NextResponse.json({ error: 'Upstream error' }, { status: upstream.status })
    }

    const contentType = upstream.headers.get('content-type') ?? 'image/jpeg'
    const body = await upstream.arrayBuffer()

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Proxy fetch failed' }, { status: 502 })
  }
}
