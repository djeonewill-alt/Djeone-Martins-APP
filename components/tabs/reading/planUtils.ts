import { BIBLE_BOOKS, getAllChapters } from './bibleData'
import type {
  BibleChapterRef,
  ReadingPlan,
  ReadingState,
  ReadingStats,
  Testament,
} from './types'

export const READING_PLANS: ReadingPlan[] = [
  {
    id: 'john-21',
    title: 'Evangelho de João em 21 dias',
    subtitle: 'Conheça Jesus através do Evangelho de João.',
    days: 21,
    scope: 'single_book',
    bookIds: ['joao'],
  },
  {
    id: 'acts-28',
    title: 'Atos em 28 dias',
    subtitle: 'Acompanhe a expansão da Igreja e a obra do Espírito Santo.',
    days: 28,
    scope: 'single_book',
    bookIds: ['atos'],
  },
  {
    id: 'proverbs-31',
    title: 'Provérbios em 31 dias',
    subtitle: 'Um capítulo por dia para crescer em sabedoria.',
    days: 31,
    scope: 'single_book',
    bookIds: ['proverbios'],
  },
  {
    id: 'psalms-60',
    title: 'Salmos em 60 dias',
    subtitle: 'Uma jornada de oração, consolo e adoração.',
    days: 60,
    scope: 'single_book',
    bookIds: ['salmos'],
  },
  {
    id: 'nt-90',
    title: 'Novo Testamento em 90 dias',
    subtitle: 'Leia os evangelhos, cartas e Apocalipse em três meses.',
    days: 90,
    scope: 'new_testament',
  },
  {
    id: 'bible-365',
    title: 'Bíblia toda em 1 ano',
    subtitle: 'Uma jornada completa pelas Escrituras em 365 dias.',
    days: 365,
    scope: 'whole_bible',
  },
]

export function getPlanById(planId: string | null) {
  if (!planId) return null

  return READING_PLANS.find((plan) => plan.id === planId) || null
}

export function getPlanChapters(plan: ReadingPlan): BibleChapterRef[] {
  if (plan.scope === 'whole_bible') {
    return getAllChapters()
  }

  if (plan.scope === 'old_testament') {
    return getAllChapters('old')
  }

  if (plan.scope === 'new_testament') {
    return getAllChapters('new')
  }

  if (plan.bookIds?.length) {
    return getAllChapters().filter((chapter) =>
      plan.bookIds?.includes(chapter.bookId)
    )
  }

  return []
}

export function splitChaptersIntoDays(
  chapters: BibleChapterRef[],
  days: number
) {
  return Array.from({ length: days }).map((_, dayIndex) => {
    const start = Math.floor((dayIndex * chapters.length) / days)
    const end = Math.floor(((dayIndex + 1) * chapters.length) / days)

    return chapters.slice(start, end)
  })
}

export function getCurrentPlanDay(startedAt: string | null, totalDays: number) {
  if (!startedAt) return 1

  const start = new Date(startedAt)
  const today = new Date()

  start.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)

  const diffMs = today.getTime() - start.getTime()
  const diffDays = Math.floor(diffMs / 86400000) + 1

  return Math.min(Math.max(diffDays, 1), totalDays)
}

export function getPlanReadingsForDay(plan: ReadingPlan, day: number) {
  const chapters = getPlanChapters(plan)
  const days = splitChaptersIntoDays(chapters, plan.days)

  return days[day - 1] || []
}

export function estimateReadingMinutes(chaptersCount: number) {
  return Math.max(3, Math.round(chaptersCount * 4.5))
}

export function calculateReadingStats(state: ReadingState): ReadingStats {
  const allChapters = getAllChapters()
  const oldChapters = getAllChapters('old')
  const newChapters = getAllChapters('new')
  const readKeys = new Set(Object.keys(state.readChapters))

  const countRead = (chapters: BibleChapterRef[]) => {
    return chapters.filter((chapter) =>
      readKeys.has(`${chapter.bookId}:${chapter.chapter}`)
    ).length
  }

  const completedBooks = BIBLE_BOOKS.filter((book) => {
    return Array.from({ length: book.chapters }).every((_, index) =>
      readKeys.has(`${book.id}:${index + 1}`)
    )
  }).length

  return {
    totalRead: countRead(allChapters),
    totalChapters: allChapters.length,
    oldRead: countRead(oldChapters),
    oldTotal: oldChapters.length,
    newRead: countRead(newChapters),
    newTotal: newChapters.length,
    completedBooks,
    totalBooks: BIBLE_BOOKS.length,
  }
}

export function getBookProgress(
  state: ReadingState,
  bookId: string,
  chapters: number
) {
  const readKeys = new Set(Object.keys(state.readChapters))

  const read = Array.from({ length: chapters }).filter((_, index) =>
    readKeys.has(`${bookId}:${index + 1}`)
  ).length

  return {
    read,
    total: chapters,
    percentage: chapters > 0 ? Math.round((read / chapters) * 100) : 0,
  }
}

export function getTestamentLabel(testament: Testament) {
  return testament === 'old' ? 'Antigo Testamento' : 'Novo Testamento'
}
