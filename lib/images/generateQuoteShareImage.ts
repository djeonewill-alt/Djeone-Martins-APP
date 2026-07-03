import { readFileSync } from 'fs'
import { join } from 'path'
import sharp from 'sharp'

// ---------------------------------------------------------------------------
// Fonte embutida — Inter-Bold.ttf via base64, autossuficiente em qualquer SO
// ---------------------------------------------------------------------------
const interBoldBase64 = readFileSync(
  join(process.cwd(), 'lib', 'fonts', 'Inter-Bold.ttf')
).toString('base64')

const FONT_FAMILY = 'InterBold, sans-serif'

export type QuoteShareImageInput = {
  quoteText: string
  bibleReference?: string | null
  baseImageUrl?: string | null
}

export type QuoteShareImageResult = {
  buffer: Buffer
  width: number
  height: number
  quality: number
  sizeBytes: number
}

const maxSizeBytes = 400 * 1024
const idealSizeBytes = 300 * 1024
const dimensions = [
  { width: 1200, height: 630 },
  { width: 800, height: 420 },
]
const qualities = [84, 78, 72, 66]

function cleanText(value?: string | null) {
  return (value || '').replace(/\s+/g, ' ').trim()
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function fitText(value: string, maxLength = 150) {
  const text = cleanText(value)

  if (text.length <= maxLength) return text

  return `${text.slice(0, maxLength - 3)}...`
}

function wrapText(value: string, maxCharsPerLine: number, maxLines: number) {
  const words = value.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word

    if (next.length > maxCharsPerLine && current) {
      lines.push(current)
      current = word
      return
    }

    current = next
  })

  if (current) lines.push(current)

  if (lines.length <= maxLines) return lines

  const visible = lines.slice(0, maxLines)
  visible[maxLines - 1] = `${visible[maxLines - 1].replace(/\.*$/, '')}...`

  return visible
}

function getTypography(width: number, quoteText: string) {
  const isLarge = width >= 1000
  const lineCountHint = quoteText.length > 120 ? 4 : quoteText.length > 80 ? 3 : 2

  return {
    eyebrowSize: isLarge ? 25 : 17,
    quoteSize: isLarge
      ? quoteText.length > 125
        ? 50
        : quoteText.length > 90
          ? 58
          : 66
      : quoteText.length > 125
        ? 34
        : quoteText.length > 90
          ? 39
          : 45,
    quoteLineHeight: isLarge ? 1.14 : 1.12,
    brandSize: isLarge ? 35 : 24,
    referenceSize: isLarge ? 24 : 17,
    maxCharsPerLine: 28,
    maxLines: Math.max(3, lineCountHint + 1),
  }
}

function createFallbackBaseSvg(width: number, height: number) {
  return Buffer.from(`
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#020617"/>
          <stop offset="0.52" stop-color="#172554"/>
          <stop offset="1" stop-color="#111827"/>
        </linearGradient>
        <radialGradient id="light" cx="0.72" cy="0.22" r="0.75">
          <stop offset="0" stop-color="#d9bc6b" stop-opacity="0.32"/>
          <stop offset="1" stop-color="#d9bc6b" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#bg)"/>
      <rect width="${width}" height="${height}" fill="url(#light)"/>
    </svg>
  `)
}

function createOverlaySvg(params: {
  width: number
  height: number
  quoteText: string
  bibleReference?: string | null
}) {
  const { width, height } = params
  const quoteText = fitText(params.quoteText)
  const reference = cleanText(params.bibleReference) || 'Devocional Diario'
  const typography = getTypography(width, quoteText)
  const quoteLines = wrapText(quoteText, typography.maxCharsPerLine, typography.maxLines)
  const lineHeight = Math.round(typography.quoteSize * typography.quoteLineHeight)
  const quoteBlockHeight = quoteLines.length * lineHeight
  const quoteStartY = Math.round(height / 2 - quoteBlockHeight / 2 + typography.quoteSize * 0.8)
  const sidePadding = Math.round(width * 0.09)
  const lineWidth = Math.round(width * 0.15)
  const quoteTspans = quoteLines
    .map((line, index) => {
      const y = quoteStartY + index * lineHeight
      return `<tspan x="${width / 2}" y="${y}">${escapeXml(line)}</tspan>`
    })
    .join('')

  return Buffer.from(`
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>
          @font-face {
            font-family: 'InterBold';
            src: url(data:font/ttf;base64,${interBoldBase64}) format('truetype');
            font-weight: 700;
          }
        </style>
        <linearGradient id="vignette" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#020617" stop-opacity="0.68"/>
          <stop offset="0.48" stop-color="#020617" stop-opacity="0.34"/>
          <stop offset="1" stop-color="#020617" stop-opacity="0.72"/>
        </linearGradient>
        <radialGradient id="centerLight" cx="0.5" cy="0.5" r="0.68">
          <stop offset="0" stop-color="#000000" stop-opacity="0"/>
          <stop offset="1" stop-color="#000000" stop-opacity="0.42"/>
        </radialGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="5" stdDeviation="7" flood-color="#000000" flood-opacity="0.82"/>
        </filter>
      </defs>
      <rect width="${width}" height="${height}" fill="rgba(2,6,23,0.38)"/>
      <rect width="${width}" height="${height}" fill="url(#vignette)"/>
      <rect width="${width}" height="${height}" fill="url(#centerLight)"/>
      <g text-anchor="middle" filter="url(#shadow)">
        <line x1="${width / 2 - lineWidth / 2}" y1="${Math.round(height * 0.13)}" x2="${width / 2 + lineWidth / 2}" y2="${Math.round(height * 0.13)}" stroke="#d9bc6b" stroke-width="2" stroke-opacity="0.88"/>
        <text x="${width / 2}" y="${Math.round(height * 0.19)}" fill="#fff4d6" font-family="${FONT_FAMILY}" font-size="${typography.eyebrowSize}" font-weight="900" letter-spacing="${width >= 1000 ? 9 : 6}">PALAVRA DO DIA</text>
        <text fill="#fffdf5" font-family="${FONT_FAMILY}" font-size="${typography.quoteSize}" font-weight="700">${quoteTspans}</text>
        <line x1="${width / 2 - lineWidth / 2}" y1="${Math.round(height * 0.77)}" x2="${width / 2 + lineWidth / 2}" y2="${Math.round(height * 0.77)}" stroke="#d9bc6b" stroke-width="2" stroke-opacity="0.88"/>
        <text x="${width / 2}" y="${Math.round(height * 0.84)}" fill="#fffdf5" font-family="${FONT_FAMILY}" font-size="${typography.brandSize}" font-weight="700">Pr. Djeone Martins</text>
        <text x="${width / 2}" y="${Math.round(height * 0.91)}" fill="#fff4d6" font-family="${FONT_FAMILY}" font-size="${typography.referenceSize}" font-weight="900" letter-spacing="${width >= 1000 ? 5 : 3}">${escapeXml(reference.toUpperCase())}</text>
      </g>
      <rect x="${sidePadding}" y="${Math.round(height * 0.08)}" width="${width - sidePadding * 2}" height="${Math.round(height * 0.84)}" rx="${width >= 1000 ? 34 : 24}" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="1"/>
    </svg>
  `)
}

async function downloadBaseImage(url?: string | null) {
  const cleanUrl = cleanText(url)

  if (!cleanUrl) return null

  try {
    const response = await fetch(cleanUrl, {
      signal: AbortSignal.timeout(12000),
      headers: {
        'User-Agent': 'DjeoneApp/1.0 share-image-generator',
      },
    })

    if (!response.ok) return null

    const contentType = response.headers.get('content-type') || ''

    if (!contentType.startsWith('image/')) return null

    return Buffer.from(await response.arrayBuffer())
  } catch {
    return null
  }
}

async function renderCandidate(params: {
  baseImageBuffer: Buffer | null
  width: number
  height: number
  quality: number
  quoteText: string
  bibleReference?: string | null
}) {
  const base = params.baseImageBuffer
    ? sharp(params.baseImageBuffer, { failOn: 'none' })
        .rotate()
        .resize(params.width, params.height, { fit: 'cover', position: 'center' })
    : sharp(createFallbackBaseSvg(params.width, params.height))

  return base
    .composite([
      {
        input: createOverlaySvg({
          width: params.width,
          height: params.height,
          quoteText: params.quoteText,
          bibleReference: params.bibleReference,
        }),
        top: 0,
        left: 0,
      },
    ])
    .jpeg({ quality: params.quality, mozjpeg: true })
    .toBuffer()
}

export async function generateQuoteShareImage(
  input: QuoteShareImageInput
): Promise<QuoteShareImageResult> {
  const quoteText = cleanText(input.quoteText)

  if (!quoteText) {
    throw new Error('Texto da Palavra ausente.')
  }

  const baseImageBuffer = await downloadBaseImage(input.baseImageUrl)
  let fallbackUnderLimit: QuoteShareImageResult | null = null

  for (const dimension of dimensions) {
    for (const quality of qualities) {
      const buffer = await renderCandidate({
        baseImageBuffer,
        width: dimension.width,
        height: dimension.height,
        quality,
        quoteText,
        bibleReference: input.bibleReference,
      })
      const result = {
        buffer,
        width: dimension.width,
        height: dimension.height,
        quality,
        sizeBytes: buffer.byteLength,
      }

      if (result.sizeBytes <= idealSizeBytes) return result

      if (result.sizeBytes <= maxSizeBytes) {
        fallbackUnderLimit = result
      }
    }
  }

  if (fallbackUnderLimit) return fallbackUnderLimit

  throw new Error('Imagem final acima do limite de 400 KB.')
}
