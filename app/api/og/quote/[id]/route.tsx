import sharp from 'sharp'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { isPublicEpisodeVisible } from '@/lib/episodes/publicVisibility'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type QuoteOgData = {
  episode_id?: string | null
  quote_text?: string | null
  background_image_url?: string | null
  source_image_url?: string | null
  card_image_url?: string | null
  episode?: {
    editorial_status?: string | null
    cover_image_url?: string | null
    series?: {
      cover_image_url?: string | null
    } | null
  } | null
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

function cleanText(value?: string | null) {
  return (value || '').replace(/\s+/g, ' ').trim()
}

/**
 * Splits text into lines of at most maxChars, preferring
 * word boundaries.
 */
function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length <= maxChars) {
      current = candidate
    } else {
      if (current) lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines
}

const AMP = '&'
const LT = '<'
const GT = '>'
const QUOT = '"'

/**
 * Escapes XML special characters for SVG embedding.
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, AMP)
    .replace(/</g, LT)
    .replace(/>/g, GT)
    .replace(/"/g, QUOT)
}

/**
 * Builds the full SVG overlay containing the dark gradient,
 * title, quote text, and credits — then composites it on top
 * of the background buffer via sharp.
 *
 * All coordinates assume a 1200×630 canvas.
 */
async function buildOgImage(
  backgroundBuffer: Buffer,
  quoteText: string
): Promise<Buffer> {
  const W = 1200
  const H = 630

  console.log('[OG Quote] sharp input buffer size:', backgroundBuffer.length)

  // ---- text wrapping ---------------------------------------------------
  const maxCharsPerLine = 35
  const quoteLines = wrapText(quoteText, maxCharsPerLine)
  const fontSize = quoteLines.length > 3 ? 36 : quoteLines.length > 2 ? 42 : 48
  const lineHeight = Math.round(fontSize * 1.25)

  // ---- build SVG overlay -----------------------------------------------
  const svgOverlay = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="topFade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(2,6,23,0.48)"/>
      <stop offset="40%" stop-color="rgba(2,6,23,0.10)"/>
      <stop offset="70%" stop-color="rgba(2,6,23,0.08)"/>
      <stop offset="100%" stop-color="rgba(2,6,23,0.48)"/>
    </linearGradient>
    <linearGradient id="goldLine" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="rgba(217,188,107,0)"/>
      <stop offset="50%" stop-color="rgba(217,188,107,0.65)"/>
      <stop offset="100%" stop-color="rgba(217,188,107,0)"/>
    </linearGradient>
  </defs>

  <!-- dark overlay -->
  <rect x="0" y="0" width="${W}" height="${H}" fill="rgba(2,6,23,0.45)"/>
  <rect x="0" y="0" width="${W}" height="${H}" fill="url(#topFade)"/>

  <!-- top: line + title -->
  <rect x="540" y="56" width="120" height="1" rx="0.5" fill="url(#goldLine)"/>
  <text x="600" y="98" text-anchor="middle" font-family="Arial, sans-serif"
        font-size="20" font-weight="900" fill="#fff4d6"
        letter-spacing="10" text-rendering="geometricPrecision">
    PALAVRA DO DIA
  </text>

  <!-- quote text -->
  ${quoteLines
    .map((line, i) => {
      const y = H / 2 - ((quoteLines.length - 1) * lineHeight) / 2 + i * lineHeight + 10
      return `<text x="600" y="${y.toFixed(0)}" text-anchor="middle"
        font-family="Georgia, serif" font-size="${fontSize}" font-weight="700"
        fill="#fffdf5" text-rendering="geometricPrecision">
        ${escapeXml(line)}
      </text>`
    })
    .join('\n  ')}

  <!-- bottom: line -->
  <rect x="540" y="${H - 110}" width="120" height="1" rx="0.5" fill="url(#goldLine)"/>

  <!-- bottom: name -->
  <text x="600" y="${H - 74}" text-anchor="middle" font-family="Georgia, serif"
        font-size="32" font-weight="700" fill="#fffdf5"
        text-rendering="geometricPrecision">
    Pr. Djeone Martins
  </text>

  <!-- bottom: subtitle -->
  <text x="600" y="${H - 44}" text-anchor="middle" font-family="Arial, sans-serif"
        font-size="14" font-weight="900" fill="#fff4d6"
        letter-spacing="6" text-rendering="geometricPrecision">
    DEVOCIONAL DIÁRIO
  </text>
</svg>`.trim()

  // ---- composite -------------------------------------------------------
  const svgBuffer = Buffer.from(svgOverlay)

  const result = await sharp(backgroundBuffer)
    .resize(W, H, { fit: 'cover', position: 'centre' })
    .composite([{ input: svgBuffer, top: 0, left: 0 }])
    .jpeg({ quality: 85, progressive: true })
    .toBuffer()

  console.log('[OG Quote] jpeg output size:', result.length)

  return result
}

export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params

  let quoteText = 'Receba uma Palavra do Dia para fortalecer sua fé.'
  let backgroundImageUrl = ''

  if (isUuid(id)) {
    try {
      const supabase = createSupabaseAdminClient()

      const { data, error } = await supabase
        .from('daily_quotes')
        .select(`
          id,
          episode_id,
          quote_text,
          status,
          background_image_url,
          source_image_url,
          card_image_url,
          episode:episodes (
            editorial_status,
            cover_image_url,
            series:series (cover_image_url)
          )
        `)
        .eq('id', id)
        .eq('status', 'published')
        .maybeSingle()

      if (error) {
        console.error('Erro ao carregar OG da Palavra do Dia:', error)
      }

      const quote = data as QuoteOgData | null

      if (
        quote?.episode_id &&
        (!quote.episode || !isPublicEpisodeVisible(quote.episode))
      ) {
        return new Response('Quote not found', { status: 404 })
      }

      if (quote?.quote_text) {
        quoteText = cleanText(quote.quote_text)

        backgroundImageUrl =
          cleanText(quote.background_image_url) ||
          cleanText(quote.source_image_url) ||
          cleanText(quote.episode?.cover_image_url) ||
          cleanText(quote.episode?.series?.cover_image_url) ||
          cleanText(quote.card_image_url) ||
          ''
      }
    } catch (error) {
      console.error('Erro inesperado na rota OG da Palavra do Dia:', error)
    }
  }

  // ---- fetch background image ------------------------------------------
  let backgroundBuffer: Buffer | null = null

  if (backgroundImageUrl) {
    console.log('[OG Quote] backgroundImageUrl:', backgroundImageUrl)
    try {
      const response = await fetch(backgroundImageUrl, {
        signal: AbortSignal.timeout(10000),
      })
      console.log('[OG Quote] fetch status:', response.status, 'ok:', response.ok)
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer()
        console.log('[OG Quote] buffer size:', arrayBuffer.byteLength)
        backgroundBuffer = Buffer.from(arrayBuffer)
        console.log('[OG Quote] fetched bytes:', backgroundBuffer.byteLength)
      } else {
        console.log('[OG Quote] fetch failed with status:', response.status)
      }
    } catch (err) {
      console.log('[OG Quote] fetch error:', err)
      // Fallback: use solid gradient background (handled below)
    }
  } else {
    console.log('[OG Quote] backgroundImageUrl is empty — using gradient fallback')
  }

  // ---- if no image, create a gradient background via SVG + sharp -------
  if (!backgroundBuffer) {
    console.log('[OG Quote] using gradient fallback (no background loaded)')
    const gradientSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#020617"/>
      <stop offset="48%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e3a8a"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
</svg>`.trim()
    backgroundBuffer = await sharp(Buffer.from(gradientSvg))
      .resize(1200, 630)
      .png()
      .toBuffer()
  }

  console.log('[OG Quote] backgroundBuffer size before buildOgImage:', backgroundBuffer?.length)

  // ---- render final image ----------------------------------------------
  const jpegBuffer = await buildOgImage(backgroundBuffer, quoteText)

  return new Response(new Uint8Array(jpegBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control':
        'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800',
    },
  })
}