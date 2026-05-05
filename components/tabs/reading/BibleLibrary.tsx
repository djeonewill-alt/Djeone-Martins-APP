import { useState } from 'react'
import {
  BIBLE_BOOKS,
  getBookChapters,
  getChapterKey,
} from './bibleData'
import {
  calculateReadingStats,
  getBookProgress,
  getTestamentLabel,
} from './planUtils'
import type {
  BibleChapterRef,
  BibleBook,
  ReadingState,
  Testament,
} from './types'

type BibleLibraryProps = {
  state: ReadingState
  onToggleChapter: (chapter: BibleChapterRef) => void
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
      <div
        className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-300 to-blue-400 shadow-[0_0_18px_rgba(96,165,250,0.5)]"
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  )
}

function MiniRing({
  value,
  label,
}: {
  value: number
  label: string
}) {
  const safeValue = Math.min(Math.max(value, 0), 100)
  const radius = 34
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (safeValue / 100) * circumference

  return (
    <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
      <svg className="h-24 w-24 -rotate-90" viewBox="0 0 90 90">
        <circle
          cx="45"
          cy="45"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="7"
        />
        <circle
          cx="45"
          cy="45"
          r={radius}
          fill="none"
          stroke="url(#miniReadingGradient)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
        <defs>
          <linearGradient id="miniReadingGradient" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="60%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#facc15" />
          </linearGradient>
        </defs>
      </svg>

      <div className="absolute text-center">
        <p className="text-xl font-black tracking-[-0.05em] text-white">
          {safeValue}%
        </p>
        <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">
          {label}
        </p>
      </div>
    </div>
  )
}

function BackButton({
  children,
  onClick,
}: {
  children: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-4 inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black text-blue-200 backdrop-blur-md active:scale-[0.98]"
    >
      ← {children}
    </button>
  )
}

export default function BibleLibrary({
  state,
  onToggleChapter,
}: BibleLibraryProps) {
  const [selectedTestament, setSelectedTestament] = useState<Testament | null>(null)
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null)

  const stats = calculateReadingStats(state)

  if (selectedBook) {
    const chapters = getBookChapters(selectedBook.id)
    const progress = getBookProgress(
      state,
      selectedBook.id,
      selectedBook.chapters
    )

    return (
      <div className="space-y-5">
        <BackButton onClick={() => setSelectedBook(null)}>
          Voltar para livros
        </BackButton>

        <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-slate-900/80 p-5 shadow-[0_22px_70px_rgba(0,0,0,0.34)]">
          <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-52 w-52 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative flex items-center justify-between gap-5">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">
                {getTestamentLabel(selectedBook.testament)}
              </p>

              <h2 className="mt-2 text-4xl font-black tracking-[-0.07em] text-white">
                {selectedBook.name}
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                {progress.read} de {progress.total} capítulos lidos
              </p>
            </div>

            <MiniRing value={progress.percentage} label="Livro" />
          </div>
        </section>

        <section className="rounded-[30px] border border-white/10 bg-white/[0.035] p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-300">
                Capítulos
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Toque para marcar como lido
              </p>
            </div>

            <span className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-xs font-black text-blue-200">
              {progress.percentage}%
            </span>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {chapters.map((chapter) => {
              const key = getChapterKey(chapter.bookId, chapter.chapter)
              const isRead = Boolean(state.readChapters[key])

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onToggleChapter(chapter)}
                  className={
                    isRead
                      ? 'relative overflow-hidden rounded-[22px] border border-blue-300/25 bg-blue-500/15 px-3 py-4 text-center text-sm font-black text-white shadow-[0_12px_30px_rgba(37,99,235,0.14)]'
                      : 'rounded-[22px] border border-white/10 bg-slate-950/50 px-3 py-4 text-center text-sm font-black text-slate-300'
                  }
                >
                  {isRead && (
                    <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.22),transparent_55%)]" />
                  )}

                  <span className="relative">{chapter.chapter}</span>
                </button>
              )
            })}
          </div>
        </section>
      </div>
    )
  }

  if (selectedTestament) {
    const books = BIBLE_BOOKS.filter((book) => book.testament === selectedTestament)

    const testamentTotal =
      selectedTestament === 'old' ? stats.oldTotal : stats.newTotal

    const testamentRead =
      selectedTestament === 'old' ? stats.oldRead : stats.newRead

    const testamentPercentage =
      testamentTotal > 0 ? Math.round((testamentRead / testamentTotal) * 100) : 0

    return (
      <div className="space-y-5">
        <BackButton onClick={() => setSelectedTestament(null)}>
          Voltar para Bíblia
        </BackButton>

        <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-slate-900/80 p-5 shadow-[0_22px_70px_rgba(0,0,0,0.34)]">
          <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -left-24 -bottom-24 h-52 w-52 rounded-full bg-yellow-500/10 blur-3xl" />

          <div className="relative flex items-center justify-between gap-5">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">
                Bíblia livre
              </p>

              <h2 className="mt-2 text-4xl font-black leading-none tracking-[-0.07em]">
                {getTestamentLabel(selectedTestament)}
              </h2>

              <p className="mt-3 text-sm text-slate-400">
                {testamentRead} de {testamentTotal} capítulos lidos
              </p>
            </div>

            <MiniRing value={testamentPercentage} label="Total" />
          </div>
        </section>

        <div className="space-y-3">
          {books.map((book) => {
            const progress = getBookProgress(state, book.id, book.chapters)
            const isCompleted = progress.read === progress.total

            return (
              <button
                key={book.id}
                type="button"
                onClick={() => setSelectedBook(book)}
                className={
                  isCompleted
                    ? 'relative w-full overflow-hidden rounded-[28px] border border-emerald-300/20 bg-emerald-500/10 p-4 text-left shadow-[0_16px_45px_rgba(16,185,129,0.08)]'
                    : 'relative w-full overflow-hidden rounded-[28px] border border-white/10 bg-slate-900/80 p-4 text-left shadow-[0_12px_35px_rgba(0,0,0,0.22)]'
                }
              >
                <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-blue-500/10 blur-3xl" />

                <div className="relative">
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-black tracking-[-0.03em] text-white">
                        {book.name}
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        {progress.read}/{progress.total} capítulos
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="block text-lg font-black text-blue-100">
                        {progress.percentage}%
                      </span>

                      {isCompleted && (
                        <span className="text-xs font-black text-emerald-200">
                          completo
                        </span>
                      )}
                    </div>
                  </div>

                  <ProgressBar value={progress.percentage} />
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const totalPercentage = Math.round((stats.totalRead / stats.totalChapters) * 100)
  const oldPercentage = Math.round((stats.oldRead / stats.oldTotal) * 100)
  const newPercentage = Math.round((stats.newRead / stats.newTotal) * 100)

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-slate-900/80 p-5 shadow-[0_22px_70px_rgba(0,0,0,0.34)]">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative flex items-center justify-between gap-5">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-300">
              Bíblia livre
            </p>

            <h2 className="mt-2 text-4xl font-black leading-none tracking-[-0.075em] text-white">
              Marque o que leu
            </h2>

            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              Leia em qualquer lugar e registre seus capítulos. Seu dashboard será atualizado automaticamente.
            </p>
          </div>

          <MiniRing value={totalPercentage} label="Bíblia" />
        </div>
      </section>

      <section className="rounded-[30px] border border-white/10 bg-white/[0.035] p-5 shadow-[0_16px_45px_rgba(0,0,0,0.22)]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              Progresso geral
            </p>

            <h3 className="mt-1 text-xl font-black">
              Bíblia toda
            </h3>
          </div>

          <span className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-xs font-black text-blue-200">
            {stats.totalRead}/{stats.totalChapters}
          </span>
        </div>

        <ProgressBar value={totalPercentage} />
      </section>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setSelectedTestament('old')}
          className="relative overflow-hidden rounded-[30px] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/60 p-5 text-left shadow-[0_16px_45px_rgba(0,0,0,0.24)]"
        >
          <div className="pointer-events-none absolute -right-14 -top-14 h-32 w-32 rounded-full bg-blue-500/15 blur-3xl" />

          <div className="relative">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-300">
              Antigo
            </p>

            <h3 className="mt-2 text-2xl font-black tracking-[-0.06em]">
              Testamento
            </h3>

            <p className="mt-3 text-xs text-slate-500">
              {stats.oldRead}/{stats.oldTotal} capítulos
            </p>

            <div className="mt-4">
              <ProgressBar value={oldPercentage} />
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedTestament('new')}
          className="relative overflow-hidden rounded-[30px] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/50 p-5 text-left shadow-[0_16px_45px_rgba(0,0,0,0.24)]"
        >
          <div className="pointer-events-none absolute -right-14 -top-14 h-32 w-32 rounded-full bg-cyan-400/15 blur-3xl" />

          <div className="relative">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
              Novo
            </p>

            <h3 className="mt-2 text-2xl font-black tracking-[-0.06em]">
              Testamento
            </h3>

            <p className="mt-3 text-xs text-slate-500">
              {stats.newRead}/{stats.newTotal} capítulos
            </p>

            <div className="mt-4">
              <ProgressBar value={newPercentage} />
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}
