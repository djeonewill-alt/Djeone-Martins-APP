'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Episode } from '@/lib/supabase'
import { useAudio } from '@/components/audio/AudioProvider'
import { usePushNotifications } from '@/lib/notifications/usePushNotifications'
import DailyQuoteCard from '@/components/daily-quote/DailyQuoteCard'

type TabHojeProps = {
  onOpenSeries?: () => void
}

function formatDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) {
    return 'Áudio devocional'
  }

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes <= 0) {
    return `${remainingSeconds}s`
  }

  return `${minutes}:${String(remainingSeconds).padStart(2, '0')} min`
}

export default function TabHoje({ onOpenSeries }: TabHojeProps) {
  const { play, currentEpisode, isPlaying } = useAudio()
  const { isSubscribed, loading: notifLoading, subscribe, unsubscribe } =
    usePushNotifications()

  const [todayEpisode, setTodayEpisode] = useState<Episode | null>(null)
  const [loading, setLoading] = useState(true)
  const [isFavorite, setIsFavorite] = useState(false)
  const [sharingEpisode, setSharingEpisode] = useState(false)

  useEffect(() => {
    loadTodayEpisode()
  }, [])

  const loadTodayEpisode = async () => {
    try {
      const { data, error } = await supabase
        .from('episodes')
        .select(`
          *,
          series:series (
            title,
            icon_emoji,
            cover_image_url
          )
        `)
        .or('status.eq.published,status.is.null')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error('Erro Supabase:', error)
        throw error
      }

      if (data) {
        setTodayEpisode(data as Episode)
        checkFavorite(data.id)
      } else {
        setTodayEpisode(null)
      }
    } catch (error) {
      console.error('Erro ao carregar episódio:', error)
      setTodayEpisode(null)
    } finally {
      setLoading(false)
    }
  }

  const checkFavorite = async (episodeId: string) => {
    const userId = localStorage.getItem('user_id')
    if (!userId) return

    try {
      const { data } = await supabase
        .from('user_favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('episode_id', episodeId)
        .single()

      setIsFavorite(!!data)
    } catch (error) {
      setIsFavorite(false)
    }
  }

  const handleFavorite = async () => {
    if (!todayEpisode) return

    const userId = localStorage.getItem('user_id')

    if (!userId) {
      alert('❌ Faça login para salvar favoritos!')
      return
    }

    try {
      if (isFavorite) {
        await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', userId)
          .eq('episode_id', todayEpisode.id)

        setIsFavorite(false)
      } else {
        await supabase.from('user_favorites').insert({
          user_id: userId,
          episode_id: todayEpisode.id,
        })

        setIsFavorite(true)
      }
    } catch (error) {
      console.error('Erro ao favoritar:', error)
    }
  }

  const handlePlay = () => {
    if (!todayEpisode) return

    play({
      id: todayEpisode.id,
      title: todayEpisode.title,
      bible_reference: todayEpisode.bible_reference || '',
      audio_url: todayEpisode.audio_url,
      duration_seconds: todayEpisode.duration_seconds || 0,
    })
  }

  const handleShareEpisode = async () => {
    if (!todayEpisode) return

    try {
      setSharingEpisode(true)

      const shareText = `🎧 Áudio devocional de hoje

${todayEpisode.title}

${todayEpisode.bible_reference || 'Devocional Diário'}

Pr. Djeone Martins`

      if (navigator.share) {
        await navigator.share({
          title: todayEpisode.title,
          text: shareText,
        })
      } else {
        await navigator.clipboard.writeText(shareText)
        alert('✅ Texto do áudio copiado para compartilhar!')
      }
    } catch (error) {
      console.error('Erro ao compartilhar áudio:', error)
    } finally {
      setSharingEpisode(false)
    }
  }

  const coverImage =
    todayEpisode?.cover_image_url ||
    todayEpisode?.series?.cover_image_url ||
    ''

  const isCurrentEpisodePlaying =
    currentEpisode?.id === todayEpisode?.id && isPlaying

  const durationLabel = formatDuration(todayEpisode?.duration_seconds || 0)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="mb-2 text-4xl">⏳</div>
          <p className="text-slate-400">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!todayEpisode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="p-5 text-center">
          <div className="mb-4 text-6xl">📭</div>

          <h3 className="mb-2 text-xl font-bold text-white">
            Nenhum devocional publicado
          </h3>

          <p className="text-slate-400">
            Aguarde o próximo episódio!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-64 pt-16">
      <div className="mx-auto max-w-2xl p-5">
        <DailyQuoteCard className="mb-6" />

        <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-slate-900/75 p-4 shadow-[0_18px_55px_rgba(0,0,0,0.32)] backdrop-blur-sm">
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-16 h-44 w-44 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_38%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))]" />

          <div className="relative">
            <div className="mb-3">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-300">
                Áudio de hoje
              </p>

              {todayEpisode.series?.title && (
                <button
                  type="button"
                  onClick={onOpenSeries}
                  className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full border border-blue-300/15 bg-blue-500/8 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-blue-100/90 transition-all hover:bg-blue-500/15 active:scale-[0.98]"
                >
                  <span>{todayEpisode.series.icon_emoji}</span>
                  <span className="truncate">{todayEpisode.series.title}</span>
                  <span className="text-blue-200/60">→</span>
                </button>
              )}

              <div className="mt-3 grid grid-cols-3 items-center text-[11px] font-semibold text-slate-400">
                <p className="text-left">
                  {todayEpisode.bible_reference || 'Devocional'}
                </p>

                <p className="text-center">
                  Ep. {todayEpisode.episode_number || 1}
                </p>

                <p className="text-right">
                  {durationLabel}
                </p>
              </div>
            </div>

            <div
              role="button"
              tabIndex={0}
              onClick={handlePlay}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  handlePlay()
                }
              }}
              className="group relative block w-full cursor-pointer overflow-hidden rounded-[26px] border border-white/10 bg-slate-950 text-left shadow-inner outline-none ring-0 transition-all focus:border-blue-300/40"
              style={{
                height: '178px',
                minHeight: '178px',
              }}
              aria-label="Tocar episódio"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-slate-950 to-slate-900" />

              {coverImage && (
                <img
                  src={coverImage}
                  alt={todayEpisode.title}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              )}

              <div className="absolute inset-0 bg-gradient-to-br from-black/22 via-black/18 to-black/75" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/35 to-black/10" />

              <div className="absolute inset-0 flex items-center justify-center px-6">
                <div className="max-w-[92%] text-center">
                  <h3 className="text-[1.05rem] font-black leading-tight tracking-[-0.03em] text-white drop-shadow-[0_3px_12px_rgba(0,0,0,0.82)] sm:text-xl">
                    {todayEpisode.title}
                  </h3>
                </div>
              </div>

              <div className="absolute bottom-3 left-3 right-3 grid grid-cols-3 gap-2">
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      handleFavorite()
                    }}
                    className={
                      isFavorite
                        ? 'flex h-8 w-full max-w-[116px] items-center justify-center gap-1 rounded-full border border-red-300/20 bg-red-500/18 px-2 text-[10px] font-bold text-red-100 backdrop-blur-md transition-all active:scale-[0.98]'
                        : 'flex h-8 w-full max-w-[116px] items-center justify-center gap-1 rounded-full border border-white/12 bg-black/22 px-2 text-[10px] font-bold text-white/82 backdrop-blur-md transition-all hover:bg-white/10 active:scale-[0.98]'
                    }
                  >
                    <span>{isFavorite ? '❤️' : '♡'}</span>
                    <span className="truncate">{isFavorite ? 'Salvo' : 'Favorito'}</span>
                  </button>
                </div>

                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      handleShareEpisode()
                    }}
                    disabled={sharingEpisode}
                    className="flex h-8 w-full max-w-[126px] items-center justify-center gap-1 rounded-full border border-white/12 bg-black/22 px-2 text-[10px] font-bold text-white/82 backdrop-blur-md transition-all hover:bg-white/10 active:scale-[0.98] disabled:opacity-60"
                  >
                    <span>{sharingEpisode ? '…' : '↗'}</span>
                    <span className="truncate">Compartilhar</span>
                  </button>
                </div>

                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      isSubscribed ? unsubscribe() : subscribe()
                    }}
                    disabled={notifLoading}
                    className={
                      isSubscribed
                        ? 'flex h-8 w-full max-w-[116px] items-center justify-center gap-1 rounded-full border border-blue-300/20 bg-blue-500/18 px-2 text-[10px] font-bold text-blue-100 backdrop-blur-md transition-all active:scale-[0.98] disabled:opacity-50'
                        : 'flex h-8 w-full max-w-[116px] items-center justify-center gap-1 rounded-full border border-white/12 bg-black/22 px-2 text-[10px] font-bold text-white/82 backdrop-blur-md transition-all hover:bg-white/10 active:scale-[0.98] disabled:opacity-50'
                    }
                  >
                    <span>{isSubscribed ? '🔔' : '🔕'}</span>
                    <span className="truncate">Lembrete</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}