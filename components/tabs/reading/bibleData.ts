import type { BibleBook, BibleChapterRef, Testament } from './types'

export const BIBLE_BOOKS: BibleBook[] = [
  { id: 'genesis', name: 'Gênesis', shortName: 'Gn', testament: 'old', chapters: 50 },
  { id: 'exodo', name: 'Êxodo', shortName: 'Êx', testament: 'old', chapters: 40 },
  { id: 'levitico', name: 'Levítico', shortName: 'Lv', testament: 'old', chapters: 27 },
  { id: 'numeros', name: 'Números', shortName: 'Nm', testament: 'old', chapters: 36 },
  { id: 'deuteronomio', name: 'Deuteronômio', shortName: 'Dt', testament: 'old', chapters: 34 },
  { id: 'josue', name: 'Josué', shortName: 'Js', testament: 'old', chapters: 24 },
  { id: 'juizes', name: 'Juízes', shortName: 'Jz', testament: 'old', chapters: 21 },
  { id: 'rute', name: 'Rute', shortName: 'Rt', testament: 'old', chapters: 4 },
  { id: '1-samuel', name: '1 Samuel', shortName: '1Sm', testament: 'old', chapters: 31 },
  { id: '2-samuel', name: '2 Samuel', shortName: '2Sm', testament: 'old', chapters: 24 },
  { id: '1-reis', name: '1 Reis', shortName: '1Rs', testament: 'old', chapters: 22 },
  { id: '2-reis', name: '2 Reis', shortName: '2Rs', testament: 'old', chapters: 25 },
  { id: '1-cronicas', name: '1 Crônicas', shortName: '1Cr', testament: 'old', chapters: 29 },
  { id: '2-cronicas', name: '2 Crônicas', shortName: '2Cr', testament: 'old', chapters: 36 },
  { id: 'esdras', name: 'Esdras', shortName: 'Ed', testament: 'old', chapters: 10 },
  { id: 'neemias', name: 'Neemias', shortName: 'Ne', testament: 'old', chapters: 13 },
  { id: 'ester', name: 'Ester', shortName: 'Et', testament: 'old', chapters: 10 },
  { id: 'jo', name: 'Jó', shortName: 'Jó', testament: 'old', chapters: 42 },
  { id: 'salmos', name: 'Salmos', shortName: 'Sl', testament: 'old', chapters: 150 },
  { id: 'proverbios', name: 'Provérbios', shortName: 'Pv', testament: 'old', chapters: 31 },
  { id: 'eclesiastes', name: 'Eclesiastes', shortName: 'Ec', testament: 'old', chapters: 12 },
  { id: 'canticos', name: 'Cânticos', shortName: 'Ct', testament: 'old', chapters: 8 },
  { id: 'isaias', name: 'Isaías', shortName: 'Is', testament: 'old', chapters: 66 },
  { id: 'jeremias', name: 'Jeremias', shortName: 'Jr', testament: 'old', chapters: 52 },
  { id: 'lamentacoes', name: 'Lamentações', shortName: 'Lm', testament: 'old', chapters: 5 },
  { id: 'ezequiel', name: 'Ezequiel', shortName: 'Ez', testament: 'old', chapters: 48 },
  { id: 'daniel', name: 'Daniel', shortName: 'Dn', testament: 'old', chapters: 12 },
  { id: 'oseias', name: 'Oseias', shortName: 'Os', testament: 'old', chapters: 14 },
  { id: 'joel', name: 'Joel', shortName: 'Jl', testament: 'old', chapters: 3 },
  { id: 'amos', name: 'Amós', shortName: 'Am', testament: 'old', chapters: 9 },
  { id: 'obadias', name: 'Obadias', shortName: 'Ob', testament: 'old', chapters: 1 },
  { id: 'jonas', name: 'Jonas', shortName: 'Jn', testament: 'old', chapters: 4 },
  { id: 'miqueias', name: 'Miqueias', shortName: 'Mq', testament: 'old', chapters: 7 },
  { id: 'naum', name: 'Naum', shortName: 'Na', testament: 'old', chapters: 3 },
  { id: 'habacuque', name: 'Habacuque', shortName: 'Hc', testament: 'old', chapters: 3 },
  { id: 'sofonias', name: 'Sofonias', shortName: 'Sf', testament: 'old', chapters: 3 },
  { id: 'ageu', name: 'Ageu', shortName: 'Ag', testament: 'old', chapters: 2 },
  { id: 'zacarias', name: 'Zacarias', shortName: 'Zc', testament: 'old', chapters: 14 },
  { id: 'malaquias', name: 'Malaquias', shortName: 'Ml', testament: 'old', chapters: 4 },

  { id: 'mateus', name: 'Mateus', shortName: 'Mt', testament: 'new', chapters: 28 },
  { id: 'marcos', name: 'Marcos', shortName: 'Mc', testament: 'new', chapters: 16 },
  { id: 'lucas', name: 'Lucas', shortName: 'Lc', testament: 'new', chapters: 24 },
  { id: 'joao', name: 'João', shortName: 'Jo', testament: 'new', chapters: 21 },
  { id: 'atos', name: 'Atos', shortName: 'At', testament: 'new', chapters: 28 },
  { id: 'romanos', name: 'Romanos', shortName: 'Rm', testament: 'new', chapters: 16 },
  { id: '1-corintios', name: '1 Coríntios', shortName: '1Co', testament: 'new', chapters: 16 },
  { id: '2-corintios', name: '2 Coríntios', shortName: '2Co', testament: 'new', chapters: 13 },
  { id: 'galatas', name: 'Gálatas', shortName: 'Gl', testament: 'new', chapters: 6 },
  { id: 'efesios', name: 'Efésios', shortName: 'Ef', testament: 'new', chapters: 6 },
  { id: 'filipenses', name: 'Filipenses', shortName: 'Fp', testament: 'new', chapters: 4 },
  { id: 'colossenses', name: 'Colossenses', shortName: 'Cl', testament: 'new', chapters: 4 },
  { id: '1-tessalonicenses', name: '1 Tessalonicenses', shortName: '1Ts', testament: 'new', chapters: 5 },
  { id: '2-tessalonicenses', name: '2 Tessalonicenses', shortName: '2Ts', testament: 'new', chapters: 3 },
  { id: '1-timoteo', name: '1 Timóteo', shortName: '1Tm', testament: 'new', chapters: 6 },
  { id: '2-timoteo', name: '2 Timóteo', shortName: '2Tm', testament: 'new', chapters: 4 },
  { id: 'tito', name: 'Tito', shortName: 'Tt', testament: 'new', chapters: 3 },
  { id: 'filemom', name: 'Filemom', shortName: 'Fm', testament: 'new', chapters: 1 },
  { id: 'hebreus', name: 'Hebreus', shortName: 'Hb', testament: 'new', chapters: 13 },
  { id: 'tiago', name: 'Tiago', shortName: 'Tg', testament: 'new', chapters: 5 },
  { id: '1-pedro', name: '1 Pedro', shortName: '1Pe', testament: 'new', chapters: 5 },
  { id: '2-pedro', name: '2 Pedro', shortName: '2Pe', testament: 'new', chapters: 3 },
  { id: '1-joao', name: '1 João', shortName: '1Jo', testament: 'new', chapters: 5 },
  { id: '2-joao', name: '2 João', shortName: '2Jo', testament: 'new', chapters: 1 },
  { id: '3-joao', name: '3 João', shortName: '3Jo', testament: 'new', chapters: 1 },
  { id: 'judas', name: 'Judas', shortName: 'Jd', testament: 'new', chapters: 1 },
  { id: 'apocalipse', name: 'Apocalipse', shortName: 'Ap', testament: 'new', chapters: 22 },
]

export function getChapterKey(bookId: string, chapter: number) {
  return `${bookId}:${chapter}`
}

export function getAllChapters(testament?: Testament): BibleChapterRef[] {
  return BIBLE_BOOKS
    .filter((book) => !testament || book.testament === testament)
    .flatMap((book) =>
      Array.from({ length: book.chapters }).map((_, index) => ({
        bookId: book.id,
        bookName: book.name,
        shortName: book.shortName,
        testament: book.testament,
        chapter: index + 1,
      }))
    )
}

export function getBookById(bookId: string) {
  return BIBLE_BOOKS.find((book) => book.id === bookId) || null
}

export function getBookChapters(bookId: string) {
  const book = getBookById(bookId)

  if (!book) return []

  return Array.from({ length: book.chapters }).map((_, index) => ({
    bookId: book.id,
    bookName: book.name,
    shortName: book.shortName,
    testament: book.testament,
    chapter: index + 1,
  }))
}
