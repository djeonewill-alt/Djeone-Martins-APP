import sharp from 'sharp'
import { join } from 'path'
import { readFileSync } from 'fs'
import { parse } from 'opentype.js'
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

// ---------------------------------------------------------------------------
// Font loading (TTF → opentype.js)
// Lazy-loaded with caching so failures are caught and logged per-request
// instead of crashing the module at import time.
// opentype.js is pure JavaScript — no native bindings, works on Vercel.
// ---------------------------------------------------------------------------
const FONT_DIR = join(process.cwd(), 'lib', 'fonts')

let _fontBoldCache: ReturnType<typeof parse> | null | undefined

function getFontBold(): ReturnType<typeof parse> {
  if (_fontBoldCache !== undefined) return _fontBoldCache as ReturnType<typeof parse>

  try {
    _fontBoldCache = parse(readFileSync(join(FONT_DIR, 'Inter-Bold.ttf')))
    console.log('[OG-Quote] Inter-Bold.ttf loaded successfully')
  } catch (err) {
    console.error('[OG-Quote] Failed to load Inter-Bold.ttf:', err)
    _fontBoldCache = null
  }

  return _fontBoldCache as ReturnType<typeof parse>
}

/**
 * Converts a string of text into an SVG <path> element (self-closing).
 *
 * Uses charToGlyph + glyph.getPath() to bypass opentype.js v2's Bidi/GSUB
 * processing which crashes with "substitutionType : 62 lookupType: 6 -
 * substFormat: 2 is not yet supported" on this font.
 *
 * @param text     — The text to render
 * @param cx       — Horizontal centre of the text in SVG pixels
 * @param y        — Baseline Y coordinate
 * @param fontSize — Font size in SVG pixels
 * @param font     — opentype.Font instance
 * @param spaced   — If true, inserts two spaces between every character
 *                   (used to simulate letter-spacing)
 */
function textToSvgPath(
  text: string,
  cx: number,
  y: number,
  fontSize: number,
  font: ReturnType<typeof parse>,
  spaced = false
): string {
  const str = spaced ? text.split('').join('  ') : text
  const scale = (1 / font.unitsPerEm) * fontSize
  const chars = [...str]
  let totalAdvance = 0

  // Calculate total advance width using charToGlyph (safe, no Bidi)
  for (const char of chars) {
    const glyph = font.charToGlyph(char)
    totalAdvance += (glyph?.advanceWidth ?? 0) * scale
  }

  const x = cx - totalAdvance / 2
  let cursor = 0

  // Build SVG path data by concatenating glyph outlines
  const pathDataParts: string[] = []
  for (const char of chars) {
    const glyph = font.charToGlyph(char)
    if (!glyph) {
      cursor += 0 // char without glyph (space, etc.) — skip path but advance if needed
      continue
    }
    const glyphPath = glyph.getPath(x + cursor, y, fontSize)
    const pathData = glyphPath.toPathData(2)
    if (pathData) pathDataParts.push(pathData)
    cursor += (glyph.advanceWidth ?? 0) * scale
  }

  return pathDataParts.join(' ')
}

/**
 * Builds the full SVG overlay containing the dark gradient,
 * title, quote text, and credits — then composites it on top
 * of the background buffer via sharp.
 *
 * All text is rendered as SVG <path> elements (vector outlines),
 * which requires zero system fonts — works identically on Windows,
 * macOS, and Linux (Vercel).
 *
 * All coordinates assume a 1200×630 canvas.
 */
async function buildOgImage(
  backgroundBuffer: Buffer,
  quoteText: string
): Promise<Buffer> {
  const W = 1200
  const H = 630

  // ---- text wrapping ---------------------------------------------------
  const maxCharsPerLine = 35
  const quoteLines = wrapText(quoteText, maxCharsPerLine)
  const fontSize = quoteLines.length > 3 ? 36 : quoteLines.length > 2 ? 42 : 48
  const lineHeight = Math.round(fontSize * 1.25)

  // ---- build SVG overlay -----------------------------------------------
  // ---- font ------------------------------------------------------------
  const fontBold = getFontBold()
  if (!fontBold) {
    throw new Error('Font Inter-Bold.ttf failed to load — cannot render OG image text.')
  }

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

  <!-- top: line -->
  <rect x="540" y="56" width="120" height="1" rx="0.5" fill="url(#goldLine)"/>

  <!-- top: title PALAVRA DO DIA (letter-spaced simulation via character spacing) -->
  <path d="${textToSvgPath('PALAVRA DO DIA', 600, 98, 20, fontBold, true)}" fill="#fff4d6"/>

  <!-- quote text (one path per line) -->
  ${quoteLines
    .map((line, i) => {
      const y = H / 2 - ((quoteLines.length - 1) * lineHeight) / 2 + i * lineHeight + 10
      return `<path d="${textToSvgPath(line, 600, y, fontSize, fontBold)}" fill="#fffdf5"/>`
    })
    .join('\n  ')}

  <!-- bottom: line -->
  <rect x="540" y="${H - 110}" width="120" height="1" rx="0.5" fill="url(#goldLine)"/>

  <!-- bottom: name -->
  <path d="${textToSvgPath('Pr. Djeone Martins', 600, H - 74, 32, fontBold)}" fill="#fffdf5"/>

  <!-- bottom: subtitle DEVOCIONAL DIÁRIO (letter-spaced) -->
  <path d="${textToSvgPath('DEVOCIONAL DIARIO', 600, H - 44, 14, fontBold, true)}" fill="#fff4d6"/>
</svg>`.trim()

  // ---- composite -------------------------------------------------------
  const svgBuffer = Buffer.from(svgOverlay)

  return sharp(backgroundBuffer)
    .resize(W, H, { fit: 'cover', position: 'centre' })
    .composite([{ input: svgBuffer, top: 0, left: 0 }])
    .jpeg({ quality: 85, progressive: true })
    .toBuffer()
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
    try {
      const response = await fetch(backgroundImageUrl, {
        signal: AbortSignal.timeout(10000),
      })
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer()
        backgroundBuffer = Buffer.from(arrayBuffer)
      }
    } catch {
      // Fallback: use solid gradient background (handled below)
    }
  }

  // ---- if no image, create a gradient background via SVG + sharp -------
  if (!backgroundBuffer) {
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