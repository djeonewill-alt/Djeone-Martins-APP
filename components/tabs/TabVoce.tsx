'use client'

import { useEffect, useState } from 'react'
import { calculateReadingStats } from './reading/planUtils'
import {
  DEFAULT_READING_STATE,
  loadReadingState,
} from './reading/storage'

type TabVoceProps = {
  onOpenFavoritos?: () => void
}

type UserMetric = {
  label: string
  value: string | number
  helper: string
  accent: 'blue' | 'gold' | 'green' | 'purple' | 'cyan'
}

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
    <div className={`rounded-[26px] border p-4 ${accentClass}`}>
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
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  )
}

function UserActionButton({
  title,
  subtitle,
  icon,
  onClick,
  disabled = false,
}: {
  title: string
  subtitle: string
  icon: string
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        disabled
          ? 'relative w-full overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.025] p-5 text-left opacity-70'
          : 'relative w-full overflow-hidden rounded-[30px] border border-white/10 bg-slate-900/80 p-5 text-left shadow-[0_16px_45px_rgba(0,0,0,0.24)] active:scale-[0.99]'
      }
    >
      <div className="pointer-events-none absolute -right-14 -top-14 h-32 w-32 rounded-full bg-blue-500/12 blur-3xl" />

      <div className="relative flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] border border-white/10 bg-white/[0.055] text-2xl">
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-black tracking-[-0.04em] text-white">
            {title}
          </h3>

          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            {subtitle}
          </p>
        </div>
      </div>
    </button>
  )
}

export default function TabVoce({ onOpenFavoritos }: TabVoceProps) {
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
    <div className="min-h-screen bg-slate-950 px-5 pb-32 pt-20 text-white">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-300">
            Você
          </p>

          <h1 className="mt-2 text-3xl font-black leading-tight tracking-[-0.06em]">
            Sua jornada espiritual
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Acompanhe seu crescimento, favoritos, oração, leitura e conquistas no discipulado diário.
          </p>
        </div>

        <section className="relative mb-5 overflow-hidden rounded-[34px] border border-white/10 bg-slate-900/80 p-5 shadow-[0_22px_70px_rgba(0,0,0,0.35)]">
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">
              Painel pessoal
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

        <section className="mb-5 grid grid-cols-2 gap-3">
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

        <section className="mb-5 rounded-[34px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.24)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-300">
                Badges
              </p>

              <h2 className="mt-1 text-xl font-black">
                Conquistas
              </h2>
            </div>

            <span className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-xs font-black text-blue-200">
              Em breve
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              ['📖', 'Leitor'],
              ['🙏', 'Intercessor'],
              ['📣', 'Evangelista'],
              ['💙', 'Encorajador'],
              ['🔥', 'Constante'],
              ['🤲', 'Servo'],
            ].map(([icon, label]) => (
              <div
                key={label}
                className="rounded-[22px] border border-white/10 bg-slate-950/50 p-3 text-center"
              >
                <div className="text-2xl">{icon}</div>
                <p className="mt-2 text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <UserActionButton
            title="Favoritos"
            subtitle="Veja palavras, áudios e conteúdos que você salvou."
            icon="♡"
            onClick={onOpenFavoritos}
          />

          <UserActionButton
            title="Notificações"
            subtitle="Gerencie lembretes de devocional, leitura e oração."
            icon="🔔"
            disabled
          />

          <UserActionButton
            title="Perfil"
            subtitle="Atualize seus dados, foto e preferências pessoais."
            icon="👤"
            disabled
          />

          <UserActionButton
            title="Assinatura"
            subtitle="Recursos premium e planos personalizados no futuro."
            icon="⭐"
            disabled
          />
        </section>
      </div>
    </div>
  )
}
