/**
 * AI-MEDIA-003 — Rota de fundo da Palavra do Dia migrada para FLUX Schnell.
 * AI-MEDIA-005 — Padrão de Fábrica unificado: ambas as imagens (card e capa)
 * usam o diagnóstico profundo de cena do DeepSeek (background_prompt).
 *
 * Fluxo:
 * 1. Recebe a frase escolhida (quoteText) + background_prompt do DeepSeek
 * 2. Constrói prompt visual limpo (sem texto) para FLUX
 * 3. Chama generateAndUploadFluxImage() → compressão WebP → upload R2
 * 4. Salva histórico no Supabase (daily_quote_image_history)
 * 5. Atualiza daily_quotes com background_image_url
 * 6. Retorna a URL da imagem + metadados
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { generateAndUploadFluxImage } from '@/lib/ai/fal'
import { getAIProvider } from '@/lib/ai/provider'

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
    // ETAPA 1: DeepSeek gera diagnóstico profundo de cena (backgroundPrompt)
    // -----------------------------------------------------------------------

    // backgroundPrompt pode vir do frontend ou ser gerado aqui
    let backgroundPrompt = cleanText(String(body.backgroundPrompt || ''))

    if (!backgroundPrompt) {
      console.log('[FLUX-BG] backgroundPrompt ausente — gerando com DeepSeek...')

      const sceneDiagnosisSchema = `{
  "flux_visual_prompt": "string (English scene description for FLUX image generation)"
}`

      const ai = getAIProvider({
        textProvider: 'deepseek-flash',
        fallbackProvider: 'openai',
      })

      const diagnosisData = await ai.generateJson({
        system: [
          'You are a cinematic biblical art director. Your task: analyze the episode context and the chosen quote, then write a vivid, concrete, cinematic English scene description for FLUX Schnell image generation.',
          '',
          'ANATOMICAL PROMPT SKELETON:',
          '1. BIBLICAL CONTEXT: Identify the exact biblical scene, location, era, and characters from the transcription. Map it precisely — shipwreck, Bethany, temple, desert, etc. Never use a generic landscape if the text points to a specific scene.',
          '2. ANATOMICAL ACTION: Focus on concrete human/biblical detail — hands, facial expression, posture, gesture, physical object, interaction between characters. What is the KEY visual moment of this quote?',
          '3. CINEMATIC LIGHTING: Specify lighting precisely — "golden hour", "soft directional light", "dramatic shafts of light breaking through storm clouds", "warm oil lamp glow". No flat or generic lighting.',
          '4. TECHNICAL COMPOSITION: "Rule of thirds", "cinematic depth of field", "foreground/background separation", specific color palette, texture details (stone, wood, linen, wool, sea, sand).',
          '5. STRICT PROHIBITIONS: No modern clothing, no modern buildings, no technology, no fantasy elements, no theatrical exaggeration, no text/letters/words/typography.',
          '',
          'THE QUOTE TEXT IS THE CENTRAL FOCUS. The scene must visually communicate the MEANING of the Palavra do Dia.',
          '',
          'Return ONLY valid JSON.',
        ].join('\n'),
        prompt: [
          'EPISODE CONTEXT:',
          queryToUse ? `Quote Text (Portuguese): "${queryToUse}"` : '',
          bibleReference ? `Bible Reference: ${bibleReference}` : '',
          title ? `Title: ${title}` : '',
          sourceExcerpt ? `Source Excerpt: ${sourceExcerpt}` : '',
          reason ? `Reason: ${reason}` : '',
          specificityReason ? `Specificity Reason: ${specificityReason}` : '',
          transcriptionPreview ? `Transcription Preview: ${transcriptionPreview.slice(0, 2000)}` : '',
          '',
          'Return JSON: { "flux_visual_prompt": "English cinematic scene description" }',
        ].filter(Boolean).join('\n'),
        schema: sceneDiagnosisSchema,
        validate: (raw) => {
          const parsed = raw as { flux_visual_prompt?: string }
          const prompt = (parsed.flux_visual_prompt || '').trim()
          if (!prompt || prompt.length < 50) {
            throw new Error('DeepSeek não gerou diagnóstico de cena válido.')
          }
          return { flux_visual_prompt: prompt }
        },
        temperature: 0.7,
        maxTokens: 2048,
      })

      backgroundPrompt = diagnosisData.flux_visual_prompt
      console.log('[FLUX-BG] Diagnóstico DeepSeek gerado | modelo=', ai.activeTextModel)
      console.log('[FLUX-BG] Diagnóstico (primeiros 200 chars):', backgroundPrompt.slice(0, 200))
    }

    // -----------------------------------------------------------------------
    // ETAPA 2: Constrói prompt visual limpo para FLUX
    // -----------------------------------------------------------------------

    const sceneDescription = backgroundPrompt

    const fluxVisualPrompt = [
      sceneDescription,
      'Cinematic photorealistic, high contrast, dramatic lighting, 8k, no text, no letters, no words, no typography, no overlay, clean background.',
    ].join(' ')

    console.log('[FLUX-BG] Prompt FLUX final (primeiros 200 chars):', fluxVisualPrompt.slice(0, 200))

    // -----------------------------------------------------------------------
    // ETAPA 3: FLUX Schnell gera a imagem com o prompt do DeepSeek
    // -----------------------------------------------------------------------

    console.log('[FLUX-BG] Etapa 3: Gerando imagem com FLUX Schnell...')

    // Gera imagem via FLUX Schnell → WebP → R2
    const fluxResult = await generateAndUploadFluxImage(fluxVisualPrompt, {
      imageSize: 'square_hd',
      r2Prefix: 'backgrounds/daily-quote',
    })

    console.log('[FLUX-BG] Imagem gerada | r2Url=', fluxResult.r2Url)

    const themeKeywords = ['devocional']

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