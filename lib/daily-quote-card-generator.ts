export type CardTemplate = 'devotional' | 'modern' | 'cinematic'

export const CARD_TEMPLATES: {
  template: CardTemplate
  label: string
}[] = [
  {
    template: 'devotional',
    label: 'Devocional elegante',
  },
  {
    template: 'modern',
    label: 'Moderno premium',
  },
  {
    template: 'cinematic',
    label: 'Cinematográfico',
  },
]

export function formatQuoteTextForDisplay(text: string) {
  const trimmedText = text.trim()

  if (!trimmedText) return ''

  const quoteMarkPattern = /^["'“”‘’«»].*["'“”‘’«»]$/

  if (quoteMarkPattern.test(trimmedText)) {
    return trimmedText
  }

  return `“${trimmedText}”`
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Erro ao carregar imagem.'))
    image.src = src
  })
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
) {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  words.forEach((word) => {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const metrics = ctx.measureText(testLine)

    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  })

  if (currentLine) {
    lines.push(currentLine)
  }

  return lines
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number
) {
  const scale = Math.max(width / image.width, height / image.height)
  const scaledWidth = image.width * scale
  const scaledHeight = image.height * scale
  const x = (width - scaledWidth) / 2
  const y = (height - scaledHeight) / 2

  ctx.drawImage(image, x, y, scaledWidth, scaledHeight)
}

function drawMultilineText(params: {
  ctx: CanvasRenderingContext2D
  lines: string[]
  x: number
  y: number
  lineHeight: number
  align: CanvasTextAlign
  maxLines?: number
}) {
  const { ctx, lines, x, y, lineHeight, align, maxLines = 7 } = params

  ctx.textAlign = align

  lines.slice(0, maxLines).forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight)
  })
}

function getCenteredTextStartY(params: {
  linesCount: number
  lineHeight: number
  maxLines: number
  areaTop: number
  areaBottom: number
}) {
  const visibleLines = Math.min(params.linesCount, params.maxLines)
  const textBlockHeight = (visibleLines - 1) * params.lineHeight
  const areaCenter = (params.areaTop + params.areaBottom) / 2

  return areaCenter - textBlockHeight / 2
}

export async function generateCardDataUrl(params: {
  quoteText: string
  bibleReference: string
  episodeTitle: string
  imageUrl: string
  template: CardTemplate
}) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Canvas não suportado neste navegador.')
  }

  const size = 1080
  canvas.width = size
  canvas.height = size

  const image = await loadImage(params.imageUrl)
  const displayQuoteText = formatQuoteTextForDisplay(params.quoteText)

  drawCoverImage(ctx, image, size, size)

  const gradient = ctx.createLinearGradient(0, 0, 0, size)

  if (params.template === 'devotional') {
    gradient.addColorStop(0, 'rgba(0,0,0,0.40)')
    gradient.addColorStop(0.45, 'rgba(0,0,0,0.48)')
    gradient.addColorStop(1, 'rgba(0,0,0,0.76)')
  }

  if (params.template === 'modern') {
    gradient.addColorStop(0, 'rgba(0,0,0,0.22)')
    gradient.addColorStop(0.45, 'rgba(0,0,0,0.40)')
    gradient.addColorStop(1, 'rgba(0,0,0,0.84)')
  }

  if (params.template === 'cinematic') {
    gradient.addColorStop(0, 'rgba(0,0,0,0.66)')
    gradient.addColorStop(0.55, 'rgba(0,0,0,0.43)')
    gradient.addColorStop(1, 'rgba(0,0,0,0.82)')
  }

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  ctx.shadowColor = 'rgba(0,0,0,0.68)'
  ctx.shadowBlur = 18
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 4

  if (params.template === 'devotional') {
    ctx.fillStyle = 'rgba(255,255,255,0.88)'
    ctx.font = '700 27px Georgia, serif'
    ctx.textAlign = 'center'
    ctx.fillText('PALAVRA DO DIA', size / 2, 145)

    ctx.fillStyle = 'rgba(255,255,255,0.96)'
    ctx.font = '700 60px Georgia, serif'

    let lines = wrapText(ctx, displayQuoteText, 820)

    if (lines.length > 6) {
      ctx.font = '700 52px Georgia, serif'
      lines = wrapText(ctx, displayQuoteText, 840)
    }

    const lineHeight = lines.length > 4 ? 66 : 72
    const startY = getCenteredTextStartY({
      linesCount: lines.length,
      lineHeight,
      maxLines: 6,
      areaTop: 225,
      areaBottom: 760,
    })

    drawMultilineText({
      ctx,
      lines,
      x: size / 2,
      y: startY,
      lineHeight,
      align: 'center',
      maxLines: 6,
    })

    ctx.font = '600 34px Arial, sans-serif'
    ctx.fillStyle = '#dbeafe'
    ctx.fillText(params.bibleReference || 'Devocional', size / 2, 805)

    ctx.font = '400 26px Arial, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.76)'
    ctx.fillText('Pr. Djeone Martins', size / 2, 858)
  }

  if (params.template === 'modern') {
    const left = 88

    ctx.textAlign = 'left'
    ctx.fillStyle = 'rgba(147,197,253,0.95)'
    ctx.font = '800 28px Arial, sans-serif'
    ctx.fillText('PALAVRA DO DIA', left, 145)

    ctx.fillStyle = 'rgba(255,255,255,0.98)'
    ctx.font = '800 56px Arial, sans-serif'

    let lines = wrapText(ctx, displayQuoteText, 850)

    if (lines.length > 7) {
      ctx.font = '800 48px Arial, sans-serif'
      lines = wrapText(ctx, displayQuoteText, 860)
    }

    const lineHeight = lines.length > 5 ? 60 : 66
    const startY = getCenteredTextStartY({
      linesCount: lines.length,
      lineHeight,
      maxLines: 7,
      areaTop: 225,
      areaBottom: 740,
    })

    drawMultilineText({
      ctx,
      lines,
      x: left,
      y: startY,
      lineHeight,
      align: 'left',
      maxLines: 7,
    })

    ctx.fillStyle = 'rgba(255,255,255,0.16)'
    ctx.fillRect(left, 770, 320, 3)

    ctx.fillStyle = '#bfdbfe'
    ctx.font = '700 34px Arial, sans-serif'
    ctx.fillText(params.bibleReference || 'Devocional', left, 825)

    ctx.fillStyle = 'rgba(255,255,255,0.72)'
    ctx.font = '400 25px Arial, sans-serif'
    ctx.fillText('Pr. Djeone Martins', left, 878)
  }

  if (params.template === 'cinematic') {
    ctx.fillStyle = 'rgba(255,255,255,0.86)'
    ctx.font = '800 26px Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('PALAVRA DO DIA', size / 2, 125)

    ctx.fillStyle = 'rgba(255,255,255,0.98)'
    ctx.font = '900 58px Arial, sans-serif'

    let lines = wrapText(ctx, displayQuoteText.toUpperCase(), 850)

    if (lines.length > 6) {
      ctx.font = '900 48px Arial, sans-serif'
      lines = wrapText(ctx, displayQuoteText.toUpperCase(), 860)
    }

    const lineHeight = lines.length > 4 ? 62 : 68
    const startY = getCenteredTextStartY({
      linesCount: lines.length,
      lineHeight,
      maxLines: 6,
      areaTop: 220,
      areaBottom: 750,
    })

    drawMultilineText({
      ctx,
      lines,
      x: size / 2,
      y: startY,
      lineHeight,
      align: 'center',
      maxLines: 6,
    })

    ctx.fillStyle = 'rgba(255,255,255,0.20)'
    ctx.fillRect(240, 770, 600, 3)

    ctx.fillStyle = '#fde68a'
    ctx.font = '800 34px Arial, sans-serif'
    ctx.fillText(params.bibleReference || 'Devocional', size / 2, 825)

    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    ctx.font = '400 26px Arial, sans-serif'
    ctx.fillText('Pr. Djeone Martins', size / 2, 878)
  }

  ctx.shadowColor = 'transparent'

  return canvas.toDataURL('image/png', 0.92)
}

export function dataUrlToBlob(dataUrl: string) {
  const [header, base64] = dataUrl.split(',')
  const mimeMatch = header.match(/:(.*?);/)
  const mime = mimeMatch ? mimeMatch[1] : 'image/png'
  const binary = atob(base64)
  const array = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i += 1) {
    array[i] = binary.charCodeAt(i)
  }

  return new Blob([array], { type: mime })
}
