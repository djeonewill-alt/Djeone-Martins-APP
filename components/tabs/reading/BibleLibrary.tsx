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
    <div className="h-2 overflow-hidden rounded-full bg-white/10">
      <div
        className="h-full rounded-full bg-blue-400"
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
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
        <button
          type="button"
          onClick={() => setSelectedBook(null)}
          className="text-sm font-black text-blue-300"
        >
          ← Voltar para livros
        </button>

        <section className="rounded-[30px] border border-white/10 bg-slate-900/80 p-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-300">
            {getTestamentLabel(selectedBook.testament)}
          </p>

          <h2 className="mt-2 text-3xl font-black tracking-[-0.05em]">
            {selectedBook.name}
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            {progress.read} de {progress.total} capítulos lidos
          </p>

          <div className="mt-4">
            <ProgressBar value={progress.percentage} />
          </div>
        </section>

        <section className="grid grid-cols-4 gap-3">
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
                    ? 'rounded-2xl border border-blue-300/25 bg-blue-500/15 px-3 py-4 text-center text-sm font-black text-white'
                    : 'rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-4 text-center text-sm font-black text-slate-300'
                }
              >
                {chapter.chapter}
              </button>
            )
          })}
        </section>
      </div>
    )
  }

  if (selectedTestament) {
    const books = BIBLE_BOOKS.filter((book) => book.testament === selectedTestament)

    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => setSelectedTestament(null)}
          className="text-sm font-black text-blue-300"
        >
          ← Voltar para Bíblia
        </button>

        <section className="rounded-[30px] border border-white/10 bg-slate-900/80 p-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-300">
            Bíblia livre
          </p>

          <h2 className="mt-2 text-3xl font-black tracking-[-0.05em]">
            {getTestamentLabel(selectedTestament)}
          </h2>
        </section>

        <div className="space-y-3">
          {books.map((book) => {
            const progress = getBookProgress(state, book.id, book.chapters)

            return (
              <button
                key={book.id}
                type="button"
                onClick={() => setSelectedBook(book)}
                className="w-full rounded-[24px] border border-white/10 bg-slate-900/80 p-4 text-left"
              >
                <div className="mb-3 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-black text-white">
                      {book.name}
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      {progress.read}/{progress.total} capítulos
                    </p>
                  </div>

                  <span className="text-xs font-black text-blue-200">
                    {progress.percentage}%
                  </span>
                </div>

                <ProgressBar value={progress.percentage} />
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
      <section className="rounded-[30px] border border-white/10 bg-slate-900/80 p-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-300">
          Bíblia livre
        </p>

        <h2 className="mt-2 text-3xl font-black tracking-[-0.05em]">
          Marque o que você leu
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Leia em qualquer lugar e marque aqui seus capítulos concluídos. Esses dados alimentam seu dashboard.
        </p>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
        <div className="mb-2 flex justify-between text-sm">
          <span className="font-bold text-slate-300">Bíblia toda</span>
          <span className="text-slate-500">
            {stats.totalRead}/{stats.totalChapters}
          </span>
        </div>

        <ProgressBar value={totalPercentage} />
      </section>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setSelectedTestament('old')}
          className="rounded-[26px] border border-white/10 bg-slate-900/80 p-5 text-left"
        >
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-300">
            Antigo
          </p>

          <h3 className="mt-2 text-xl font-black">
            Testamento
          </h3>

          <p className="mt-2 text-xs text-slate-500">
            {stats.oldRead}/{stats.oldTotal} capítulos
          </p>

          <div className="mt-4">
            <ProgressBar value={oldPercentage} />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedTestament('new')}
          className="rounded-[26px] border border-white/10 bg-slate-900/80 p-5 text-left"
        >
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-300">
            Novo
          </p>

          <h3 className="mt-2 text-xl font-black">
            Testamento
          </h3>

          <p className="mt-2 text-xs text-slate-500">
            {stats.newRead}/{stats.newTotal} capítulos
          </p>

          <div className="mt-4">
            <ProgressBar value={newPercentage} />
          </div>
        </button>
      </div>
    </div>
  )
}
