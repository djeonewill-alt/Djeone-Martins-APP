import type { ChangeEvent } from 'react'
import { formatTime } from './utils'

type PlayerControlsProps = {
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  playbackRate: number
  captionsEnabled: boolean
  onToggleCaptions: () => void
  onTogglePlay: () => void
  onSeek: (time: number) => void
  onVolumeChange: (volume: number) => void
  onPlaybackRateChange: (rate: number) => void
}

function PlayIcon() {
  return (
    <svg className="ml-1 h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
    </svg>
  )
}

export default function PlayerControls({
  isPlaying,
  currentTime,
  duration,
  volume,
  playbackRate,
  captionsEnabled,
  onToggleCaptions,
  onTogglePlay,
  onSeek,
  onVolumeChange,
  onPlaybackRateChange,
}: PlayerControlsProps) {
  const safeMax = Math.max(duration, currentTime, 1)
  const progress = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0
  const playbackRates = [0.75, 1, 1.25, 1.5, 1.75, 2]

  const handleSeek = (event: ChangeEvent<HTMLInputElement>) => {
    onSeek(Number(event.target.value))
  }

  const handleBack = () => {
    onSeek(Math.max(currentTime - 15, 0))
  }

  const handleForward = () => {
    onSeek(Math.min(currentTime + 15, duration || currentTime + 15))
  }

  const cyclePlaybackRate = () => {
    const currentIndex = playbackRates.indexOf(playbackRate)
    const nextIndex =
      currentIndex === -1 ? 1 : (currentIndex + 1) % playbackRates.length

    onPlaybackRateChange(playbackRates[nextIndex])
  }

  return (
    <section className="shrink-0">
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={onToggleCaptions}
          className={
            captionsEnabled
              ? 'rounded-full border border-blue-300/25 bg-blue-500/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-blue-100'
              : 'rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400'
          }
        >
          Legenda
        </button>
      </div>

      <div className="relative">
        <div className="h-1.5 overflow-hidden rounded-full bg-white/12">
          <div
            className="h-full rounded-full bg-blue-400"
            style={{ width: `${progress}%` }}
          />
        </div>

        <input
          type="range"
          min="0"
          max={safeMax}
          value={Math.min(currentTime, safeMax)}
          onChange={handleSeek}
          className="absolute left-0 right-0 top-[-6px] h-5 w-full cursor-pointer opacity-0"
          aria-label="Progresso do áudio"
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs font-semibold text-slate-400">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="text-sm text-slate-300">Volume</span>

          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(event) => onVolumeChange(Number(event.target.value))}
            className="h-1 w-full accent-blue-400"
            aria-label="Volume"
          />
        </div>

        <button
          type="button"
          onClick={cyclePlaybackRate}
          className="shrink-0 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-black text-white"
        >
          {playbackRate}x
        </button>
      </div>

      <div className="mt-5 flex items-center justify-center gap-7">
        <button
          type="button"
          onClick={handleBack}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-black text-white/75 active:scale-95"
        >
          -15
        </button>

        <button
          type="button"
          onClick={onTogglePlay}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-blue-700 shadow-[0_20px_70px_rgba(255,255,255,0.18)] active:scale-95"
          aria-label={isPlaying ? 'Pausar áudio' : 'Tocar áudio'}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>

        <button
          type="button"
          onClick={handleForward}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-black text-white/75 active:scale-95"
        >
          +15
        </button>
      </div>
    </section>
  )
}
