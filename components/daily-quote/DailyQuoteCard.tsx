'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { DailyQuote } from '@/lib/supabase'
import { formatQuoteTextForDisplay } from '@/lib/daily-quote-card-generator'
import { trackAppEvent } from '@/lib/analytics/client'
import { getPublicAppUrl } from '@/lib/appUrl'

type DailyQuoteCardProps = {
  className?: string
}

export default function DailyQuoteCard({ className = '' }: DailyQuoteCardProps) {
  const [quote, setQuote] = useState<DailyQuote | null>(null)
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState(false)
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    loadDailyQuote()
  }, [])

  useEffect(() => {
    if (!quote?.id) return

    const savedLiked =
      localStorage.getItem(`daily_quote_liked_${quote.id}`) === 'true'

    setLiked(savedLiked)
  }, [quote?.id])

  const loadDailyQuote = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_quotes')
        .select(`
          id,
          episode_id,
          quote_background_id,
          quote_text,
          background_image_url,
          card_image_url,
          date,
          status,
          scheduled_publish_at,
          published_at,
          source_type,
          ai_suggestions,
          selected_suggestion_index,
          share_count,
          like_count,
          created_at,
          theme_keywords,
          source_image_provider,
          source_image_url,
          selected_template,
          generated_card_options,
          card_generation_status,
          card_generation_error,
          card_generated_at,
          episode:episodes (
            id,
            title,
            bible_reference,
            cover_image_url,
            series:series (
              title,
              icon_emoji,
              cover_image_url
            )
          )
        `)
        .eq('status', 'published')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error

      setQuote(data as DailyQuote | null)
    } catch (error) {
      console.error('Erro ao carregar Palavra do Dia:', error)
      setQuote(null)
    } finally {
      setLoading(false)
    }
  }

  const handleLike = async () => {
    if (!quote) return

    const nextLiked = !liked
    const currentLikes = quote.like_count || 0
    const nextLikes = Math.max(0, currentLikes + (nextLiked ? 1 : -1))

    setLiked(nextLiked)
    localStorage.setItem(`daily_quote_liked_${quote.id}`, String(nextLiked))

    setQuote({
      ...quote,
      like_count: nextLikes,
    })

    const { error } = await supabase
      .from('daily_quotes')
      .update({
        like_count: nextLikes,
      })
      .eq('id', quote.id)

    if (error) {
      console.error('Erro ao atualizar curtida:', error)
    }
  }

  const handleShare = async () => {
    if (!quote || sharing) return

    setSharing(true)

    try {
      const quoteUrl = `${getPublicAppUrl()}/palavra/${quote.id}?share=quote-v25`

      let shouldCountShare = false

      if (navigator.share) {
        trackAppEvent('quote_share_clicked', {
          entityType: 'daily_quote',
          entityId: quote.id,
          source: 'daily_quote_card',
          metadata: {
            channel: 'native_share',
            entity: 'daily_quote',
          },
        })

        try {
          await navigator.share({
            url: quoteUrl,
          })

          shouldCountShare = window.confirm(
            'Você concluiu o compartilhamento da Palavra do Dia?'
          )
        } catch (shareError) {
          const errorName =
            shareError instanceof Error ? shareError.name : ''

          if (errorName !== 'AbortError') {
            console.error('Erro ao abrir compartilhamento:', shareError)
          }

          return
        }
      } else {
        trackAppEvent('quote_share_clicked', {
          entityType: 'daily_quote',
          entityId: quote.id,
          source: 'daily_quote_card',
          metadata: {
            channel: 'clipboard',
            entity: 'daily_quote',
          },
        })

        await navigator.clipboard.writeText(quoteUrl)
        alert('Link da Palavra do Dia copiado para compartilhar.')
        shouldCountShare = true
      }

      if (!shouldCountShare) return

      const nextShareCount = (quote.share_count || 0) + 1

      setQuote({
        ...quote,
        share_count: nextShareCount,
      })

      await supabase
        .from('daily_quotes')
        .update({
          share_count: nextShareCount,
        })
        .eq('id', quote.id)
    } catch (error) {
      console.error('Erro ao compartilhar Palavra do Dia:', error)
    } finally {
      setSharing(false)
    }
  }
  if (loading) {
    return (
      <section className={`w-full ${className}`}>
        <div className="h-[360px] w-full animate-pulse rounded-[30px] bg-slate-900/80" />
      </section>
    )
  }

  if (!quote) return null

  const fallbackBackgroundImage =
    quote.background_image_url ||
    quote.source_image_url ||
    quote.episode?.cover_image_url ||
    quote.episode?.series?.cover_image_url ||
    ''

  const likeIcon = liked ? '\u2665' : '\u2661'
  const shareIcon = sharing ? '...' : '\u2197'
  const displayQuoteText = formatQuoteTextForDisplay(quote.quote_text)

  return (
    <section className={`w-full ${className}`}>
      {quote.card_image_url ? (
        <div className="relative w-full overflow-hidden rounded-[30px] bg-slate-950 shadow-[0_18px_55px_rgba(0,0,0,0.32)]">
          <img
            src={quote.card_image_url}
            alt="Palavra do Dia"
            className="block aspect-square w-full object-contain"
          />

          <div className="absolute inset-x-0 bottom-5 flex items-center justify-between px-10 sm:px-14">
            <button
              type="button"
              onClick={handleLike}
              aria-label="Curtir Palavra do Dia"
              className="flex h-9 min-w-[72px] items-center justify-center gap-2 rounded-full border border-white/20 bg-black/35 px-3 text-sm font-semibold text-white/95 backdrop-blur-sm transition-all hover:bg-black/45 active:scale-[0.96]"
            >
              <span className="text-base leading-none">{likeIcon}</span>
              <span>{quote.like_count || 0}</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              disabled={sharing}
              aria-label="Compartilhar Palavra do Dia"
              className="flex h-9 min-w-[72px] items-center justify-center gap-2 rounded-full border border-white/20 bg-black/35 px-3 text-sm font-semibold text-white/95 backdrop-blur-sm transition-all hover:bg-black/45 active:scale-[0.96] disabled:opacity-60"
            >
              <span className="text-base leading-none">{shareIcon}</span>
              <span>{quote.share_count || 0}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="relative w-full overflow-hidden rounded-[30px] bg-slate-900 shadow-[0_18px_55px_rgba(0,0,0,0.32)]">
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[30px] sm:aspect-square">
            {fallbackBackgroundImage ? (
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `url(${fallbackBackgroundImage})`,
                }}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-slate-950 to-slate-900" />
            )}

            <div className="absolute inset-0 bg-black/50" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/50" />

            <div className="relative flex h-full flex-col items-center justify-center px-7 pb-20 pt-10 text-center sm:px-8 sm:pb-16">
              <p className="mb-5 text-[11px] font-black uppercase tracking-[0.22em] text-blue-200">
                Palavra do Dia
              </p>

              <blockquote className="max-w-[92%] text-[clamp(1.45rem,8vw,1.85rem)] font-black leading-[1.12] text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.82)]">
                {displayQuoteText}
              </blockquote>

              {quote.episode?.bible_reference && (
                <p className="mt-6 text-sm font-black text-blue-100">
                  {quote.episode.bible_reference}
                </p>
              )}
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/52 via-black/10 to-transparent" />

            <button
              type="button"
              onClick={handleLike}
              aria-label="Curtir Palavra do Dia"
              className="absolute bottom-4 left-1/4 flex h-9 min-w-[72px] -translate-x-1/2 items-center justify-center gap-2 rounded-full border border-white/15 bg-black/18 px-3 text-sm font-semibold text-white/95 backdrop-blur-md transition-all hover:bg-black/28 active:scale-[0.96]"
            >
              <span className="text-base leading-none">{likeIcon}</span>
              <span>{quote.like_count || 0}</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              disabled={sharing}
              aria-label="Compartilhar Palavra do Dia"
              className="absolute bottom-4 left-3/4 flex h-9 min-w-[72px] -translate-x-1/2 items-center justify-center gap-2 rounded-full border border-white/15 bg-black/18 px-3 text-sm font-semibold text-white/95 backdrop-blur-md transition-all hover:bg-black/28 active:scale-[0.96] disabled:opacity-60"
            >
              <span className="text-base leading-none">{shareIcon}</span>
              <span>{quote.share_count || 0}</span>
            </button>
          </div>
        </div>
      )}
    </section>
  )
}






















