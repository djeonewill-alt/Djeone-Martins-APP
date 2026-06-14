import { PutObjectCommand } from '@aws-sdk/client-s3'
import { NextRequest, NextResponse } from 'next/server'
import { generateQuoteShareImage } from '@/lib/images/generateQuoteShareImage'
import { R2_BUCKET_NAME, R2_PUBLIC_URL, r2Client } from '@/lib/r2/client'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

type RouteParams = {
  id: string
}

type RouteProps = {
  params: Promise<RouteParams>
}

type DailyQuoteRecord = {
  id: string
  quote_text: string
  share_image_url: string | null
  background_image_url: string | null
  source_image_url: string | null
  card_image_url: string | null
  episode: {
    bible_reference?: string | null
    cover_image_url?: string | null
    series?: {
      cover_image_url?: string | null
    } | null
  } | null
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i

function getAdminSecret() {
  return process.env.ADMIN_API_SECRET || ''
}

function isAuthorized(request: NextRequest) {
  const adminSecret = getAdminSecret()
  const headerPassword = request.headers.get('x-admin-password') || ''
  const authHeader = request.headers.get('authorization') || ''
  const bearerToken = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : ''

  return Boolean(adminSecret) && (headerPassword === adminSecret || bearerToken === adminSecret)
}

function getAdminAuthError(request: NextRequest) {
  if (!getAdminSecret()) {
    return NextResponse.json(
      { error: 'Configuracao administrativa ausente.' },
      { status: 500 }
    )
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Nao autorizado.' }, { status: 401 })
  }

  return null
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return String(error)
}

function getBaseImageUrl(quote: DailyQuoteRecord) {
  // Ordem: background > source > episode cover > series cover > card (último fallback)
  return (
    quote.background_image_url ||
    quote.source_image_url ||
    quote.episode?.cover_image_url ||
    quote.episode?.series?.cover_image_url ||
    quote.card_image_url ||
    null
  )
}

function getShareImageKey(quoteId: string, force: boolean) {
  if (force) {
    return `og/quotes/${quoteId}-quote-og-v26-${Date.now()}.png`
  }
  return `og/quotes/${quoteId}-quote-og-v26.png`
}

async function markQuoteError(quoteId: string, message: string) {
  try {
    const supabase = createSupabaseAdminClient()
    await supabase
      .from('daily_quotes')
      .update({
        share_image_status: 'error',
        share_image_error: message.slice(0, 240),
      })
      .eq('id', quoteId)
  } catch (error) {
    console.error('[quote-share-image] erro ao salvar status de falha:', error)
  }
}

export async function POST(request: NextRequest, { params }: RouteProps) {
  const authError = getAdminAuthError(request)
  if (authError) return authError

  const { id } = await params

  if (!uuidPattern.test(id)) {
    return NextResponse.json({ error: 'ID da Palavra invalido.' }, { status: 400 })
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { force?: boolean }
    const force = body.force === true
    const publicBaseUrl = R2_PUBLIC_URL.replace(/\/+$/, '')

    if (!publicBaseUrl) {
      throw new Error('R2_PUBLIC_URL nao configurado.')
    }

    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from('daily_quotes')
      .select(`
        id,
        quote_text,
        share_image_url,
        background_image_url,
        source_image_url,
        card_image_url,
        episode:episodes (
          bible_reference,
          cover_image_url,
          series:series (
            cover_image_url
          )
        )
      `)
      .eq('id', id)
      .maybeSingle()

    if (error) throw error

    if (!data) {
      return NextResponse.json({ error: 'Palavra nao encontrada.' }, { status: 404 })
    }

    const quote = data as DailyQuoteRecord

    // Se share_image_url já existe e não for force, retornar URL existente
    if (quote.share_image_url && !force) {
      return NextResponse.json({
        ok: true,
        daily_quote_id: quote.id,
        share_image_url: quote.share_image_url,
        reused_existing: true,
      })
    }

    const generated = await generateQuoteShareImage({
      quoteText: quote.quote_text,
      bibleReference: quote.episode?.bible_reference,
      baseImageUrl: getBaseImageUrl(quote),
    })

    const key = getShareImageKey(quote.id, force)
    const shareImageUrl = `${publicBaseUrl}/${key}`

    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: generated.buffer,
        ContentType: 'image/png',
        CacheControl: 'public, max-age=31536000, immutable',
      })
    )

    const generatedAt = new Date().toISOString()
    const { error: updateError } = await supabase
      .from('daily_quotes')
      .update({
        share_image_url: shareImageUrl,
        share_image_size_bytes: generated.sizeBytes,
        share_image_generated_at: generatedAt,
        share_image_status: 'ready',
        share_image_error: null,
      })
      .eq('id', quote.id)

    if (updateError) throw updateError

    return NextResponse.json({
      ok: true,
      daily_quote_id: quote.id,
      share_image_url: shareImageUrl,
      size_bytes: generated.sizeBytes,
      content_type: 'image/png',
    })
  } catch (error) {
    const message = getErrorMessage(error)
    await markQuoteError(id, message)

    return NextResponse.json(
      {
        error: message,
        share_image_status: 'error',
      },
      { status: 500 }
    )
  }
}