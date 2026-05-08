'use client'

type SettingsOptionItemProps = {
  icon: string
  title: string
  subtitle: string
  badge?: string
  onClick?: () => void
  danger?: boolean
  disabled?: boolean
}

export default function SettingsOptionItem({
  icon,
  title,
  subtitle,
  badge,
  onClick,
  danger = false,
  disabled = false,
}: SettingsOptionItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        danger
          ? 'w-full rounded-[28px] border border-red-300/15 bg-red-500/10 p-5 text-left active:scale-[0.99] disabled:opacity-60'
          : 'w-full rounded-[28px] border border-white/10 bg-slate-950/45 p-5 text-left active:scale-[0.99] disabled:opacity-60'
      }
    >
      <div className="flex items-start gap-4">
        <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-[22px] border border-white/10 bg-white/[0.055] text-2xl">
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-base font-black tracking-[-0.035em] text-white">
              {title}
            </h3>

            {badge && (
              <span className="shrink-0 rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-blue-100">
                {badge}
              </span>
            )}
          </div>

          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            {subtitle}
          </p>
        </div>
      </div>
    </button>
  )
}
