export type Testament = 'old' | 'new'

export type ReadingSubTab = 'hoje' | 'planos' | 'biblia'

export type BibleBook = {
  id: string
  name: string
  shortName: string
  testament: Testament
  chapters: number
}

export type BibleChapterRef = {
  bookId: string
  bookName: string
  shortName: string
  testament: Testament
  chapter: number
}

export type ReadingPlanScope =
  | 'whole_bible'
  | 'old_testament'
  | 'new_testament'
  | 'book_collection'
  | 'single_book'

export type ReadingPlan = {
  id: string
  title: string
  subtitle: string
  days: number
  scope: ReadingPlanScope
  bookIds?: string[]
  isPremium?: boolean
}

export type ReadingState = {
  activePlanId: string | null
  activePlanStartedAt: string | null
  readChapters: Record<string, string>
}

export type ReadingStats = {
  totalRead: number
  totalChapters: number
  oldRead: number
  oldTotal: number
  newRead: number
  newTotal: number
  completedBooks: number
  totalBooks: number
}
