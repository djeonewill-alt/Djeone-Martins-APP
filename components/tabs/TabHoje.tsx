'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Episode } from '@/lib/supabase'
import { useAudio } from '@/components/audio/AudioProvider'
import { usePushNotifications } from '@/lib/notifications/usePushNotifications'
import DailyQuoteCard from '@/components/daily-quote/DailyQuoteCard'
import TodayAudioCard from '@/components/tabs/TodayAudioCard'

type TabHojeProps = {
  onOpenSeries?: () => void
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
      console.error('Erro ao carregar episÃ³dio:', error)
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
      alert('âŒ FaÃ§a login para salvar favoritos!')
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
      transcription_text: todayEpisode.transcription_text || null,
      transcription_segments: todayEpisode.transcription_segments || null,
    })
  }

  const handleShareEpisode = async () => {
    if (!todayEpisode) return

    try {
      setSharingEpisode(true)

      const shareText = `ðŸŽ§ Ãudio devocional de hoje

${todayEpisode.title}

${todayEpisode.bible_reference || 'Devocional DiÃ¡rio'}

Pr. Djeone Martins`

      if (navigator.share) {
        await navigator.share({
          title: todayEpisode.title,
          text: shareText,
        })
      } else {
        await navigator.clipboard.writeText(shareText)
        alert('âœ… Texto do Ã¡udio copiado para compartilhar!')
      }
    } catch (error) {
      console.error('Erro ao compartilhar Ã¡udio:', error)
    } finally {
      setSharingEpisode(false)
    }
  }

  const isCurrentEpisodePlaying =
    currentEpisode?.id === todayEpisode?.id && isPlaying

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="mb-2 text-4xl">â³</div>
          <p className="text-slate-400">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!todayEpisode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="p-5 text-center">
          <div className="mb-4 text-6xl">ðŸ“­</div>

          <h3 className="mb-2 text-xl font-bold text-white">
            Nenhum devocional publicado
          </h3>

          <p className="text-slate-400">
            Aguarde o prÃ³ximo episÃ³dio!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-64 pt-16">
      <div className="mx-auto max-w-2xl p-5">
        <DailyQuoteCard className="mb-6" />

        <TodayAudioCard
          episode={todayEpisode}
          isFavorite={isFavorite}
          isPlaying={isCurrentEpisodePlaying}
          isSubscribed={isSubscribed}
          notifLoading={notifLoading}
          sharingEpisode={sharingEpisode}
          onPlay={handlePlay}
          onFavorite={handleFavorite}
          onShare={handleShareEpisode}
          onToggleNotifications={isSubscribed ? unsubscribe : subscribe}
          onOpenSeries={onOpenSeries}
        />
      </div>
    </div>
  )
}
