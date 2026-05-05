type ExpandedHeaderProps = {
  onMinimize: () => void
}

function ChevronDownIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function ExpandedHeader({ onMinimize }: ExpandedHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between px-5 pt-2">
      <button
        type="button"
        onClick={onMinimize}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/85 backdrop-blur-md active:scale-95"
        aria-label="Minimizar player"
      >
        <ChevronDownIcon />
      </button>

      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-200">
        Reproduzindo
      </p>

      <div className="h-10 w-10" />
    </header>
  )
}
