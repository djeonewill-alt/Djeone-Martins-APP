'use client'

import { createContext, useContext, useState, useRef, ReactNode, useEffect } from 'react'

type Episode = {
  id: string
  title: string
  bible_reference: string
  audio_url: string
  duration_seconds: number
  series_title?: string
  icon_emoji?: string
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

export function AudioProvider({ children }: { children: ReactNode }) {
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(1)
  const [playbackRate, setPlaybackRateState] = useState(1)
  const [isExpanded, setIsExpanded] = useState(false)
  
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    // Criar elemento de áudio
    const audio = new Audio()
    audioRef.current = audio

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime)
    })

    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration)
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

    // Se é o mesmo episódio, só retoma
    if (currentEpisode?.id === episode.id) {
      audioRef.current.play()
      setIsPlaying(true)
      return
    }

    // Novo episódio
    setCurrentEpisode(episode)
    audioRef.current.src = episode.audio_url
    audioRef.current.play()
    setIsPlaying(true)
    setCurrentTime(0)
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
    audioRef.current.currentTime = time
    setCurrentTime(time)
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

export const useAudio = () => {
  const context = useContext(AudioContext)
  if (!context) {
    throw new Error('useAudio must be used within AudioProvider')
  }
  return context
}