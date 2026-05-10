'use client'

import { useEffect, useState } from 'react'
import MinhaJornadaPreview from '@/components/gamification/MinhaJornadaPreview'
import AchievementsDetail from '@/components/gamification/AchievementsDetail'
import { calculateReadingStats } from './reading/planUtils'
import {
  DEFAULT_READING_STATE,
  loadReadingState,
} from './reading/storage'

type TabVoceProps = {
  onOpenFavoritos?: () => void
}

type UserSubTab = 'jornada' | 'trilhas'

type UserMetric = {
  label: string
  value: string | number
  helper: string
  accent: 'blue' | 'gold' | 'green' | 'purple' | 'cyan'
}

const userTabs: Array<{ id: UserSubTab; label: string }> = [
  { id: 'jornada', label: 'Jornada' },
  { id: 'trilhas', label: 'Trilhas' },
]

function getLocalArray(key: string) {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(key)
    const parsed = raw ? JSON.parse(raw) : []

    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function getLocalNumber(key: string) {
  if (typeof window === 'undefined') return 0

  const value = Number(window.localStorage.getItem(key) || 0)

  return Number.isFinite(value) ? value : 0
}

function MetricCard({
  label,
  value,
  helper,
  accent,
}: UserMetric) {
  const accentClass =
    accent === 'gold'
      ? 'border-yellow-300/15 bg-yellow-500/10 text-yellow-100'
      : accent === 'green'
        ? 'border-emerald-300/15 bg-emerald-500/10 text-emerald-100'
        : accent === 'purple'
          ? 'border-purple-300/15 bg-purple-500/10 text-purple-100'
          : accent === 'cyan'
            ? 'border-cyan-300/15 bg-cyan-500/10 text-cyan-100'
            : 'border-blue-300/15 bg-blue-500/10 text-blue-100'

  return (
    <div className={'rounded-[26px] border p-4 ' + accentClass}>
      <p className="text-3xl font-black tracking-[-0.06em]">
        {value}
      </p>

      <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] opacity-80">
        {label}
      </p>

      <p className="mt-2 text-xs leading-relaxed text-slate-400">
        {helper}
      </p>
    </div>
  )
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-white/10">
      <div
        className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-300 to-blue-400 shadow-[0_0_18px_rgba(96,165,250,0.55)]"
        style={{ width: Math.min(Math.max(value, 0), 100) + '%' }}
      />
    </div>
  )
}

function UserTabs({
  activeTab,
  onChange,
}: {
  activeTab: UserSubTab
  onChange: (tab: UserSubTab) => void
}) {
  return (
    <div className="mb-6 rounded-[28px] border border-white/10 bg-white/[0.035] p-1.5 shadow-[0_16px_45px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <div className="grid grid-cols-2 gap-1">
        {userTabs.map((tab) => {
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={
                isActive
                  ? 'relative rounded-[20px] bg-slate-950 px-2 py-3 text-[10px] font-black uppercase tracking-[0.1em] text-white shadow-[inset_0_0_0_1px_rgba(96,165,250,0.22),0_10px_28px_rgba(37,99,235,0.18)]'
                  : 'rounded-[20px] px-2 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500 transition-all hover:text-slate-300'
              }
            >
              <span>{tab.label}</span>

              {isActive && (
                <span className="absolute bottom-1.5 left-1/2 h-1 w-7 -translate-x-1/2 rounded-full bg-blue-400 shadow-[0_0_18px_rgba(96,165,250,0.75)]" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ActivityPanel({
  biblePercentage,
  chaptersRead,
  prayedCount,
  shareCount,
  encouragementCount,
}: {
  biblePercentage: number
  chaptersRead: number
  prayedCount: number
  shareCount: number
  encouragementCount: number
}) {
  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-slate-900/80 p-5 shadow-[0_22px_70px_rgba(0,0,0,0.35)]">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">
            Atividade pessoal
          </p>

          <div className="mt-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-4xl font-black tracking-[-0.075em] text-white">
                {biblePercentage}%
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                da Bíblia marcada como lida
              </p>
            </div>

            <div className="rounded-[22px] border border-blue-300/15 bg-blue-500/10 px-4 py-3 text-right">
              <p className="text-2xl font-black text-blue-100">
                {chaptersRead}
              </p>

              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-200/70">
                capítulos
              </p>
            </div>
          </div>

          <div className="mt-5">
            <ProgressBar value={biblePercentage} />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <MetricCard
          label="Leitura"
          value={chaptersRead}
          helper="capítulos lidos"
          accent="blue"
        />

        <MetricCard
          label="Oração"
          value={prayedCount}
          helper="pedidos intercedidos"
          accent="gold"
        />

        <MetricCard
          label="Evangelismo"
          value={shareCount}
          helper="compartilhamentos"
          accent="purple"
        />

        <MetricCard
          label="Encorajar"
          value={encouragementCount}
          helper="mensagens enviadas"
          accent="cyan"
        />
      </section>
    </div>
  )
}

export default function TabVoce(_props: TabVoceProps) {
  void _props

  const [activeUserSubTab, setActiveUserSubTab] = useState<UserSubTab>('jornada')
  const [chaptersRead, setChaptersRead] = useState(0)
  const [biblePercentage, setBiblePercentage] = useState(0)
  const [prayedCount, setPrayedCount] = useState(0)
  const [myPrayerCount, setMyPrayerCount] = useState(0)
  const [shareCount, setShareCount] = useState(0)
  const [encouragementCount, setEncouragementCount] = useState(0)

  useEffect(() => {
    const readingState = loadReadingState() || DEFAULT_READING_STATE
    const readingStats = calculateReadingStats(readingState)

    setChaptersRead(readingStats.totalRead)
    setBiblePercentage(
      readingStats.totalChapters > 0
        ? Math.round((readingStats.totalRead / readingStats.totalChapters) * 100)
        : 0
    )

    setPrayedCount(getLocalArray('djeone-prayed-ids-v1').length)
    setMyPrayerCount(getLocalArray('djeone-my-prayer-ids-v1').length)
    setShareCount(getLocalNumber('djeone-share-count-v1'))
    setEncouragementCount(getLocalArray('djeone-encouragement-ids-v1').length)
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 px-5 pb-32 pt-4 text-white">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-300">
            Você
          </p>

          <h1 className="mt-2 text-3xl font-black leading-tight tracking-[-0.06em]">
            Sua jornada espiritual
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Acompanhe sua caminhada, suas trilhas e os frutos de constância no discipulado diário.
          </p>
        </div>

        <UserTabs
          activeTab={activeUserSubTab}
          onChange={setActiveUserSubTab}
        />

        {activeUserSubTab === 'jornada' && (
          <MinhaJornadaPreview
            chaptersRead={chaptersRead}
            prayedCount={prayedCount}
            shareCount={shareCount}
            encouragementCount={encouragementCount}
            myPrayerCount={myPrayerCount}
            activitySlot={
              <ActivityPanel
                biblePercentage={biblePercentage}
                chaptersRead={chaptersRead}
                prayedCount={prayedCount}
                shareCount={shareCount}
                encouragementCount={encouragementCount}
              />
            }
          />
        )}

        {activeUserSubTab === 'trilhas' && (
          <AchievementsDetail
            chaptersRead={chaptersRead}
            prayedCount={prayedCount}
            shareCount={shareCount}
            encouragementCount={encouragementCount}
            myPrayerCount={myPrayerCount}
            embedded
            onBack={() => setActiveUserSubTab('jornada')}
          />
        )}
      </div>
    </div>
  )
}
