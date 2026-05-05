type AudioCardActionsProps = {
  isFavorite: boolean
  isSubscribed: boolean
  notifLoading: boolean
  sharingEpisode: boolean
  onFavorite: () => void
  onShare: () => void
  onToggleNotifications: () => void
}

export default function AudioCardActions({
  isFavorite,
  isSubscribed,
  notifLoading,
  sharingEpisode,
  onFavorite,
  onShare,
  onToggleNotifications,
}: AudioCardActionsProps) {
  const baseButton =
    'flex h-6 items-center justify-center gap-1 rounded-full border px-2 text-[8.5px] font-semibold backdrop-blur-sm transition-all active:scale-[0.98]'

  return (
    <div className="grid w-full grid-cols-3 gap-3">
      <button
        type="button"
        onClick={onFavorite}
        className={
          isFavorite
            ? `${baseButton} mx-auto w-[82px] border-red-300/20 bg-red-500/15 text-red-100`
            : `${baseButton} mx-auto w-[82px] border-white/10 bg-black/18 text-white/75 hover:bg-white/8`
        }
      >
        <span>{isFavorite ? '❤️' : '♡'}</span>
        <span className="truncate">{isFavorite ? 'Salvo' : 'Favorito'}</span>
      </button>

      <button
        type="button"
        onClick={onShare}
        disabled={sharingEpisode}
        className={`${baseButton} mx-auto w-[98px] border-white/10 bg-black/18 text-white/75 hover:bg-white/8 disabled:opacity-60`}
      >
        <span>{sharingEpisode ? '…' : '↗'}</span>
        <span className="truncate">Compartilhar</span>
      </button>

      <button
        type="button"
        onClick={onToggleNotifications}
        disabled={notifLoading}
        className={
          isSubscribed
            ? `${baseButton} mx-auto w-[82px] border-blue-300/20 bg-blue-500/15 text-blue-100 disabled:opacity-50`
            : `${baseButton} mx-auto w-[82px] border-white/10 bg-black/18 text-white/75 hover:bg-white/8 disabled:opacity-50`
        }
      >
        <span>{isSubscribed ? '🔔' : '🔕'}</span>
        <span className="truncate">Lembrete</span>
      </button>
    </div>
  )
}
