import type { EpisodeWithSeries } from './types'

type AudioCardHeaderProps = {
  episode: EpisodeWithSeries
  onOpenSeries?: () => void
}

export default function AudioCardHeader({
  episode,
  onOpenSeries,
}: AudioCardHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-300">
        Áudio de hoje
      </p>

      {episode.series?.title && (
        <button
          type="button"
          onClick={onOpenSeries}
          className="max-w-[58%] truncate text-right text-[9px] font-black uppercase tracking-[0.12em] text-blue-200 transition-colors hover:text-white"
          style={{
            textShadow: '0 1px 8px rgba(0,0,0,0.65)',
          }}
        >
          {episode.series.title} →
        </button>
      )}
    </div>
  )
}
