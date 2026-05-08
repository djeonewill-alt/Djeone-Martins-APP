'use client'

import { useEffect, useRef, useState } from 'react'

type AdminAudioPlayerProps = {
  src: string
  title?: string
  compact?: boolean
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00'

  const minutes = Math.floor(seconds / 60)
  const rest = Math.floor(seconds % 60)

  return `${minutes}:${String(rest).padStart(2, '0')}`
}

export default function AdminAudioPlayer({
  src,
  title,
  compact = false,
}: AdminAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isReady, setIsReady] = useState(false)

  const progress = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0

  useEffect(() => {
    setIsPlaying(false)
    setDuration(0)
    setCurrentTime(0)
    setIsReady(false)
  }, [src])

  function togglePlay() {
    const audio = audioRef.current

    if (!audio) return

    if (audio.paused) {
      audio.play()
      setIsPlaying(true)
    } else {
      audio.pause()
      setIsPlaying(false)
    }
  }

  function skip(seconds: number) {
    const audio = audioRef.current

    if (!audio) return

    const nextTime = Math.max(
      0,
      Math.min((audio.currentTime || 0) + seconds, duration || audio.duration || 0)
    )

    audio.currentTime = nextTime
    setCurrentTime(nextTime)
  }

  function handleSeek(value: string) {
    const audio = audioRef.current
    const numericValue = Number(value)

    if (!audio || !Number.isFinite(numericValue)) return

    const nextTime = duration > 0 ? (numericValue / 100) * duration : 0

    audio.currentTime = nextTime
    setCurrentTime(nextTime)
  }

  return (
    <div
      className={
        compact
          ? 'rounded-2xl border border-white/10 bg-slate-950/80 p-3'
          : 'rounded-[26px] border border-white/10 bg-slate-950/80 p-4 shadow-xl shadow-black/10'
      }
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(event) => {
          setDuration(event.currentTarget.duration || 0)
          setIsReady(true)
        }}
        onTimeUpdate={(event) => {
          setCurrentTime(event.currentTarget.currentTime || 0)
        }}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onEnded={() => {
          setIsPlaying(false)
          setCurrentTime(0)
        }}
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-sm font-black text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500 active:scale-95"
          aria-label={isPlaying ? 'Pausar áudio' : 'Reproduzir áudio'}
        >
          {isPlaying ? 'Ⅱ' : '▶'}
        </button>

        <div className="min-w-0 flex-1">
          {title && !compact && (
            <p className="mb-2 truncate text-xs font-black uppercase tracking-[0.14em] text-slate-400">
              {title}
            </p>
          )}

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
      </div>

      {!compact && (
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
          <button
            type="button"
            onClick={() => skip(-15)}
            className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs font-black text-slate-200 transition hover:border-white/20 active:scale-95"
          >
            −15s
          </button>

          <p className="text-center text-[11px] font-bold text-slate-500">
            Player admin
          </p>

          <button
            type="button"
            onClick={() => skip(15)}
            className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs font-black text-slate-200 transition hover:border-white/20 active:scale-95"
          >
            +15s
          </button>
        </div>
      )}
    </div>
  )
}