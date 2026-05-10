'use client'

import { useEffect, useMemo, useState } from 'react'
import GamificationSvgIcon from '@/components/icons/GamificationSvgIcon'
import PremiumIconTile from '@/components/icons/PremiumIconTile'
import {
  ACHIEVEMENT_DEFINITIONS,
  type AchievementTier,
} from '@/lib/gamification/achievements'
import {
  buildGamificationStats,
  checkAndUnlockAchievements,
  type UnlockedAchievement,
} from '@/lib/gamification/unlock'

type AchievementsDetailProps = {
  chaptersRead: number
  prayedCount: number
  shareCount: number
  encouragementCount: number
  myPrayerCount: number
  onBack: () => void
  embedded?: boolean
}

const tierNames: Record<AchievementTier, string> = {
  bronze: 'Bronze',
  silver: 'Prata',
  gold: 'Ouro',
  diamond: 'Diamante',
}

const tierClasses: Record<AchievementTier, string> = {
  bronze: 'border-orange-300/25 bg-orange-500/10 text-orange-100',
  silver: 'border-slate-200/25 bg-slate-300/10 text-slate-100',
  gold: 'border-amber-300/30 bg-amber-500/10 text-amber-100',
  diamond: 'border-cyan-200/30 bg-cyan-400/10 text-cyan-100',
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-white/10">
      <div
        className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-400 to-amber-300 shadow-[0_0_18px_rgba(56,189,248,0.42)]"
        style={{ width: Math.min(Math.max(value, 0), 100) + '%' }}
      />
    </div>
  )
}

export default function AchievementsDetail({
  chaptersRead,
  prayedCount,
  shareCount,
  encouragementCount,
  myPrayerCount,
  onBack,
  embedded = false,
}: AchievementsDetailProps) {
  const [unlockedAchievements, setUnlockedAchievements] = useState<UnlockedAchievement[]>([])

  const stats = useMemo(
    () =>
      buildGamificationStats({
        chaptersRead,
        prayedCount,
        shareCount,
        encouragementCount,
        myPrayerCount,
      }),
    [chaptersRead, prayedCount, shareCount, encouragementCount, myPrayerCount]
  )

  useEffect(() => {
    let active = true

    checkAndUnlockAchievements(stats).then((items) => {
      if (active) {
        setUnlockedAchievements(items)
      }
    })

    return () => {
      active = false
    }
  }, [stats])

  const unlockedSet = new Set(
    unlockedAchievements.map(
      (achievement) => achievement.achievement_key + ':' + achievement.tier
    )
  )

  const content = (
    <>
      {!embedded && (
        <button
          type="button"
          onClick={onBack}
          className="mb-5 rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm font-black text-slate-200 active:scale-[0.98]"
        >
          ← Voltar para Você
        </button>
      )}

      <section className="relative mb-5 overflow-hidden rounded-[34px] border border-white/10 bg-slate-900/80 p-5 shadow-[0_22px_70px_rgba(0,0,0,0.35)]">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-amber-400/10 blur-3xl" />

        <div className="relative">
          <PremiumIconTile tone="cyan" size="lg" className="mb-5">
            <GamificationSvgIcon name="level" className="h-8 w-8" />
          </PremiumIconTile>

          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">
            Minha Jornada
          </p>

          <h1 className="mt-2 text-3xl font-black leading-none tracking-[-0.07em] text-white">
            Conquistas espirituais
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Acompanhe seus marcos de constância, oração, leitura, encorajamento e serviço.
            Algumas conquistas vêm em dias, outras em semanas, meses e anos.
          </p>
        </div>
      </section>

      <div className="space-y-4">
        {ACHIEVEMENT_DEFINITIONS.map((definition) => {
          const current = stats[definition.key as keyof typeof stats] || 0

          const nextTier =
            definition.tiers.find(
              (tier) => !unlockedSet.has(definition.key + ':' + tier.tier)
            ) || definition.tiers[definition.tiers.length - 1]

          const progress = Math.min(
            Math.round((current / nextTier.target) * 100),
            100
          )

          const unlockedTiers = definition.tiers.filter((tier) =>
            unlockedSet.has(definition.key + ':' + tier.tier)
          )

          return (
            <section
              key={definition.key}
              className="rounded-[34px] border border-white/10 bg-slate-900/80 p-5 shadow-[0_16px_45px_rgba(0,0,0,0.22)]"
            >
              <div className="flex items-start gap-4">
                <PremiumIconTile tone={definition.tone} size="md">
                  <GamificationSvgIcon name={definition.icon} className="h-8 w-8" />
                </PremiumIconTile>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-black text-white">
                        {definition.title}
                      </h2>

                      <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
                        {definition.spiritualName}
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-[10px] font-black text-blue-200">
                      {current}
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-relaxed text-slate-400">
                    {definition.description}
                  </p>

                  <div className="mt-4 rounded-[22px] border border-white/10 bg-slate-950/55 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-black text-white">
                        Próximo marco: {tierNames[nextTier.tier]}
                      </p>

                      <p className="text-xs font-bold text-slate-400">
                        {Math.min(current, nextTier.target)}/{nextTier.target}
                      </p>
                    </div>

                    <ProgressBar value={progress} />

                    <p className="mt-3 text-xs leading-5 text-slate-500">
                      {current >= nextTier.target
                        ? 'Marco alcançado. Continue avançando para os próximos níveis.'
                        : 'Faltam ' + (nextTier.target - current) + ' para desbloquear este marco.'}
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {definition.tiers.map((tier) => {
                      const unlocked = unlockedSet.has(
                        definition.key + ':' + tier.tier
                      )

                      return (
                        <div
                          key={tier.tier}
                          className={[
                            'rounded-2xl border px-3 py-3',
                            tierClasses[tier.tier],
                            unlocked ? 'opacity-100' : 'opacity-45',
                          ].join(' ')}
                        >
                          <p className="text-xs font-black uppercase tracking-[0.12em]">
                            {tierNames[tier.tier]}
                          </p>

                          <p className="mt-1 text-[11px] font-bold leading-4 text-slate-300">
                            alvo: {tier.target}
                          </p>

                          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.1em]">
                            {unlocked ? 'desbloqueado' : 'em andamento'}
                          </p>
                        </div>
                      )
                    })}
                  </div>

                  {unlockedTiers.length > 0 && (
                    <p className="mt-4 rounded-2xl border border-emerald-300/15 bg-emerald-500/10 px-4 py-3 text-xs font-bold leading-5 text-emerald-100">
                      Você já desbloqueou {unlockedTiers.length} marco(s) nesta trilha.
                    </p>
                  )}
                </div>
              </div>
            </section>
          )
        })}
      </div>
    </>
  )

  if (embedded) {
    return <div className="space-y-5">{content}</div>
  }

  return (
    <div className="min-h-screen bg-slate-950 px-5 pb-32 pt-4 text-white">
      <div className="mx-auto max-w-2xl">
        {content}
      </div>
    </div>
  )
}
