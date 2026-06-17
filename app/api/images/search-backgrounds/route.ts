/**
 * AI-MEDIA-003 — Rota de fundo da Palavra do Dia migrada para FLUX Schnell.
 *
 * Remove completamente a dependência da API do Pexels e do catálogo curado.
 * Agora gera imagens conceituais únicas via Fal.ai FLUX Schnell com o
 * texto da frase embutido nativamente na imagem.
 *
 * Fluxo:
 * 1. Recebe a frase escolhida (quoteText) + contexto do episódio
 * 2. Constrói um prompt conceitual profundo otimizado para FLUX
 * 3. Chama generateAndUploadFluxImage() → compressão WebP → upload R2
 * 4. Salva histórico no Supabase (daily_quote_image_history)
 * 5. Atualiza daily_quotes com background_image_url
 * 6. Retorna a URL da imagem + metadados
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { generateAndUploadFluxImage } from '@/lib/ai/fal'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

type GeneratedBackground = {
  id: string
  provider: 'flux'
  url: string
  preview_url: string
  query: string
  theme_keywords: string[]
  searchQueryUsed: string
  visualTheme: string
  matchedReason: string
  /** ID do registro de histórico no Supabase */
  quote_background_id?: string | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function cleanText(value: string, maxLength = 12000) {
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength)
}

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function getStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => cleanText(String(item || ''))).filter(Boolean)
    : []
}

// ---------------------------------------------------------------------------
// Detecção de cena bíblica (prompt visual limpo, sem texto)
// ---------------------------------------------------------------------------

const VISUAL_SCENE_MAP: Array<{ pattern: RegExp; scene: string }> = [
  {
    pattern: /nardo|perfume|alabastro|ungiu|óleo|oleo|aroma|maria.*pés|pes.*jesus/,
    scene: 'An alabaster jar of precious nard perfume resting on a stone table. Warm golden light pours through an open doorway in a humble Bethany interior. Subtle fragrance suggested by soft glowing particles in the air.',
  },
  {
    pattern: /betânia|betania|lázaro|lazaro|marta|casa da afli[cç][aã]o/,
    scene: 'A simple stone house in the biblical village of Bethany at dusk. Warm oil lamp glow from within. An open doorway reveals a humble interior. Dust motes dance in golden light. Olive trees frame the scene.',
  },
  {
    pattern: /templo|jerusal[ée]m|presen[cç]a de deus|lugar sagrado/,
    scene: 'The ancient Jerusalem temple in the distance, glowing in golden sunset light. A stone path leading toward it. Olive trees and ancient walls. Warm light breaking through clouds.',
  },
  {
    pattern: /tempestade|mar|ondas|barco|navio|naufr[áa]gio|naufragio|terra firme|atos 27/,
    scene: 'A dramatic Mediterranean shoreline at dawn. Golden light breaking through storm clouds after a shipwreck. Broken wood on the beach. Calm sea emerging. Survivors standing on dry land looking toward the horizon.',
  },
  {
    pattern: /grão|grao|trigo|semente|frutificar|morrer.*viver/,
    scene: 'A single grain of wheat falling into dark rich soil. Golden light from above. A tiny green sprout emerging. Wheat field stretching to the horizon at golden hour.',
  },
  {
    pattern: /cruz|madeiro|sacrif[ií]cio|sacrificio|salva[cç][aã]o|salvacao|reden[cç][aã]o|redencao/,
    scene: 'A wooden cross silhouetted against a golden sunrise over rolling Judean hills. Warm light breaking through. Ancient olive trees. Stone path leading toward the cross.',
  },
  {
    pattern: /luz|trevas|amanhecer|resplandecer|brilhar|gl[oó]ria|gloria/,
    scene: 'Dramatic golden sun rays piercing through dark clouds over a peaceful landscape. Ancient stone path leading toward the light. Olive trees. Warm and reverent atmosphere.',
  },
  {
    pattern: /deserto|caminho|jornada|passos|dire[cç][aã]o|direcao|rumo/,
    scene: 'An ancient desert road at sunrise. Golden light stretching across the sand. Distant mountains. A clear path forward. Warm and hopeful atmosphere.',
  },
  {
    pattern: /ora[cç][aã]o|oracao|orar|intimidade|ajoelhar|altar|buscar/,
    scene: 'A humble prayer space at dawn. Warm golden light through an open window. A simple stone altar or table. Hands folded in prayer. Peaceful and reverent atmosphere.',
  },
  {
    pattern: /f[ée]|fe|crer|confian[cç]a|confianca|promessa|perseverar/,
    scene: 'Majestic mountain peaks at sunrise. Golden light breaking over the summit. Ancient stone path winding upward. Vast sky with soft clouds. Cinematic and uplifting.',
  },
]

function detectBiblicalScene(normalizedText: string): string {
  for (const mapping of VISUAL_SCENE_MAP) {
    if (mapping.pattern.test(normalizedText)) {
      return mapping.scene
    }
  }

  return 'A peaceful biblical landscape at golden hour. Ancient stone path leading toward the horizon. Warm directional light. Olive trees. Soft clouds. Reverent and contemplative atmosphere.'
}

// ---------------------------------------------------------------------------
// Persistência no Supabase (histórico + vínculo com daily_quotes)
// ---------------------------------------------------------------------------

async function saveFluxBackgroundHistory(params: {
  dailyQuoteId?: string
  r2Url: string
  promptUsed: string
  themeKeywords: string[]
  quoteText: string
}): Promise<{ quoteBackgroundId: string }> {
  const now = new Date().toISOString()
  const today = now.split('T')[0]
  const theme = params.themeKeywords[0] || 'devocional'

  // 1. Cria/atualiza registro em quote_backgrounds
  const { data: background, error: backgroundError } = await supabase
    .from('quote_backgrounds')
    .upsert(
      {
        image_url: params.r2Url,
        preview_url: params.r2Url,
        theme,
        theme_keywords: params.themeKeywords,
        source: 'flux',
        source_image_provider: 'flux',
        source_page_url: null,
        query_used: params.promptUsed.slice(0, 500),
        last_used_date: today,
        use_count: 1,
        is_active: true,
        is_approved: true,
        updated_at: now,
      },
      {
        onConflict: 'image_url',
        ignoreDuplicates: false,
      }
    )
    .select('id')
    .single()

  if (backgroundError) {
    console.error('[FLUX-BG] Erro ao salvar quote_backgrounds:', backgroundError)
    throw backgroundError
  }

  const quoteBackgroundId = background?.id

  if (!quoteBackgroundId) {
    throw new Error('Falha ao obter ID do background após upsert.')
  }

  // 2. Atualiza a daily_quote com o background_image_url
  if (params.dailyQuoteId) {
    const { error: quoteUpdateError } = await supabase
      .from('daily_quotes')
      .update({
        background_image_url: params.r2Url,
        source_image_url: params.r2Url,
        quote_background_id: quoteBackgroundId,
      })
      .eq('id', params.dailyQuoteId)

    if (quoteUpdateError) {
      console.error('[FLUX-BG] Erro ao atualizar daily_quotes:', quoteUpdateError)
      // Não quebra — o background já foi salvo
    }
  }

  // 3. Insere no histórico de imagens
  const { error: historyError } = await supabase
    .from('daily_quote_image_history')
    .insert([
      {
        daily_quote_id: params.dailyQuoteId || null,
        quote_background_id: quoteBackgroundId,
        source_image_url: params.r2Url,
        source_image_provider: 'flux',
        query_used: params.promptUsed.slice(0, 500),
        theme_keywords: params.themeKeywords,
        used_at: now,
      },
    ])

  if (historyError) {
    console.error('[FLUX-BG] Erro ao salvar histórico:', historyError)
    // Não quebra — o background já foi salvo
  }

  console.log('[FLUX-BG] Histórico salvo | quoteBackgroundId=', quoteBackgroundId)

  return { quoteBackgroundId }
}

// ---------------------------------------------------------------------------
// Rota principal
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const quoteText = cleanText(String(body.quoteText || ''))
    const manualQuery = cleanText(String(body.query || ''))
    const purpose = cleanText(String(body.purpose || ''))
    const title = cleanText(String(body.title || ''))
    const bibleReference = cleanText(String(body.bibleReference || ''))
    const sourceExcerpt = cleanText(String(body.sourceExcerpt || ''))
    const reason = cleanText(String(body.reason || ''))
    const specificityReason = cleanText(String(body.specificityReason || ''))
    const transcriptionPreview = cleanText(String(body.transcriptionPreview || ''))
    const dailyQuoteId = cleanText(String(body.dailyQuoteId || ''))
    const preferredThemes = getStringArray(body.preferredThemes)
    const avoidThemes = getStringArray(body.avoidThemes)

    const queryToUse = quoteText || manualQuery

    if (!queryToUse) {
      return NextResponse.json(
        { error: 'Envie quoteText ou query para gerar a imagem.' },
        { status: 400 }
      )
    }

    // -----------------------------------------------------------------------
    // Constrói prompt visual limpo para FLUX (apenas cenário, sem texto)
    // -----------------------------------------------------------------------

    // Detecta a cena bíblica na frase para enriquecer o prompt
    const normalizedQuote = normalizeText(queryToUse)
    const visualScene = detectBiblicalScene(normalizedQuote)

    const fluxVisualPrompt = [
      'Cinematic biblical realism. 4K photorealistic.',
      visualScene,
      'Clean background. No text, no letters, no words, no typography, no overlay.',
      'Square 1:1 composition. Rule of thirds. Cinematic depth of field.',
      'Natural colors. Warm golden hour lighting. Soft directional light.',
      'Reverent tone. Not theatrical or exaggerated. No watermarks.',
    ].join(' ')

    console.log('[FLUX-BG] Prompt visual (primeiros 200 chars):', fluxVisualPrompt.slice(0, 200))

    // -----------------------------------------------------------------------
    // ETAPA 2: FLUX Schnell gera a imagem com o prompt do DeepSeek
    // -----------------------------------------------------------------------

    console.log('[FLUX-BG] Etapa 2: Gerando imagem com FLUX Schnell...')

    // Gera imagem via FLUX Schnell → WebP → R2
    const fluxResult = await generateAndUploadFluxImage(fluxVisualPrompt, {
      imageSize: 'square_hd',
      r2Prefix: 'backgrounds/daily-quote',
    })

    console.log('[FLUX-BG] Imagem gerada | r2Url=', fluxResult.r2Url)

    // Detecta temas visuais para metadados (reusa normalizedQuote já definido acima)
    const THEME_MAP: Array<{ keywords: string[]; theme: string }> = [
      { keywords: ['jesus', 'cristo', 'senhor', 'salvador', 'messias', 'cordeiro'], theme: 'Jesus' },
      { keywords: ['palavra', 'bíblia', 'biblia', 'escritura', 'verdade', 'revelação', 'revelacao', 'verbo'], theme: 'Palavra' },
      { keywords: ['vida', 'viver', 'renovo', 'ressurreição', 'ressurreicao'], theme: 'vida' },
      { keywords: ['liberdade', 'liberta', 'libertação', 'libertacao', 'livre'], theme: 'liberdade' },
      { keywords: ['salvação', 'salvacao', 'evangelho', 'redenção', 'redencao', 'cruz', 'perdão', 'perdao'], theme: 'salvação' },
      { keywords: ['luz', 'trevas', 'clareza', 'iluminar', 'resplandecer', 'brilhar', 'glória', 'gloria'], theme: 'luz' },
      { keywords: ['tempestade', 'crise', 'vento', 'mar', 'ondas', 'medo', 'tribulação', 'tribulacao'], theme: 'tempestade' },
      { keywords: ['deserto', 'solidão', 'solidao', 'seco', 'caminho', 'provação', 'provacao'], theme: 'deserto' },
      { keywords: ['esperança', 'esperanca', 'novo', 'recomeço', 'recomeco', 'alegria'], theme: 'esperança' },
      { keywords: ['direção', 'direcao', 'guiar', 'passos', 'decisão', 'decisao', 'jornada'], theme: 'direção' },
      { keywords: ['oração', 'oracao', 'orar', 'presença', 'presenca', 'intimidade', 'altar'], theme: 'oração' },
      { keywords: ['fé', 'fe', 'crer', 'confiança', 'confianca', 'promessa', 'perseverar'], theme: 'fé' },
      { keywords: ['cura', 'restauração', 'restauracao', 'ferida', 'dor', 'consolo', 'paz'], theme: 'cura' },
      { keywords: ['graça', 'graca', 'misericórdia', 'misericordia', 'amor', 'bondade'], theme: 'graça' },
      { keywords: ['vitória', 'vitoria', 'vencer', 'força', 'forca', 'coragem', 'levantar'], theme: 'vitória' },
    ]

    const matchedThemes = THEME_MAP
      .filter((item) => item.keywords.some((keyword) => normalizedQuote.includes(keyword)))
      .map((item) => item.theme)

    const themeKeywords = matchedThemes.length > 0
      ? matchedThemes.slice(0, 4)
      : ['devocional', 'esperança']

    // Salva histórico no Supabase
    let quoteBackgroundId: string | null = null

    try {
      const saved = await saveFluxBackgroundHistory({
        dailyQuoteId: dailyQuoteId || undefined,
        r2Url: fluxResult.r2Url,
        promptUsed: fluxVisualPrompt,
        themeKeywords,
        quoteText: queryToUse,
      })
      quoteBackgroundId = saved.quoteBackgroundId
    } catch (historyError) {
      console.error('[FLUX-BG] Erro ao salvar histórico (não-fatal):', historyError)
    }

    // Constrói resposta
    const background: GeneratedBackground = {
      id: `flux-${Date.now()}`,
      provider: 'flux',
      url: fluxResult.r2Url,
      preview_url: fluxResult.r2Url,
      query: queryToUse.slice(0, 120),
      theme_keywords: themeKeywords,
      searchQueryUsed: queryToUse.slice(0, 120),
      visualTheme: themeKeywords[0] || 'devocional',
      matchedReason: 'Imagem conceitual gerada por IA (FLUX Schnell) com base no texto da Palavra do Dia.',
      quote_background_id: quoteBackgroundId,
    }

    return NextResponse.json({
      success: true,
      query: queryToUse.slice(0, 120),
      queries: [queryToUse.slice(0, 120)],
      theme_keywords: themeKeywords,
      visual_theme: themeKeywords[0] || 'devocional',
      matched_reason: background.matchedReason,
      images: [background],
      provider: 'flux',
      source_counts: {
        curated: 0,
        pexels: 0,
        flux: 1,
        returned: 1,
        history: 0,
      },
      flux_image_url: fluxResult.r2Url,
      flux_image_size_bytes: fluxResult.sizeBytes,
      flux_image_width: fluxResult.width,
      flux_image_height: fluxResult.height,
      debug: {
        provider: 'flux',
        queries_used: [queryToUse.slice(0, 120)],
        total_received: 1,
        final_valid_images: 1,
        fallback_used: false,
        warning_reason: '',
      },
    })
  } catch (error) {
    console.error('[FLUX-BG] Erro ao gerar fundo:', error)

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Erro ao gerar imagem de fundo.',
        provider: 'flux',
        debug: {
          provider: 'flux',
          queries_used: [],
          total_received: 0,
          final_valid_images: 0,
          fallback_used: true,
          warning_reason: 'Erro na geração FLUX',
        },
      },
      { status: 500 }
    )
  }
}