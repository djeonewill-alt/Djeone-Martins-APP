'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { useAudio } from '../AudioProvider'
import ExpandedHeader from './ExpandedHeader'
import ExpandedHero from './ExpandedHero'
import PlayerControls from './PlayerControls'
import TranscriptPanel from './TranscriptPanel'

export default function ExpandedPlayer() {
  const pathname = usePathname()
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

  const [captionsEnabled, setCaptionsEnabled] = useState(true)
  const isPublicContentPage =
    pathname.startsWith('/ep/') || pathname.startsWith('/palavra/')

  if (isPublicContentPage) return null

  if (!isExpanded || !currentEpisode) return null

  const segments = currentEpisode.transcription_segments || []

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.20),transparent_36%),linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,1))]" />

      <div className="relative mx-auto flex h-full max-w-md flex-col">
        <ExpandedHeader onMinimize={toggleExpanded} />

        <main className="flex min-h-0 flex-1 flex-col gap-4 px-5 pb-5">
          <ExpandedHero
            episode={currentEpisode}
            isPlaying={isPlaying}
            currentTime={currentTime}
            captionsEnabled={captionsEnabled}
          />

          {captionsEnabled && (
            <TranscriptPanel
              segments={segments}
              transcriptionText={currentEpisode.transcription_text}
              currentTime={currentTime}
              onSeek={seek}
            />
          )}

          <PlayerControls
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            volume={volume}
            playbackRate={playbackRate}
            captionsEnabled={captionsEnabled}
            onToggleCaptions={() => setCaptionsEnabled((value) => !value)}
            onTogglePlay={togglePlay}
            onSeek={seek}
            onVolumeChange={setVolume}
            onPlaybackRateChange={setPlaybackRate}
          />
        </main>
      </div>
    </div>
  )
}
