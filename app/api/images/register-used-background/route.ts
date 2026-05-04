import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type RegisterImageBody = {
  dailyQuoteId?: string
  quoteBackgroundId?: string | null
  sourceImageUrl?: string
  sourceImageProvider?: string
  sourcePageUrl?: string | null
  pexelsPhotoId?: string | null
  photographer?: string | null
  photographerUrl?: string | null
  queryUsed?: string | null
  themeKeywords?: string[]
}

function cleanText(value: unknown) {
  return String(value || '').trim()
}

function getPrimaryTheme(themeKeywords: string[]) {
  const firstTheme = themeKeywords.find((theme) => theme && theme.trim())

  return firstTheme || 'devocional'
}

async function findOrCreateQuoteBackground(params: {
  quoteBackgroundId?: string | null
  sourceImageUrl: string
  sourceImageProvider: string
  sourcePageUrl?: string | null
  pexelsPhotoId?: string | null
  photographer?: string | null
  photographerUrl?: string | null
  queryUsed?: string | null
  themeKeywords: string[]
}) {
  if (params.quoteBackgroundId) {
    const { data: existingById, error: existingByIdError } = await supabase
      .from('quote_backgrounds')
      .select('id, use_count')
      .eq('id', params.quoteBackgroundId)
      .maybeSingle()

    if (existingByIdError) {
      throw existingByIdError
    }

    if (existingById) {
      return existingById
    }
  }

  if (params.pexelsPhotoId) {
    const { data: existingByPexels, error: existingByPexelsError } = await supabase
      .from('quote_backgrounds')
      .select('id, use_count')
      .eq('pexels_photo_id', params.pexelsPhotoId)
      .maybeSingle()

    if (existingByPexelsError) {
      throw existingByPexelsError
    }

    if (existingByPexels) {
      return existingByPexels
    }
  }

  const { data: existingByUrl, error: existingByUrlError } = await supabase
    .from('quote_backgrounds')
    .select('id, use_count')
    .eq('image_url', params.sourceImageUrl)
    .maybeSingle()

  if (existingByUrlError) {
    throw existingByUrlError
  }

  if (existingByUrl) {
    return existingByUrl
  }

  const theme = getPrimaryTheme(params.themeKeywords)

  const { data: createdBackground, error: createError } = await supabase
    .from('quote_backgrounds')
    .insert([
      {
        image_url: params.sourceImageUrl,
        preview_url: params.sourceImageUrl,

        theme,
        theme_keywords: params.themeKeywords,

        source: params.sourceImageProvider === 'pexels' ? 'pexels' : 'manual',
        source_image_provider: params.sourceImageProvider,
        source_page_url: params.sourcePageUrl || null,
        pexels_photo_id: params.pexelsPhotoId || null,
        photographer: params.photographer || null,
        photographer_url: params.photographerUrl || null,
        query_used: params.queryUsed || null,

        last_used_date: null,
        use_count: 0,

        is_active: true,
        is_approved: true,
      },
    ])
    .select('id, use_count')
    .single()

  if (createError) {
    throw createError
  }

  return createdBackground
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RegisterImageBody

    const dailyQuoteId = cleanText(body.dailyQuoteId)
    const sourceImageUrl = cleanText(body.sourceImageUrl)
    const sourceImageProvider = cleanText(body.sourceImageProvider || 'manual')
    const sourcePageUrl = body.sourcePageUrl || null
    const pexelsPhotoId = body.pexelsPhotoId || null
    const photographer = body.photographer || null
    const photographerUrl = body.photographerUrl || null
    const queryUsed = body.queryUsed || null
    const themeKeywords = Array.isArray(body.themeKeywords)
      ? body.themeKeywords.filter(Boolean)
      : []

    if (!dailyQuoteId) {
      return NextResponse.json(
        { error: 'dailyQuoteId é obrigatório.' },
        { status: 400 }
      )
    }

    if (!sourceImageUrl) {
      return NextResponse.json(
        { error: 'sourceImageUrl é obrigatório.' },
        { status: 400 }
      )
    }

    const quoteBackground = await findOrCreateQuoteBackground({
      quoteBackgroundId: body.quoteBackgroundId || null,
      sourceImageUrl,
      sourceImageProvider,
      sourcePageUrl,
      pexelsPhotoId,
      photographer,
      photographerUrl,
      queryUsed,
      themeKeywords,
    })

    const today = new Date().toISOString().split('T')[0]
    const now = new Date().toISOString()

    const { error: updateBackgroundError } = await supabase
      .from('quote_backgrounds')
      .update({
        last_used_date: today,
        use_count: Number(quoteBackground.use_count || 0) + 1,
        updated_at: now,
      })
      .eq('id', quoteBackground.id)

    if (updateBackgroundError) {
      throw updateBackgroundError
    }

    const { error: updateQuoteError } = await supabase
      .from('daily_quotes')
      .update({
        quote_background_id: quoteBackground.id,
      })
      .eq('id', dailyQuoteId)

    if (updateQuoteError) {
      throw updateQuoteError
    }

    const { error: historyError } = await supabase
      .from('daily_quote_image_history')
      .insert([
        {
          daily_quote_id: dailyQuoteId,
          quote_background_id: quoteBackground.id,

          pexels_photo_id: pexelsPhotoId,
          source_image_url: sourceImageUrl,
          source_image_provider: sourceImageProvider,
          source_page_url: sourcePageUrl,
          photographer,
          photographer_url: photographerUrl,
          query_used: queryUsed,
          theme_keywords: themeKeywords,
          used_at: now,
        },
      ])

    if (historyError) {
      throw historyError
    }

    return NextResponse.json({
      success: true,
      quote_background_id: quoteBackground.id,
      daily_quote_id: dailyQuoteId,
      message: 'Imagem registrada no histórico com sucesso.',
    })
  } catch (error) {
    console.error('Erro ao registrar imagem usada:', error)

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Erro ao registrar imagem usada.',
      },
      { status: 500 }
    )
  }
}