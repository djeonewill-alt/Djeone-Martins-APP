'use client'

import { useState, useEffect, FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AudioRecorder from '@/components/recorder/AudioRecorder'
import type { DailyQuoteSuggestion } from '@/lib/supabase'

// ---------------------------------------------------------------------------
// Card generation helpers (inline — substituem lib/daily-quote-card-generator.ts)
// ---------------------------------------------------------------------------

type CardTemplate = 'devotional' | 'modern' | 'cinematic'

const CARD_TEMPLATES: { template: CardTemplate; label: string }[] = [
  { template: 'devotional', label: 'Devocional elegante' },
  { template: 'modern', label: 'Moderno premium' },
  { template: 'cinematic', label: 'Cinematográfico' },
]

function formatQuoteTextForDisplay(text: string) {
  const trimmedText = text.trim()
  if (!trimmedText) return ''
  const quoteMarkPattern = /^["'""''«»].*["'""''«»]$/
  if (quoteMarkPattern.test(trimmedText)) return trimmedText
  return `"${trimmedText}"`
}

function dataUrlToBlob(dataUrl: string) {
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

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Erro ao carregar imagem.'))
    image.src = src
  })
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
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
  if (currentLine) lines.push(currentLine)
  return lines
}

function drawCoverImage(ctx: CanvasRenderingContext2D, image: HTMLImageElement, width: number, height: number) {
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

async function generateCardDataUrl(params: {
  quoteText: string
  bibleReference: string
  episodeTitle: string
  imageUrl: string
  template: CardTemplate
}) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas não suportado neste navegador.')
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
    if (lines.length > 6) { ctx.font = '700 52px Georgia, serif'; lines = wrapText(ctx, displayQuoteText, 840) }
    const lineHeight = lines.length > 4 ? 66 : 72
    const startY = getCenteredTextStartY({ linesCount: lines.length, lineHeight, maxLines: 6, areaTop: 225, areaBottom: 760 })
    drawMultilineText({ ctx, lines, x: size / 2, y: startY, lineHeight, align: 'center', maxLines: 6 })
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
    if (lines.length > 7) { ctx.font = '800 48px Arial, sans-serif'; lines = wrapText(ctx, displayQuoteText, 860) }
    const lineHeight = lines.length > 5 ? 60 : 66
    const startY = getCenteredTextStartY({ linesCount: lines.length, lineHeight, maxLines: 7, areaTop: 225, areaBottom: 740 })
    drawMultilineText({ ctx, lines, x: left, y: startY, lineHeight, align: 'left', maxLines: 7 })
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
    if (lines.length > 6) { ctx.font = '900 48px Arial, sans-serif'; lines = wrapText(ctx, displayQuoteText.toUpperCase(), 860) }
    const lineHeight = lines.length > 4 ? 62 : 68
    const startY = getCenteredTextStartY({ linesCount: lines.length, lineHeight, maxLines: 6, areaTop: 220, areaBottom: 750 })
    drawMultilineText({ ctx, lines, x: size / 2, y: startY, lineHeight, align: 'center', maxLines: 6 })
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

// ---------------------------------------------------------------------------

type Series = {
  id: string
  title: string
  cover_image_url: string | null
}

type BackgroundImage = {
  id: string
  provider: string
  url: string
  preview_url: string
  photographer?: string
  photographer_url?: string
  source_page_url?: string
  alt?: string
  query: string
  theme_keywords: string[]
  quote_background_id?: string | null
  pexels_photo_id?: string | null
}

type CardOption = {
  id: string
  template: CardTemplate
  label: string
  source_image_url: string
  source_image_provider: string
  theme_keywords: string[]
  preview_data_url: string
  photographer?: string | null
  photographer_url?: string | null
  source_page_url?: string | null
  quote_background_id?: string | null
  pexels_photo_id?: string | null
  query_used?: string | null
}

type AudioUploadResponse = {
  url?: string
  key?: string
  type?: string
  contentType?: string
  extension?: string
  sizeBytes?: number
  compatibleAudioUrl?: string | null
  compatibleAudioType?: string | null
  isAudioCompatible?: boolean
  error?: string
}

type PresignedUploadResponse = {
  signedUrl?: string
  publicUrl?: string
  key?: string
  contentType?: string
  extension?: string
  sizeBytes?: number
  compatibleAudioUrl?: string | null
  compatibleAudioType?: string | null
  isAudioCompatible?: boolean
  error?: string
}

type ConvertToMp3Response = {
  success?: boolean
  compatibleUrl?: string
  compatibleKey?: string
  compatibleType?: 'audio/mpeg'
  sizeBytes?: number
  sizeMb?: number
  bitrate?: string
  maxSizeBytes?: number
  withinLimit?: boolean
  attempts?: Array<{
    bitrate: string
    status?: 'converted' | 'too_large' | 'ffmpeg_failed' | 'skipped'
    sizeBytes?: number
    sizeMb?: number
    withinLimit: boolean
    error?: string
  }>
  error?: string
}

type TranscriptionWord = {
  word: string
  start: number
  end: number
}

type TranscribeAudioResponse = {
  success?: boolean
  transcriptionText?: string
  transcriptionSegments?: Array<{ start: number; end: number; text: string }>
  transcription_words?: TranscriptionWord[]
  transcription_words_count?: number
  transcription_words_status?: 'ready' | 'pending_save' | 'missing' | 'error'
  transcription_words_url?: string
  transcription_words_key?: string
  error?: string
}

type PersistTranscriptionWordsResponse = {
  success?: boolean
  transcription_words_url?: string
  transcription_words_key?: string
  transcription_words_count?: number
  transcription_words_status?: 'ready'
  error?: string
}

type PremiumImagePromptResponse = {
  success?: boolean
  model?: string
  title?: string
  official_episode_title?: string
  suggested_cover_title?: string
  scene_diagnosis?: {
    dominant_scene_type?: string
    biblical_setting?: string
    main_characters?: string[]
    visual_anchors?: string[]
    allowed_visual_elements?: string[]
    forbidden_visual_elements?: string[]
    why_this_scene_matches?: string
  }
  visual_theme?: {
    scene?: string
    central_focus?: string
    atmosphere?: string
    background?: string
    lighting?: string
    color_palette?: string
    theological_meaning?: string
  }
  background_prompt?: string
  full_prompt_with_text?: string
  text_overlay?: {
    top?: string
    main_title?: string
    suggested_short_title?: string
    subtitle?: string
    bottom_quote?: string
  }
  negative_prompt?: string
  keywords?: string[]
  warning?: string
  error?: string
  flux_image_url?: string
  flux_image_size_bytes?: number
  flux_image_width?: number
  flux_image_height?: number
}

function getLocalDateString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getLocalDateStringFromDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getLocalTimeStringFromDate(date: Date) {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${hours}:${minutes}`
}

function getScheduledDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`)
}

function getRoundedFutureDateTime(minutesAhead: number) {
  const date = new Date(Date.now() + minutesAhead * 60 * 1000)
  const roundedMinutes = Math.ceil(date.getMinutes() / 5) * 5

  date.setMinutes(roundedMinutes, 0, 0)

  return date
}

const MAX_COMPATIBLE_AUDIO_BYTES = 4.5 * 1024 * 1024
const ALLOWED_COVER_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const ALLOWED_COVER_IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp']
const TRANSCRIPTION_COMPATIBLE_AUDIO_WARNING =
  'Antes de transcrever, gere o MP3 compativel. Isso garante que a legenda fique sincronizada com o audio publicado.'

function isSmallMp3Audio(data: AudioUploadResponse, fallbackSizeBytes = 0) {
  const contentType = (data.contentType || data.type || '').toLowerCase()
  const extension = (data.extension || '').toLowerCase().replace(/^\./, '')
  const sizeBytes = data.sizeBytes || fallbackSizeBytes

  return (
    (contentType === 'audio/mpeg' || extension === 'mp3') &&
    sizeBytes > 0 &&
    sizeBytes <= MAX_COMPATIBLE_AUDIO_BYTES
  )
}

function isAllowedCoverImage(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase() || ''

  return (
    ALLOWED_COVER_IMAGE_TYPES.includes(file.type) ||
    ALLOWED_COVER_IMAGE_EXTENSIONS.includes(extension)
  )
}

function formatConversionAttempts(attempts?: ConvertToMp3Response['attempts']) {
  if (!attempts?.length) return ''

  return attempts
    .map((attempt) => {
      const sizeText = attempt.sizeMb
        ? `${attempt.sizeMb.toFixed(2)} MB`
        : attempt.sizeBytes
          ? `${(attempt.sizeBytes / 1024 / 1024).toFixed(2)} MB`
          : ''
      const statusText =
        attempt.status === 'converted'
          ? `${sizeText} dentro do limite`.trim()
          : attempt.status === 'too_large'
            ? `${sizeText} acima do limite`.trim()
            : attempt.status === 'skipped'
              ? `${sizeText} sem reencodar`.trim()
              : attempt.status === 'ffmpeg_failed'
                ? attempt.error
                  ? `falhou no ffmpeg: ${attempt.error.slice(0, 120)}`
                  : 'falhou no ffmpeg'
              : attempt.error
                ? `falhou: ${attempt.error.slice(0, 120)}`
                : 'falhou'

      return `${attempt.bitrate}: ${statusText}`
    })
    .join('\n')
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  try {
    return JSON.stringify(error)
  } catch {
    return 'Erro desconhecido'
  }
}

function getSuggestionUseCaseLabel(useCase?: string) {
  const normalized = String(useCase || '').trim().toLowerCase()
  const labels: Record<string, string> = {
    card: 'card',
    whatsapp: 'WhatsApp',
    instagram: 'Instagram',
    short: 'short',
    devotional: 'devocional',
  }

  return labels[normalized] || ''
}

function getSuggestionDisplayData(suggestion: DailyQuoteSuggestion | string) {
  if (typeof suggestion === 'string') {
    return {
      suggestion: {
        quote_text: suggestion,
        reason: '',
        score: 0,
      } as DailyQuoteSuggestion,
      quoteText: suggestion,
      reason: '',
      score: null as number | null,
      sourceExcerpt: '',
      useCaseLabel: '',
      specificityReason: '',
    }
  }

  const value = suggestion as DailyQuoteSuggestion & {
    quote_text?: unknown
    reason?: unknown
    score?: unknown
    source_excerpt?: unknown
    use_case?: unknown
    specificity_reason?: unknown
  }
  const rawScore = Number(value.score)

  return {
    suggestion,
    quoteText: String(value.quote_text || '').trim(),
    reason: String(value.reason || '').trim(),
    score: Number.isFinite(rawScore) ? rawScore : null,
    sourceExcerpt: String(value.source_excerpt || '').trim(),
    useCaseLabel: getSuggestionUseCaseLabel(String(value.use_case || '')),
    specificityReason: String(value.specificity_reason || '').trim(),
  }
}

function getPremiumOverlayCopy(prompt: PremiumImagePromptResponse) {
  return JSON.stringify(
    {
      official_episode_title: prompt.official_episode_title || '',
      suggested_cover_title: prompt.suggested_cover_title || '',
      top: prompt.text_overlay?.top || '',
      main_title: prompt.text_overlay?.main_title || '',
      suggested_short_title: prompt.text_overlay?.suggested_short_title || '',
      subtitle: prompt.text_overlay?.subtitle || '',
      bottom_quote: prompt.text_overlay?.bottom_quote || '',
    },
    null,
    2
  )
}

function hasExplicitWaterTheme(text: string) {
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  const patterns = [
    /\batos\s*27\b/,
    /\bpaulo\b.*\b(viagem|navio|naufragio|mar)\b/,
    /\bcenturiao\b.*\b(naufragio|navio|mar|prisioneiros?)\b/,
    /\bmar\b/,
    /\bbarco\b/,
    /\bnavio\b/,
    /\bnaufragio\b/,
    /\baguas?\b/,
    /\bondas?\b/,
    /\btempestade\b/,
    /\bnadar\b/,
    /\bnadando\b/,
    /\bpraia\b/,
    /\bcosta\b/,
    /\bterra firme\b/,
  ]

  return patterns.some((pattern) => pattern.test(normalized))
}

function hasFallbackImage(data: { provider?: string; images?: BackgroundImage[] }) {
  return (
    data.provider === 'fallback' ||
    (data.images || []).some((image) => image.provider === 'fallback')
  )
}

function isFallbackSource(option?: Pick<CardOption, 'source_image_provider' | 'source_image_url'> | null) {
  return (
    option?.source_image_provider === 'fallback' ||
    option?.source_image_url === '/vencendo-tempestades.jpg'
  )
}

function normalizeBasicPortuguese(text: string) {
  let value = text
    .replace(/\s+/g, ' ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim()

  const replacements: [RegExp, string][] = [
    [/\bjesus\b/gi, 'Jesus'],
    [/\bdeus\b/gi, 'Deus'],
    [/\bsenhor\b/gi, 'Senhor'],
    [/\bespirito santo\b/gi, 'Espírito Santo'],
    [/\bespirito\b/gi, 'Espírito'],
    [/\bnao\b/gi, 'não'],
    [/\bvoce\b/gi, 'você'],
    [/\bagua\b/gi, 'água'],
    [/\bgraca\b/gi, 'graça'],
    [/\bfe\b/gi, 'fé'],
    [/\bcoracao\b/gi, 'coração'],
    [/\boracao\b/gi, 'oração'],
    [/\bprotecao\b/gi, 'proteção'],
    [/\blibertacao\b/gi, 'libertação'],
    [/\bsalvacao\b/gi, 'salvação'],
    [/\bperdao\b/gi, 'perdão'],
  ]

  replacements.forEach(([regex, replacement]) => {
    value = value.replace(regex, replacement)
  })

  value = value.replace(/\s+([,.!?;:])/g, '$1')
  value = value.replace(/([,.!?;:])([^\s])/g, '$1 $2')

  if (value.length > 0) {
    value = value.charAt(0).toUpperCase() + value.slice(1)
  }

  if (value && !/[.!?…]$/.test(value)) {
    value += '.'
  }

  return value
}

function FullscreenImageModal({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-6"
    >
      <div className="relative max-h-[92vh] max-w-[92vw]">
        <button
          type="button"
          onClick={onClose}
          className="absolute -right-3 -top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-slate-950 text-lg font-bold text-white shadow-xl transition-colors hover:bg-slate-800"
        >
          ✕
        </button>
        <img
          src={src}
          alt={alt}
          className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain"
        />
      </div>
    </div>
  )
}

export default function NovoEpisodio() {
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<'record' | 'upload'>('record')
  const [series, setSeries] = useState<Series[]>([])

  const [loading, setLoading] = useState(false)
  const [savingToRepository, setSavingToRepository] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isGeneratingCompatibleAudio, setIsGeneratingCompatibleAudio] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [generatingQuote, setGeneratingQuote] = useState(false)
  const [generatingCards, setGeneratingCards] = useState(false)
  const [correctingQuote, setCorrectingQuote] = useState(false)

  const [audioUrl, setAudioUrl] = useState('')
  const [audioDuration, setAudioDuration] = useState(0)
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null)
  const [audioOriginalUrl, setAudioOriginalUrl] = useState('')
  const [audioOriginalKey, setAudioOriginalKey] = useState('')
  const [audioOriginalType, setAudioOriginalType] = useState('')
  const [uploadedAudioContentType, setUploadedAudioContentType] = useState('')
  const [audioUrlCompatible, setAudioUrlCompatible] = useState('')
  const [audioCompatibleType, setAudioCompatibleType] = useState('')
  const [audioCompatibleSizeBytes, setAudioCompatibleSizeBytes] = useState(0)
  const [isAudioCompatible, setIsAudioCompatible] = useState(false)
  const [audioCompatibilityWarning, setAudioCompatibilityWarning] = useState('')

  const [episodeImageUrl, setEpisodeImageUrl] = useState('')
  const [useSeriesImage, setUseSeriesImage] = useState(true)
  const [selectedSeriesImage, setSelectedSeriesImage] = useState<string | null>(null)
  const [episodeThumbnailOptions, setEpisodeThumbnailOptions] = useState<BackgroundImage[]>([])
  const [selectedEpisodeThumbnailIndex, setSelectedEpisodeThumbnailIndex] = useState<number | null>(null)
  const [generatingEpisodeThumbnails, setGeneratingEpisodeThumbnails] = useState(false)

  const [useDefaultTime, setUseDefaultTime] = useState(false)
  const [autoGenerateEpisodeMetadata, setAutoGenerateEpisodeMetadata] = useState(true)
  const [generatingEpisodeMetadata, setGeneratingEpisodeMetadata] = useState(false)

  const [enableDailyQuote, setEnableDailyQuote] = useState(true)
  const [generateAdvancedTranscription, setGenerateAdvancedTranscription] = useState(true)
  const [transcriptionText, setTranscriptionText] = useState('')
  const [transcriptionSegments, setTranscriptionSegments] = useState<Array<{ start: number; end: number; text: string }>>([])
  const [transcriptionWords, setTranscriptionWords] = useState<TranscriptionWord[]>([])
  const [transcriptionWordsCount, setTranscriptionWordsCount] = useState(0)
  const [transcriptionWordsStatus, setTranscriptionWordsStatus] = useState<'ready' | 'pending_save' | 'missing' | 'error'>('missing')
  const [transcriptionWordsUrl, setTranscriptionWordsUrl] = useState('')
  const [transcriptionWordsKey, setTranscriptionWordsKey] = useState('')
  const [transcriptionWordsPersistWarning, setTranscriptionWordsPersistWarning] = useState('')
  const [quoteSuggestions, setQuoteSuggestions] = useState<DailyQuoteSuggestion[]>([])
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<number | null>(null)
  const [selectedDailyQuote, setSelectedDailyQuote] = useState('')
  const [correctionNote, setCorrectionNote] = useState('')

  const [cardOptions, setCardOptions] = useState<CardOption[]>([])
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null)
  const [generatingPremiumImagePrompt, setGeneratingPremiumImagePrompt] = useState(false)
  const [premiumImagePrompt, setPremiumImagePrompt] = useState<PremiumImagePromptResponse | null>(null)
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    series_id: '',
    episode_number: 1,
    bible_reference: '',
    title: '',
    description: '',
    status: 'draft' as 'draft' | 'published',
    scheduled_date: '',
    scheduled_time: '06:00',
  })

  useEffect(() => {
    loadSeries()
  }, [])

  useEffect(() => {
    if (formData.series_id) {
      const selectedSeries = series.find((s) => s.id === formData.series_id)
      setSelectedSeriesImage(selectedSeries?.cover_image_url || null)
      suggestNextEpisodeNumber(formData.series_id)
    }
  }, [formData.series_id, series])

  async function suggestNextEpisodeNumber(seriesId: string) {
    try {
      const { data, error } = await supabase
        .from('episodes')
        .select('episode_number')
        .eq('series_id', seriesId)
        .not('episode_number', 'is', null)
        .order('episode_number', { ascending: false })
        .limit(1)

      if (error) throw error

      const maxNumber = data && data.length > 0 ? (data[0].episode_number as number) : 0
      const nextNumber = maxNumber + 1

      setFormData((prev) => ({ ...prev, episode_number: nextNumber }))
    } catch (error) {
      console.error('Erro ao sugerir próximo número de episódio:', error)
    }
  }

  const resetCardData = () => {
    setCardOptions([])
    setSelectedCardIndex(null)
  }

  const resetAutomationData = () => {
    setTranscriptionText('')
    setTranscriptionSegments([])
    setTranscriptionWords([])
    setTranscriptionWordsCount(0)
    setTranscriptionWordsStatus('missing')
    setTranscriptionWordsUrl('')
    setTranscriptionWordsKey('')
    setTranscriptionWordsPersistWarning('')
    setQuoteSuggestions([])
    setSelectedSuggestionIndex(null)
    setSelectedDailyQuote('')
    setCorrectionNote('')
    resetCardData()
  }

  const getTranscriptionAudioUrl = () => {
    if (audioUrlCompatible) {
      return audioUrlCompatible
    }

    if (audioUrl && audioCompatibleType.toLowerCase() === 'audio/mpeg') {
      return audioUrl
    }

    return ''
  }

  const applyTranscriptionResult = (data: TranscribeAudioResponse) => {
    setTranscriptionText(data.transcriptionText || '')
    setTranscriptionSegments(Array.isArray(data.transcriptionSegments) ? data.transcriptionSegments : [])

    const words = Array.isArray(data.transcription_words) ? data.transcription_words : []

    setTranscriptionWords(words)
    setTranscriptionWordsCount(data.transcription_words_count || words.length)
    setTranscriptionWordsStatus(data.transcription_words_status || 'missing')
    setTranscriptionWordsUrl(data.transcription_words_url || '')
    setTranscriptionWordsKey(data.transcription_words_key || '')
    setTranscriptionWordsPersistWarning('')
  }

  const getAdvancedTranscriptionMessage = (data: TranscribeAudioResponse) => {
    if (!generateAdvancedTranscription) {
      return 'Transcricao gerada com sucesso!'
    }

    const wordsCount = data.transcription_words_count || data.transcription_words?.length || 0

    if (wordsCount > 0 && data.transcription_words_status === 'ready') {
      return `Transcricao avancada gerada: ${wordsCount} palavras com timestamps.`
    }

    if (wordsCount > 0) {
      return `Transcricao avancada gerada: ${wordsCount} palavras com timestamps. Words pendentes de salvamento ate o episodio ser salvo.`
    }

    return 'Transcricao gerada. Words nao foram retornadas pela transcricao avancada.'
  }

  const persistPendingTranscriptionWords = async (episodeId: string) => {
    if (
      !generateAdvancedTranscription ||
      transcriptionWords.length === 0 ||
      transcriptionWordsStatus !== 'pending_save' ||
      (transcriptionWordsUrl && transcriptionWordsKey)
    ) {
      return { ok: true as const, message: '' }
    }

    try {
      const response = await fetch('/api/ai/persist-transcription-words', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          episodeId,
          words: transcriptionWords,
          audioUrl: audioUrlCompatible || audioUrl,
          episodeTitle: formData.title,
        }),
      })
      const data = (await response.json()) as PersistTranscriptionWordsResponse

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Nao foi possivel salvar timestamps avancados.')
      }

      setTranscriptionWordsUrl(data.transcription_words_url || '')
      setTranscriptionWordsKey(data.transcription_words_key || '')
      setTranscriptionWordsCount(data.transcription_words_count || transcriptionWords.length)
      setTranscriptionWordsStatus('ready')
      setTranscriptionWordsPersistWarning('')

      return {
        ok: true as const,
        message: ' Timestamps avancados salvos.',
      }
    } catch (error) {
      console.error('Erro ao persistir timestamps avancados:', error)

      const warning =
        'Episodio salvo, mas nao foi possivel salvar os timestamps avancados. Voce pode gerar novamente na Central.'

      setTranscriptionWordsStatus('error')
      setTranscriptionWordsPersistWarning(warning)

      return {
        ok: false as const,
        message: ` ${warning}`,
      }
    }
  }

  const applyAudioUploadMetadata = (data: AudioUploadResponse) => {
    const contentType = data.contentType || data.type || ''

    setUploadedAudioContentType(contentType)

    if (data.isAudioCompatible) {
      setAudioUrlCompatible(data.compatibleAudioUrl || data.url || '')
      setAudioCompatibleType(data.compatibleAudioType || contentType)
      setAudioCompatibleSizeBytes(data.sizeBytes || 0)
      setIsAudioCompatible(true)
      setAudioCompatibilityWarning('')
      return
    }

    setAudioUrlCompatible('')
    setAudioCompatibleType('')
    setIsAudioCompatible(false)
    setAudioCompatibilityWarning(
      'Este audio precisa gerar MP3 compativel abaixo de 4,5 MB antes de publicar ou agendar.'
    )
  }

  const uploadAudioDirectToR2 = async (
    file: Blob | File,
    fileName: string,
    folder = 'recordings'
  ): Promise<AudioUploadResponse> => {
    const contentType = (file.type || 'audio/webm').split(';')[0]

    const presignResponse = await fetch('/api/r2/presigned-upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName,
        contentType,
        sizeBytes: file.size,
        folder,
      }),
    })

    const presignData = (await presignResponse.json()) as PresignedUploadResponse

    if (!presignResponse.ok || !presignData.signedUrl || !presignData.publicUrl) {
      throw new Error(presignData.error || 'Erro ao preparar upload direto.')
    }

    const uploadResponse = await fetch(presignData.signedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': presignData.contentType || contentType,
      },
      body: file,
    })

    if (!uploadResponse.ok) {
      throw new Error('Erro ao enviar audio diretamente para o R2.')
    }

    return {
      url: presignData.publicUrl,
      key: presignData.key,
      type: presignData.contentType,
      contentType: presignData.contentType,
      extension: presignData.extension,
      sizeBytes: presignData.sizeBytes,
      compatibleAudioUrl: presignData.compatibleAudioUrl,
      compatibleAudioType: presignData.compatibleAudioType,
      isAudioCompatible: presignData.isAudioCompatible,
    }
  }

  const loadSeries = async () => {
    try {
      const { data, error } = await supabase
        .from('series')
        .select('id, title, cover_image_url')
        .eq('is_open', true)
        .order('created_at', { ascending: false })

      if (error) throw error

      setSeries(data || [])
    } catch (error) {
      console.error('Erro ao carregar séries:', error)
    }
  }

  const handleRecordingComplete = async (blob: Blob, duration: number) => {
    setUploading(true)

    try {
      const data = await uploadAudioDirectToR2(blob, 'recording.webm')

      if (data.url) {
        setRecordingBlob(blob)
        setAudioUrl(data.url)
        setAudioOriginalUrl(data.url)
        setAudioOriginalKey(data.key || '')
        setAudioOriginalType(data.contentType || data.type || 'audio/webm')
        setAudioCompatibleSizeBytes(0)
        setAudioDuration(Math.round(duration))
        applyAudioUploadMetadata(data)
        resetAutomationData()
        alert('Gravação enviada para armazenamento. Para publicação final, ainda será necessário gerar versão MP3 compatível.')
      } else {
        throw new Error(data.error || 'Erro ao fazer upload')
      }
    } catch (error) {
      console.error('Erro no upload:', error)
      alert('❌ Erro ao enviar gravação. Tente novamente.')
    } finally {
      setUploading(false)
    }
  }

  const handleGenerateCompatibleAudio = async () => {
    const sourceUrl = audioOriginalUrl || audioUrl

    if (!sourceUrl) {
      alert('Nenhum audio original foi encontrado para converter.')
      return
    }

    if (isGeneratingCompatibleAudio) return

    setIsGeneratingCompatibleAudio(true)

    try {
      const response = await fetch('/api/admin/audio/convert-to-mp3', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceUrl,
          sourceKey: audioOriginalKey || null,
        }),
      })
      const data = (await response.json()) as ConvertToMp3Response

      if (!response.ok || !data.success || !data.compatibleUrl) {
        const attemptsSummary = formatConversionAttempts(data.attempts)

        if (attemptsSummary) {
          console.error('Tentativas de conversao MP3:', data.attempts)
        }

        throw new Error(
          attemptsSummary
            ? `${data.error || 'Nao foi possivel converter o audio no servidor.'}\n\nTentativas:\n${attemptsSummary}`
            : data.error || 'Nao foi possivel converter o audio no servidor.'
        )
      }

      setAudioUrl(data.compatibleUrl)
      setAudioUrlCompatible(data.compatibleUrl)
      setAudioCompatibleType(data.compatibleType || 'audio/mpeg')
      setAudioCompatibleSizeBytes(data.sizeBytes || 0)
      setUploadedAudioContentType(data.compatibleType || 'audio/mpeg')
      setIsAudioCompatible(true)
      setAudioCompatibilityWarning('')
      resetAutomationData()

      const sizeMb = typeof data.sizeMb === 'number'
        ? data.sizeMb.toFixed(2)
        : ((data.sizeBytes || 0) / 1024 / 1024).toFixed(2)
      const bitrate = data.bitrate || '64k'
      const aboveLimitAttempts = (data.attempts || [])
        .filter((attempt) => attempt.sizeBytes && !attempt.withinLimit)
        .map((attempt) => attempt.bitrate)
      const attemptSummary = aboveLimitAttempts.length
        ? ` ${aboveLimitAttempts.join(', ')} ficou acima do limite; usamos ${bitrate}.`
        : ''

      alert(`MP3 compativel gerado. Qualidade: ${bitrate}. Tamanho: ${sizeMb} MB. Dentro do limite de 4,5 MB.${attemptSummary}`)
    } catch (error) {
      console.error('Erro ao gerar MP3 compativel:', error)
      alert(`A conversao no servidor falhou. A gravacao original continua disponivel.\n\n${getErrorMessage(error)}`)
    } finally {
      setIsGeneratingCompatibleAudio(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]

    if (!file) return

    setUploading(true)

    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      uploadFormData.append('type', 'audio')

      const response = await fetch('/api/upload-audio', {
        method: 'POST',
        body: uploadFormData,
      })

      const data = (await response.json()) as AudioUploadResponse

      if (data.url) {
        const compatibleMp3 = isSmallMp3Audio(data, file.size)

        setRecordingBlob(null)
        setAudioUrl(data.url)
        setAudioOriginalUrl(data.url)
        setAudioOriginalKey(data.key || '')
        setAudioOriginalType(data.contentType || data.type || file.type || '')
        setAudioCompatibleSizeBytes(compatibleMp3 ? data.sizeBytes || file.size : 0)
        setUploadedAudioContentType(data.contentType || data.type || file.type || '')

        if (compatibleMp3) {
          setAudioUrlCompatible(data.compatibleAudioUrl || data.url)
          setAudioCompatibleType('audio/mpeg')
          setIsAudioCompatible(true)
          setAudioCompatibilityWarning('')
        } else {
          setAudioUrlCompatible('')
          setAudioCompatibleType('')
          setIsAudioCompatible(false)
          setAudioCompatibilityWarning(
            'Este audio precisa gerar MP3 compativel abaixo de 4,5 MB antes de publicar ou agendar.'
          )
        }

        resetAutomationData()

        const audio = new Audio(data.url)

        audio.addEventListener('loadedmetadata', () => {
          setAudioDuration(Math.round(audio.duration))
        })

        alert('✅ Arquivo enviado com sucesso!')
      } else {
        throw new Error(data.error || 'Erro ao fazer upload')
      }
    } catch (error) {
      console.error('Erro no upload:', error)
      alert('❌ Erro ao enviar arquivo. Tente novamente.')
    } finally {
      setUploading(false)
    }
  }

  const uploadEpisodeCoverImage = async (
    file: File,
    successMessage = 'Imagem enviada e definida como capa do episodio.'
  ) => {
    if (!isAllowedCoverImage(file)) {
      throw new Error('Envie uma imagem PNG, JPG, JPEG ou WEBP.')
    }

    setUploading(true)

    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      uploadFormData.append('type', 'cover')

      const response = await fetch('/api/upload-audio', {
        method: 'POST',
        body: uploadFormData,
      })

      const data = await response.json()

      if (data.url) {
        setEpisodeImageUrl(data.url)
        setUseSeriesImage(false)
        alert(successMessage)
      } else {
        throw new Error(data.error || 'Erro ao fazer upload')
      }
    } finally {
      setUploading(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]

    if (!file) return

    try {
      await uploadEpisodeCoverImage(file)
    } catch (error) {
      console.error('Erro no upload:', error)
      alert(`Erro ao fazer upload da imagem: ${getErrorMessage(error)}`)
    }
  }

  const handlePremiumManualImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]

    if (!file) return

    try {
      await uploadEpisodeCoverImage(
        file,
        'Imagem premium enviada e definida como capa do episodio.'
      )
    } catch (error) {
      console.error('Erro no upload da imagem premium:', error)
      alert(`Erro ao enviar imagem premium: ${getErrorMessage(error)}`)
    }
  }

  const handleGenerateEpisodeThumbnails = async () => {
    const sourceText = [
      formData.title,
      formData.description,
      formData.bible_reference,
      selectedDailyQuote,
      transcriptionText.slice(0, 900),
    ]
      .filter(Boolean)
      .join('\n')
      .trim()

    if (sourceText.length < 20) {
      alert('❌ Preencha pelo menos o título, descrição ou transcrição para buscar thumbnails.')
      return
    }

    setGeneratingEpisodeThumbnails(true)

    try {
      const response = await fetch('/api/images/search-backgrounds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quoteText: sourceText,
          purpose: 'episode_thumbnail',
          visualStyle: 'devotional_landscape',
          preferredThemes: [
            'paisagem',
            'liberdade',
            'esperança',
            'amanhecer',
            'céu',
            'luz',
            'mar',
            'águas',
            'caminho',
            'jornada',
            'montanhas',
            'paz',
            'fé',
            'barco',
          ],
          avoidThemes: [
            'pessoas posando',
            'retrato',
            'negócios',
            'cidade corporativa',
            'objetos aleatórios',
            'comida',
            'tecnologia',
            'festa',
            'animais aleatórios',
          ],
        }),
      })

      const data = await response.json()

      if (!response.ok && !data.images) {
        throw new Error(data.error || 'Erro ao buscar thumbnails.')
      }

      const images = ((data.images || []) as BackgroundImage[]).slice(0, 3)

      if (!images.length) {
        throw new Error('Nenhuma imagem encontrada.')
      }

      if (hasFallbackImage({ provider: data.provider, images })) {
        setEpisodeThumbnailOptions([])
        setSelectedEpisodeThumbnailIndex(null)

        alert('Não encontrei thumbnails do Pexels para este áudio. Tente novamente, ajuste título/descrição ou envie uma imagem manualmente.')
        return
      }

      setEpisodeThumbnailOptions(images)
      setSelectedEpisodeThumbnailIndex(0)
      setEpisodeImageUrl(images[0].url)
      setUseSeriesImage(false)

      alert('✅ 3 thumbnails foram sugeridas. Escolha a melhor para o episódio.')
    } catch (error) {
      console.error('Erro ao gerar thumbnails:', error)
      alert('❌ ' + getErrorMessage(error))
    } finally {
      setGeneratingEpisodeThumbnails(false)
    }
  }

  const handleSelectEpisodeThumbnail = (image: BackgroundImage, index: number) => {
    setSelectedEpisodeThumbnailIndex(index)
    setEpisodeImageUrl(image.url)
    setUseSeriesImage(false)
  }

  const copyPromptText = async (label: string, text: string) => {
    const value = text.trim()

    if (!value) {
      alert('Nada para copiar ainda.')
      return
    }

    try {
      await navigator.clipboard.writeText(value)
      alert(`${label} copiado.`)
    } catch (error) {
      console.error('Erro ao copiar prompt:', error)
      alert('Nao foi possivel copiar automaticamente. Selecione o texto manualmente.')
    }
  }

  const getSelectedQuotePromptContext = () => {
    const selectedSuggestion =
      selectedSuggestionIndex !== null
        ? quoteSuggestions[selectedSuggestionIndex]
        : quoteSuggestions.find((suggestion) => {
            const display = getSuggestionDisplayData(suggestion)
            const selected = selectedDailyQuote.trim()

            return (
              display.quoteText === selected ||
              display.quoteText.replace(/^["'“”]+|["'“”]+$/g, '') === selected
            )
          }) || null
    const display = selectedSuggestion
      ? getSuggestionDisplayData(selectedSuggestion)
      : null

    return {
      selectedQuote: selectedDailyQuote.trim() || display?.quoteText || '',
      sourceExcerpt: display?.sourceExcerpt || '',
      reason: display?.reason || '',
      specificityReason: display?.specificityReason || '',
      useCase: display?.useCaseLabel || '',
    }
  }

  const handleGeneratePremiumImagePrompt = async () => {
    const quoteContext = getSelectedQuotePromptContext()
    const hasContext =
      formData.title.trim().length > 0 ||
      formData.description.trim().length > 0 ||
      formData.bible_reference.trim().length > 0 ||
      quoteContext.selectedQuote.length > 0 ||
      transcriptionText.trim().length > 100

    if (!hasContext) {
      alert('Preencha titulo, referencia, frase escolhida ou transcricao antes de gerar o prompt premium.')
      return
    }

    setGeneratingPremiumImagePrompt(true)

    try {
      const response = await fetch('/api/ai/generate-image-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          bibleReference: formData.bible_reference,
          description: formData.description,
          selectedQuote: quoteContext.selectedQuote,
          sourceExcerpt: quoteContext.sourceExcerpt,
          reason: quoteContext.reason,
          specificityReason: quoteContext.specificityReason,
          transcriptionText,
          format: 'episode_cover',
          includeTextOverlay: true,
        }),
      })

      const data = (await response.json()) as PremiumImagePromptResponse

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erro ao gerar prompt premium.')
      }

      setPremiumImagePrompt(data)
      alert('Prompt premium gerado. Nenhuma imagem foi criada.')
    } catch (error) {
      console.error('Erro ao gerar prompt premium:', error)
      alert(`Erro ao gerar prompt premium: ${getErrorMessage(error)}`)
    } finally {
      setGeneratingPremiumImagePrompt(false)
    }
  }

  const handleTranscribeAudio = async () => {
    if (!audioUrl) {
      alert('❌ Envie ou grave um áudio primeiro.')
      return
    }

    const transcriptionAudioUrl = getTranscriptionAudioUrl()

    if (!transcriptionAudioUrl) {
      alert(TRANSCRIPTION_COMPATIBLE_AUDIO_WARNING)
      return
    }

    setTranscribing(true)

    try {
      const response = await fetch('/api/ai/transcribe-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioUrl: transcriptionAudioUrl,
          advanced: generateAdvancedTranscription,
        }),
      })

      const data = (await response.json()) as TranscribeAudioResponse

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao transcrever áudio.')
      }

      applyTranscriptionResult(data)
      alert(`✅ ${getAdvancedTranscriptionMessage(data)}`)
    } catch (error) {
      console.error('Erro ao transcrever:', error)
      alert(`❌ ${getErrorMessage(error)}`)
    } finally {
      setTranscribing(false)
    }
  }

  const handleGenerateEpisodeMetadataFromTranscription = async (sourceText: string) => {
    const cleanedTranscription = sourceText.trim()

    if (cleanedTranscription.length < 100) {
      return null
    }

    setGeneratingEpisodeMetadata(true)

    try {
      const response = await fetch('/api/ai/generate-episode-metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcriptionText: cleanedTranscription,
          bibleReference: formData.bible_reference,
          currentTitle: formData.title,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar título e descrição.')
      }

      const generatedTitle = String(data.title || '').trim()
      const generatedDescription = String(data.description || '').trim()

      setFormData((current) => ({
        ...current,
        title: generatedTitle || current.title,
        description: generatedDescription || current.description,
      }))

      return {
        title: generatedTitle,
        description: generatedDescription,
        themeKeywords: data.theme_keywords || [],
      }
    } catch (error) {
      console.error('Erro ao gerar título e descrição:', error)
      alert('⚠️ Não consegui gerar título e descrição automaticamente. Vou continuar gerando as frases.')
      return null
    } finally {
      setGeneratingEpisodeMetadata(false)
    }
  }

  const handleGenerateDailyQuote = async () => {
    const cleanedTranscription = transcriptionText.trim()

    if (cleanedTranscription.length < 100) {
      alert('❌ A transcrição está muito curta. Gere ou cole uma transcrição maior.')
      return
    }

    setGeneratingQuote(true)

    try {
      const response = await fetch('/api/ai/generate-daily-quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcriptionText: cleanedTranscription,
          title: formData.title,
          bibleReference: formData.bible_reference,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar sugestões.')
      }

      const suggestions = (data.suggestions || []) as DailyQuoteSuggestion[]

      if (!suggestions.length) {
        throw new Error('Nenhuma sugestão foi gerada.')
      }

      setQuoteSuggestions(suggestions)
      setSelectedSuggestionIndex(0)
      setSelectedDailyQuote(suggestions[0].quote_text)
      setCorrectionNote('')
      resetCardData()

      const providerMessage =
        data.provider === 'openai'
          ? 'com IA'
          : 'com modo local'

      alert(`✅ Sugestões geradas ${providerMessage}!`)
    } catch (error) {
      console.error('Erro ao gerar Palavra do Dia:', error)
      alert(`❌ ${getErrorMessage(error)}`)
    } finally {
      setGeneratingQuote(false)
    }
  }

  const handleTranscribeAndGenerateQuote = async () => {
    if (!audioUrl) {
      alert('❌ Envie ou grave um áudio primeiro.')
      return
    }

    const transcriptionAudioUrl = getTranscriptionAudioUrl()

    if (!transcriptionAudioUrl) {
      alert(TRANSCRIPTION_COMPATIBLE_AUDIO_WARNING)
      return
    }

    setTranscribing(true)
    setGeneratingQuote(true)

    try {
      const transcribeResponse = await fetch('/api/ai/transcribe-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioUrl: transcriptionAudioUrl,
          advanced: generateAdvancedTranscription,
        }),
      })

      const transcribeData = (await transcribeResponse.json()) as TranscribeAudioResponse

      if (!transcribeResponse.ok) {
        throw new Error(transcribeData.error || 'Erro ao transcrever áudio.')
      }

      const generatedTranscription = String(
        transcribeData.transcriptionText || ''
      ).trim()

      if (generatedTranscription.length < 100) {
        throw new Error(
          'A transcrição gerada ficou muito curta. Verifique se o áudio foi enviado corretamente.'
        )
      }

      applyTranscriptionResult({
        ...transcribeData,
        transcriptionText: generatedTranscription,
      })

      const generatedMetadata = autoGenerateEpisodeMetadata
        ? await handleGenerateEpisodeMetadataFromTranscription(generatedTranscription)
        : null
      const quoteTitle = generatedMetadata?.title || formData.title

      const quoteResponse = await fetch('/api/ai/generate-daily-quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcriptionText: generatedTranscription,
          title: quoteTitle,
          bibleReference: formData.bible_reference,
        }),
      })

      const quoteData = await quoteResponse.json()

      if (!quoteResponse.ok) {
        throw new Error(quoteData.error || 'Erro ao gerar sugestões.')
      }

      const suggestions = (quoteData.suggestions || []) as DailyQuoteSuggestion[]

      if (!suggestions.length) {
        throw new Error('Nenhuma sugestão foi gerada.')
      }

      setQuoteSuggestions(suggestions)
      setSelectedSuggestionIndex(0)
      setSelectedDailyQuote(suggestions[0].quote_text)
      setCorrectionNote('')
      resetCardData()

      const providerMessage =
        quoteData.provider === 'openai'
          ? 'com IA'
          : 'com modo local'

      alert(
        '✅ Transcricao e sugestoes geradas ' +
          providerMessage +
          `! ${getAdvancedTranscriptionMessage(transcribeData)}`
      )
    } catch (error) {
      console.error('Erro no fluxo automático:', error)
      alert('❌ ' + getErrorMessage(error))
    } finally {
      setTranscribing(false)
      setGeneratingQuote(false)
    }
  }

  const handleSelectSuggestion = (suggestion: DailyQuoteSuggestion, index: number) => {
    setSelectedSuggestionIndex(index)
    setSelectedDailyQuote(suggestion.quote_text)
    setCorrectionNote('')
    resetCardData()
  }

  const handleDailyQuoteChange = (text: string) => {
    setSelectedDailyQuote(text)
    setCorrectionNote('')
    resetCardData()
  }

  const handleCorrectDailyQuote = async () => {
    const currentText = selectedDailyQuote.trim()

    if (!currentText) {
      alert('❌ Escreva ou escolha uma frase primeiro.')
      return
    }

    setCorrectingQuote(true)

    try {
      const response = await fetch('/api/ai/correct-daily-quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: currentText,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao corrigir frase.')
      }

      const correctedText = String(data.correctedText || '').trim()

      if (!correctedText) {
        throw new Error('A correção retornou uma frase vazia.')
      }

      setSelectedDailyQuote(correctedText)
      setCorrectionNote(
        data.provider === 'openai'
          ? data.notes || 'Frase revisada com IA.'
          : data.notes || 'Frase revisada com correção local.'
      )
      resetCardData()

      alert(
        data.changed
          ? '✅ Frase corrigida. Revise antes de gerar os cards.'
          : '✅ A frase já parecia correta.'
      )
    } catch (error) {
      console.error('Erro ao corrigir frase:', error)

      const correctedText = normalizeBasicPortuguese(currentText)
      setSelectedDailyQuote(correctedText)
      setCorrectionNote('A correção com IA falhou. Foi aplicada uma correção local básica.')
      resetCardData()

      alert(`⚠️ ${getErrorMessage(error)} Correção local aplicada.`)
    } finally {
      setCorrectingQuote(false)
    }
  }

  const [generatedFluxImageUrl, setGeneratedFluxImageUrl] = useState<string | null>(null)
  const [fluxRefinement, setFluxRefinement] = useState('')

  const handleGenerateCardImage = async (refinement?: string) => {
    const quoteText = selectedDailyQuote.trim()

    if (!quoteText) {
      alert('❌ Escolha ou escreva uma frase primeiro.')
      return
    }

    setGeneratingCards(true)

    try {
      const quoteContext = getSelectedQuotePromptContext()
      const contextText = [
        quoteText,
        quoteContext.sourceExcerpt,
        quoteContext.reason,
        quoteContext.specificityReason,
        formData.title,
        formData.bible_reference,
        transcriptionText.slice(0, 2000),
      ].filter(Boolean).join('\n')

      // Primeiro, gera o diagnóstico de cena com DeepSeek
      const diagnosisResponse = await fetch('/api/ai/generate-image-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          bibleReference: formData.bible_reference,
          description: formData.description,
          selectedQuote: quoteText,
          sourceExcerpt: quoteContext.sourceExcerpt,
          reason: quoteContext.reason,
          specificityReason: quoteContext.specificityReason,
          transcriptionText: transcriptionText.slice(0, 7000),
          format: 'daily_quote_card',
          includeTextOverlay: false,
        }),
      })

      const diagnosisData = await diagnosisResponse.json()

      if (!diagnosisResponse.ok || !diagnosisData.background_prompt) {
        throw new Error(diagnosisData.error || 'DeepSeek não gerou diagnóstico de cena.')
      }

      const backgroundPrompt = refinement
        ? `${diagnosisData.background_prompt} REFINEMENT: ${refinement}`
        : diagnosisData.background_prompt

      // Depois, gera a imagem com FLUX via search-backgrounds (que chama DeepSeek internamente se necessário)
      const response = await fetch('/api/images/search-backgrounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteText,
          purpose: 'daily_quote_card',
          title: formData.title,
          bibleReference: formData.bible_reference,
          sourceExcerpt: quoteContext.sourceExcerpt,
          reason: quoteContext.reason,
          specificityReason: quoteContext.specificityReason,
          useCase: quoteContext.useCase,
          transcriptionPreview: transcriptionText.slice(0, 2000),
          backgroundPrompt,
        }),
      })

      const data = await response.json()

      if (!response.ok && !data.images) {
        throw new Error(data.error || 'Erro ao gerar imagem.')
      }

      const images = ((data.images || []) as BackgroundImage[])

      if (!images.length) {
        throw new Error('Nenhuma imagem gerada.')
      }

      const imageUrl = images[0].url

      // Armazena a URL base da imagem FLUX (limpa, sem texto)
      setGeneratedFluxImageUrl(imageUrl)

      // Cria 3 opções de card com overlays CSS (não Canvas)
      const options: CardOption[] = CARD_TEMPLATES.map((template, index) => ({
        id: `${template.template}-${Date.now()}-${index}`,
        template: template.template,
        label: template.label,
        source_image_url: imageUrl,
        source_image_provider: 'flux',
        theme_keywords: data.theme_keywords || [],
        preview_data_url: imageUrl, // URL base — overlay é aplicado via CSS
        quote_background_id: data.images?.[0]?.quote_background_id || null,
      }))

      setCardOptions(options)
      setSelectedCardIndex(0)
      setFluxRefinement('')
      alert(refinement
        ? '✅ Imagem regenerada com refinamento!'
        : '✅ Imagem gerada com sucesso! Escolha o estilo de card.')
    } catch (error) {
      console.error('Erro ao gerar imagem:', error)
      alert(`❌ ${getErrorMessage(error)}`)
    } finally {
      setGeneratingCards(false)
    }
  }

  const uploadGeneratedCard = async (dataUrl: string) => {
    const blob = dataUrlToBlob(dataUrl)
    const uploadFormData = new FormData()

    uploadFormData.append(
      'file',
      blob,
      `palavra-do-dia-${Date.now()}.png`
    )
    uploadFormData.append('type', 'cover')

    const response = await fetch('/api/upload-audio', {
      method: 'POST',
      body: uploadFormData,
    })

    const data = await response.json()

    if (!response.ok || !data.url) {
      throw new Error(data.error || 'Erro ao salvar card no R2.')
    }

    return data.url as string
  }

  const handleSaveToRepository = async () => {
    const safeEpisodeNumber =
      Number.isFinite(Number(formData.episode_number)) &&
      Number(formData.episode_number) > 0
        ? Number(formData.episode_number)
        : 1

    if (!formData.series_id || !formData.bible_reference || !formData.title) {
      alert('Preencha todos os campos obrigatórios.')
      return
    }

    if (!audioUrl) {
      alert('Grave ou faça upload do áudio antes de salvar no repositório.')
      return
    }

    setSavingToRepository(true)

    try {
      const finalImageUrl = useSeriesImage ? null : episodeImageUrl || null
      const hasTranscription = transcriptionText.trim().length > 0
      const hasQuoteSuggestions = quoteSuggestions.length > 0

      const { data: newEpisode, error } = await supabase
        .from('episodes')
        .insert([
          {
            series_id: formData.series_id,
            episode_number: safeEpisodeNumber,
            bible_reference: formData.bible_reference,
            title: formData.title,
            description: formData.description,
            audio_url: audioUrl,
            audio_original_url: audioOriginalUrl || audioUrl,
            audio_original_type: audioOriginalType || uploadedAudioContentType || null,
            audio_url_compatible: audioUrlCompatible || null,
            audio_compatible_type: audioCompatibleType || null,
            duration_seconds: audioDuration,
            cover_image_url: finalImageUrl,
            status: 'draft',
            editorial_status: 'repository',
            calendar_scheduled_at: null,
            internal_notes: null,

            transcription_text: hasTranscription ? transcriptionText.trim() : null,
            transcription_segments:
              hasTranscription && transcriptionSegments.length > 0
                ? transcriptionSegments
                : null,
            transcription_status: hasTranscription ? 'completed' : 'not_started',
            transcription_error: null,
            transcription_generated_at: hasTranscription ? new Date().toISOString() : null,

            daily_quote_status: 'not_started',
            daily_quote_suggestions: hasQuoteSuggestions ? quoteSuggestions : null,
            daily_quote_generated_at: hasQuoteSuggestions ? new Date().toISOString() : null,
          },
        ])
        .select('id')
        .single()

      if (error) throw error

      if (!newEpisode?.id) {
        throw new Error('Episódio salvo no repositório sem ID retornado.')
      }

      const wordsPersistence = await persistPendingTranscriptionWords(newEpisode.id)

      if (!wordsPersistence.ok) {
        console.warn('Episódio salvo no repositório, mas houve aviso na transcrição:', wordsPersistence.message)
      }

      alert('Episódio salvo no repositório. Ele ainda não está público.')
      router.push('/admin')
    } catch (error) {
      console.error('Erro ao salvar episódio no repositório:', error)
      alert('Não foi possível salvar no repositório. Revise os dados e tente novamente.')
    } finally {
      setSavingToRepository(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    const safeEpisodeNumber =
      Number.isFinite(Number(formData.episode_number)) &&
      Number(formData.episode_number) > 0
        ? Number(formData.episode_number)
        : 1

    if (!formData.series_id || !formData.bible_reference || !formData.title) {
      alert('❌ Preencha todos os campos obrigatórios!')
      return
    }

    if (formData.status === 'published' && !audioUrl) {
      alert('❌ Grave ou faça upload do áudio antes de publicar!')
      return
    }

    if (formData.scheduled_date && !audioUrl) {
      alert('❌ Grave ou faça upload do áudio antes de agendar!')
      return
    }

    let scheduledPublishAt: string | null = null

    if (formData.scheduled_date) {
      const time = useDefaultTime ? '06:00' : formData.scheduled_time
      const scheduledDateTime = getScheduledDateTime(formData.scheduled_date, time)

      if (scheduledDateTime <= new Date()) {
        alert('Escolha um horário futuro para agendar a publicação.')
        return
      }

      scheduledPublishAt = scheduledDateTime.toISOString()
    }

    if (audioUrl && !audioUrlCompatible && (formData.status !== 'draft' || scheduledPublishAt)) {
      alert('Para publicar ou agendar, gere um MP3 compativel abaixo de 4,5 MB.')
      return
    }

    if (enableDailyQuote && selectedDailyQuote.trim().length > 0 && selectedDailyQuote.trim().length < 20) {
      alert('❌ A Palavra do Dia está muito curta.')
      return
    }

    setLoading(true)

    try {
      const finalImageUrl = useSeriesImage ? null : episodeImageUrl || null

      const hasTranscription = transcriptionText.trim().length > 0
      const hasQuoteSuggestions = quoteSuggestions.length > 0
      const hasDailyQuote = enableDailyQuote && selectedDailyQuote.trim().length > 0

      const { data: newEpisode, error } = await supabase
        .from('episodes')
        .insert([
          {
            series_id: formData.series_id,
            episode_number: safeEpisodeNumber,
            bible_reference: formData.bible_reference,
            title: formData.title,
            description: formData.description,
            audio_url: audioUrl || null,
            audio_original_url: audioOriginalUrl || audioUrl || null,
            audio_original_type: audioOriginalType || uploadedAudioContentType || null,
            audio_url_compatible: audioUrlCompatible || null,
            audio_compatible_type: audioCompatibleType || null,
            duration_seconds: audioDuration,
            cover_image_url: finalImageUrl,
            status: scheduledPublishAt ? 'scheduled' : formData.status,
            scheduled_publish_at: scheduledPublishAt,

            transcription_text: hasTranscription ? transcriptionText.trim() : null,
            transcription_segments:
              hasTranscription && transcriptionSegments.length > 0
                ? transcriptionSegments
                : null,
            transcription_status: hasTranscription ? 'completed' : 'not_started',
            transcription_error: null,
            transcription_generated_at: hasTranscription ? new Date().toISOString() : null,

            daily_quote_status: hasDailyQuote ? 'completed' : 'not_started',
            daily_quote_suggestions: hasQuoteSuggestions ? quoteSuggestions : null,
            daily_quote_generated_at: hasQuoteSuggestions ? new Date().toISOString() : null,
          },
        ])
        .select('id')
        .single()

      if (error) throw error

      if (!newEpisode?.id) {
        throw new Error('Episodio criado sem ID retornado.')
      }

      const wordsPersistence = await persistPendingTranscriptionWords(newEpisode.id)

      if (hasDailyQuote && newEpisode?.id) {
        const selectedCard =
          selectedCardIndex !== null
            ? cardOptions[selectedCardIndex]
            : null

        let finalCardImageUrl: string | null = null

        const selectedCardHasFallback = isFallbackSource(selectedCard)
        const safeCardOptions = cardOptions.filter((option) => !isFallbackSource(option))
        const safeSelectedCardSourceUrl = selectedCardHasFallback
          ? null
          : selectedCard?.source_image_url || null
        const safeSelectedCardSourceProvider = selectedCardHasFallback
          ? null
          : selectedCard?.source_image_provider || null

        if (selectedCard?.preview_data_url && !selectedCardHasFallback) {
          finalCardImageUrl = await uploadGeneratedCard(selectedCard.preview_data_url)
        }

        const quoteStatus = scheduledPublishAt
          ? 'scheduled'
          : formData.status === 'published'
          ? 'published'
          : 'draft'

        const quoteDate = formData.scheduled_date || getLocalDateString()

        const generatedCardOptionsForDb = safeCardOptions.map((option) => ({
          id: option.id,
          template: option.template,
          label: option.label,
          source_image_url: option.source_image_url,
          source_image_provider: option.source_image_provider,
          theme_keywords: option.theme_keywords,
          photographer: option.photographer || null,
          photographer_url: option.photographer_url || null,
          source_page_url: option.source_page_url || null,
          quote_background_id: option.quote_background_id || null,
          pexels_photo_id: option.pexels_photo_id || null,
          query_used: option.query_used || null,
        }))

        const quotePayload = {
          episode_id: newEpisode.id,
          quote_text: selectedDailyQuote.trim(),
          background_image_url:
            safeSelectedCardSourceUrl || finalImageUrl || selectedSeriesImage || null,
          card_image_url: finalCardImageUrl,
          date: quoteDate,
          status: quoteStatus,
          scheduled_publish_at: scheduledPublishAt,
          published_at: quoteStatus === 'published' ? new Date().toISOString() : null,
          source_type: hasQuoteSuggestions ? 'ai_suggested' : 'manual',
          ai_suggestions: hasQuoteSuggestions ? quoteSuggestions : null,
          selected_suggestion_index: selectedSuggestionIndex,
          share_count: 0,
          like_count: 0,

          theme_keywords: selectedCard?.theme_keywords || null,
          source_image_provider: safeSelectedCardSourceProvider,
          source_image_url: safeSelectedCardSourceUrl,
          selected_template: selectedCard?.template || null,
          generated_card_options:
            generatedCardOptionsForDb.length > 0 ? generatedCardOptionsForDb : null,
          card_generation_status: finalCardImageUrl
            ? 'completed'
            : generatedCardOptionsForDb.length > 0
            ? 'completed'
            : 'not_started',
          card_generation_error: null,
          card_generated_at: finalCardImageUrl ? new Date().toISOString() : null,
          quote_background_id: selectedCard?.quote_background_id || null,
        }

        const { data: existingDailyQuote, error: existingDailyQuoteError } = await supabase
          .from('daily_quotes')
          .select('id, date, quote_text')
          .eq('date', quoteDate)
          .maybeSingle()

        if (existingDailyQuoteError) throw existingDailyQuoteError

        if (existingDailyQuote?.id) {
          const shouldReplace = window.confirm(
            'Já existe uma Palavra do Dia para esta data. Deseja substituir pela nova?'
          )

          if (!shouldReplace) {
            throw new Error('Publicação cancelada: já existe uma Palavra do Dia para esta data.')
          }

          const { error: updateQuoteError } = await supabase
            .from('daily_quotes')
            .update(quotePayload)
            .eq('id', existingDailyQuote.id)

          if (updateQuoteError) throw updateQuoteError
        } else {
          const { error: quoteError } = await supabase
            .from('daily_quotes')
            .insert([quotePayload])

          if (quoteError) {
            if (quoteError.code === '23505') {
              const shouldReplaceAfterConflict = window.confirm(
                'Já existe uma Palavra do Dia para esta data. Deseja substituir pela nova?'
              )

              if (!shouldReplaceAfterConflict) {
                throw new Error('Publicação cancelada: já existe uma Palavra do Dia para esta data.')
              }

              const { error: updateQuoteAfterConflictError } = await supabase
                .from('daily_quotes')
                .update(quotePayload)
                .eq('date', quoteDate)

              if (updateQuoteAfterConflictError) throw updateQuoteAfterConflictError
            } else {
              throw quoteError
            }
          }
        }
      }

      // Auto-generate WhatsApp share image for the daily quote
      let shareImageMessage = ''

      if (hasDailyQuote) {
        try {
          // Fetch the daily quote ID that was just saved
          const { data: savedQuote } = await supabase
            .from('daily_quotes')
            .select('id')
            .eq('episode_id', newEpisode.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (savedQuote?.id) {
            const shareImageResponse = await fetch(
              `/api/admin/daily-quotes/${savedQuote.id}/generate-share-image`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
              }
            )

            const shareImageResult = await shareImageResponse.json()

            if (shareImageResponse.ok && shareImageResult.share_image_url) {
              shareImageMessage = ' Preview WhatsApp da Palavra do Dia gerado.'
            } else {
              shareImageMessage = ' Palavra salva, mas preview WhatsApp usará fallback dinâmico.'
            }
          }
        } catch (error) {
          shareImageMessage = ' Palavra salva, mas preview WhatsApp usará fallback dinâmico.'
          console.error('Erro ao gerar share image automaticamente:', error)
        }
      }

      const message = scheduledPublishAt
        ? hasDailyQuote
          ? `✅ Episódio e Palavra do Dia agendados para ${new Date(scheduledPublishAt).toLocaleString('pt-BR')}!${shareImageMessage}`
          : `✅ Episódio agendado para ${new Date(scheduledPublishAt).toLocaleString('pt-BR')}!`
        : formData.status === 'published'
        ? hasDailyQuote
          ? `✅ Episódio e Palavra do Dia publicados com sucesso!${shareImageMessage}`
          : '✅ Episódio publicado com sucesso!'
        : hasDailyQuote
        ? `✅ Rascunho salvo com Palavra do Dia!${shareImageMessage}`
        : '✅ Rascunho salvo com sucesso!'

      alert(`${message}${wordsPersistence.message}`)
      router.push('/admin')
    } catch (error) {
      console.error('Erro ao criar episódio:', error)
      alert(`❌ Erro ao criar episódio: ${getErrorMessage(error)}`)
    } finally {
      setLoading(false)
    }
  }

  const selectedTime = useDefaultTime ? '06:00' : formData.scheduled_time
  const selectedScheduledDateTime = formData.scheduled_date
    ? getScheduledDateTime(formData.scheduled_date, selectedTime)
    : null
  const isScheduledInPast =
    selectedScheduledDateTime !== null && selectedScheduledDateTime <= new Date()
  const scheduledPreview = selectedScheduledDateTime
    ? selectedScheduledDateTime.toLocaleString('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'America/Sao_Paulo',
      })
    : ''

  const setTomorrowMorningSchedule = () => {
    const tomorrow = new Date()

    tomorrow.setDate(tomorrow.getDate() + 1)
    setUseDefaultTime(true)
    setFormData({
      ...formData,
      scheduled_date: getLocalDateStringFromDate(tomorrow),
      scheduled_time: '06:00',
    })
  }

  const setTodayInFifteenMinutesSchedule = () => {
    const nextSlot = getRoundedFutureDateTime(15)

    setUseDefaultTime(false)
    setFormData({
      ...formData,
      scheduled_date: getLocalDateStringFromDate(nextSlot),
      scheduled_time: getLocalTimeStringFromDate(nextSlot),
    })
  }

  return (
    <div className="admin-new-episode-page min-h-screen bg-slate-950">
      <div className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-4xl mx-auto p-6">
          <Link href="/admin" className="text-slate-400 hover:text-white mb-3 inline-block text-sm">
            ← Voltar
          </Link>

          <h1 className="text-2xl font-bold text-white">🎙️ Novo Episódio</h1>

          <p className="text-slate-400 text-sm mt-1">
            Publicar ou agendar devocional com Palavra do Dia automática
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-5">
        <div className="flex gap-2 mb-5">
          <button
            type="button"
            onClick={() => setActiveTab('record')}
            className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
              activeTab === 'record'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            🎙️ Gravar Agora
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
              activeTab === 'upload'
                ? 'bg-yellow-500 text-white'
                : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            📁 Upload de Arquivo
          </button>
        </div>

        {activeTab === 'record' ? (
          <div className="bg-red-600 rounded-xl p-6 mb-5 text-center shadow-lg">
            <AudioRecorder onRecordingComplete={handleRecordingComplete} />

            <p className="text-sm text-white mt-3">
              Audios gravados direto no navegador podem ficar em WEBM. Para publicacao final, gere um MP3 compativel abaixo de 4,5 MB.
            </p>

            {uploading && (
              <p className="text-sm text-white/80 mt-3">
                ⏳ Enviando gravação...
              </p>
            )}

            {isGeneratingCompatibleAudio && (
              <p className="text-sm text-white/80 mt-3">
                Convertendo MP3 no servidor...
              </p>
            )}

            {audioUrl && (
              <div className="mt-4">
                <audio src={audioUrl} controls className="w-full" />
                {isAudioCompatible ? (
                  <p className="text-sm text-green-300 mt-2">
                    Formato compatível para iPhone/Safari.
                  </p>
                ) : audioCompatibilityWarning ? (
                  <p className="text-sm text-yellow-300 mt-2">
                    {audioCompatibilityWarning}
                  </p>
                ) : null}
                <p className="text-sm text-white mt-2">✅ Áudio carregado!</p>
              </div>
            )}

            {audioUrl && !audioUrlCompatible && (
              <div className="mt-4 space-y-3">
                <button
                  type="button"
                  onClick={handleGenerateCompatibleAudio}
                  disabled={uploading || isGeneratingCompatibleAudio}
                  className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {isGeneratingCompatibleAudio
                    ? 'Convertendo MP3 no servidor...'
                    : 'Gerar MP3 compatível para publicação'}
                </button>

                <a
                  href={audioOriginalUrl || audioUrl}
                  download="gravacao-original.webm"
                  className="inline-block text-sm text-white underline hover:text-green-100"
                >
                  Baixar gravação original
                </a>
              </div>
            )}

            {audioCompatibleSizeBytes > 0 && activeTab === 'record' && (
              <p className="text-xs text-green-200 mt-2">
                MP3 compatível: {(audioCompatibleSizeBytes / 1024 / 1024).toFixed(2)} MB
              </p>
            )}
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-5">
            <label className="block">
              <span className="text-sm font-semibold text-slate-300 mb-2 block">
                Selecione o arquivo de áudio
              </span>

              <input
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                disabled={uploading}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 focus:border-blue-500 outline-none disabled:opacity-50"
              />
            </label>

            {uploading && (
              <p className="text-sm text-slate-400 mt-2">
                ⏳ Enviando arquivo...
              </p>
            )}

            {audioUrl && (
              <div className="mt-4">
                <audio src={audioUrl} controls className="w-full" />
                {isAudioCompatible ? (
                  <p className="text-sm text-green-300 mt-2">
                    Formato compatível para iPhone/Safari.
                  </p>
                ) : audioCompatibilityWarning ? (
                  <p className="text-sm text-yellow-300 mt-2">
                    {audioCompatibilityWarning}
                  </p>
                ) : null}
                <p className="text-sm text-green-400 mt-2">✅ Áudio carregado!</p>
              </div>
            )}

            {audioUrl && !audioUrlCompatible && (
              <div className="mt-4 space-y-3">
                <button
                  type="button"
                  onClick={handleGenerateCompatibleAudio}
                  disabled={uploading || isGeneratingCompatibleAudio}
                  className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {isGeneratingCompatibleAudio
                    ? 'Convertendo MP3 no servidor...'
                    : 'Gerar MP3 compativel para publicacao'}
                </button>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
          <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-3">
            📝 Informações
          </h3>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Série *
            </label>

            <select
              value={formData.series_id}
              onChange={(e) => setFormData({ ...formData, series_id: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 focus:border-blue-500 outline-none"
              required
            >
              <option value="">Selecione a série...</option>

              {series.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Episódio Nº *
            </label>

            <input
              type="number"
              min="1"
              value={
                Number.isFinite(Number(formData.episode_number))
                  ? formData.episode_number
                  : 1
              }
              onChange={(e) => {
                const value = Number(e.target.value)

                setFormData({
                  ...formData,
                  episode_number: Number.isFinite(value) && value > 0 ? value : 1,
                })
              }}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 focus:border-blue-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Referência Bíblica *
            </label>

            <input
              type="text"
              value={formData.bible_reference}
              onChange={(e) => setFormData({ ...formData, bible_reference: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 focus:border-blue-500 outline-none"
              placeholder="Ex: João 11:17-27"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Título do Episódio *
            </label>

            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 focus:border-blue-500 outline-none"
              placeholder="Ex: Eu sou a ressurreição e a vida"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Descrição (opcional)
            </label>

            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 focus:border-blue-500 outline-none"
              rows={3}
              placeholder="Resumo do devocional..."
            />
          </div>

          <div className="border-t border-slate-800 pt-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h4 className="text-sm font-semibold text-slate-300">
                  ✨ Palavra do Dia automática
                </h4>

                <p className="text-xs text-slate-500 mt-1">
                  Transcreva o áudio, gere frases fortes e crie 3 cards prontos para escolher.
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableDailyQuote}
                  onChange={(e) => setEnableDailyQuote(e.target.checked)}
                />

                <span className="text-sm text-slate-300">Ativar</span>
              </label>
            </div>

            {enableDailyQuote && (
              <div className="space-y-4 bg-slate-950 border border-slate-800 rounded-xl p-4">
                <div className="bg-blue-950/40 border border-blue-900/60 rounded-lg p-3">
                  <p className="text-xs text-blue-100 leading-relaxed">
                    Fluxo recomendado: envie o áudio → transcreva → gere título/descrição → gere frases → escolha a frase → corrija se necessário → gere 3 cards → escolha o card final.
                  </p>
                </div>

                <label className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-900/70 p-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoGenerateEpisodeMetadata}
                    onChange={(e) => setAutoGenerateEpisodeMetadata(e.target.checked)}
                    className="mt-1"
                  />

                  <div>
                    <p className="text-sm font-semibold text-slate-200">
                      Gerar título e descrição automaticamente
                    </p>

                    <p className="text-xs text-slate-500 mt-1">
                      Use nos áudios novos do dia. Para séries antigas com título pronto, desmarque esta opção.
                    </p>

                    {generatingEpisodeMetadata && (
                      <p className="text-xs text-blue-300 mt-2">
                        ⏳ Gerando título e descrição...
                      </p>
                    )}
                  </div>
                </label>

                <label className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-900/70 p-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={generateAdvancedTranscription}
                    onChange={(e) => setGenerateAdvancedTranscription(e.target.checked)}
                    className="mt-1"
                  />

                  <div>
                    <p className="text-sm font-semibold text-slate-200">
                      Gerar transcricao avancada para Central/Shorts
                    </p>

                    <p className="text-xs text-slate-500 mt-1">
                      Gera segmentos para o player e palavras com timestamps para cortes e legendas sincronizadas.
                    </p>
                  </div>
                </label>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleTranscribeAudio}
                    disabled={!audioUrl || transcribing}
                    className="flex-1 bg-purple-600 text-white font-bold py-3 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    {transcribing ? '⏳ Transcrevendo...' : '🎧 Transcrever áudio'}
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerateDailyQuote}
                    disabled={transcriptionText.trim().length < 100 || generatingQuote}
                    className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    {generatingQuote ? '⏳ Gerando...' : '✨ Gerar frases'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleTranscribeAndGenerateQuote}
                  disabled={!audioUrl || transcribing || generatingQuote || generatingEpisodeMetadata}
                  className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {transcribing || generatingQuote
                    ? '⏳ Processando áudio, título e frases...'
                    : '🚀 Transcrever e gerar frases'}
                </button>

                {!audioUrl && (
                  <p className="text-xs text-yellow-400">
                    Envie ou grave um áudio para liberar a transcrição automática.
                  </p>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Transcrição do áudio
                  </label>

                  <textarea
                    value={transcriptionText}
                    onChange={(e) => setTranscriptionText(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 focus:border-purple-500 outline-none"
                    rows={6}
                    placeholder="A transcrição automática aparecerá aqui. Você também pode colar uma transcrição manualmente..."
                  />

                  <p className="text-xs text-slate-500 mt-1">
                    Caracteres: {transcriptionText.trim().length}
                  </p>

                  {transcriptionWordsStatus !== 'missing' && (
                    <p className="text-xs text-cyan-300 mt-2">
                      {transcriptionWordsStatus === 'error'
                        ? transcriptionWordsPersistWarning || 'Nao foi possivel salvar os timestamps avancados.'
                        : transcriptionWordsStatus === 'ready'
                        ? `Transcricao avancada salva: ${transcriptionWordsCount} palavras com timestamps.`
                        : `Transcricao avancada gerada: ${transcriptionWordsCount} palavras com timestamps. Words pendentes de salvamento ate o episodio ser salvo.`}
                    </p>
                  )}
                </div>

                {quoteSuggestions.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-3">
                      Sugestões geradas
                    </label>

                    <div className="space-y-3">
                      {quoteSuggestions.map((suggestion, index) => {
                        const display = getSuggestionDisplayData(suggestion)

                        return (
                          <button
                            key={`${display.quoteText}-${index}`}
                            type="button"
                            onClick={() => handleSelectSuggestion(display.suggestion, index)}
                            className={`w-full text-left rounded-xl p-4 border transition-colors ${
                              selectedSuggestionIndex === index
                                ? 'bg-blue-600/20 border-blue-500'
                                : 'bg-slate-800 border-slate-700 hover:border-slate-500'
                            }`}
                          >
                          <div className="flex items-start gap-3">
                            <div className={`mt-1 w-5 h-5 rounded-full border flex items-center justify-center ${
                              selectedSuggestionIndex === index
                                ? 'border-blue-400 bg-blue-500'
                                : 'border-slate-500'
                            }`}>
                              {selectedSuggestionIndex === index && (
                                <div className="w-2 h-2 bg-white rounded-full" />
                              )}
                            </div>

                            <div className="flex-1 space-y-3">
                              <p className="text-white font-semibold leading-relaxed">
                                {formatQuoteTextForDisplay(display.quoteText)}
                              </p>

                              <div className="flex flex-wrap gap-2">
                                {display.useCaseLabel && (
                                  <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-100">
                                    Uso sugerido: {display.useCaseLabel}
                                  </span>
                                )}

                                {display.score !== null && (
                                  <span className="rounded-full border border-blue-400/30 bg-blue-500/10 px-2.5 py-1 text-[11px] font-semibold text-blue-100">
                                    Forca devocional: {display.score}/10
                                  </span>
                                )}
                              </div>

                              {display.reason && (
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                    Por que funciona
                                  </p>
                                  <p className="mt-1 text-xs leading-relaxed text-slate-300">
                                    {display.reason}
                                  </p>
                                </div>
                              )}

                              <div className="rounded-lg border border-slate-700/80 bg-slate-950/45 p-3">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                  Trecho-base
                                </p>
                                <p className="mt-1 text-xs leading-relaxed text-slate-300">
                                  {display.sourceExcerpt || 'Trecho-base nao informado.'}
                                </p>
                              </div>

                              {display.specificityReason && (
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                    Ligacao com o episodio
                                  </p>
                                  <p className="mt-1 text-xs leading-relaxed text-slate-300">
                                    {display.specificityReason}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <label className="block text-sm font-semibold text-slate-300">
                      Frase escolhida para a Palavra do Dia
                    </label>

                    <button
                      type="button"
                      onClick={handleCorrectDailyQuote}
                      disabled={!selectedDailyQuote.trim() || correctingQuote}
                      className="rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1.5 text-xs font-bold text-blue-100 hover:bg-blue-500/20 disabled:opacity-50"
                    >
                      {correctingQuote ? '⏳ Corrigindo...' : '✨ Corrigir frase'}
                    </button>
                  </div>

                  <textarea
                    value={selectedDailyQuote}
                    onChange={(e) => handleDailyQuoteChange(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 focus:border-blue-500 outline-none"
                    rows={3}
                    placeholder="Escolha uma sugestão ou escreva a frase final..."
                  />

                  {correctionNote && (
                    <p className="text-xs text-blue-300 mt-2">
                      {correctionNote}
                    </p>
                  )}

                  <p className="text-xs text-slate-500 mt-1">
                    Se editar ou corrigir a frase, gere os cards novamente para atualizar o visual.
                  </p>
                </div>

                {selectedDailyQuote && (
                  <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-blue-300 font-semibold mb-3">
                      Preview textual
                    </p>

                    <blockquote className="text-lg text-white font-semibold leading-relaxed">
                      {formatQuoteTextForDisplay(selectedDailyQuote)}
                    </blockquote>

                    <div className="mt-4 pt-3 border-t border-slate-800">
                      <p className="text-blue-200 text-sm font-medium">
                        {formData.bible_reference || 'Referência bíblica'}
                      </p>

                      <p className="text-slate-400 text-sm mt-1">
                        {formData.title || 'Título do episódio'}
                      </p>

                      {formData.scheduled_date && (
                        <p className="text-green-300 text-xs mt-2">
                          Programada para {formData.scheduled_date} às {selectedTime}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="border-t border-slate-800 pt-4">
                  <div className="mb-3">
                    <h5 className="text-sm font-bold text-white">
                      🖼️ Cards prontos
                    </h5>

                    <p className="text-xs text-slate-500 mt-1">
                      O sistema vai buscar imagens e montar 3 opções já com a frase aplicada.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleGenerateCardImage()}
                    disabled={!selectedDailyQuote.trim() || generatingCards}
                    className="w-full bg-amber-500 text-slate-950 font-bold py-3 rounded-lg hover:bg-amber-400 transition-colors disabled:opacity-50"
                  >
                    {generatingCards ? '⏳ Gerando imagem...' : '🎨 Gerar Imagem Base (FLUX)'}
                  </button>

                  {generatedFluxImageUrl && (
                    <div className="mt-4 space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={fluxRefinement}
                          onChange={(e) => setFluxRefinement(e.target.value)}
                          placeholder="Refinamento manual (ex: mais tempestade, menos luz, close no rosto...)"
                          className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleGenerateCardImage(fluxRefinement)}
                          disabled={!fluxRefinement.trim() || generatingCards}
                          className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
                        >
                          Regenerar
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Descreva o ajuste visual desejado e clique em "Regenerar". A IA refará a imagem com sua instrução.
                      </p>
                    </div>
                  )}

                  {cardOptions.length > 0 && generatedFluxImageUrl && (
                    <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                      {cardOptions.map((option, index) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setSelectedCardIndex(index)}
                          className={`relative overflow-hidden rounded-2xl border-2 text-left transition-all ${
                            selectedCardIndex === index
                              ? 'border-amber-400 scale-[1.02]'
                              : 'border-slate-700 hover:border-slate-500'
                          }`}
                        >
                          {/* Overlay CSS aplicado sobre a imagem base do FLUX */}
                          <div className="relative aspect-square w-full overflow-hidden bg-slate-900">
                            <img
                              src={generatedFluxImageUrl}
                              alt={option.label}
                              className="absolute inset-0 h-full w-full object-cover"
                            />
                            {/* Gradiente de fundo sutil sobre a imagem */}
                            <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/60" />

                            {/* Sanduíche Visual: Header (topo) · Body (centro) · Footer (base) */}
                            <div className="absolute inset-0 flex flex-col justify-between">
                              {/* ── Header: PALAVRA DO DIA ── */}
                              <div className={`pt-5 ${
                                option.template === 'devotional' ? 'text-center' :
                                option.template === 'modern' ? 'text-left pl-5' :
                                'text-center'
                              }`}>
                                <p className={`inline-block font-black uppercase tracking-[0.2em] ${
                                  option.template === 'devotional' ? 'text-[10px] text-blue-200/90' :
                                  option.template === 'modern' ? 'text-[9px] text-blue-200/85' :
                                  'text-[10px] text-white/80'
                                }`}>
                                  PALAVRA DO DIA
                                </p>
                                <div className={`mt-1.5 border-t ${
                                  option.template === 'devotional' ? 'mx-auto w-12 border-blue-300/30' :
                                  option.template === 'modern' ? 'w-10 border-blue-300/25' :
                                  'mx-auto w-10 border-white/20'
                                }`} />
                              </div>

                              {/* ── Body: Frase central ── */}
                              <div className={`flex-1 flex items-center px-4 ${
                                option.template === 'devotional' ? 'justify-center text-center' :
                                option.template === 'modern' ? 'justify-start text-left' :
                                'justify-center text-center'
                              }`}>
                                <div className={`w-full ${
                                  option.template === 'devotional' ? 'max-w-[85%]' :
                                  option.template === 'modern' ? 'max-w-[72%]' :
                                  'max-w-[80%]'
                                }`}>
                                  <p className={`font-bold leading-[1.2] ${
                                    option.template === 'devotional' ? 'font-[Georgia,serif] text-white/96' :
                                    option.template === 'modern' ? 'font-[Arial,sans-serif] text-white/98' :
                                    'font-[Arial,sans-serif] text-white/98'
                                  }`} style={{
                                    fontSize: option.template === 'devotional' ? 'clamp(0.75rem,2.2vw,1.15rem)' :
                                              option.template === 'modern' ? 'clamp(0.7rem,2vw,1.05rem)' :
                                              'clamp(0.7rem,2.1vw,1.1rem)',
                                    textShadow: '0 2px 10px rgba(0,0,0,0.8), 0 1px 4px rgba(0,0,0,0.95)',
                                  }}>
                                    {formatQuoteTextForDisplay(selectedDailyQuote)}
                                  </p>
                                </div>
                              </div>

                              {/* ── Footer: Referência + Assinatura ── */}
                              <div className={`pb-5 ${
                                option.template === 'devotional' ? 'text-center' :
                                option.template === 'modern' ? 'text-left pl-5' :
                                'text-center'
                              }`}>
                                <div className={`mb-2 border-t ${
                                  option.template === 'devotional' ? 'mx-auto w-12 border-white/20' :
                                  option.template === 'modern' ? 'w-10 border-white/15' :
                                  'mx-auto w-10 border-white/20'
                                }`} />
                                <p className="font-bold text-white/85" style={{
                                  fontSize: 'clamp(0.5rem,1.2vw,0.7rem)',
                                  textShadow: '0 1px 5px rgba(0,0,0,0.8)',
                                }}>
                                  {formData.bible_reference || 'Devocional'}
                                </p>
                                <p className="mt-0.5 font-semibold text-white/55" style={{
                                  fontSize: 'clamp(0.4rem,0.9vw,0.6rem)',
                                  textShadow: '0 1px 4px rgba(0,0,0,0.7)',
                                }}>
                                  Pr. Djeone Martins
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="bg-slate-900 p-3">
                            <p className="text-sm font-bold text-white">
                              {option.label}
                            </p>
                            <p className={`text-xs font-semibold mt-1 ${
                              selectedCardIndex === index ? 'text-amber-300' : 'text-slate-500'
                            }`}>
                              {selectedCardIndex === index ? '✅ Escolhido' : 'Clique para escolher'}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedDailyQuote && cardOptions.length === 0 && !generatingCards && (
                    <p className="text-xs text-slate-500 mt-3">
                      Clique em "Gerar Imagem Base" para o FLUX criar uma arte conceitual exclusiva. Depois escolha o estilo de card.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-800 pt-5">
            <h4 className="text-sm font-semibold text-slate-300 mb-3">
              🖼️ Capa do Episódio (FLUX Schnell)
            </h4>

            <div className="space-y-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Gera a capa do episódio com IA (FLUX Schnell). O sistema usa o diagnóstico profundo de cena via DeepSeek para criar uma arte cinematográfica exclusiva.
                </p>

                <button
                  type="button"
                  onClick={handleGeneratePremiumImagePrompt}
                  disabled={generatingPremiumImagePrompt}
                  className="mt-4 w-full rounded-lg bg-indigo-600 py-3 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
                >
                  {generatingPremiumImagePrompt
                    ? 'Gerando capa premium...'
                    : '🎬 Gerar Capa do Episódio (Premium)'}
                </button>

                {premiumImagePrompt && (
                  <div className="mt-4 space-y-4">
                    {premiumImagePrompt.warning && (
                      <p className="text-xs leading-relaxed text-indigo-100">
                        {premiumImagePrompt.warning}
                      </p>
                    )}

                    {premiumImagePrompt.flux_image_url && (
                      <div className="mt-3">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Capa gerada
                        </p>
                        <div className="relative overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
                          <img
                            src={premiumImagePrompt.flux_image_url}
                            alt="Capa do episódio"
                            className="aspect-video w-full object-cover"
                          />
                          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-3 bg-gradient-to-t from-black/70 via-black/40 to-transparent p-4 pt-10">
                            <button
                              type="button"
                              onClick={() => setFullscreenImage(premiumImagePrompt.flux_image_url || null)}
                              className="rounded-full border border-white/20 bg-slate-950/80 px-4 py-2 text-xs font-bold text-white backdrop-blur-sm transition-colors hover:bg-slate-900/90"
                            >
                              🔍 Ver imagem completa
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEpisodeImageUrl(premiumImagePrompt.flux_image_url || '')
                                setUseSeriesImage(false)
                                alert('Capa FLUX definida como capa do episódio.')
                              }}
                              className="rounded-full border border-indigo-400/30 bg-indigo-600/70 px-4 py-2 text-xs font-bold text-white backdrop-blur-sm transition-colors hover:bg-indigo-600"
                            >
                              Usar como capa
                            </button>
                          </div>
                        </div>
                        {premiumImagePrompt.flux_image_size_bytes && (
                          <p className="mt-2 text-center text-[11px] text-slate-500">
                            {(premiumImagePrompt.flux_image_size_bytes / 1024).toFixed(1)} KB
                            {premiumImagePrompt.flux_image_width && premiumImagePrompt.flux_image_height
                              ? ` · ${premiumImagePrompt.flux_image_width}×${premiumImagePrompt.flux_image_height}`
                              : ''}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {episodeImageUrl && !useSeriesImage && !premiumImagePrompt?.flux_image_url && (
                  <div className="mt-3">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Capa atual do episódio
                    </p>
                    <img
                      src={episodeImageUrl}
                      alt="Capa atual do episódio"
                      className="h-36 w-full rounded-lg object-cover"
                    />
                  </div>
                )}
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={useSeriesImage}
                  onChange={() => setUseSeriesImage(true)}
                />

                <span className="text-sm text-slate-300">Usar imagem da série</span>
              </label>

              {selectedSeriesImage && useSeriesImage && (
                <div className="ml-6">
                  <img
                    src={selectedSeriesImage}
                    alt="Capa da série"
                    className="w-24 h-32 object-cover rounded-lg"
                  />
                </div>
              )}

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!useSeriesImage}
                  onChange={() => setUseSeriesImage(false)}
                />

                <span className="text-sm text-slate-300">Imagem específica deste episódio</span>
              </label>

              {!useSeriesImage && (
                <div className="ml-6">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 text-sm disabled:opacity-50"
                  />

                  {episodeImageUrl && (
                    <img
                      src={episodeImageUrl}
                      alt="Preview"
                      className="w-24 h-32 object-cover rounded-lg mt-2"
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-800 pt-5">
            <h4 className="text-sm font-semibold text-slate-300 mb-3">
              ⏰ Agendamento
            </h4>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={setTomorrowMorningSchedule}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-blue-500 hover:text-white"
                >
                  Amanhã às 06:00
                </button>

                <button
                  type="button"
                  onClick={setTodayInFifteenMinutesSchedule}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-blue-500 hover:text-white"
                >
                  Hoje em 15 minutos
                </button>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Data de Publicação
                </label>

                <input
                  type="date"
                  value={formData.scheduled_date}
                  min={getLocalDateString()}
                  onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 focus:border-blue-500 outline-none"
                />

                <p className="text-xs text-slate-500 mt-1">
                  Deixe em branco para publicar imediatamente
                </p>
              </div>

              {formData.scheduled_date && (
                <>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useDefaultTime}
                      onChange={(e) => setUseDefaultTime(e.target.checked)}
                    />

                    <span className="text-sm text-slate-300">Sempre publicar às 6:00 da manhã</span>
                  </label>

                  {!useDefaultTime && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">
                        Horário
                      </label>

                      <input
                        type="time"
                        value={formData.scheduled_time}
                        step={300}
                        onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 focus:border-blue-500 outline-none"
                      />
                    </div>
                  )}

                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                    <p className="text-sm text-slate-200">
                      Será publicado em {scheduledPreview}, horário de Brasília.
                    </p>

                    <p className="text-xs text-slate-500 mt-1">
                      No banco, esse horário aparece em UTC.
                    </p>

                    {isScheduledInPast && (
                      <p className="text-sm text-red-300 mt-2">
                        Esse horário já passou. Escolha um horário futuro.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {!formData.scheduled_date && (
            <div className="border-t border-slate-800 pt-5">
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Status *
              </label>

              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'draft' | 'published' })}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 focus:border-blue-500 outline-none"
              >
                <option value="draft">💾 Salvar como Rascunho</option>
                <option value="published">✅ Publicar Agora</option>
              </select>
            </div>
          )}

          <div className="rounded-xl border border-amber-300/20 bg-amber-500/5 p-4">
            <p className="text-sm font-semibold text-amber-100">
              Repositório editorial
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Salva o episódio preparado sem publicar e sem acionar o agendamento automático.
            </p>
            <button
              type="button"
              onClick={handleSaveToRepository}
              disabled={loading || savingToRepository}
              className="mt-3 w-full rounded-lg border border-amber-300/40 bg-amber-400/10 px-4 py-3 font-bold text-amber-100 transition-colors hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingToRepository ? 'Salvando no repositório...' : 'Salvar no repositório'}
            </button>
          </div>

          <div className="flex gap-3 pt-4">
            <Link
              href="/admin"
              className="flex-1 bg-slate-800 text-slate-300 font-bold py-3 rounded-lg text-center hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={loading || savingToRepository}
              className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading
                ? '⏳ Salvando...'
                : formData.scheduled_date
                ? enableDailyQuote && selectedDailyQuote
                  ? '📅 Agendar Episódio + Palavra'
                  : '📅 Agendar Publicação'
                : formData.status === 'published'
                ? enableDailyQuote && selectedDailyQuote
                  ? '📤 Publicar Episódio + Palavra'
                  : '📤 Publicar Agora'
                : enableDailyQuote && selectedDailyQuote
                ? '💾 Salvar Rascunho + Palavra'
                : '💾 Salvar Rascunho'}
            </button>
          </div>
        </form>
      </div>
    
      <style jsx global>{`
        .admin-new-episode-page {
          min-height: 100vh !important;
          background:
            radial-gradient(circle at top left, rgba(37, 99, 235, 0.18), transparent 34rem),
            radial-gradient(circle at top right, rgba(245, 158, 11, 0.14), transparent 30rem),
            #030712 !important;
          color: #f8fafc !important;
        }

        .admin-new-episode-page > div:first-child {
          background:
            linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 64, 175, 0.24)) !important;
          border-bottom: 1px solid rgba(148, 163, 184, 0.16) !important;
          box-shadow: 0 20px 80px rgba(0, 0, 0, 0.22) !important;
        }

        .admin-new-episode-page > div:first-child > div,
        .admin-new-episode-page > div:nth-child(2) {
          max-width: 1180px !important;
        }

        .admin-new-episode-page > div:nth-child(2) {
          padding-top: 28px !important;
          padding-bottom: 64px !important;
        }

        .admin-new-episode-page h1 {
          font-size: clamp(2.1rem, 4vw, 3.2rem) !important;
          line-height: 0.98 !important;
          letter-spacing: -0.07em !important;
          color: #f8fafc !important;
        }

        .admin-new-episode-page h3 {
          color: #f8fafc !important;
          letter-spacing: -0.04em !important;
        }

        .admin-new-episode-page label {
          color: #dbeafe !important;
          font-weight: 800 !important;
        }

        .admin-new-episode-page form,
        .admin-new-episode-page div.bg-slate-900,
        .admin-new-episode-page div.bg-red-600 {
          background:
            linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(15, 23, 42, 0.72)) !important;
          border: 1px solid rgba(148, 163, 184, 0.16) !important;
          box-shadow: 0 22px 70px rgba(0, 0, 0, 0.22) !important;
          border-radius: 28px !important;
        }

        .admin-new-episode-page div.bg-red-600 {
          background:
            linear-gradient(135deg, rgba(127, 29, 29, 0.52), rgba(15, 23, 42, 0.78)) !important;
          border-color: rgba(248, 113, 113, 0.24) !important;
        }

        .admin-new-episode-page input,
        .admin-new-episode-page textarea,
        .admin-new-episode-page select {
          background: rgba(2, 6, 23, 0.72) !important;
          border: 1px solid rgba(148, 163, 184, 0.24) !important;
          color: #f8fafc !important;
          border-radius: 16px !important;
          padding: 13px 15px !important;
          outline: none !important;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03) !important;
        }

        .admin-new-episode-page input:focus,
        .admin-new-episode-page textarea:focus,
        .admin-new-episode-page select:focus {
          border-color: rgba(147, 197, 253, 0.62) !important;
          box-shadow:
            0 0 0 3px rgba(59, 130, 246, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.03) !important;
        }

        .admin-new-episode-page textarea {
          min-height: 130px;
          resize: vertical;
        }

        .admin-new-episode-page button,
        .admin-new-episode-page a,
        .admin-new-episode-page label.cursor-pointer {
          border-radius: 16px !important;
          font-weight: 900 !important;
          transition:
            transform 0.2s ease,
            border-color 0.2s ease,
            background 0.2s ease,
            opacity 0.2s ease !important;
        }

        .admin-new-episode-page button:hover,
        .admin-new-episode-page a:hover,
        .admin-new-episode-page label.cursor-pointer:hover {
          transform: translateY(-1px);
        }

        .admin-new-episode-page button:disabled {
          opacity: 0.55 !important;
          cursor: not-allowed !important;
          transform: none !important;
        }

        .admin-new-episode-page .bg-blue-600,
        .admin-new-episode-page .bg-indigo-600 {
          background: linear-gradient(135deg, #2563eb, #1d4ed8) !important;
          border-color: rgba(147, 197, 253, 0.34) !important;
          color: #ffffff !important;
        }

        .admin-new-episode-page .bg-emerald-600,
        .admin-new-episode-page .bg-green-600 {
          background: linear-gradient(135deg, #059669, #047857) !important;
          border-color: rgba(110, 231, 183, 0.28) !important;
          color: #ffffff !important;
        }

        .admin-new-episode-page .bg-purple-600 {
          background: linear-gradient(135deg, #7c3aed, #5b21b6) !important;
          border-color: rgba(216, 180, 254, 0.28) !important;
          color: #ffffff !important;
        }

        .admin-new-episode-page .bg-slate-800 {
          background: rgba(15, 23, 42, 0.72) !important;
          border: 1px solid rgba(148, 163, 184, 0.18) !important;
        }

        .admin-new-episode-page .text-slate-400,
        .admin-new-episode-page .text-slate-500,
        .admin-new-episode-page .text-slate-300 {
          color: #bfdbfe !important;
        }

        .admin-new-episode-page .border-slate-800,
        .admin-new-episode-page .border-slate-700 {
          border-color: rgba(148, 163, 184, 0.18) !important;
        }

        .admin-new-episode-page audio {
          border-radius: 16px !important;
          overflow: hidden !important;
        }

        .admin-new-episode-page img {
          border-radius: 20px !important;
        }

        .admin-new-episode-page ::placeholder {
          color: rgba(191, 219, 254, 0.46) !important;
        }

        @media (max-width: 768px) {
          .admin-new-episode-page > div:first-child > div,
          .admin-new-episode-page > div:nth-child(2) {
            padding-left: 14px !important;
            padding-right: 14px !important;
          }

          .admin-new-episode-page h1 {
            font-size: 2.1rem !important;
          }

          .admin-new-episode-page form,
          .admin-new-episode-page div.bg-slate-900,
          .admin-new-episode-page div.bg-red-600 {
            border-radius: 24px !important;
          }
        }
      `}</style>


      <style jsx global>{`
        .admin-new-episode-page .admin-new-episode-polish {
          display: none;
        }

        .admin-new-episode-page > div:first-child {
          position: relative !important;
          overflow: hidden !important;
        }

        .admin-new-episode-page > div:first-child::before {
          content: "" !important;
          position: absolute !important;
          inset: 0 !important;
          background:
            radial-gradient(circle at 12% 20%, rgba(96, 165, 250, 0.18), transparent 28rem),
            radial-gradient(circle at 88% 20%, rgba(245, 158, 11, 0.12), transparent 26rem) !important;
          pointer-events: none !important;
        }

        .admin-new-episode-page > div:first-child > div {
          position: relative !important;
          z-index: 1 !important;
          padding-top: 34px !important;
          padding-bottom: 28px !important;
        }

        .admin-new-episode-page > div:first-child a {
          display: inline-flex !important;
          align-items: center !important;
          gap: 6px !important;
          color: #bfdbfe !important;
          background: rgba(15, 23, 42, 0.58) !important;
          border: 1px solid rgba(148, 163, 184, 0.18) !important;
          padding: 8px 12px !important;
          border-radius: 999px !important;
          margin-bottom: 16px !important;
          text-decoration: none !important;
        }

        .admin-new-episode-page h1 {
          display: flex !important;
          align-items: center !important;
          gap: 14px !important;
        }

        .admin-new-episode-page h1::after {
          content: "Admin" !important;
          font-size: 0.72rem !important;
          letter-spacing: 0.18em !important;
          text-transform: uppercase !important;
          color: #93c5fd !important;
          background: rgba(59, 130, 246, 0.14) !important;
          border: 1px solid rgba(147, 197, 253, 0.22) !important;
          padding: 7px 10px !important;
          border-radius: 999px !important;
        }

        .admin-new-episode-page > div:nth-child(2) > div.flex {
          background: rgba(15, 23, 42, 0.62) !important;
          border: 1px solid rgba(148, 163, 184, 0.14) !important;
          border-radius: 22px !important;
          padding: 6px !important;
          gap: 6px !important;
        }

        .admin-new-episode-page > div:nth-child(2) > div.flex button {
          border-radius: 16px !important;
          min-height: 48px !important;
        }

        .admin-new-episode-page div.bg-red-600 {
          background:
            linear-gradient(135deg, rgba(127, 29, 29, 0.28), rgba(15, 23, 42, 0.82)) !important;
          border-color: rgba(248, 113, 113, 0.22) !important;
        }

        .admin-new-episode-page div.bg-red-600 button,
        .admin-new-episode-page button.bg-red-600 {
          background:
            linear-gradient(135deg, #ef4444, #be123c) !important;
          border: 1px solid rgba(254, 202, 202, 0.28) !important;
          box-shadow: 0 16px 40px rgba(225, 29, 72, 0.22) !important;
        }

        .admin-new-episode-page form {
          padding: 28px !important;
        }

        .admin-new-episode-page form > h3 {
          display: flex !important;
          align-items: center !important;
          gap: 10px !important;
          font-size: 1.15rem !important;
          padding-bottom: 18px !important;
          margin-bottom: 6px !important;
        }

        .admin-new-episode-page form > h3::after {
          content: "" !important;
          height: 1px !important;
          flex: 1 !important;
          background: linear-gradient(90deg, rgba(147, 197, 253, 0.28), transparent) !important;
        }

        .admin-new-episode-page form .border-t {
          padding-top: 28px !important;
          margin-top: 12px !important;
        }

        .admin-new-episode-page input,
        .admin-new-episode-page textarea,
        .admin-new-episode-page select {
          min-height: 48px !important;
        }

        .admin-new-episode-page textarea {
          line-height: 1.6 !important;
        }

        .admin-new-episode-page .bg-blue-600,
        .admin-new-episode-page .bg-emerald-600,
        .admin-new-episode-page .bg-purple-600 {
          box-shadow: 0 14px 38px rgba(37, 99, 235, 0.12) !important;
        }

        .admin-new-episode-page button[type="submit"] {
          min-height: 52px !important;
          font-size: 0.98rem !important;
          box-shadow: 0 18px 44px rgba(37, 99, 235, 0.2) !important;
        }

        .admin-new-episode-page a[href="/admin"] {
          min-height: 52px !important;
          display: grid !important;
          place-items: center !important;
        }

        .admin-new-episode-page .text-yellow-400 {
          color: #facc15 !important;
        }

        .admin-new-episode-page .bg-blue-950\/40 {
          background: rgba(30, 64, 175, 0.16) !important;
          border-color: rgba(96, 165, 250, 0.24) !important;
        }

        @media (max-width: 768px) {
          .admin-new-episode-page h1 {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 8px !important;
          }

          .admin-new-episode-page form {
            padding: 20px !important;
          }
        }
      `}</style>
      {fullscreenImage && (
        <FullscreenImageModal
          src={fullscreenImage}
          alt="Capa do episódio em alta resolução"
          onClose={() => setFullscreenImage(null)}
        />
      )}

      <div className="admin-new-episode-polish" />

</div>
  )
}
