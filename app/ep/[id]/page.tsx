'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAudio } from '@/components/audio/AudioProvider'
import { getPublicAppUrl } from '@/lib/appUrl'
import { trackAppEvent, type AnalyticsEventName } from '@/lib/analytics/client'
import type { Episode } from '@/lib/supabase'

type EpisodeSeries = {
  id: string
  title: string
  icon_emoji?: string | null
  cover_image_url?: string | null
}

type PublicEpisode = Episode & {
  series?: EpisodeSeries | null
}

function formatDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return 'Áudio devocional'

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  return `${minutes}:${String(remainingSeconds).padStart(2, '0')} min`
}

function MicIcon() {
  return (
    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M19 11a7 7 0 0 1-14 0M12 18v3M8 21h8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg className="ml-1 h-7 w-7" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
    </svg>
  )
}

export default function EpisodePage() {
  const router = useRouter()
  const params = useParams()

  const {
    play,
    togglePlay,
    toggleExpanded,
    currentEpisode,
    isPlaying,
    currentTime,
    duration,
  } = useAudio()

  const [episode, setEpisode] = useState<PublicEpisode | null>(null)
  const [loading, setLoading] = useState(true)
  const publicAudioStartedRef = useRef(false)
  const publicAudioCompletedRef = useRef(false)
  const publicProgressMilestonesRef = useRef<Set<number>>(new Set())

  useEffect(() => {
    publicAudioStartedRef.current = false
    publicAudioCompletedRef.current = false
    publicProgressMilestonesRef.current = new Set()
    loadEpisode()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  useEffect(() => {
    if (!episode || currentEpisode?.id !== episode.id || duration <= 0) return

    const progressPercent = Math.min((currentTime / duration) * 100, 100)

    ;([25, 50, 75] as const).forEach((milestone) => {
      if (
        progressPercent >= milestone &&
        !publicProgressMilestonesRef.current.has(milestone)
      ) {
        publicProgressMilestonesRef.current.add(milestone)
        trackPublicEpisodeEvent(('public_episode_audio_progress_' + milestone) as AnalyticsEventName, {
          position_seconds: Math.floor(currentTime || 0),
          duration_seconds: Math.floor(duration),
          progress_percent: milestone,
        })
      }
    })

    if (progressPercent >= 98 && !publicAudioCompletedRef.current) {
      publicAudioCompletedRef.current = true
      trackPublicEpisodeEvent('public_episode_audio_completed', {
        position_seconds: Math.floor(currentTime || duration || 0),
        duration_seconds: Math.floor(duration),
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episode?.id, currentEpisode?.id, currentTime, duration])

  function getShareParam() {
    if (typeof window === 'undefined') return null

    return new URLSearchParams(window.location.search).get('share')
  }

  function getPublicEpisodeUrl() {
    if (!episode) return ''

    return getPublicAppUrl() + '/ep/' + episode.id + '?share=audio-v5'
  }

  function buildPublicMetadata(extraMetadata: Record<string, unknown> = {}) {
    return {
      title: episode?.title || null,
      bible_reference: episode?.bible_reference || null,
      share_param: getShareParam(),
      path: typeof window !== 'undefined' ? window.location.pathname : null,
      referrer: typeof document !== 'undefined' ? document.referrer || null : null,
      ...extraMetadata,
    }
  }

  function trackPublicEpisodeEvent(
    eventName: AnalyticsEventName,
    metadata: Record<string, unknown> = {}
  ) {
    if (!episode) return

    trackAppEvent(eventName, {
      entityType: 'episode',
      entityId: episode.id,
      source: 'public_episode_page',
      metadata: buildPublicMetadata(metadata),
    })
  }

  function trackPublicAudioStarted(typedEpisode: PublicEpisode) {
    if (publicAudioStartedRef.current) return

    publicAudioStartedRef.current = true
    trackAppEvent('public_episode_audio_started', {
      entityType: 'episode',
      entityId: typedEpisode.id,
      source: 'public_episode_page',
      metadata: {
        title: typedEpisode.title,
        bible_reference: typedEpisode.bible_reference || null,
        share_param: getShareParam(),
        path: typeof window !== 'undefined' ? window.location.pathname : null,
        referrer: typeof document !== 'undefined' ? document.referrer || null : null,
      },
    })
  }

  function buildPlayerEpisode(typedEpisode: PublicEpisode) {
    return {
      id: typedEpisode.id,
      title: typedEpisode.title,
      bible_reference: typedEpisode.bible_reference || '',
      audio_url: typedEpisode.audio_url,

      audio_url_compatible: typedEpisode.audio_url_compatible,
      audio_compatible_type: typedEpisode.audio_compatible_type,

      duration_seconds: typedEpisode.duration_seconds || 0,
      series_title: typedEpisode.series?.title,
      icon_emoji: typedEpisode.series?.icon_emoji || '🎙️',
      transcription_text: typedEpisode.transcription_text,
      transcription_segments: typedEpisode.transcription_segments || null,
    }
  }

  async function loadEpisode() {
    try {
      const episodeId = Array.isArray(params.id) ? params.id[0] : params.id

      const { data, error } = await supabase
        .from('episodes')
        .select(`
          *,
          series:series_id (
            id,
            title,
            icon_emoji,
            cover_image_url
          )
        `)
        .eq('id', episodeId)
        .single()

      if (error) throw error

      const typedEpisode = data as PublicEpisode

      setEpisode(typedEpisode)

      if (typedEpisode) {
        trackAppEvent('public_episode_opened', {
          entityType: 'episode',
          entityId: typedEpisode.id,
          source: 'public_episode_page',
          metadata: {
            title: typedEpisode.title,
            bible_reference: typedEpisode.bible_reference || null,
            share_param: getShareParam(),
            path: typeof window !== 'undefined' ? window.location.pathname : null,
            referrer: typeof document !== 'undefined' ? document.referrer || null : null,
          },
        })
        trackPublicAudioStarted(typedEpisode)
        play(buildPlayerEpisode(typedEpisode))
      }
    } catch (error) {
      console.error('Erro ao carregar episódio:', error)
      setEpisode(null)
    } finally {
      setLoading(false)
    }
  }

  const handlePlay = () => {
    if (!episode) return

    if (currentEpisode?.id === episode.id) {
      if (!isPlaying) {
        trackPublicAudioStarted(episode)
      }
      togglePlay()
      return
    }

    trackPublicAudioStarted(episode)
    play(buildPlayerEpisode(episode))
  }

  const handleOpenPlayer = () => {
    if (!episode) return

    if (currentEpisode?.id !== episode.id) {
      trackPublicAudioStarted(episode)
      play(buildPlayerEpisode(episode))
    }

    toggleExpanded()
  }

  async function handleShareEpisode() {
    if (!episode) return

    const episodeUrl = getPublicEpisodeUrl()
    const message = 'Ouca o devocional de hoje: ' + episodeUrl

    try {
      if (navigator.share) {
        trackPublicEpisodeEvent('public_episode_share_clicked', {
          channel: 'native_share',
          share_param: 'audio-v5',
        })
        await navigator.share({
          title: episode.title,
          text: 'Ouca o devocional de hoje.',
          url: episodeUrl,
        })
        return
      }

      const whatsappUrl = 'https://wa.me/?text=' + encodeURIComponent(message)
      trackPublicEpisodeEvent('public_episode_share_clicked', {
        channel: 'whatsapp',
        share_param: 'audio-v5',
      })

      const opened = window.open(whatsappUrl, '_blank')

      if (!opened) {
        await navigator.clipboard.writeText(episodeUrl)
        alert('Link copiado para compartilhar.')
      }
    } catch (error) {
      try {
        await navigator.clipboard.writeText(episodeUrl)
        alert('Link copiado para compartilhar.')
      } catch (clipboardError) {
        console.error('Erro ao compartilhar episodio:', error, clipboardError)
      }
    }
  }

  function handleReceiveDailyDevotionals() {
    if (episode) {
      trackPublicEpisodeEvent('public_episode_open_app_clicked', {
        share_param: getShareParam(),
        target: 'daily_devotionals_signup',
        source: 'public_episode_page',
      })
    }

    router.push('/cadastro?source=public_episode&episode=' + episode?.id)
  }

  function handleOpenAppHome() {
    if (episode) {
      trackPublicEpisodeEvent('public_episode_open_app_clicked', {
        share_param: getShareParam(),
        target: 'app_home',
        source: 'public_episode_page',
      })
    }

    router.push('/')
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-white">
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-blue-300/20 bg-blue-500/15 text-blue-100">
            <MicIcon />
          </div>

          <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-200">
            Carregando devocional
          </p>
        </div>
      </main>
    )
  }

  if (!episode) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-5 text-white">
        <div className="w-full max-w-md rounded-[30px] border border-white/10 bg-white/[0.04] p-7 text-center shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5 text-3xl">
            !
          </div>

          <h1 className="mb-2 text-2xl font-black">
            Episódio não encontrado
          </h1>

          <p className="mb-6 text-sm leading-relaxed text-slate-300">
            Não conseguimos carregar este devocional agora.
          </p>

          <button
            type="button"
            onClick={handleOpenAppHome}
            className="w-full rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950"
          >
            Abrir app
          </button>
        </div>
      </main>
    )
  }

  const coverImage =
    episode.cover_image_url ||
    episode.series?.cover_image_url ||
    ''

  const isCurrentEpisode = currentEpisode?.id === episode.id
  const isEpisodePlaying = isCurrentEpisode && isPlaying
  const durationLabel = formatDuration(episode.duration_seconds)

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-4 pb-40 pt-6 text-white">
      {coverImage && (
        <img
          src={coverImage}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-25 blur-2xl"
        />
      )}

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.22),transparent_38%),linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,1))]" />

      <section className="relative mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-md flex-col justify-center">
        <div className="overflow-hidden rounded-[34px] border border-white/10 bg-slate-950/78 shadow-[0_24px_80px_rgba(0,0,0,0.54)] backdrop-blur-xl">
          <div className="relative h-[250px] overflow-hidden bg-slate-900">
            {coverImage ? (
              <img
                src={coverImage}
                alt={episode.title}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-slate-950 to-slate-900" />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/38 to-black/10" />
            <div className="absolute inset-0 bg-gradient-to-br from-blue-950/20 via-transparent to-black/45" />

            <div className="absolute left-5 right-5 top-5 flex items-center justify-between gap-3">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-200">
                Áudio devocional
              </p>

              {episode.series?.title && (
                <p className="max-w-[50%] truncate text-right text-[10px] font-black uppercase tracking-[0.12em] text-blue-100">
                  {episode.series.title}
                </p>
              )}
            </div>

            <div className="absolute inset-x-5 bottom-5">
              <p className="mb-2 text-xs font-bold text-blue-100">
                {episode.bible_reference || 'Devocional'}
              </p>

              <h1 className="text-[2rem] font-black leading-[0.98] tracking-[-0.06em] text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.9)]">
                {episode.title}
              </h1>
            </div>
          </div>

          <div className="space-y-5 px-5 py-5">
            <div className="grid grid-cols-3 rounded-[22px] border border-white/10 bg-white/[0.04] p-3 text-center">
              <div>
                <p className="text-[10px] font-bold text-slate-400">
                  Base
                </p>
                <p className="mt-1 truncate text-xs font-black text-white">
                  {episode.bible_reference || 'Devocional'}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400">
                  Duração
                </p>
                <p className="mt-1 text-xs font-black text-white">
                  {durationLabel}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400">
                  Autor
                </p>
                <p className="mt-1 truncate text-xs font-black text-white">
                  Pr. Djeone
                </p>
              </div>
            </div>

            {episode.description && (
              <p className="text-sm leading-relaxed text-slate-300">
                {episode.description}
              </p>
            )}

            <div className="rounded-[26px] border border-blue-300/15 bg-blue-500/10 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-200">
                Ouça agora
              </p>

              <p className="mt-2 text-sm leading-relaxed text-slate-200">
                Dê play e receba uma palavra bíblica para fortalecer seu dia.
              </p>
            </div>

            <div className="grid grid-cols-[72px_1fr] gap-3">
              <button
                type="button"
                onClick={handlePlay}
                className="flex h-[58px] items-center justify-center rounded-2xl bg-white text-blue-700 shadow-[0_18px_45px_rgba(255,255,255,0.14)] active:scale-95"
                aria-label={isEpisodePlaying ? 'Pausar áudio' : 'Tocar áudio'}
              >
                {isEpisodePlaying ? <PauseIcon /> : <PlayIcon />}
              </button>

              <button
                type="button"
                onClick={handleOpenPlayer}
                className="h-[58px] rounded-2xl bg-blue-600 px-5 text-sm font-black text-white shadow-[0_16px_40px_rgba(37,99,235,0.32)] active:scale-[0.98]"
              >
                Abrir player completo
              </button>
            </div>

            <button
              type="button"
              onClick={handleShareEpisode}
              className="w-full rounded-full bg-emerald-500 px-5 py-3 text-sm font-black text-emerald-950 shadow-[0_16px_40px_rgba(16,185,129,0.24)] transition hover:bg-emerald-400 active:scale-[0.98]"
            >
              Compartilhar no WhatsApp
            </button>

            <div className="flex items-center gap-4 rounded-[26px] border border-white/10 bg-white/[0.05] p-4">
              <img
                src="/pastor.png"
                alt="Pr. Djeone Martins"
                className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-1 ring-blue-200/20"
              />

              <div className="min-w-0">
                <p className="text-sm font-black text-white">
                  Com Pr. Djeone Martins
                </p>
                <p className="mt-1 text-sm leading-relaxed text-slate-300">
                  Devocionais bíblicos para fortalecer sua fé todos os dias.
                </p>
              </div>
            </div>

            <div className="rounded-[26px] border border-white/10 bg-slate-900/70 p-4">
              <p className="text-sm font-black text-white">
                No app você encontra:
              </p>

              <ul className="mt-3 space-y-2 text-sm font-semibold leading-6 text-slate-300">
                <li>Devocionais em áudio todos os dias</li>
                <li>Palavra do Dia para compartilhar</li>
                <li>Leitura bíblica e oração</li>
                <li>Séries para crescer na fé</li>
              </ul>
            </div>

            <button
              type="button"
              onClick={handleReceiveDailyDevotionals}
              className="w-full rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-[0_18px_45px_rgba(255,255,255,0.14)] transition hover:bg-blue-100 active:scale-[0.98]"
            >
              Receber devocionais diários
            </button>

            <button
              type="button"
              onClick={handleOpenAppHome}
              className="w-full rounded-full border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              Já tenho conta
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}

