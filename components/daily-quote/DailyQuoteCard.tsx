'use client'

// DATA-PALAVRA-LAYOUT-V2

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { DailyQuote } from '@/lib/supabase'

function getLocalDateString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getFormattedToday() {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(new Date())
}

type DailyQuoteCardProps = {
  className?: string
}

export default function DailyQuoteCard({ className = '' }: DailyQuoteCardProps) {
  const [quote, setQuote] = useState<DailyQuote | null>(null)
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState(false)
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    const today = getLocalDateString()
    const savedLiked = localStorage.getItem(`daily_quote_liked_${today}`) === 'true'

    setLiked(savedLiked)
    loadDailyQuote()
  }, [])

  const loadDailyQuote = async () => {
    try {
      const today = getLocalDateString()

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
        .eq('date', today)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error('Erro ao carregar Palavra do Dia:', error)
        setQuote(null)
        return
      }

      setQuote(data as DailyQuote | null)
    } catch (error) {
      console.error('Erro inesperado ao carregar Palavra do Dia:', error)
      setQuote(null)
    } finally {
      setLoading(false)
    }
  }

  const handleLike = async () => {
    if (!quote) return

    const today = getLocalDateString()
    const nextLiked = !liked
    const currentLikes = quote.like_count || 0
    const nextLikes = Math.max(0, currentLikes + (nextLiked ? 1 : -1))

    setLiked(nextLiked)
    localStorage.setItem(`daily_quote_liked_${today}`, String(nextLiked))

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
    if (!quote) return

    try {
      setSharing(true)

      const bibleReference = quote.episode?.bible_reference
        ? `\n\nBase bíblica: ${quote.episode.bible_reference}`
        : ''

      const episodeTitle = quote.episode?.title
        ? `\nTema: ${quote.episode.title}`
        : ''

      const shareText = `📖 Palavra do Dia\n\n“${quote.quote_text}”${bibleReference}${episodeTitle}\n\nPr. Djeone Martins`

      if (navigator.share) {
        await navigator.share({
          title: 'Palavra do Dia',
          text: shareText,
        })
      } else {
        await navigator.clipboard.writeText(shareText)
        alert('✅ Palavra copiada para a área de transferência!')
      }

      const nextShareCount = (quote.share_count || 0) + 1

      setQuote({
        ...quote,
        share_count: nextShareCount,
      })

      const { error } = await supabase
        .from('daily_quotes')
        .update({
          share_count: nextShareCount,
        })
        .eq('id', quote.id)

      if (error) {
        console.error('Erro ao atualizar compartilhamentos:', error)
      }
    } catch (error) {
      console.error('Erro ao compartilhar:', error)
    } finally {
      setSharing(false)
    }
  }

  if (loading) {
    return (
      <div className={`mx-auto max-w-[420px] px-4 ${className}`}>
        <div className="animate-pulse">
          <div className="mb-2 h-4 w-36 rounded bg-slate-800" />
          <div className="mb-2 h-7 w-64 rounded bg-slate-800" />
          <div className="mb-5 h-4 w-40 rounded bg-slate-800" />
          <div className="aspect-square w-full rounded-[30px] bg-slate-800" />
        </div>
      </div>
    )
  }

  if (!quote) {
    return null
  }

  const seriesTitle = quote.episode?.series?.title || 'Devocional'
  const episodeTitle = quote.episode?.title || 'Meditação devocional'
  const todayLabel = getFormattedToday()

  const fallbackBackgroundImage =
    quote.background_image_url ||
    quote.episode?.cover_image_url ||
    quote.episode?.series?.cover_image_url ||
    ''

  const ActionButtons = () => (
    <div className="absolute inset-x-0 bottom-0 z-20 h-24">
      <button
        type="button"
        onClick={handleLike}
        aria-label="Curtir Palavra do Dia"
        className={`absolute bottom-4 left-1/4 flex h-9 min-w-[72px] -translate-x-1/2 items-center justify-center gap-2 rounded-full border px-3 text-sm font-semibold text-white/95 backdrop-blur-md transition-all active:scale-[0.96] ${
          liked
            ? 'border-red-300/25 bg-red-500/20'
            : 'border-white/15 bg-black/16 hover:bg-black/26'
        }`}
      >
        <span className="text-base leading-none">{liked ? '❤️' : '♡'}</span>
        <span>{quote.like_count || 0}</span>
      </button>

      <button
        type="button"
        onClick={handleShare}
        disabled={sharing}
        aria-label="Compartilhar Palavra do Dia"
        className="absolute bottom-4 left-3/4 flex h-9 min-w-[72px] -translate-x-1/2 items-center justify-center gap-2 rounded-full border border-white/15 bg-black/16 px-3 text-sm font-semibold text-white/95 backdrop-blur-md transition-all hover:bg-black/26 active:scale-[0.96] disabled:opacity-60"
      >
        <span className="text-base leading-none">{sharing ? '…' : '↗'}</span>
        <span>{quote.share_count || 0}</span>
      </button>
    </div>
  )

  return (
    <section className={`mx-auto max-w-[420px] px-4 ${className}`}>
      <div className="mb-4">
        <p className="text-[12px] font-semibold capitalize tracking-[-0.01em] text-slate-400">
          {todayLabel}
        </p>

        <h2 className="mt-1 text-[1.38rem] font-black leading-tight tracking-[-0.04em] text-white">
          {episodeTitle}
        </h2>

        <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-blue-300/90">
          {seriesTitle}
        </p>
      </div>

      {quote.card_image_url ? (
        <div className="relative overflow-hidden rounded-[30px] bg-slate-900 shadow-[0_16px_50px_rgba(0,0,0,0.34)]">
          <img
            src={quote.card_image_url}
            alt="Palavra do Dia"
            className="aspect-square w-full rounded-[30px] object-cover"
          />

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/36 via-black/10 to-transparent" />

          <ActionButtons />
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-[30px] bg-slate-900 shadow-[0_16px_50px_rgba(0,0,0,0.34)]">
          <div className="relative aspect-square w-full overflow-hidden rounded-[30px]">
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

            <div className="absolute inset-0 bg-black/45" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30" />

            <div className="relative flex h-full flex-col items-center justify-center px-8 pb-10 text-center">
              <div className="mx-auto max-w-[290px]">
                <div className="mb-4 text-5xl leading-none text-white/22">“</div>

                <blockquote className="text-[2rem] font-black leading-[1.18] tracking-[-0.02em] text-white drop-shadow-[0_3px_10px_rgba(0,0,0,0.35)]">
                  {quote.quote_text}
                </blockquote>

                <div className="mt-4 text-5xl leading-none text-white/22">”</div>
              </div>
            </div>

            <div className="absolute inset-x-0 bottom-14 px-6 text-center">
              <p className="text-sm font-bold text-white">
                {quote.episode?.bible_reference || 'Palavra do Dia'}
              </p>

              <p className="mt-1 text-xs text-white/70">
                Pr. Djeone Martins
              </p>
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/36 via-black/10 to-transparent" />

            <ActionButtons />
          </div>
        </div>
      )}
    </section>
  )
}