type TodayActionCardProps = {
  eyebrow: string
  title: string
  subtitle: string
  meta?: string
  icon: string
  accent?: 'blue' | 'gold' | 'green'
  onClick: () => void
}

export default function TodayActionCard({
  eyebrow,
  title,
  subtitle,
  meta,
  icon,
  accent = 'blue',
  onClick,
}: TodayActionCardProps) {
  const accentClasses =
    accent === 'gold'
      ? 'from-yellow-500/16 via-slate-900/80 to-slate-950 border-yellow-300/15 text-yellow-100'
      : accent === 'green'
        ? 'from-emerald-500/14 via-slate-900/80 to-slate-950 border-emerald-300/15 text-emerald-100'
        : 'from-blue-500/16 via-slate-900/80 to-slate-950 border-blue-300/15 text-blue-100'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative w-full overflow-hidden rounded-[30px] border bg-gradient-to-br p-5 text-left shadow-[0_18px_55px_rgba(0,0,0,0.28)] active:scale-[0.99] ${accentClasses}`}
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/10 blur-3xl" />

      <div className="relative flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-300">
            {eyebrow}
          </p>

          <h3 className="mt-2 text-xl font-black leading-tight tracking-[-0.045em] text-white">
            {title}
          </h3>

          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            {subtitle}
          </p>

          {meta && (
            <p className="mt-3 inline-flex rounded-full border border-white/10 bg-slate-950/55 px-3 py-1 text-xs font-black text-blue-100">
              {meta}
            </p>
          )}
        </div>

        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] border border-white/10 bg-white/[0.055] text-3xl">
          {icon}
        </div>
      </div>
    </button>
  )
}
