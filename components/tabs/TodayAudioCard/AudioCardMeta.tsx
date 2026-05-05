type AudioCardMetaProps = {
  bibleReference?: string | null
  episodeNumber?: number | null
  durationLabel: string
}

export default function AudioCardMeta({
  bibleReference,
  episodeNumber,
  durationLabel,
}: AudioCardMetaProps) {
  return (
    <div className="relative h-4 text-[10px] font-semibold text-slate-400">
      <span
        className="absolute top-0 -translate-x-1/2 whitespace-nowrap"
        style={{ left: '18%' }}
      >
        {bibleReference || 'Devocional'}
      </span>

      <span
        className="absolute top-0 -translate-x-1/2 whitespace-nowrap"
        style={{ left: '50%' }}
      >
        Ep. {episodeNumber || 1}
      </span>

      <span
        className="absolute top-0 -translate-x-1/2 whitespace-nowrap"
        style={{ left: '82%' }}
      >
        {durationLabel}
      </span>
    </div>
  )
}
