'use client'

import { useEffect, useRef, useState } from 'react'

type EpisodeAudioPlayerProps = {
  episodeId: string
  src: string
  title: string
  subtitle?: string
}

const STORAGE_PREFIX = 'djeone-episode-progress-'

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00'

  const minutes = Math.floor(seconds / 60)
  const rest = Math.floor(seconds % 60)

  return `${minutes}:${String(rest).padStart(2, '0')}`
}

export default function EpisodeAudioPlayer({
  episodeId,
  src,
  title,
  subtitle,
}: EpisodeAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const lastSavedRef = useRef(0)

  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isReady, setIsReady] = useState(false)
  const [restored, setRestored] = useState(false)

  const storageKey = `${STORAGE_PREFIX}${episodeId}`
  const progress = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0

  useEffect(() => {
    setIsPlaying(false)
    setDuration(0)
    setCurrentTime(0)
    setIsReady(false)
    setRestored(false)
    lastSavedRef.current = 0
  }, [episodeId, src])

  function saveProgress(nextTime: number) {
    if (typeof window === 'undefined') return

    if (!duration || nextTime < 5) return

    if (duration - nextTime <= 8) {
      window.localStorage.removeItem(storageKey)
      return
    }

    window.localStorage.setItem(storageKey, String(Math.floor(nextTime)))
  }

  async function togglePlay() {
    const audio = audioRef.current

    if (!audio) return

    if (audio.paused) {
      try {
        await audio.play()
        setIsPlaying(true)
      } catch (error) {
        console.error('Erro ao tocar áudio:', error)
      }
    } else {
      audio.pause()
      setIsPlaying(false)
    }
  }

  function skip(seconds: number) {
    const audio = audioRef.current

    if (!audio) return

    const maxDuration = duration || audio.duration || 0
    const nextTime = Math.max(0, Math.min((audio.currentTime || 0) + seconds, maxDuration))

    audio.currentTime = nextTime
    setCurrentTime(nextTime)
    saveProgress(nextTime)
  }

  function handleSeek(value: string) {
    const audio = audioRef.current
    const numericValue = Number(value)

    if (!audio || !Number.isFinite(numericValue)) return

    const nextTime = duration > 0 ? (numericValue / 100) * duration : 0

    audio.currentTime = nextTime
    setCurrentTime(nextTime)
    saveProgress(nextTime)
  }

  return (
    <section className="mt-5 overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(2,6,23,0.96))] p-4 shadow-[0_22px_70px_rgba(0,0,0,0.38)] ring-1 ring-white/10">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(event) => {
          const audio = event.currentTarget
          const nextDuration = audio.duration || 0

          setDuration(nextDuration)
          setIsReady(true)

          if (typeof window !== 'undefined') {
            const saved = Number(window.localStorage.getItem(storageKey) || '0')

            if (saved > 5 && nextDuration > 0 && saved < nextDuration - 8) {
              audio.currentTime = saved
              setCurrentTime(saved)
              setRestored(true)
            }
          }
        }}
        onTimeUpdate={(event) => {
          const nextTime = event.currentTarget.currentTime || 0
          setCurrentTime(nextTime)

          if (Math.abs(nextTime - lastSavedRef.current) >= 3) {
            lastSavedRef.current = nextTime
            saveProgress(nextTime)
          }
        }}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onEnded={() => {
          setIsPlaying(false)
          setCurrentTime(0)

          if (typeof window !== 'undefined') {
            window.localStorage.removeItem(storageKey)
          }
        }}
      />

      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={togglePlay}
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-lg font-black text-white shadow-xl shadow-blue-950/30 transition hover:bg-blue-500 active:scale-95"
          aria-label={isPlaying ? 'Pausar áudio' : 'Reproduzir áudio'}
        >
          {isPlaying ? 'Ⅱ' : '▶'}
        </button>

        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-sm font-black text-white">
            {title}
          </p>

          {subtitle && (
            <p className="mt-1 text-xs font-bold text-blue-200">
              {subtitle}
            </p>
          )}

          {restored && (
            <p className="mt-2 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-200">
              Continuando de onde você parou
            </p>
          )}
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center gap-3">
          <span className="w-10 text-xs font-black tabular-nums text-slate-400">
            {formatTime(currentTime)}
          </span>

          <div className="relative h-8 flex-1">
            <div className="absolute left-0 top-1/2 h-2 w-full -translate-y-1/2 rounded-full bg-slate-800" />
            <div
              className="absolute left-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-blue-500"
              style={{ width: `${progress}%` }}
            />

            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={progress}
              onChange={(event) => handleSeek(event.target.value)}
              disabled={!isReady}
              className="absolute inset-0 h-8 w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
              aria-label="Progresso do áudio"
            />
          </div>

          <span className="w-10 text-right text-xs font-black tabular-nums text-slate-400">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={() => skip(-15)}
          className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2 text-xs font-black text-slate-200 transition hover:border-white/20 active:scale-95"
        >
          −15s
        </button>

        <p className="text-center text-[11px] font-bold text-slate-500">
          Progresso salvo neste aparelho
        </p>

        <button
          type="button"
          onClick={() => skip(15)}
          className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2 text-xs font-black text-slate-200 transition hover:border-white/20 active:scale-95"
        >
          +15s
        </button>
      </div>
    </section>
  )
}