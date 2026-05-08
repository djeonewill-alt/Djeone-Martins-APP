import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

type RouteParams = {
  id: string
}

type RouteProps = {
  params: Promise<RouteParams>
}

export const dynamic = 'force-dynamic'

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

function getBaseUrl() {
  const explicitUrl =
    process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL

  if (explicitUrl) {
    return explicitUrl.replace(/\/+$/, '')
  }

  const vercelUrl =
    process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL

  if (vercelUrl) {
    return `https://${vercelUrl.replace(/^https?:\/\//, '')}`.replace(/\/+$/, '')
  }

  return 'http://localhost:3000'
}

function toAbsoluteUrl(url: string) {
  if (/^https?:\/\//i.test(url)) return url

  const baseUrl = getBaseUrl()
  const path = url.startsWith('/') ? url : `/${url}`

  return `${baseUrl}${path}`
}

function inferContentType(imageUrl: string, upstreamContentType?: string | null) {
  const cleanContentType = upstreamContentType
    ?.split(';')[0]
    ?.trim()
    ?.toLowerCase()

  if (cleanContentType?.startsWith('image/')) {
    return cleanContentType
  }

  try {
    const pathname = new URL(imageUrl).pathname.toLowerCase()

    if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) {
      return 'image/jpeg'
    }

    if (pathname.endsWith('.webp')) {
      return 'image/webp'
    }

    if (pathname.endsWith('.png')) {
      return 'image/png'
    }
  } catch {
    // mantém fallback abaixo
  }

  return 'image/png'
}

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function fallbackImageResponse(text = 'Palavra do Dia', status = 200) {
  const safeText = escapeXml(text.length > 90 ? `${text.slice(0, 87)}...` : text)

  const svg = `
    <svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#0f172a"/>
          <stop offset="45%" stop-color="#1e3a8a"/>
          <stop offset="100%" stop-color="#020617"/>
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="20%" r="60%">
          <stop offset="0%" stop-color="#60a5fa" stop-opacity="0.45"/>
          <stop offset="100%" stop-color="#60a5fa" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1080" height="1080" fill="url(#bg)"/>
      <rect width="1080" height="1080" fill="url(#glow)"/>
      <rect x="74" y="74" width="932" height="932" rx="54" fill="rgba(15,23,42,0.62)" stroke="rgba(255,255,255,0.16)" stroke-width="3"/>
      <text x="540" y="250" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="900" letter-spacing="8" fill="#bfdbfe">PALAVRA DO DIA</text>
      <foreignObject x="150" y="355" width="780" height="330">
        <div xmlns="http://www.w3.org/1999/xhtml" style="height:330px;display:flex;align-items:center;justify-content:center;text-align:center;color:white;font-family:Arial,sans-serif;font-size:58px;font-weight:900;line-height:1.12;">
          ${safeText}
        </div>
      </foreignObject>
      <text x="540" y="860" text-anchor="middle" font-family="Arial, sans-serif" font-size="38" font-weight="900" fill="#ffffff">Pr. Djeone Martins</text>
    </svg>
  `.trim()

  return new NextResponse(svg, {
    status,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

export async function GET(_request: Request, { params }: RouteProps) {
  const { id } = await params

  if (!isUuid(id)) {
    return fallbackImageResponse('Palavra do Dia', 404)
  }

  const supabase = createSupabaseAdminClient()

  const { data, error } = await supabase
    .from('daily_quotes')
    .select('id, quote_text, status, card_image_url, background_image_url, source_image_url')
    .eq('id', id)
    .eq('status', 'published')
    .maybeSingle()

  if (error) {
    console.error('Erro ao carregar OG da Palavra do Dia:', error)
    return fallbackImageResponse('Palavra do Dia', 500)
  }

  if (!data) {
    return fallbackImageResponse('Palavra do Dia', 404)
  }

  const imageUrl =
    data.card_image_url || data.background_image_url || data.source_image_url

  if (!imageUrl) {
    return fallbackImageResponse(data.quote_text || 'Palavra do Dia')
  }

  try {
    const absoluteImageUrl = toAbsoluteUrl(imageUrl)

    const imageResponse = await fetch(absoluteImageUrl, {
      cache: 'no-store',
    })

    if (!imageResponse.ok) {
      console.warn(
        'Imagem da Palavra do Dia não retornou OK:',
        imageResponse.status,
        absoluteImageUrl
      )

      return fallbackImageResponse(data.quote_text || 'Palavra do Dia')
    }

    const contentType = inferContentType(
      absoluteImageUrl,
      imageResponse.headers.get('content-type')
    )

    const imageBuffer = await imageResponse.arrayBuffer()

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(imageBuffer.byteLength),
        'Cache-Control': 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800',
        'Access-Control-Allow-Origin': '*',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('Erro ao gerar proxy OG da Palavra do Dia:', error)

    return fallbackImageResponse(data.quote_text || 'Palavra do Dia')
  }
}

