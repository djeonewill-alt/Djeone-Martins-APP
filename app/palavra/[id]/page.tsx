import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

type RouteParams = {
  id: string
}

type PageProps = {
  params: Promise<RouteParams>
}

type PublicDailyQuote = {
  id: string
  quote_text: string
  card_image_url?: string | null
  background_image_url?: string | null
  source_image_url?: string | null
  date?: string | null
  episode?: {
    id?: string | null
    title?: string | null
    bible_reference?: string | null
    cover_image_url?: string | null
    duration_seconds?: number | null
    series?: {
      title?: string | null
      icon_emoji?: string | null
      cover_image_url?: string | null
    } | null
  } | null
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

function getBaseUrl() {
  const explicitUrl =
    process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL

  if (explicitUrl) {
    return explicitUrl.replace(/\/+$/, '')
  }

  const vercelUrl =
    process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL

  if (vercelUrl) {
    return `https://${vercelUrl.replace(/^https?:\/\//, '')}`.replace(/\/+$/, '')
  }

  return 'http://localhost:3000'
}

function normalizeText(text?: string | null) {
  return (text || '').replace(/\s+/g, ' ').trim()
}

function buildDescription(quote?: PublicDailyQuote | null) {
  const text = normalizeText(quote?.quote_text)

  if (!text) {
    return 'Receba uma Palavra do Dia para fortalecer sua fé.'
  }

  return text.length > 170 ? `${text.slice(0, 167)}...` : text
}

function formatDuration(seconds?: number | null) {
  if (!seconds) return ''

  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60

  return `${minutes}:${String(rest).padStart(2, '0')}`
}

async function getDailyQuote(id: string): Promise<PublicDailyQuote | null> {
  if (!isUuid(id)) return null

  const supabase = createSupabaseAdminClient()

  const { data, error } = await supabase
    .from('daily_quotes')
    .select(`
      id,
      quote_text,
      card_image_url,
      background_image_url,
      source_image_url,
      date,
      status,
      episode:episodes (
        id,
        title,
        bible_reference,
        cover_image_url,
        duration_seconds,
        series:series (
          title,
          icon_emoji,
          cover_image_url
        )
      )
    `)
    .eq('id', id)
    .eq('status', 'published')
    .maybeSingle()

  if (error) {
    console.error('Erro ao carregar página pública da Palavra do Dia:', error)
    return null
  }

  return data as PublicDailyQuote | null
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params
  const quote = await getDailyQuote(id)
  const baseUrl = getBaseUrl()

  const pageUrl = `${baseUrl}/palavra/${id}?share=quote-v24`
  const imageUrl = `${baseUrl}/api/og/quote/${id}?v=quote-og-v24`
  const title = 'Palavra do Dia | Pr. Djeone Martins'
  const description = buildDescription(quote)

  if (!quote) {
    return {
      title,
      description: 'Palavra do Dia não encontrada.',
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  return {
    title,
    description,
    alternates: {
      canonical: `/palavra/${id}`,
    },
    openGraph: {
      title,
      description,
      type: 'website',
      url: pageUrl,
      siteName: 'Pr. Djeone Martins',
      images: [
        {
          url: imageUrl,
          width: 800,
          height: 420,
          alt: 'Palavra do Dia',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  }
}

export default async function PalavraDoDiaPage({ params }: PageProps) {
  const { id } = await params
  const quote = await getDailyQuote(id)

  if (!quote) {
    notFound()
  }

  const imageUrl =
    quote.card_image_url ||
    quote.background_image_url ||
    quote.source_image_url ||
    quote.episode?.cover_image_url ||
    quote.episode?.series?.cover_image_url ||
    ''

  const audioThumb =
    quote.episode?.cover_image_url ||
    quote.episode?.series?.cover_image_url ||
    imageUrl

  const duration = formatDuration(quote.episode?.duration_seconds)
  const episodeHref = quote.episode?.id
    ? `/ep/${quote.episode.id}?from=palavra&share=quote-v4`
    : '/'

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.20),transparent_35%),linear-gradient(135deg,#020617,#0f172a_52%,#020617)] px-4 py-6 text-white">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md flex-col justify-center">
        <div className="overflow-hidden rounded-[34px] border border-white/10 bg-slate-950/70 shadow-[0_24px_80px_rgba(0,0,0,0.50)]">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Palavra do Dia"
              className="aspect-square w-full bg-slate-950 object-contain"
            />
          ) : (
            <div className="flex aspect-square w-full flex-col items-center justify-center bg-gradient-to-br from-blue-950 via-slate-950 to-slate-900 px-8 text-center">
              <p className="mb-5 text-xs font-black uppercase tracking-[0.24em] text-blue-200">
                Palavra do Dia
              </p>

              <blockquote className="text-3xl font-black leading-tight text-white">
                “{quote.quote_text}”
              </blockquote>

              {quote.episode?.bible_reference && (
                <p className="mt-6 text-sm font-bold text-blue-100">
                  {quote.episode.bible_reference}
                </p>
              )}
            </div>
          )}

          <div className="space-y-5 px-5 py-5">
            <div className="text-center">
              <p className="text-sm font-black text-white">
                Pr. Djeone Martins
              </p>
              <p className="mt-1 text-xs font-medium text-slate-400">
                Devocional Diário
              </p>
            </div>

            {quote.episode?.id && (
              <div className="rounded-[26px] border border-white/10 bg-white/[0.05] p-4">
                <p className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-blue-200">
                  Ouça o devocional completo
                </p>

                <div className="flex gap-3">
                  {audioThumb && (
                    <img
                      src={audioThumb}
                      alt="Áudio devocional"
                      className="h-20 w-20 rounded-2xl object-cover"
                    />
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-black leading-snug text-white">
                      {quote.episode.title || 'Áudio devocional'}
                    </p>

                    {quote.episode.bible_reference && (
                      <p className="mt-1 text-xs font-bold text-blue-100">
                        {quote.episode.bible_reference}
                      </p>
                    )}

                    {duration && (
                      <p className="mt-1 text-xs text-slate-400">
                        Duração: {duration}
                      </p>
                    )}
                  </div>
                </div>

                <Link
                  href={episodeHref}
                  className="mt-4 block rounded-full bg-blue-600 px-5 py-3 text-center text-sm font-black text-white transition hover:bg-blue-500"
                >
                  Ouvir devocional
                </Link>
              </div>
            )}

            <Link
              href="/"
              className="block rounded-full bg-white px-5 py-3 text-center text-sm font-black text-slate-950 transition hover:bg-blue-100"
            >
              Abrir app
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}


















