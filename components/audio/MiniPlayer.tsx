'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useAudio } from './AudioProvider'

function formatTime(seconds: number) {
  const safeSeconds = Number.isFinite(seconds) ? seconds : 0
  const mins = Math.floor(safeSeconds / 60)
  const secs = Math.floor(safeSeconds % 60)

  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function PlayIcon() {
  return (
    <svg className="ml-0.5 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
    </svg>
  )
}

function ExpandIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path
        d="M8 4H4v4M4 4l6 6M16 20h4v-4M20 20l-6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function MiniPlayer() {
  const pathname = usePathname()

const {
    currentEpisode,
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    toggleExpanded,
    pause,
    seek,
  } = useAudio()

  const [dismissedEpisodeId, setDismissedEpisodeId] = useState<string | null>(null)

  useEffect(() => {
    if (currentEpisode?.id !== dismissedEpisodeId) {
      setDismissedEpisodeId(null)
    }
  }, [currentEpisode?.id, dismissedEpisodeId])

  useEffect(() => {
    if (isPlaying && currentEpisode?.id && dismissedEpisodeId === currentEpisode.id) {
      setDismissedEpisodeId(null)
    }
  }, [isPlaying, currentEpisode?.id, dismissedEpisodeId])

  if (!currentEpisode) return null

  if (dismissedEpisodeId === currentEpisode.id) return null

  const progress = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0
  const isPublicContentPage =
    pathname.startsWith('/ep/') || pathname.startsWith('/palavra/')
  const playerBottom = isPublicContentPage
    ? 'calc(18px + env(safe-area-inset-bottom))'
    : 'calc(118px + env(safe-area-inset-bottom))'

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextTime = Number(event.target.value)

    if (Number.isFinite(nextTime)) {
      seek(nextTime)
    }
  }

  const handleClose = () => {
    pause()
    setDismissedEpisodeId(currentEpisode.id)
  }

  return (
    <div
      className="fixed z-50"
      style={{
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 24px)',
        maxWidth: '430px',
        bottom: playerBottom,
      }}
    >
      <div className="overflow-hidden rounded-[24px] border border-white/15 bg-slate-950 shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl">
        <div className="relative">
          <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-blue-500/25 blur-3xl" />
          <div className="pointer-events-none absolute -left-10 -bottom-12 h-28 w-28 rounded-full bg-cyan-400/12 blur-3xl" />

          <div className="relative p-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlay}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-blue-300/25 bg-blue-600 text-white shadow-[0_10px_28px_rgba(37,99,235,0.34)] transition-all active:scale-95"
                aria-label={isPlaying ? 'Pausar áudio' : 'Tocar áudio'}
              >
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
              </button>

              <button
                type="button"
                onClick={toggleExpanded}
                className="min-w-0 flex-1 text-left"
              >
                <p className="truncate text-sm font-black leading-tight tracking-[-0.03em] text-white">
                  {currentEpisode.title}
                </p>

                <p className="mt-0.5 truncate text-[11px] font-medium text-slate-300">
                  {currentEpisode.bible_reference || 'Devocional'} ·{' '}
                  {formatTime(currentTime)} / {formatTime(duration)}
                </p>
              </button>

              <button
                type="button"
                onClick={toggleExpanded}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/12 text-white shadow-[0_8px_20px_rgba(0,0,0,0.22)] transition-all active:scale-95"
                aria-label="Expandir player"
              >
                <ExpandIcon />
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/12 text-white shadow-[0_8px_20px_rgba(0,0,0,0.22)] transition-all active:scale-95"
                aria-label="Fechar mini player"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="relative mt-3">
              <div className="relative h-1.5 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-blue-400 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <input
                type="range"
                min="0"
                max={duration || 0}
                value={Math.min(currentTime, duration || currentTime)}
                onChange={handleSeek}
                className="absolute left-0 right-0 top-[-5px] h-4 w-full cursor-pointer opacity-0"
                aria-label="Progresso do áudio"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}



