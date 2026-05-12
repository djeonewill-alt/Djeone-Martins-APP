import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type BackgroundImage = {
  id: string
  provider: 'curated' | 'pexels' | 'fallback'
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

type PexelsPhoto = {
  id: number
  url: string
  alt: string | null
  photographer: string
  photographer_url: string
  src: {
    original: string
    large2x?: string
    large?: string
    medium?: string
    portrait?: string
    landscape?: string
  }
}

type QuoteBackgroundRow = {
  id: string
  image_url: string
  preview_url: string | null
  theme: string
  theme_keywords: string[] | null
  source: string | null
  source_image_provider: string | null
  source_page_url: string | null
  pexels_photo_id: string | null
  photographer: string | null
  photographer_url: string | null
  query_used: string | null
  last_used_date: string | null
  use_count: number | null
  is_active: boolean | null
  is_approved: boolean | null
}

type ImageHistoryRow = {
  pexels_photo_id: string | null
  source_image_url: string | null
  quote_background_id: string | null
  photographer: string | null
}

type DetectedTheme = {
  query: string
  queries: string[]
  theme_keywords: string[]
  avoid_keywords?: string[]
}

type SearchDebug = {
  pexels_key_configured: boolean
  queries_used: string[]
  pexels_total_received: number
  curated_total_received: number
  removed_by_history: number
  removed_by_content_filter: number
  final_valid_images: number
  fallback_used: boolean
  warning_reason: string
}

const DAYS_WITHOUT_REPEAT = 120

const SAFE_DAILY_QUOTE_QUERIES = [
  'peaceful sunrise landscape hope faith',
  'open bible morning light peaceful',
  'mountain sunrise path hope peace',
  'calm ocean sunrise hope light',
  'golden sky peaceful landscape',
]

const THEME_MAP = [
  {
    keywords: ['jesus', 'cristo', 'senhor', 'salvador', 'messias', 'cordeiro', 'filho de deus'],
    query: 'wooden cross sunrise field',
    safeQueries: [
      'wooden cross sunrise field',
      'cross in field sunrise',
      'bright cross sunrise',
    ],
    theme: 'Jesus',
  },
  {
    keywords: ['palavra', 'verbo', 'bíblia', 'biblia', 'escritura', 'verdade', 'revelação', 'revelacao'],
    query: 'open bible sunlight morning',
    safeQueries: [
      'open bible sunlight morning',
      'open bible hands sunlight',
      'bible window light peaceful',
    ],
    theme: 'Palavra',
  },
  {
    keywords: ['vida', 'viver', 'vivificar', 'renovo', 'novo nascimento', 'ressurreição', 'ressurreicao'],
    query: 'sunrise nature new life',
    safeQueries: [
      'sunrise nature new life',
      'green field sunrise hope',
      'morning light nature peaceful',
    ],
    theme: 'vida',
  },
  {
    keywords: ['liberdade', 'liberta', 'libertação', 'libertacao', 'livre', 'prisão', 'prisao', 'correntes', 'cativo', 'cativeiro'],
    query: 'birds flying sunrise sky freedom',
    safeQueries: [
      'birds flying sunrise sky freedom',
      'open sky birds sunrise',
      'wide open road sunrise freedom',
    ],
    theme: 'liberdade',
  },
  {
    keywords: ['salvação', 'salvacao', 'salva', 'evangelho', 'redenção', 'redencao', 'cruz', 'perdão', 'perdao'],
    query: 'wooden cross sunrise hope',
    safeQueries: [
      'wooden cross sunrise hope',
      'cross in field sunrise',
      'bright cross sunrise landscape',
    ],
    theme: 'salvação',
  },
  {
    keywords: ['luz', 'trevas', 'clareza', 'iluminar', 'resplandecer', 'brilhar', 'glória', 'gloria'],
    query: 'sun rays peaceful sky',
    safeQueries: [
      'sun rays peaceful sky',
      'golden sunrise light',
      'sunlight forest peaceful',
    ],
    theme: 'luz',
  },
  {
    keywords: ['tempestade', 'crise', 'vento', 'mar', 'ondas', 'medo', 'tribulação', 'tribulacao', 'luta'],
    query: 'storm sea light hope',
    safeQueries: [
      'storm sea light hope',
      'storm clouds sunlight ocean',
      'sea storm sunrise hope',
    ],
    theme: 'tempestade',
  },
  {
    keywords: ['deserto', 'solidão', 'solidao', 'seco', 'caminho', 'provação', 'provacao', 'processo'],
    query: 'desert road sunrise hope',
    safeQueries: [
      'desert road sunrise hope',
      'desert path sunrise',
      'empty road desert sunrise',
    ],
    theme: 'deserto',
  },
  {
    keywords: ['esperança', 'esperanca', 'novo', 'amanhã', 'amanha', 'recomeço', 'recomeco', 'renovo', 'alegria'],
    query: 'sunrise hope peaceful sky',
    safeQueries: [
      'sunrise hope peaceful sky',
      'peaceful sunrise landscape',
      'golden sunrise mountains',
    ],
    theme: 'esperança',
  },
  {
    keywords: ['direção', 'direcao', 'guiar', 'caminho', 'passos', 'decisão', 'decisao', 'jornada', 'rumo'],
    query: 'path road sunrise peaceful',
    safeQueries: [
      'path road sunrise peaceful',
      'road sunrise mountains',
      'forest path sunlight',
    ],
    theme: 'direção',
  },
  {
    keywords: ['oração', 'oracao', 'orar', 'presença', 'presenca', 'intimidade', 'altar', 'buscar'],
    query: 'prayer hands sunlight peaceful',
    safeQueries: [
      'prayer hands sunlight peaceful',
      'hands praying sunlight',
      'quiet prayer light',
    ],
    theme: 'oração',
  },
  {
    keywords: ['fé', 'fe', 'crer', 'confiança', 'confianca', 'promessa', 'perseverar', 'permanecer'],
    query: 'mountain sunrise faith hope',
    safeQueries: [
      'mountain sunrise faith hope',
      'sunrise mountains hope',
      'person mountain sunrise silhouette',
    ],
    theme: 'fé',
  },
  {
    keywords: ['cura', 'restauração', 'restauracao', 'ferida', 'dor', 'consolo', 'paz', 'sarado'],
    query: 'peaceful nature healing light',
    safeQueries: [
      'peaceful nature healing light',
      'calm lake sunrise peaceful',
      'soft light nature healing',
    ],
    theme: 'cura',
  },
  {
    keywords: ['graça', 'graca', 'misericórdia', 'misericordia', 'perdão', 'perdao', 'amor', 'bondade'],
    query: 'soft light peaceful nature',
    safeQueries: [
      'soft light peaceful nature',
      'gentle sunlight flowers',
      'peaceful sky soft light',
    ],
    theme: 'graça',
  },
  {
    keywords: ['vitória', 'vitoria', 'vencer', 'força', 'forca', 'guerrear', 'coragem', 'levantar'],
    query: 'mountain peak sunrise victory',
    safeQueries: [
      'mountain peak sunrise victory',
      'mountain summit sunrise',
      'sunrise peak victory',
    ],
    theme: 'vitória',
  },
]

const FALLBACK_IMAGES: BackgroundImage[] = [
  {
    id: 'fallback-hope-1',
    provider: 'fallback',
    url: '/vencendo-tempestades.jpg',
    preview_url: '/vencendo-tempestades.jpg',
    alt: 'Imagem padrão devocional',
    query: 'default',
    theme_keywords: ['esperança'],
    quote_background_id: null,
    pexels_photo_id: null,
  },
]

function cleanText(text: string) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim()
}

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function getCutoffDate() {
  const date = new Date()
  date.setDate(date.getDate() - DAYS_WITHOUT_REPEAT)
  return date.toISOString().split('T')[0]
}

function getRandomPage() {
  return Math.floor(Math.random() * 5) + 1
}

function shuffleArray<T>(array: T[]) {
  return [...array].sort(() => Math.random() - 0.5)
}

function uniqueList(values: string[]) {
  return Array.from(new Set(values.map((value) => cleanText(value)).filter(Boolean)))
}

function shouldAvoidPhoto(photo: PexelsPhoto, themeKeywords: string[], avoidKeywords: string[] = []) {
  const allowDramatic =
    themeKeywords.includes('tempestade') ||
    themeKeywords.includes('deserto')

  if (allowDramatic) {
    return false
  }

  const alt = normalizeText(photo.alt || '')

  const blockedWords = [
    'city',
    'urban',
    'street',
    'building',
    'neon',
    'night',
    'dark',
    'storm',
    'lightning',
    'thunder',
    'rain',
    'crowd',
    'party',
    'bar',
    'club',
    'cidade',
    'rua',
    'noite',
    'escuro',
    'tempestade',
    'chuva',
  ]

  const episodeThumbnailBlockedWords = themeKeywords.includes('episode_thumbnail')
    ? [
        'portrait',
        'posing',
        'business',
        'office',
        'corporate',
        'technology',
        'computer',
        'phone',
        'food',
        'restaurant',
        'party',
        'animal',
        'dog',
        'cat',
      ]
    : []

  return [...blockedWords, ...episodeThumbnailBlockedWords, ...avoidKeywords].some((word) =>
    alt.includes(normalizeText(word))
  )
}

function getStringArray(value: unknown) {
  return Array.isArray(value)
    ? value
        .map((item) => cleanText(String(item || '')))
        .filter(Boolean)
    : []
}

function detectThemeFromQuote(quoteText: string): DetectedTheme {
  const normalized = normalizeText(quoteText)

  const scores = THEME_MAP.map((item) => {
    let score = 0

    item.keywords.forEach((keyword) => {
      const normalizedKeyword = normalizeText(keyword)

      if (normalized.includes(normalizedKeyword)) {
        score += 1
      }
    })

    return {
      ...item,
      score,
    }
  })

  const matchedThemes = scores
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)

  if (matchedThemes.length === 0) {
    return {
      query: SAFE_DAILY_QUOTE_QUERIES[0],
      queries: SAFE_DAILY_QUOTE_QUERIES,
      theme_keywords: ['esperança'],
    }
  }

  const themeNames = matchedThemes.slice(0, 4).map((item) => item.theme)

  const hasJesus = themeNames.includes('Jesus')
  const hasPalavra = themeNames.includes('Palavra')
  const hasVida = themeNames.includes('vida')
  const hasLiberdade = themeNames.includes('liberdade')
  const hasLuz = themeNames.includes('luz')
  const hasSalvacao = themeNames.includes('salvação')

  if (hasJesus && hasPalavra && hasLiberdade) {
    return {
      query: 'open bible cross sunrise freedom',
      queries: [
        'open bible sunlight morning',
        'wooden cross sunrise field',
        'birds flying sunrise sky freedom',
      ],
      theme_keywords: themeNames,
    }
  }

  if (hasJesus && hasPalavra && hasVida) {
    return {
      query: 'open bible cross sunrise life',
      queries: [
        'open bible sunlight morning',
        'wooden cross sunrise field',
        'sunrise nature new life',
      ],
      theme_keywords: themeNames,
    }
  }

  if (hasJesus && hasPalavra) {
    return {
      query: 'open bible cross sunlight',
      queries: [
        'open bible sunlight morning',
        'wooden cross sunrise field',
        'open bible hands sunlight',
      ],
      theme_keywords: themeNames,
    }
  }

  if (hasJesus && (hasVida || hasLiberdade || hasLuz || hasSalvacao)) {
    return {
      query: 'cross sunrise light hope',
      queries: [
        'wooden cross sunrise field',
        'golden sunrise light',
        'birds flying sunrise sky freedom',
      ],
      theme_keywords: themeNames,
    }
  }

  if (hasPalavra && (hasVida || hasLuz)) {
    return {
      query: 'open bible sunlight',
      queries: [
        'open bible sunlight morning',
        'open bible hands sunlight',
        'bible window light peaceful',
      ],
      theme_keywords: themeNames,
    }
  }

  if (hasLiberdade) {
    return {
      query: 'birds flying sunrise sky freedom',
      queries: [
        'birds flying sunrise sky freedom',
        'open sky birds sunrise',
        'wide open road sunrise freedom',
      ],
      theme_keywords: themeNames,
    }
  }

  const firstTheme = matchedThemes[0]

  const queries = [
    ...firstTheme.safeQueries,
    ...matchedThemes.slice(1, 3).flatMap((item) => item.safeQueries.slice(0, 1)),
  ]

  return {
    query: firstTheme.query,
    queries: Array.from(new Set(queries)).slice(0, 3),
    theme_keywords: themeNames,
  }
}

function improveDailyQuoteQueries(detectedTheme: DetectedTheme): DetectedTheme {
  const queries = uniqueList([
    ...detectedTheme.queries,
    ...SAFE_DAILY_QUOTE_QUERIES,
  ]).slice(0, 7)

  return {
    ...detectedTheme,
    query: queries[0] || detectedTheme.query,
    queries,
  }
}

function themeMatchesBackground(background: QuoteBackgroundRow, themeKeywords: string[]) {
  const backgroundTheme = normalizeText(background.theme || '')
  const backgroundKeywords = (background.theme_keywords || []).map((keyword) =>
    normalizeText(keyword)
  )
  const normalizedThemes = themeKeywords.map((theme) => normalizeText(theme))

  return normalizedThemes.some((theme) => {
    return (
      backgroundTheme === theme ||
      backgroundKeywords.includes(theme) ||
      backgroundTheme.includes(theme) ||
      theme.includes(backgroundTheme)
    )
  })
}

async function getRecentImageHistory() {
  const cutoffIso = new Date()
  cutoffIso.setDate(cutoffIso.getDate() - DAYS_WITHOUT_REPEAT)

  const { data, error } = await supabase
    .from('daily_quote_image_history')
    .select('pexels_photo_id, source_image_url, quote_background_id, photographer')
    .gte('used_at', cutoffIso.toISOString())

  if (error) {
    console.error('Erro ao buscar histórico de imagens:', error)
    return [] as ImageHistoryRow[]
  }

  return (data || []) as ImageHistoryRow[]
}

function isImageRecentlyUsed(image: BackgroundImage, history: ImageHistoryRow[]) {
  return history.some((item) => {
    const sameCuratedImage =
      image.quote_background_id &&
      item.quote_background_id &&
      image.quote_background_id === item.quote_background_id

    const samePexelsPhoto =
      image.pexels_photo_id &&
      item.pexels_photo_id &&
      image.pexels_photo_id === item.pexels_photo_id

    const sameImageUrl =
      image.url &&
      item.source_image_url &&
      image.url === item.source_image_url

    return sameCuratedImage || samePexelsPhoto || sameImageUrl
  })
}

async function searchCuratedImages(params: {
  theme_keywords: string[]
  history: ImageHistoryRow[]
}) {
  const cutoffDate = getCutoffDate()

  const { data, error } = await supabase
    .from('quote_backgrounds')
    .select(`
      id,
      image_url,
      preview_url,
      theme,
      theme_keywords,
      source,
      source_image_provider,
      source_page_url,
      pexels_photo_id,
      photographer,
      photographer_url,
      query_used,
      last_used_date,
      use_count,
      is_active,
      is_approved
    `)
    .eq('is_active', true)
    .eq('is_approved', true)
    .order('use_count', { ascending: true })
    .order('last_used_date', { ascending: true, nullsFirst: true })
    .limit(80)

  if (error) {
    console.error('Erro ao buscar imagens curadas:', error)
    return [] as BackgroundImage[]
  }

  const rows = ((data || []) as QuoteBackgroundRow[])
    .filter((background) => {
      const allowedByDate =
        !background.last_used_date ||
        background.last_used_date < cutoffDate

      return allowedByDate && themeMatchesBackground(background, params.theme_keywords)
    })

  const images: BackgroundImage[] = rows.map((background) => ({
    id: `curated-${background.id}`,
    provider: 'curated',
    url: background.image_url,
    preview_url: background.preview_url || background.image_url,
    photographer: background.photographer || undefined,
    photographer_url: background.photographer_url || undefined,
    source_page_url: background.source_page_url || undefined,
    alt: background.theme,
    query: background.query_used || background.theme,
    theme_keywords: background.theme_keywords || [background.theme],
    quote_background_id: background.id,
    pexels_photo_id: background.pexels_photo_id,
  }))

  return shuffleArray(images).filter((image) => !isImageRecentlyUsed(image, params.history))
}

async function fetchPexelsPhotos(params: {
  query: string
  theme_keywords: string[]
  avoid_keywords?: string[]
  apiKey: string
  perPage?: number
  page?: number
}) {
  const url = new URL('https://api.pexels.com/v1/search')
  url.searchParams.set('query', params.query)
  url.searchParams.set('per_page', String(params.perPage || 8))
  url.searchParams.set('orientation', 'landscape')
  url.searchParams.set('size', 'large')
  url.searchParams.set('locale', 'pt-BR')
  url.searchParams.set('page', String(params.page || getRandomPage()))

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: params.apiKey.trim(),
    },
    cache: 'no-store',
  })

  const data = await response.json()

  if (!response.ok) {
    console.error('Erro Pexels:', data)

    return {
      error:
        data?.message ||
        data?.error ||
        'Erro ao buscar imagens no Pexels.',
      photos: [] as BackgroundImage[],
      totalReceived: 0,
      removedByContentFilter: 0,
    }
  }

  const rawPhotos = (data.photos || []) as PexelsPhoto[]
  const photos = rawPhotos.filter(
    (photo) => !shouldAvoidPhoto(photo, params.theme_keywords, params.avoid_keywords)
  )

  const images: BackgroundImage[] = photos.map((photo) => ({
    id: `pexels-${photo.id}`,
    provider: 'pexels',
    url:
      photo.src.landscape ||
      photo.src.large2x ||
      photo.src.large ||
      photo.src.original,
    preview_url:
      photo.src.medium ||
      photo.src.landscape ||
      photo.src.large ||
      photo.src.original,
    photographer: photo.photographer,
    photographer_url: photo.photographer_url,
    source_page_url: photo.url,
    alt: photo.alt || '',
    query: params.query,
    theme_keywords: params.theme_keywords,
    quote_background_id: null,
    pexels_photo_id: String(photo.id),
  }))

  return {
    error: null,
    photos: images,
    totalReceived: rawPhotos.length,
    removedByContentFilter: rawPhotos.length - photos.length,
  }
}

function addUniqueImage(
  collection: BackgroundImage[],
  image: BackgroundImage
) {
  const alreadyExists = collection.some((item) => {
    const sameId = item.id === image.id
    const sameUrl = item.url === image.url
    const samePexels =
      item.pexels_photo_id &&
      image.pexels_photo_id &&
      item.pexels_photo_id === image.pexels_photo_id

    return sameId || sameUrl || samePexels
  })

  if (!alreadyExists) {
    collection.push(image)
  }
}

async function searchPexelsImages(params: {
  queries: string[]
  theme_keywords: string[]
  avoid_keywords?: string[]
  history: ImageHistoryRow[]
}) {
  const apiKey = process.env.PEXELS_API_KEY
  const queries = uniqueList(params.queries).slice(0, 5)

  if (!apiKey) {
    console.warn('PEXELS_API_KEY ausente. Usando fallback interno.')

    return {
      images: [] as BackgroundImage[],
      warning: 'PEXELS_API_KEY ausente.',
      debug: {
        pexels_key_configured: false,
        queries_used: queries,
        pexels_total_received: 0,
        removed_by_history: 0,
        removed_by_content_filter: 0,
        warning_reason: 'PEXELS_API_KEY ausente',
      },
    }
  }

  try {
    const resultsByQuery: BackgroundImage[][] = []
    let lastError: string | null = null
    let hadPexelsError = false
    let pexelsTotalReceived = 0
    let removedByContentFilter = 0
    let removedByHistory = 0

    const searchRound = async (pagesByQuery: number[]) => {
      for (const query of queries) {
        for (const page of pagesByQuery) {
          const result = await fetchPexelsPhotos({
            query,
            theme_keywords: params.theme_keywords,
            avoid_keywords: params.avoid_keywords,
            apiKey,
            perPage: 10,
            page,
          })

          if (result.error) {
            hadPexelsError = true
            lastError = result.error
          }

          pexelsTotalReceived += result.totalReceived
          removedByContentFilter += result.removedByContentFilter

          const filteredPhotos = result.photos.filter((image) => {
            const recentlyUsed = isImageRecentlyUsed(image, params.history)

            if (recentlyUsed) {
              removedByHistory += 1
            }

            return !recentlyUsed
          })

          resultsByQuery.push(shuffleArray(filteredPhotos))
        }
      }
    }

    const collectFinalImages = () => {
      const collected: BackgroundImage[] = []

      for (let queryIndex = 0; queryIndex < resultsByQuery.length; queryIndex += 1) {
        const firstImage = resultsByQuery[queryIndex][0]

        if (firstImage) {
          addUniqueImage(collected, firstImage)
        }
      }

      for (let imageIndex = 1; imageIndex < 10; imageIndex += 1) {
        for (let queryIndex = 0; queryIndex < resultsByQuery.length; queryIndex += 1) {
          const image = resultsByQuery[queryIndex][imageIndex]

          if (image) {
            addUniqueImage(collected, image)
          }
        }
      }

      return collected
    }

    await searchRound([getRandomPage()])

    let finalImages = collectFinalImages()

    if (finalImages.length === 0 && removedByHistory > 0) {
      await searchRound([1, 2, 3])
      finalImages = collectFinalImages()
    }

    let warningReason = ''

    if (hadPexelsError) {
      warningReason = 'Erro HTTP ou rate limit do Pexels'
    } else if (pexelsTotalReceived === 0) {
      warningReason = 'Pexels retornou zero imagens'
    } else if (removedByContentFilter >= pexelsTotalReceived) {
      warningReason = 'Pexels retornou imagens, mas todas foram removidas por filtro'
    } else if (finalImages.length === 0 && removedByHistory > 0) {
      warningReason = 'Pexels retornou imagens, mas todas foram removidas por histórico'
    } else if (finalImages.length === 0) {
      warningReason = 'Nenhuma imagem curada ou Pexels válida'
    }

    return {
      images: finalImages.slice(0, 9),
      warning: finalImages.length > 0 ? null : lastError || warningReason,
      debug: {
        pexels_key_configured: true,
        queries_used: queries,
        pexels_total_received: pexelsTotalReceived,
        removed_by_history: removedByHistory,
        removed_by_content_filter: removedByContentFilter,
        warning_reason: warningReason,
      },
    }
  } catch (error) {
    console.error('Falha inesperada ao buscar no Pexels:', error)

    return {
      images: [] as BackgroundImage[],
      warning: 'Falha inesperada no Pexels.',
      debug: {
        pexels_key_configured: true,
        queries_used: queries,
        pexels_total_received: 0,
        removed_by_history: 0,
        removed_by_content_filter: 0,
        warning_reason: 'Erro HTTP ou rate limit do Pexels',
      },
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const quoteText = cleanText(String(body.quoteText || ''))
    const manualQuery = cleanText(String(body.query || ''))
    const purpose = cleanText(String(body.purpose || ''))
    const preferredThemes = getStringArray(body.preferredThemes)
    const avoidThemes = getStringArray(body.avoidThemes)

    if (!quoteText && !manualQuery) {
      return NextResponse.json(
        { error: 'Envie quoteText ou query.' },
        { status: 400 }
      )
    }

    const detectedThemeBase =
      purpose === 'episode_thumbnail'
        ? detectEpisodeThumbnailTheme(quoteText || manualQuery, preferredThemes, avoidThemes)
        : manualQuery
        ? {
            query: manualQuery,
            queries: [manualQuery],
            theme_keywords: [manualQuery],
          }
        : detectThemeFromQuote(quoteText)

    const detectedTheme =
      !purpose && !manualQuery
        ? improveDailyQuoteQueries(detectedThemeBase)
        : detectedThemeBase

    const history = await getRecentImageHistory()

    const curatedImages = await searchCuratedImages({
      theme_keywords: detectedTheme.theme_keywords,
      history,
    })

    const pexelsImages = await searchPexelsImages({
      queries: detectedTheme.queries,
      theme_keywords: detectedTheme.theme_keywords,
      avoid_keywords: detectedTheme.avoid_keywords,
      history,
    })

    const finalImages: BackgroundImage[] = []

    curatedImages.slice(0, 3).forEach((image) => {
      addUniqueImage(finalImages, image)
    })

    pexelsImages.images.forEach((image) => {
      addUniqueImage(finalImages, image)
    })

    const images =
      finalImages.length > 0
        ? finalImages.slice(0, 9)
        : FALLBACK_IMAGES

    const provider =
      curatedImages.length > 0
        ? 'curated'
        : pexelsImages.images.length > 0
        ? 'pexels'
        : 'fallback'

    const fallbackUsed = images[0]?.provider === 'fallback'
    const warningReason =
      fallbackUsed && !pexelsImages.debug.warning_reason
        ? 'Nenhuma imagem curada ou Pexels válida'
        : pexelsImages.debug.warning_reason
    const debug: SearchDebug = {
      pexels_key_configured: pexelsImages.debug.pexels_key_configured,
      queries_used: pexelsImages.debug.queries_used,
      pexels_total_received: pexelsImages.debug.pexels_total_received,
      curated_total_received: curatedImages.length,
      removed_by_history: pexelsImages.debug.removed_by_history,
      removed_by_content_filter: pexelsImages.debug.removed_by_content_filter,
      final_valid_images: finalImages.length,
      fallback_used: fallbackUsed,
      warning_reason: warningReason,
    }

    return NextResponse.json({
      success: true,
      query: detectedTheme.query,
      queries: detectedTheme.queries,
      theme_keywords: detectedTheme.theme_keywords,
      images,
      provider,
      source_counts: {
        curated: curatedImages.length,
        pexels: pexelsImages.images.length,
        returned: images.length,
        history: history.length,
      },
      debug,
      warning:
        fallbackUsed
          ? warningReason || pexelsImages.warning || 'Usando fallback interno.'
          : pexelsImages.warning,
    })
  } catch (error) {
    console.error('Erro ao buscar imagens:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao buscar imagens.',
        images: FALLBACK_IMAGES,
        provider: 'fallback',
        debug: {
          pexels_key_configured: Boolean(process.env.PEXELS_API_KEY),
          queries_used: [],
          pexels_total_received: 0,
          curated_total_received: 0,
          removed_by_history: 0,
          removed_by_content_filter: 0,
          final_valid_images: 0,
          fallback_used: true,
          warning_reason: 'Nenhuma imagem curada ou Pexels válida',
        } satisfies SearchDebug,
      },
      { status: 500 }
    )
  }
}

function detectEpisodeThumbnailTheme(contextText: string, preferredThemes: string[], avoidThemes: string[]): DetectedTheme {
  const normalized = normalizeText(contextText)
  const baseQueries = [
    'peaceful sunrise landscape path mountains sky hope freedom',
    'peaceful ocean sunrise light hope landscape',
    'mountain path sunrise sky freedom peaceful',
  ]

  let queries = baseQueries
  let themeKeywords = ['episode_thumbnail', ...preferredThemes]

  if (/(barco|mar|oceano|ondas|aguas|águas|tempestade|vento|naufragio|naufrágio)/.test(normalized)) {
    queries = [
      'calm sea sunrise boat hope peaceful',
      'peaceful ocean sunrise light hope',
      'boat on calm water sunrise journey',
    ]
    themeKeywords = ['episode_thumbnail', 'mar', 'barco', 'esperança', ...preferredThemes]
  } else if (/(caminho|jornada|passos|direcao|direção|rumo|estrada)/.test(normalized)) {
    queries = [
      'peaceful path sunrise mountains journey hope',
      'open road sunrise freedom landscape',
      'forest path sunlight peaceful journey',
    ]
    themeKeywords = ['episode_thumbnail', 'caminho', 'jornada', 'esperança', ...preferredThemes]
  } else if (/(montanha|monte|alto|vitoria|vitória|forca|força|coragem)/.test(normalized)) {
    queries = [
      'mountain sunrise hope freedom peaceful',
      'mountain path sunrise sky landscape',
      'golden sunrise mountains peaceful',
    ]
    themeKeywords = ['episode_thumbnail', 'montanhas', 'fé', 'esperança', ...preferredThemes]
  }

  const uniqueQueries = Array.from(new Set(queries))
  const uniqueThemes = Array.from(new Set(themeKeywords.filter(Boolean)))

  return {
    query: uniqueQueries[0],
    queries: uniqueQueries.slice(0, 3),
    theme_keywords: uniqueThemes,
    avoid_keywords: avoidThemes,
  }
}
