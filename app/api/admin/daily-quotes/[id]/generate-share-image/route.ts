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
  background_image_url: string | null
  source_image_url: string | null
  card_image_url: string | null
  episode: {
    bible_reference?: string | null
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
  return (
    quote.background_image_url ||
    quote.source_image_url ||
    quote.card_image_url ||
    null
  )
}

function getShareImageKey(quoteId: string) {
  return `share/quotes/${quoteId}/og.jpg`
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
        background_image_url,
        source_image_url,
        card_image_url,
        episode:episodes (
          bible_reference
        )
      `)
      .eq('id', id)
      .maybeSingle()

    if (error) throw error

    if (!data) {
      return NextResponse.json({ error: 'Palavra nao encontrada.' }, { status: 404 })
    }

    const quote = data as DailyQuoteRecord
    const generated = await generateQuoteShareImage({
      quoteText: quote.quote_text,
      bibleReference: quote.episode?.bible_reference,
      baseImageUrl: getBaseImageUrl(quote),
    })

    const key = getShareImageKey(quote.id)
    const shareImageUrl = `${publicBaseUrl}/${key}`

    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: generated.buffer,
        ContentType: 'image/jpeg',
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
      share_image_url: shareImageUrl,
      share_image_key: key,
      share_image_size_bytes: generated.sizeBytes,
      width: generated.width,
      height: generated.height,
      quality: generated.quality,
      share_image_generated_at: generatedAt,
      share_image_status: 'ready',
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
