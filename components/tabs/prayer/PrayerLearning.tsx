import PremiumIconTile, { type PremiumIconTone } from '@/components/icons/PremiumIconTile'
﻿import PrayerSvgIcon, { type PrayerSvgIconName } from '@/components/icons/PrayerSvgIcon'
import { PRAYER_LEARNING_ITEMS } from './mockData'

function getLearningIconName(id: string): PrayerSvgIconName {
  switch (id) {
    case 'o-que-e-oracao':
      return 'heart'
    case 'orar-com-a-palavra':
      return 'open-bible'
    case 'intercessao':
      return 'hands'
    case 'perseveranca':
      return 'flame'
    default:
      return 'light'
  }
}

function getLearningIconTone(id: string): PremiumIconTone {
  switch (id) {
    case 'o-que-e-oracao':
      return 'rose'
    case 'orar-com-a-palavra':
      return 'amber'
    case 'intercessao':
      return 'cyan'
    case 'perseveranca':
      return 'fire'
    default:
      return 'sky'
  }
}

export default function PrayerLearning() {
  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-slate-900/80 p-5 shadow-[0_22px_70px_rgba(0,0,0,0.35)]">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-yellow-500/15 blur-3xl" />

        <div className="relative">
          <PremiumIconTile tone="amber" size="lg" className="mb-5">
            <PrayerSvgIcon name="light" className="h-8 w-8" />
          </PremiumIconTile>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-200">
            Aprender
          </p>

          <h2 className="mt-2 text-3xl font-black tracking-[-0.07em]">
            Escola de oração
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Pequenos guias para ajudar você a orar com mais constância, fé e profundidade bíblica.
          </p>
        </div>
      </section>

      <div className="space-y-3">
        {PRAYER_LEARNING_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className="w-full rounded-[30px] border border-white/10 bg-slate-900/80 p-5 text-left shadow-[0_16px_45px_rgba(0,0,0,0.22)]"
          >
            <div className="flex items-start gap-4">
              <PremiumIconTile tone={getLearningIconTone(item.id)} size="md">
                <PrayerSvgIcon name={getLearningIconName(item.id)} className="h-8 w-8" />
              </PremiumIconTile>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-black text-white">
                    {item.title}
                  </h3>

                  <span className="shrink-0 rounded-full border border-white/10 bg-slate-950/50 px-3 py-1 text-[10px] font-black text-blue-200">
                    {item.minutes}min
                  </span>
                </div>

                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {item.subtitle}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <section className="rounded-[30px] border border-yellow-300/15 bg-gradient-to-br from-yellow-500/10 via-slate-900/80 to-slate-950 p-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-200">
          Futuro
        </p>

        <h2 className="mt-2 text-xl font-black">
          Mapa de oração
        </h2>

        <p className="mt-2 text-sm leading-relaxed text-yellow-50/70">
          Depois do lançamento, poderemos criar planos personalizados de oração por áreas da vida, tempo disponível e versículos bíblicos.
        </p>
      </section>
    </div>
  )
}
