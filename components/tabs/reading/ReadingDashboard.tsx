import { getChapterKey } from './bibleData'
import {
  calculateReadingStats,
  estimateReadingMinutes,
  getCurrentPlanDay,
  getPlanById,
  getPlanReadingsForDay,
} from './planUtils'
import type { BibleChapterRef, ReadingState } from './types'

type ReadingDashboardProps = {
  state: ReadingState
  onToggleChapter: (chapter: BibleChapterRef) => void
  onOpenPlans: () => void
  onOpenBible: () => void
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

function ProgressRing({
  value,
  label,
}: {
  value: number
  label: string
}) {
  const safeValue = Math.min(Math.max(value, 0), 100)
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (safeValue / 100) * circumference

  return (
    <div className="relative flex h-32 w-32 shrink-0 items-center justify-center">
      <svg className="h-32 w-32 -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="url(#readingRingGradient)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
        <defs>
          <linearGradient id="readingRingGradient" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="55%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#facc15" />
          </linearGradient>
        </defs>
      </svg>

      <div className="absolute text-center">
        <p className="text-3xl font-black tracking-[-0.06em] text-white">
          {safeValue}%
        </p>
        <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
          {label}
        </p>
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  accent = 'blue',
}: {
  label: string
  value: string | number
  accent?: 'blue' | 'gold' | 'green'
}) {
  const accentClass =
    accent === 'gold'
      ? 'text-yellow-200 bg-yellow-500/10 border-yellow-300/15'
      : accent === 'green'
        ? 'text-emerald-200 bg-emerald-500/10 border-emerald-300/15'
        : 'text-blue-200 bg-blue-500/10 border-blue-300/15'

  return (
    <div className={`rounded-[24px] border p-4 ${accentClass}`}>
      <p className="text-2xl font-black tracking-[-0.05em]">
        {value}
      </p>

      <p className="mt-1 text-[11px] font-bold leading-snug opacity-70">
        {label}
      </p>
    </div>
  )
}

export default function ReadingDashboard({
  state,
  onToggleChapter,
  onOpenPlans,
  onOpenBible,
}: ReadingDashboardProps) {
  const activePlan = getPlanById(state.activePlanId)
  const stats = calculateReadingStats(state)
  const totalPercentage = Math.round((stats.totalRead / stats.totalChapters) * 100)
  const oldPercentage = Math.round((stats.oldRead / stats.oldTotal) * 100)
  const newPercentage = Math.round((stats.newRead / stats.newTotal) * 100)

  if (!activePlan) {
    return (
      <section className="overflow-hidden rounded-[34px] border border-white/10 bg-slate-900/80 p-5 shadow-[0_22px_70px_rgba(0,0,0,0.35)]">
        <div className="pointer-events-none absolute inset-0" />

        <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">
          Comece hoje
        </p>

        <h2 className="mt-2 text-2xl font-black tracking-[-0.05em]">
          Escolha um plano de leitura
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Você ainda não iniciou um plano. Escolha um plano pronto ou navegue pela Bíblia livremente.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onOpenPlans}
            className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-[0_12px_35px_rgba(37,99,235,0.28)]"
          >
            Ver planos
          </button>

          <button
            type="button"
            onClick={onOpenBible}
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-white"
          >
            Abrir Bíblia
          </button>
        </div>
      </section>
    )
  }

  const currentDay = getCurrentPlanDay(
    state.activePlanStartedAt,
    activePlan.days
  )
  const readingsToday = getPlanReadingsForDay(activePlan, currentDay)
  const estimatedMinutes = estimateReadingMinutes(readingsToday.length)

  const completedToday = readingsToday.filter((chapter) =>
    Boolean(state.readChapters[getChapterKey(chapter.bookId, chapter.chapter)])
  ).length

  const todayPercentage =
    readingsToday.length > 0
      ? Math.round((completedToday / readingsToday.length) * 100)
      : 0

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-slate-900/80 p-5 shadow-[0_22px_70px_rgba(0,0,0,0.35)]">
        <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-52 w-52 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">
                Leitura de hoje
              </p>

              <h2 className="mt-2 text-3xl font-black tracking-[-0.06em]">
                Dia {currentDay} de {activePlan.days}
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                {activePlan.title}
              </p>
            </div>

            <div className="rounded-[22px] border border-blue-300/15 bg-blue-500/12 px-4 py-3 text-right">
              <p className="text-2xl font-black tracking-[-0.05em] text-blue-100">
                {estimatedMinutes}
              </p>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-200/70">
                minutos
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {readingsToday.map((chapter) => {
              const key = getChapterKey(chapter.bookId, chapter.chapter)
              const isRead = Boolean(state.readChapters[key])

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onToggleChapter(chapter)}
                  className={
                    isRead
                      ? 'flex w-full items-center justify-between rounded-[24px] border border-emerald-300/20 bg-emerald-500/12 p-4 text-left shadow-[0_12px_30px_rgba(16,185,129,0.08)]'
                      : 'flex w-full items-center justify-between rounded-[24px] border border-white/10 bg-slate-950/55 p-4 text-left'
                  }
                >
                  <span>
                    <span className="block text-base font-black text-white">
                      {chapter.bookName} {chapter.chapter}
                    </span>

                    <span className="mt-1 block text-xs text-slate-500">
                      {isRead ? 'Concluído' : 'Toque para marcar como lido'}
                    </span>
                  </span>

                  <span className={isRead ? 'text-2xl' : 'text-xl text-slate-500'}>
                    {isRead ? '✅' : '○'}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="mt-5">
            <div className="mb-2 flex justify-between text-xs font-bold text-slate-400">
              <span>Progresso de hoje</span>
              <span>{completedToday}/{readingsToday.length}</span>
            </div>

            <ProgressBar value={todayPercentage} />
          </div>
        </div>
      </section>

      <section className="rounded-[34px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.25)]">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-300">
              Dashboard
            </p>

            <h2 className="mt-1 text-xl font-black">
              Seu progresso
            </h2>
          </div>

          <button
            type="button"
            onClick={onOpenBible}
            className="rounded-full border border-blue-300/15 bg-blue-500/10 px-3 py-1.5 text-[11px] font-black text-blue-200"
          >
            Drilldown
          </button>
        </div>

        <div className="flex items-center gap-5">
          <ProgressRing value={totalPercentage} label="Bíblia" />

          <div className="min-w-0 flex-1 space-y-4">
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span className="font-bold text-slate-300">Antigo Testamento</span>
                <span className="text-slate-500">
                  {stats.oldRead}/{stats.oldTotal}
                </span>
              </div>
              <ProgressBar value={oldPercentage} />
            </div>

            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span className="font-bold text-slate-300">Novo Testamento</span>
                <span className="text-slate-500">
                  {stats.newRead}/{stats.newTotal}
                </span>
              </div>
              <ProgressBar value={newPercentage} />
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <MetricCard
            value={stats.totalRead}
            label="capítulos lidos"
            accent="blue"
          />

          <MetricCard
            value={stats.completedBooks}
            label="livros concluídos"
            accent="gold"
          />

          <MetricCard
            value={todayPercentage + '%'}
            label="hoje"
            accent="green"
          />
        </div>
      </section>
    </div>
  )
}
