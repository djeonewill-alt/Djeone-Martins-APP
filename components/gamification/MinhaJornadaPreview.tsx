import { useEffect, useMemo, useState, type ReactNode } from 'react'
import GamificationSvgIcon from '@/components/icons/GamificationSvgIcon'
import { buildGamificationStats, checkAndUnlockAchievements, type UnlockedAchievement } from '@/lib/gamification/unlock'
import PremiumIconTile from '@/components/icons/PremiumIconTile'
import {
  AchievementDefinition,
  buildAchievementDefinitions,
  calculateJourneyPoints,
  getJourneyLevel,
} from './achievementDefinitions'

function MiniProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-white/10">
      <div
        className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-400 to-amber-300 shadow-[0_0_18px_rgba(56,189,248,0.42)]"
        style={{ width: Math.min(Math.max(value, 0), 100) + '%' }}
      />
    </div>
  )
}

function AchievementCard({ achievement }: { achievement: AchievementDefinition }) {
  const progress = Math.min(
    Math.round((achievement.current / achievement.target) * 100),
    100
  )

  return (
    <div className="rounded-[26px] border border-white/10 bg-slate-950/55 p-4">
      <div className="flex items-start gap-3">
        <PremiumIconTile tone={achievement.tone} size="md">
          <GamificationSvgIcon name={achievement.icon} className="h-8 w-8" />
        </PremiumIconTile>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-black text-white">
              {achievement.title}
            </h3>

            <span className="shrink-0 rounded-full border border-white/10 bg-slate-900/80 px-2.5 py-1 text-[10px] font-black text-slate-300">
              {achievement.unlocked ? 'desbloqueada' : achievement.current + '/' + achievement.target}
            </span>
          </div>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {achievement.spiritualName}
          </p>

          <div className="mt-3">
            <MiniProgressBar value={progress} />
          </div>
        </div>
      </div>
    </div>
  )
}

type MinhaJornadaPreviewProps = {
  chaptersRead: number
  prayedCount: number
  shareCount: number
  encouragementCount: number
  myPrayerCount: number
  activitySlot?: ReactNode
}

export default function MinhaJornadaPreview({
  chaptersRead,
  prayedCount,
  shareCount,
  encouragementCount,
  myPrayerCount,
  activitySlot,
}: MinhaJornadaPreviewProps) {
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

  const points = calculateJourneyPoints({
    chaptersRead,
    prayedCount,
    shareCount,
    encouragementCount,
    myPrayerCount,
  })

  const journeyLevel = getJourneyLevel(points)

  const achievements = buildAchievementDefinitions({
    chaptersRead,
    prayedCount,
    shareCount,
    encouragementCount,
    myPrayerCount,
  })

  const unlockedKeys = new Set(
    unlockedAchievements.map((achievement) => achievement.achievement_key)
  )

  const unlockedCount = achievements.filter((achievement) =>
    unlockedKeys.has(achievement.key)
  ).length

  const highlighted = achievements
    .map((achievement) => ({
      ...achievement,
      unlocked: unlockedKeys.has(achievement.key),
      unlockedTier: unlockedAchievements
        .filter((item) => item.achievement_key === achievement.key)
        .map((item) => item.tier)
        .join(', '),
    }))
    .sort((a, b) => Number(b.unlocked) - Number(a.unlocked))
    .slice(0, 4)

  return (
    <section className="mb-5 space-y-4">
      <div className="relative overflow-hidden rounded-[34px] border border-white/10 bg-slate-900/80 p-5 shadow-[0_22px_70px_rgba(0,0,0,0.35)]">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-amber-400/10 blur-3xl" />

        <div className="relative">
          <div className="flex items-start gap-4">
            <PremiumIconTile tone="cyan" size="lg">
              <GamificationSvgIcon name="journey" className="h-8 w-8" />
            </PremiumIconTile>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">
                Minha Jornada
              </p>

              <h2 className="mt-2 text-2xl font-black leading-tight tracking-[-0.06em] text-white">
                {journeyLevel.current.title}
              </h2>

              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {'Acompanhe seus frutos de constância, oração, leitura e serviço no discipulado diário.'}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-[24px] border border-cyan-300/15 bg-cyan-500/10 p-4">
              <p className="text-3xl font-black tracking-[-0.06em] text-white">
                {points}
              </p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/80">
                pontos de jornada
              </p>
            </div>

            <div className="rounded-[24px] border border-amber-300/15 bg-amber-500/10 p-4">
              <p className="text-3xl font-black tracking-[-0.06em] text-white">
                {unlockedCount}/{achievements.length}
              </p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-100/80">
                conquistas desbloqueadas
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-[24px] border border-white/10 bg-slate-950/55 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-black text-white">
                Próxima etapa
              </p>

              <p className="text-xs font-bold text-slate-400">
                {journeyLevel.next
                  ? 'faltam ' + journeyLevel.pointsToNext + ' pontos'
                  : 'jornada completa'}
              </p>
            </div>

            <MiniProgressBar value={journeyLevel.progress} />

            {journeyLevel.next && (
              <p className="mt-3 text-xs leading-5 text-slate-500">
                Continue ouvindo, orando, encorajando e crescendo para chegar em{' '}
                <span className="font-black text-cyan-100">
                  {journeyLevel.next.title}
                </span>.
              </p>
            )}
          </div>
        </div>
      </div>

      {activitySlot}

      <div className="rounded-[34px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.24)]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-300">
              Conquistas espirituais
            </p>

            <h2 className="mt-1 text-xl font-black text-white">
              Próximos marcos
            </h2>
          </div>

          <span className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-xs font-black text-blue-200">
            trilhas
          </span>
        </div>

        <div className="space-y-3">
          {highlighted.map((achievement) => (
            <AchievementCard
              key={achievement.key}
              achievement={achievement}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
