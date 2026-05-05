import type { ReactNode } from 'react'

type AudioCardThumbnailProps = {
  title: string
  coverImage: string
  onPlay: () => void
  actions: ReactNode
}

export default function AudioCardThumbnail({
  title,
  coverImage,
  onPlay,
  actions,
}: AudioCardThumbnailProps) {
  return (
    <div
      className="relative overflow-hidden rounded-[26px] border border-white/10 bg-slate-950 shadow-inner"
      style={{
        height: '178px',
        minHeight: '178px',
        position: 'relative',
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-slate-950 to-slate-900" />

      {coverImage && (
        <img
          src={coverImage}
          alt={title}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700"
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-br from-black/28 via-black/22 to-black/78" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/36 to-black/10" />

      <button
        type="button"
        onClick={onPlay}
        className="absolute inset-0 z-10 cursor-pointer"
        aria-label="Tocar episódio"
      />

      <div
        className="pointer-events-none z-20 flex items-center justify-center px-5"
        style={{
          position: 'absolute',
          inset: 0,
          paddingBottom: '24px',
        }}
      >
        <h3 className="max-w-[92%] text-center text-[1.9rem] font-black leading-[0.98] tracking-[-0.055em] text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.92)] sm:text-[2.25rem]">
          {title}
        </h3>
      </div>

      <div
        style={{
          position: 'absolute',
          left: '16px',
          right: '16px',
          bottom: '10px',
          zIndex: 50,
        }}
      >
        {actions}
      </div>
    </div>
  )
}
