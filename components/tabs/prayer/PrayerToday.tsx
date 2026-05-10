import PremiumIconTile from '@/components/icons/PremiumIconTile'
﻿import PrayerSvgIcon from '@/components/icons/PrayerSvgIcon'
import { TODAY_PRAYER_GUIDE } from './mockData'

type PrayerTodayProps = {
  onOpenWall: () => void
  onOpenLearning: () => void
}

export default function PrayerToday({
  onOpenWall,
  onOpenLearning,
}: PrayerTodayProps) {
  const guide = TODAY_PRAYER_GUIDE

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-slate-900/80 p-5 shadow-[0_22px_70px_rgba(0,0,0,0.35)]">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative">
          <PremiumIconTile tone="sky" size="lg" className="mb-5">
            <PrayerSvgIcon name="guided-prayer" className="h-8 w-8" />
          </PremiumIconTile>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">
            Oração guiada
          </p>

          <h2 className="mt-2 text-3xl font-black leading-none tracking-[-0.07em]">
            {guide.title}
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            {guide.subtitle}
          </p>

          <div className="mt-5 rounded-[24px] border border-blue-300/15 bg-blue-500/10 p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-200">
              {guide.bibleReference}
            </p>

            <p className="mt-2 text-base font-bold leading-relaxed text-white">
              “{guide.bibleText}”
            </p>
          </div>

          <div className="mt-5 flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
            <span className="text-sm font-bold text-slate-300">
              Tempo estimado
            </span>

            <span className="text-sm font-black text-blue-200">
              {guide.estimatedMinutes} min
            </span>
          </div>
        </div>
      </section>

      <section className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-300">
          Passos da oração
        </p>

        <div className="mt-4 space-y-3">
          {guide.steps.map((step, index) => (
            <div
              key={step.title}
              className="rounded-[24px] border border-white/10 bg-slate-950/50 p-4"
            >
              <div className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-blue-500/15 text-sm font-black text-blue-100">
                  {index + 1}
                </div>

                <div>
                  <h3 className="text-base font-black text-white">
                    {step.title}
                  </h3>

                  <p className="mt-1 text-sm leading-relaxed text-slate-400">
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onOpenWall}
          className="rounded-[26px] border border-blue-300/15 bg-blue-500/10 p-4 text-left"
        >
          <PremiumIconTile tone="cyan" size="md">
            <PrayerSvgIcon name="hands" className="h-8 w-8" />
          </PremiumIconTile>
          <h3 className="mt-3 text-base font-black text-white">
            Orar por alguém
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Vá para o mural e interceda.
          </p>
        </button>

        <button
          type="button"
          onClick={onOpenLearning}
          className="rounded-[26px] border border-yellow-300/15 bg-yellow-500/10 p-4 text-left"
        >
          <PremiumIconTile tone="amber" size="md">
            <PrayerSvgIcon name="open-bible" className="h-8 w-8" />
          </PremiumIconTile>
          <h3 className="mt-3 text-base font-black text-white">
            Aprender a orar
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Veja guias simples de oração.
          </p>
        </button>
      </div>
    </div>
  )
}
