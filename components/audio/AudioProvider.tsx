'use client'
import { getPreferredAudioUrl } from '@/lib/audio/compatibleAudio'
import { trackAppEvent } from '@/lib/analytics/client'

import { createContext, useContext, useState, useRef, useEffect } from 'react'

type TranscriptionSegment = {
  start: number
  end: number
  text: string
}

type Episode = {
  id: string
  title: string
  bible_reference: string
  audio_url: string
  audio_url_compatible?: string | null
  audio_compatible_type?: string | null
  duration_seconds: number
  icon_emoji?: string
  series_title?: string
  transcription_text?: string | null
  transcription_segments?: TranscriptionSegment[] | null
}

type AudioContextType = {
  currentEpisode: Episode | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  playbackRate: number
  isExpanded: boolean
  play: (episode: Episode) => void
  pause: () => void
  togglePlay: () => void
  seek: (time: number) => void
  setVolume: (volume: number) => void
  setPlaybackRate: (rate: number) => void
  toggleExpanded: () => void
}

const AudioContext = createContext<AudioContextType | undefined>(undefined)

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(1)
  const [playbackRate, setPlaybackRateState] = useState(1)
  const [isExpanded, setIsExpanded] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const currentEpisodeRef = useRef<Episode | null>(null)
  const progressMilestonesRef = useRef<Record<string, Set<number>>>({})

  useEffect(() => {
  const audio = new Audio()
  audioRef.current = audio

  audio.addEventListener('timeupdate', () => {
    setCurrentTime(audio.currentTime)

    const episode = currentEpisodeRef.current
    const totalDuration =
      Number.isFinite(audio.duration) && audio.duration > 0
        ? audio.duration
        : episode?.duration_seconds || 0

    if (episode && totalDuration > 0) {
      const progressPercent = Math.min((audio.currentTime / totalDuration) * 100, 100)
      const completedMilestones =
        progressMilestonesRef.current[episode.id] || new Set<number>()

      ;([25, 50, 75] as const).forEach((milestone) => {
        if (progressPercent >= milestone && !completedMilestones.has(milestone)) {
          completedMilestones.add(milestone)
          progressMilestonesRef.current[episode.id] = completedMilestones

          trackAppEvent(`audio_progress_${milestone}`, {
            entityType: 'episode',
            entityId: episode.id,
            source: 'audio_provider',
            metadata: {
              title: episode.title,
              position_seconds: Math.floor(audio.currentTime || 0),
              duration_seconds: Math.floor(totalDuration),
              progress_percent: milestone,
            },
          })
        }
      })
    }
    
    // Se duraÃ§Ã£o Ã© Infinity, tentar pegar do currentTime mÃ¡ximo
    if (!isFinite(audio.duration) || audio.duration === 0) {
      if (audio.seekable.length > 0) {
        const seekableDuration = audio.seekable.end(0)
        if (isFinite(seekableDuration) && seekableDuration > 0) {
          setDuration(seekableDuration)
        }
      }
    }
  })

  audio.addEventListener('loadedmetadata', () => {
    console.log('ðŸ“Š Metadata carregado!')
    console.log('â±ï¸ DuraÃ§Ã£o do arquivo:', audio.duration)
    
    const audioDuration = audio.duration
    
    // Validar duraÃ§Ã£o
    if (isFinite(audioDuration) && audioDuration > 0) {
      console.log('âœ… DuraÃ§Ã£o vÃ¡lida:', audioDuration)
      setDuration(audioDuration)
    } else {
      console.log('âŒ DuraÃ§Ã£o invÃ¡lida (Infinity ou 0)')
      // Tentar pegar de seekable
      if (audio.seekable.length > 0) {
        const seekableDuration = audio.seekable.end(0)
        console.log('ðŸ” Tentando seekable.end:', seekableDuration)
        if (isFinite(seekableDuration) && seekableDuration > 0) {
          setDuration(seekableDuration)
        }
      }
    }
  })

  audio.addEventListener('durationchange', () => {
    console.log('ðŸ”„ DuraÃ§Ã£o mudou:', audio.duration)
    if (isFinite(audio.duration) && audio.duration > 0) {
      setDuration(audio.duration)
    }
  })

  audio.addEventListener('ended', () => {
    const episode = currentEpisodeRef.current
    const totalDuration =
      Number.isFinite(audio.duration) && audio.duration > 0
        ? audio.duration
        : episode?.duration_seconds || 0

    if (episode) {
      trackAppEvent('audio_completed', {
        entityType: 'episode',
        entityId: episode.id,
        source: 'audio_provider',
        metadata: {
          title: episode.title,
          position_seconds: Math.floor(totalDuration || audio.currentTime || 0),
          duration_seconds: Math.floor(totalDuration || 0),
        },
      })
    }

    setIsPlaying(false)
    setCurrentTime(0)
  })

  return () => {
    audio.pause()
    audio.src = ''
    currentEpisodeRef.current = null
  }
}, [])

  const play = (episode: Episode) => {
  if (!audioRef.current) return

  currentEpisodeRef.current = episode

  if (currentEpisode?.id !== episode.id) {
    audioRef.current.src = getPreferredAudioUrl(episode)
    setCurrentEpisode(episode)
    setCurrentTime(0)
    
    // IMPORTANTE: Usar duration_seconds do banco SEMPRE
    console.log('ðŸŽµ Tocando episÃ³dio:', episode.title)
    console.log('â±ï¸ DuraÃ§Ã£o do banco:', episode.duration_seconds, 'segundos')
    
    if (episode.duration_seconds && episode.duration_seconds > 0) {
      setDuration(episode.duration_seconds)
    } else {
      console.warn('âš ï¸ EpisÃ³dio sem duraÃ§Ã£o no banco!')
      setDuration(0)
    }
  }

  trackAppEvent('audio_started', {
    entityType: 'episode',
    entityId: episode.id,
    source: 'audio_provider',
    metadata: {
      title: episode.title,
      bible_reference: episode.bible_reference || null,
      series_title: episode.series_title || null,
      duration_seconds: episode.duration_seconds || 0,
    },
  })

  audioRef.current.play()
  setIsPlaying(true)
}

  const pause = () => {
    if (!audioRef.current) return

    const episode = currentEpisodeRef.current

    if (episode && !audioRef.current.paused) {
      const totalDuration =
        Number.isFinite(audioRef.current.duration) && audioRef.current.duration > 0
          ? audioRef.current.duration
          : episode.duration_seconds || 0

      trackAppEvent('audio_paused', {
        entityType: 'episode',
        entityId: episode.id,
        source: 'audio_provider',
        metadata: {
          title: episode.title,
          position_seconds: Math.floor(audioRef.current.currentTime || 0),
          duration_seconds: Math.floor(totalDuration || 0),
        },
      })
    }

    audioRef.current.pause()
    setIsPlaying(false)
  }

  const togglePlay = () => {
    if (isPlaying) {
      pause()
    } else if (currentEpisode) {
      play(currentEpisode)
    }
  }

  const seek = (time: number) => {
    if (!audioRef.current) return
    // Validar tempo antes de aplicar
    if (isFinite(time) && time >= 0) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const setVolume = (vol: number) => {
    if (!audioRef.current) return
    audioRef.current.volume = vol
    setVolumeState(vol)
  }

  const setPlaybackRate = (rate: number) => {
    if (!audioRef.current) return
    audioRef.current.playbackRate = rate
    setPlaybackRateState(rate)
  }

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    <AudioContext.Provider
      value={{
        currentEpisode,
        isPlaying,
        currentTime,
        duration,
        volume,
        playbackRate,
        isExpanded,
        play,
        pause,
        togglePlay,
        seek,
        setVolume,
        setPlaybackRate,
        toggleExpanded,
      }}
    >
      {children}
    </AudioContext.Provider>
  )
}

export function useAudio() {
  const context = useContext(AudioContext)
  if (context === undefined) {
    throw new Error('useAudio must be used within AudioProvider')
  }
  return context
}
