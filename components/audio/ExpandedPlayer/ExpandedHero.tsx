import AudioWave from './AudioWave'
import type { PlayerEpisode } from './types'

type ExpandedHeroProps = {
  episode: PlayerEpisode
  isPlaying: boolean
  currentTime: number
  captionsEnabled: boolean
}

export default function ExpandedHero({
  episode,
  isPlaying,
  currentTime,
  captionsEnabled,
}: ExpandedHeroProps) {
  return (
    <section className="shrink-0 pt-2 text-center">
      <h1 className="mx-auto max-w-[92%] text-[1.55rem] font-black leading-[1.05] tracking-[-0.055em] text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.65)]">
        {episode.title}
      </h1>

      <p className="mt-2 text-sm font-bold text-blue-200">
        {episode.bible_reference || 'Devocional'}
      </p>

      <div className="mt-5">
        <AudioWave
          isPlaying={isPlaying}
          currentTime={currentTime}
          captionsEnabled={captionsEnabled}
        />
      </div>
    </section>
  )
}
