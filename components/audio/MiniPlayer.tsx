'use client'

import { useAudio } from './AudioProvider'

export default function MiniPlayer() {
  const { currentEpisode, isPlaying, currentTime, duration, togglePlay, toggleExpanded, pause } = useAudio()

  if (!currentEpisode) return null

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleClose = () => {
    pause()
    window.location.reload()
  }

  return (
    <div className="fixed bottom-20 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-xl z-40 max-w-md mx-auto">
      <div className="p-3">
        <div className="flex items-center gap-3 mb-2">
          {/* Info */}
          <button
            onClick={toggleExpanded}
            className="flex-1 text-left"
          >
            <div className="flex items-center gap-2 mb-1">
              {currentEpisode.icon_emoji && (
                <span className="text-lg">{currentEpisode.icon_emoji}</span>
              )}
              <p className="font-semibold text-sm text-gray-900 truncate">
                {currentEpisode.bible_reference}
              </p>
            </div>
            <p className="text-xs text-gray-600 truncate">
              {currentEpisode.title}
            </p>
          </button>

          {/* Controls */}
          <button
            onClick={togglePlay}
            className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors flex-shrink-0"
          >
            <span className="text-xl">{isPlaying ? '⏸️' : '▶️'}</span>
          </button>

          {/* Expand */}
          <button
            onClick={toggleExpanded}
            className="text-gray-600 hover:text-blue-600 flex-shrink-0"
          >
            <span className="text-xl">↗️</span>
          </button>

          {/* Close */}
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-red-600 flex-shrink-0"
          >
            <span className="text-xl">✕</span>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className="bg-blue-600 h-1.5 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Time */}
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  )
}