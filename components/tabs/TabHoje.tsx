'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Episode } from '@/lib/supabase'
import { useAudio } from '@/components/audio/AudioProvider'
import { usePushNotifications } from '@/lib/notifications/usePushNotifications'
import DailyQuoteCard from '@/components/daily-quote/DailyQuoteCard'
import TodayAudioCard from '@/components/tabs/TodayAudioCard'
import TodayActionCard from '@/components/tabs/today/TodayActionCard'
import { getChapterKey } from './reading/bibleData'
import {
  estimateReadingMinutes,
  getCurrentPlanDay,
  getPlanById,
  getPlanReadingsForDay,
} from './reading/planUtils'
import {
  DEFAULT_READING_STATE,
  loadReadingState,
} from './reading/storage'
import type { ReadingState } from './reading/types'
import { TODAY_PRAYER_GUIDE } from './prayer/mockData'

type TabHojeProps = {
  onOpenSeries?: () => void
  onOpenReading?: () => void
  onOpenPrayer?: () => void
}

export default function TabHoje({
  onOpenSeries,
  onOpenReading,
  onOpenPrayer,
}: TabHojeProps) {
  const { play, currentEpisode, isPlaying } = useAudio()
  const { isSubscribed, loading: notifLoading, subscribe, unsubscribe } =
    usePushNotifications()

  const [todayEpisode, setTodayEpisode] = useState<Episode | null>(null)
  const [loading, setLoading] = useState(true)
  const [isFavorite, setIsFavorite] = useState(false)
  const [sharingEpisode, setSharingEpisode] = useState(false)
  const [readingState, setReadingState] = useState<ReadingState>(
    DEFAULT_READING_STATE
  )

  useEffect(() => {
    loadTodayEpisode()
    setReadingState(loadReadingState())
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
    } catch {
      setIsFavorite(false)
    }
  }

  const handleFavorite = async () => {
    if (!todayEpisode) return

    const userId = localStorage.getItem('user_id')

    if (!userId) {
      alert('Faça seu cadastro para salvar favoritos.')
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
      alert('Não foi possível atualizar o favorito agora.')
    }
  }

  const handlePlay = () => {
    if (!todayEpisode?.audio_url) return

    play({
      id: todayEpisode.id,
      title: todayEpisode.title,
      bible_reference: todayEpisode.bible_reference || '',
      audio_url: todayEpisode.audio_url,
      duration_seconds: todayEpisode.duration_seconds || 0,
      icon_emoji: todayEpisode.series?.icon_emoji,
      series_title: todayEpisode.series?.title,
      transcription_text: todayEpisode.transcription_text || null,
      transcription_segments: todayEpisode.transcription_segments || null,
    })
  }

  const handleShareEpisode = async () => {
    if (!todayEpisode || sharingEpisode) return

    setSharingEpisode(true)

    try {
      const episodeUrl = `${window.location.origin}/ep/${todayEpisode.id}`
      const shareText = `Áudio devocional de hoje

${todayEpisode.title}

${todayEpisode.bible_reference || 'Devocional Diário'}

Pr. Djeone Martins`
      const shareTextWithLink = `${shareText}

${episodeUrl}`

      if (navigator.share) {
        await navigator.share({
          title: todayEpisode.title,
          text: shareText,
          url: episodeUrl,
        })
      } else {
        await navigator.clipboard.writeText(shareTextWithLink)
        alert('Texto do áudio copiado para compartilhar!')
      }

      const currentShareCount = Number(localStorage.getItem('djeone-share-count-v1') || 0)
      localStorage.setItem('djeone-share-count-v1', String(currentShareCount + 1))
    } catch (error) {
      console.error('Erro ao compartilhar áudio:', error)
    } finally {
      setSharingEpisode(false)
    }
  }

  const readingSummary = useMemo(() => {
    const activePlan = getPlanById(readingState.activePlanId)

    if (!activePlan) {
      return {
        title: 'Escolha seu plano de leitura',
        subtitle: 'Comece hoje uma jornada bíblica diária.',
        meta: 'Abrir leitura',
      }
    }

    const currentDay = getCurrentPlanDay(
      readingState.activePlanStartedAt,
      activePlan.days
    )

    const readingsToday = getPlanReadingsForDay(activePlan, currentDay)
    const completedToday = readingsToday.filter((chapter) =>
      Boolean(
        readingState.readChapters[
          getChapterKey(chapter.bookId, chapter.chapter)
        ]
      )
    ).length

    const firstReading = readingsToday[0]
    const estimatedMinutes = estimateReadingMinutes(readingsToday.length)

    return {
      title: firstReading
        ? `${firstReading.bookName} ${firstReading.chapter}`
        : activePlan.title,
      subtitle: `${activePlan.title} · Dia ${currentDay} de ${activePlan.days}`,
      meta: `${completedToday}/${readingsToday.length} concluído · ${estimatedMinutes}min`,
    }
  }, [readingState])

  const isCurrentEpisodePlaying =
    currentEpisode?.id === todayEpisode?.id && isPlaying

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
          <div className="mb-4 text-6xl">📖</div>

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
      <div className="mx-auto w-full max-w-2xl px-5 py-6">
        <section className="mb-6">
          <p className="text-xs font-bold text-blue-200">
            Terça-Feira, 05 De Maio
          </p>

          <h1 className="mt-2 max-w-xl text-3xl font-black leading-[0.98] tracking-[-0.06em] text-white">
            {todayEpisode.title}
          </h1>

          {todayEpisode.series?.title && (
            <p className="mt-2 text-[11px] font-black uppercase tracking-[0.26em] text-blue-300">
              {todayEpisode.series.title}
            </p>
          )}
        </section>

        <div className="space-y-6">
          <div className="[&>*]:!mx-0 [&>*]:!w-full [&>*]:!max-w-none">
            <DailyQuoteCard className="w-full max-w-none" />
          </div>

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

          <TodayActionCard
            eyebrow="Leitura de hoje"
            title={readingSummary.title}
            subtitle={readingSummary.subtitle}
            meta={readingSummary.meta}
            icon="📖"
            accent="blue"
            onClick={onOpenReading || (() => {})}
          />

          <TodayActionCard
            eyebrow="Oração de hoje"
            title={TODAY_PRAYER_GUIDE.title}
            subtitle={`${TODAY_PRAYER_GUIDE.bibleReference} · ${TODAY_PRAYER_GUIDE.subtitle}`}
            meta={`${TODAY_PRAYER_GUIDE.estimatedMinutes}min guiados`}
            icon="🙏"
            accent="gold"
            onClick={onOpenPrayer || (() => {})}
          />
        </div>
      </div>
    </div>
  )
}

