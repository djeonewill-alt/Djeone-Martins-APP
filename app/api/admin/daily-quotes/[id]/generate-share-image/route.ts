/**
 * AI-MEDIA-004 — Rota de geração de share image otimizada para WhatsApp.
 *
 * Gera uma imagem JPEG leve (alvo < 300 KB, máx 400 KB) com overlay de
 * texto via sharp, faz upload para R2 e atualiza daily_quotes.share_image_url.
 *
 * Substitui o comportamento anterior que apenas copiava a URL existente
 * de background_image_url / card_image_url sem otimização.
 */

import { NextRequest, NextResponse } from 'next/server'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from '@/lib/r2/client'
import {
  generateQuoteShareImage,
  type QuoteShareImageInput,
} from '@/lib/images/generateQuoteShareImage'

export const runtime = 'nodejs'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

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

/**
 * Resolve a melhor imagem base para composição do overlay de texto.
 * Prioridade:
 * 1. background_image_url (FLUX limpo)
 * 2. card_image_url (imagem composta existente)
 * 3. source_image_url
 * 4. episode/series cover
 */
function resolveBaseImageUrl(quote: DailyQuoteRecord): string | null {
  return (
    quote.background_image_url ||
    quote.card_image_url ||
    quote.source_image_url ||
    quote.episode?.cover_image_url ||
    quote.episode?.series?.cover_image_url ||
    null
  )
}

// ---------------------------------------------------------------------------
// Rota
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest, { params }: RouteProps) {
  const authError = getAdminAuthError(request)
  if (authError) return authError

  const { id } = await params

  if (!isUuid(id)) {
    return NextResponse.json({ error: 'ID da Palavra invalido.' }, { status: 400 })
  }

  try {
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
      return NextResponse.json(
        { error: 'Palavra nao encontrada.' },
        { status: 404 }
      )
    }

    const quote = data as DailyQuoteRecord

    // Gerar imagem JPEG otimizada com overlay de texto
    const input: QuoteShareImageInput = {
      quoteText: quote.quote_text,
      bibleReference: quote.episode?.bible_reference ?? null,
      baseImageUrl: resolveBaseImageUrl(quote),
    }

    const result = await generateQuoteShareImage(input)

    // Upload para R2 com nome estável
    const r2Key = `daily-quotes/share-images/${quote.id}-quote-share-v1.jpg`

    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: r2Key,
        Body: result.buffer,
        ContentType: 'image/jpeg',
        CacheControl: 'public, max-age=31536000, immutable',
      })
    )

    const publicUrl = `${R2_PUBLIC_URL}/${r2Key}`

    // Atualizar share_image_url no banco
    await supabase
      .from('daily_quotes')
      .update({
        share_image_url: publicUrl,
        share_image_status: 'ready',
        share_image_error: null,
        share_image_generated_at: new Date().toISOString(),
      })
      .eq('id', quote.id)

    return NextResponse.json({
      ok: true,
      daily_quote_id: quote.id,
      share_image_url: publicUrl,
      quote_text: quote.quote_text,
      size_bytes: result.sizeBytes,
      width: result.width,
      height: result.height,
      quality: result.quality,
      r2_key: r2Key,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[share-image] Erro ao gerar share image:', message)

    return NextResponse.json(
      { error: message, share_image_status: 'error' },
      { status: 500 }
    )
  }
}