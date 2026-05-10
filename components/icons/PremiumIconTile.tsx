import type { ReactNode } from 'react'

export type PremiumIconTone =
  | 'sky'
  | 'cyan'
  | 'amber'
  | 'rose'
  | 'fire'
  | 'violet'
  | 'emerald'

type PremiumIconTileProps = {
  tone?: PremiumIconTone
  size?: 'md' | 'lg'
  className?: string
  children: ReactNode
}

const toneClasses: Record<PremiumIconTone, string> = {
  sky:
    'border-sky-200/40 bg-gradient-to-br from-sky-400/42 via-blue-700/34 to-slate-950 text-white shadow-[0_0_34px_rgba(56,189,248,0.18)] ring-sky-100/15',
  cyan:
    'border-cyan-200/40 bg-gradient-to-br from-cyan-300/42 via-blue-700/34 to-slate-950 text-white shadow-[0_0_34px_rgba(34,211,238,0.18)] ring-cyan-100/15',
  amber:
    'border-amber-200/42 bg-gradient-to-br from-amber-300/46 via-yellow-700/32 to-slate-950 text-white shadow-[0_0_34px_rgba(251,191,36,0.18)] ring-amber-100/15',
  rose:
    'border-rose-200/38 bg-gradient-to-br from-rose-300/40 via-fuchsia-800/28 to-slate-950 text-white shadow-[0_0_34px_rgba(244,114,182,0.15)] ring-rose-100/15',
  fire:
    'border-orange-200/40 bg-gradient-to-br from-orange-300/44 via-rose-800/28 to-slate-950 text-white shadow-[0_0_34px_rgba(251,146,60,0.18)] ring-orange-100/15',
  violet:
    'border-violet-200/38 bg-gradient-to-br from-violet-300/40 via-indigo-800/30 to-slate-950 text-white shadow-[0_0_34px_rgba(167,139,250,0.16)] ring-violet-100/15',
  emerald:
    'border-emerald-200/38 bg-gradient-to-br from-emerald-300/38 via-teal-800/30 to-slate-950 text-white shadow-[0_0_34px_rgba(52,211,153,0.15)] ring-emerald-100/15',
}

const sizeClasses = {
  md: 'h-[58px] w-[58px] rounded-[23px]',
  lg: 'h-16 w-16 rounded-[26px]',
}

export default function PremiumIconTile({
  tone = 'sky',
  size = 'md',
  className = '',
  children,
}: PremiumIconTileProps) {
  return (
    <span
      className={[
        'inline-flex shrink-0 items-center justify-center border ring-1',
        sizeClasses[size],
        toneClasses[tone],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  )
}
