'use client'

import { createContext, useContext, useState, useRef, useEffect } from 'react'

type Episode = {
  id: string
  title: string
  bible_reference: string
  audio_url: string
  duration_seconds: number
  icon_emoji?: string
  series_title?: string
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

  useEffect(() => {
  const audio = new Audio()
  audioRef.current = audio

  audio.addEventListener('timeupdate', () => {
    setCurrentTime(audio.currentTime)
    
    // Se duração é Infinity, tentar pegar do currentTime máximo
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
    console.log('📊 Metadata carregado!')
    console.log('⏱️ Duração do arquivo:', audio.duration)
    
    const audioDuration = audio.duration
    
    // Validar duração
    if (isFinite(audioDuration) && audioDuration > 0) {
      console.log('✅ Duração válida:', audioDuration)
      setDuration(audioDuration)
    } else {
      console.log('❌ Duração inválida (Infinity ou 0)')
      // Tentar pegar de seekable
      if (audio.seekable.length > 0) {
        const seekableDuration = audio.seekable.end(0)
        console.log('🔍 Tentando seekable.end:', seekableDuration)
        if (isFinite(seekableDuration) && seekableDuration > 0) {
          setDuration(seekableDuration)
        }
      }
    }
  })

  audio.addEventListener('durationchange', () => {
    console.log('🔄 Duração mudou:', audio.duration)
    if (isFinite(audio.duration) && audio.duration > 0) {
      setDuration(audio.duration)
    }
  })

  audio.addEventListener('ended', () => {
    setIsPlaying(false)
    setCurrentTime(0)
  })

  return () => {
    audio.pause()
    audio.src = ''
  }
}, [])

  const play = (episode: Episode) => {
  if (!audioRef.current) return

  if (currentEpisode?.id !== episode.id) {
    audioRef.current.src = episode.audio_url
    setCurrentEpisode(episode)
    setCurrentTime(0)
    
    // IMPORTANTE: Usar duration_seconds do banco SEMPRE
    console.log('🎵 Tocando episódio:', episode.title)
    console.log('⏱️ Duração do banco:', episode.duration_seconds, 'segundos')
    
    if (episode.duration_seconds && episode.duration_seconds > 0) {
      setDuration(episode.duration_seconds)
    } else {
      console.warn('⚠️ Episódio sem duração no banco!')
      setDuration(0)
    }
  }

  audioRef.current.play()
  setIsPlaying(true)
}

  const pause = () => {
    if (!audioRef.current) return
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