import type { TranscriptionSegment } from './types'
import { findActiveSegment, formatTime } from './utils'

type TranscriptPanelProps = {
  segments: TranscriptionSegment[]
  transcriptionText?: string | null
  currentTime: number
  onSeek: (time: number) => void
}

export default function TranscriptPanel({
  segments,
  transcriptionText,
  currentTime,
  onSeek,
}: TranscriptPanelProps) {
  const activeSegment = findActiveSegment(segments, currentTime)

  const firstUpcomingSegment =
    !activeSegment
      ? segments.find((segment) => currentTime < segment.start) || segments[0]
      : null

  const currentDisplaySegment =
    activeSegment || firstUpcomingSegment || null

  return (
    <section className="shrink-0">
      {segments.length > 0 && currentDisplaySegment ? (
        <button
          type="button"
          onClick={() => onSeek(currentDisplaySegment.start)}
          className="w-full rounded-[24px] border border-blue-300/25 bg-blue-500/12 p-5 text-left shadow-[0_12px_35px_rgba(37,99,235,0.12)]"
        >
          <div className="mb-3 flex justify-end">
            <p className="text-[11px] font-bold text-blue-100/80">
              {formatTime(currentDisplaySegment.start)}
            </p>
          </div>

          <p className="text-xl font-black leading-snug tracking-[-0.035em] text-white">
            {currentDisplaySegment.text}
          </p>
        </button>
      ) : (
        <div className="max-h-40 overflow-y-auto rounded-[24px] border border-white/10 bg-white/[0.04] p-5 text-sm leading-relaxed text-slate-300">
          {transcriptionText ? (
            <p>{transcriptionText}</p>
          ) : (
            <p>
              Este episódio ainda não tem transcrição disponível.
            </p>
          )}
        </div>
      )}
    </section>
  )
}
