'use client'

import { useAudio } from './AudioProvider'

export default function ExpandedPlayer() {
  const {
    currentEpisode,
    isPlaying,
    currentTime,
    duration,
    volume,
    playbackRate,
    isExpanded,
    togglePlay,
    seek,
    setVolume,
    setPlaybackRate,
    toggleExpanded,
  } = useAudio()

  if (!isExpanded || !currentEpisode) return null

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = (parseFloat(e.target.value) / 100) * duration
    seek(newTime)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value))
  }

  const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

  const cyclePlaybackRate = () => {
    const currentIndex = playbackRates.indexOf(playbackRate)
    const nextIndex = (currentIndex + 1) % playbackRates.length
    setPlaybackRate(playbackRates[nextIndex])
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-blue-600 to-blue-800 z-[9999] flex flex-col">
      <div className="w-full max-w-md mx-auto h-full flex flex-col">
        {/* Header */}
        <div className="p-4 flex items-center justify-between text-white flex-shrink-0">
          <button
            onClick={toggleExpanded}
            className="text-2xl hover:scale-110 transition-transform"
          >
            ↓
          </button>
          <h2 className="text-sm font-semibold opacity-90">Reproduzindo</h2>
          <div className="w-8" />
        </div>

        {/* Cover/Icon */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="w-48 h-48 mx-auto bg-white/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm border-2 border-white/20">
              <span className="text-8xl">
                {currentEpisode.icon_emoji || '🎙️'}
              </span>
            </div>

            <h3 className="text-white text-lg font-semibold mb-2">
              {currentEpisode.bible_reference}
            </h3>
            <p className="text-blue-100 text-sm mb-1">
              {currentEpisode.title}
            </p>
            {currentEpisode.series_title && (
              <p className="text-blue-200 text-xs opacity-75">
                {currentEpisode.series_title}
              </p>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="p-6 pb-8 flex-shrink-0">
          {/* Progress Bar */}
          <div className="mb-2">
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={handleSeek}
              className="w-full h-2 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
            />
          </div>

          {/* Time */}
          <div className="flex justify-between text-sm text-white/80 mb-6">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          {/* Play Controls */}
          <div className="flex items-center justify-center gap-8 mb-6">
            <button className="text-white/60 hover:text-white transition-colors">
              <span className="text-3xl">⏮️</span>
            </button>

            <button
              onClick={togglePlay}
              className="w-20 h-20 rounded-full bg-white text-blue-600 flex items-center justify-center hover:scale-105 transition-transform shadow-xl"
            >
              <span className="text-4xl">{isPlaying ? '⏸️' : '▶️'}</span>
            </button>

            <button className="text-white/60 hover:text-white transition-colors">
              <span className="text-3xl">⏭️</span>
            </button>
          </div>

          {/* Extra Controls */}
          <div className="flex items-center justify-between px-4">
            {/* Volume */}
            <div className="flex items-center gap-2">
              <span className="text-white text-xl">🔊</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
                className="w-20 h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
              />
            </div>

            {/* Playback Rate */}
            <button
              onClick={cyclePlaybackRate}
              className="bg-white/20 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-white/30 transition-colors"
            >
              ⚡ {playbackRate}x
            </button>

            {/* Share */}
            <button
              onClick={() => {
                if (currentEpisode) {
                  const { shareEpisodeWhatsApp } = require('@/lib/share/whatsapp')
                  shareEpisodeWhatsApp({
                    id: currentEpisode.id,
                    title: currentEpisode.title,
                    bible_reference: currentEpisode.bible_reference,
                    series_title: currentEpisode.series_title,
                  })
                }
              }}
              className="text-white text-2xl hover:scale-110 transition-transform"
            >
              📤
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}