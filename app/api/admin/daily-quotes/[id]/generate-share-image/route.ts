/**
 * AI-MEDIA-004 — Rota de compartilhamento simplificada com FLUX Schnell.
 *
 * O FLUX Schnell já gera a imagem final com texto embutido nativamente,
 * comprimida em WebP (~50-80 KB) e salva no R2. Esta rota apenas
 * consulta o registro da daily_quote e retorna a URL já existente.
 *
 * Não há mais processamento Canvas (@napi-rs/canvas/sharp) — a imagem
 * já está pronta para compartilhamento no WhatsApp.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

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

/**
 * Resolve a melhor URL de imagem para compartilhamento, na ordem:
 * 1. background_image_url (FLUX Schnell)
 * 2. source_image_url
 * 3. episode cover > series cover
 * 4. card_image_url
 * 5. Fallback: imagem padrão do app
 */
function getShareImageUrl(quote: DailyQuoteRecord): string {
  const url =
    quote.background_image_url ||
    quote.source_image_url ||
    quote.episode?.cover_image_url ||
    quote.episode?.series?.cover_image_url ||
    quote.card_image_url

  if (url) return url

  // Fallback: imagem padrão do app
  return '/vencendo-tempestades.jpg'
}

// ---------------------------------------------------------------------------
// Rota
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest, { params }: RouteProps) {
  const authError = getAdminAuthError(request)
  if (authError) return authError

  const { id } = await params

  if (!uuidPattern.test(id)) {
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
    const shareImageUrl = getShareImageUrl(quote)

    // Se share_image_url no banco está desatualizado, atualiza com a URL do FLUX
    if (shareImageUrl && shareImageUrl !== quote.share_image_url) {
      try {
        await supabase
          .from('daily_quotes')
          .update({
            share_image_url: shareImageUrl,
            share_image_status: 'ready',
            share_image_error: null,
            share_image_generated_at: new Date().toISOString(),
          })
          .eq('id', quote.id)
      } catch (updateError) {
        console.error('[share-image] Erro ao atualizar share_image_url:', updateError)
        // Não quebra — a URL foi retornada mesmo assim
      }
    }

    return NextResponse.json({
      ok: true,
      daily_quote_id: quote.id,
      share_image_url: shareImageUrl,
      quote_text: quote.quote_text,
      source: shareImageUrl === (quote.background_image_url || quote.source_image_url)
        ? 'flux'
        : 'fallback',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[share-image] Erro:', message)

    return NextResponse.json(
      { error: message, share_image_status: 'error' },
      { status: 500 }
    )
  }
}