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
        className="h-full rounded-full bg-blue-400"
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
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
      <section className="rounded-[30px] border border-white/10 bg-slate-900/80 p-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-300">
          Comece hoje
        </p>

        <h2 className="mt-2 text-2xl font-black tracking-[-0.04em]">
          Escolha um plano de leitura
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Você ainda não iniciou um plano. Escolha um plano pronto ou navegue pela Bíblia livremente.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onOpenPlans}
            className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white"
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

  return (
    <div className="space-y-5">
      <section className="rounded-[30px] border border-white/10 bg-slate-900/80 p-5 shadow-[0_18px_55px_rgba(0,0,0,0.32)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-300">
              Leitura de hoje
            </p>

            <h2 className="mt-2 text-2xl font-black tracking-[-0.04em]">
              Dia {currentDay} de {activePlan.days}
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              {activePlan.title}
            </p>
          </div>

          <div className="rounded-2xl bg-blue-500/15 px-3 py-2 text-right">
            <p className="text-lg font-black text-blue-100">
              {estimatedMinutes}min
            </p>
            <p className="text-[10px] font-bold text-blue-200/70">
              estimado
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
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
                    ? 'flex w-full items-center justify-between rounded-2xl border border-blue-300/20 bg-blue-500/15 p-4 text-left'
                    : 'flex w-full items-center justify-between rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-left'
                }
              >
                <span>
                  <span className="block text-sm font-black text-white">
                    {chapter.bookName} {chapter.chapter}
                  </span>

                  <span className="mt-1 block text-xs text-slate-500">
                    Toque para marcar como {isRead ? 'não lido' : 'lido'}
                  </span>
                </span>

                <span className="text-xl">
                  {isRead ? '✅' : '○'}
                </span>
              </button>
            )
          })}
        </div>

        <div className="mt-5">
          <div className="mb-2 flex justify-between text-xs font-bold text-slate-400">
            <span>Hoje</span>
            <span>{completedToday}/{readingsToday.length}</span>
          </div>

          <ProgressBar
            value={
              readingsToday.length
                ? Math.round((completedToday / readingsToday.length) * 100)
                : 0
            }
          />
        </div>
      </section>

      <section className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black">
            Seu progresso
          </h2>

          <button
            type="button"
            onClick={onOpenBible}
            className="text-xs font-black text-blue-300"
          >
            Ver detalhes
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <div className="mb-2 flex justify-between text-sm">
              <span className="font-bold text-slate-300">Bíblia toda</span>
              <span className="text-slate-500">
                {stats.totalRead}/{stats.totalChapters}
              </span>
            </div>
            <ProgressBar value={totalPercentage} />
          </div>

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

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <p className="text-2xl font-black text-white">
              {stats.completedBooks}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              livros concluídos
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <p className="text-2xl font-black text-white">
              {stats.totalRead}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              capítulos lidos
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
