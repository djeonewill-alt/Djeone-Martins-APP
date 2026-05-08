'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

import { supabase } from '@/lib/supabase'

type SeriesRow = {
  id: string
  title: string
  description: string | null
  cover_image_url: string | null
  book_name: string | null
  bible_book: string | null
  icon_emoji: string | null
  is_free: boolean | null
  is_current: boolean | null
  total_episodes: number | null
  order_index: number | null
  created_at: string | null
  updated_at: string | null
  episode_count?: number
}

function formatDate(date?: string | null) {
  if (!date) return 'Sem data'

  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function AdminSeriesPage() {
  const [series, setSeries] = useState<SeriesRow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  useEffect(() => {
    loadSeries()
  }, [])

  async function loadSeries() {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('series')
        .select('*')
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: false })

      if (error) throw error

      const rows = await Promise.all(
        (data || []).map(async (serie) => {
          const { count, error: countError } = await supabase
            .from('episodes')
            .select('id', { count: 'exact', head: true })
            .eq('series_id', serie.id)

          if (countError) {
            console.error('Erro ao contar episódios:', countError)
          }

          return {
            ...serie,
            episode_count: count || 0,
          } as SeriesRow
        })
      )

      setSeries(rows)
    } catch (error) {
      console.error('Erro ao carregar podcasts:', error)
      alert('Não foi possível carregar as podcasts agora.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(serie: SeriesRow) {
    if ((serie.episode_count || 0) > 0) {
      alert(
        'Este podcast possui episódios vinculados. Para evitar perda de organização, remova ou mova os episódios antes de excluir o podcast.'
      )
      return
    }

    const confirmed = confirm(
      `Excluir o podcast "${serie.title}"?\n\nEsta ação não pode ser desfeita.`
    )

    if (!confirmed) return

    try {
      setActionLoadingId(serie.id)

      const { error } = await supabase
        .from('series')
        .delete()
        .eq('id', serie.id)

      if (error) throw error

      await loadSeries()
    } catch (error) {
      console.error('Erro ao excluir podcast:', error)
      alert('Não foi possível excluir o podcast agora.')
    } finally {
      setActionLoadingId(null)
    }
  }

  const filteredSeries = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    if (!term) return series

    return series.filter((serie) => {
      const title = serie.title.toLowerCase()
      const book =
        serie.bible_book?.toLowerCase() ||
        serie.book_name?.toLowerCase() ||
        ''
      const description = serie.description?.toLowerCase() || ''

      return (
        title.includes(term) ||
        book.includes(term) ||
        description.includes(term)
      )
    })
  }, [searchTerm, series])

  const stats = useMemo(() => {
    const totalEpisodes = series.reduce(
      (sum, serie) => sum + (serie.episode_count || 0),
      0
    )

    return {
      totalSeries: series.length,
      totalEpisodes,
      freeSeries: series.filter((serie) => serie.is_free !== false).length,
      currentSeries: series.filter((serie) => serie.is_current).length,
    }
  }, [series])

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-white">
      <section className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              href="/admin"
              className="inline-flex rounded-full border border-white/10 bg-slate-900/80 px-4 py-2 text-sm font-black text-blue-200 active:scale-[0.98]"
            >
              ← Voltar ao painel
            </Link>

            <p className="mt-7 text-[11px] font-black uppercase tracking-[0.24em] text-blue-300">
              Conteúdo
            </p>

            <h1 className="mt-2 text-4xl font-black leading-none tracking-[-0.07em] sm:text-5xl">
              Podcasts devocionais
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400">
              Organize podcasts como Salmo 23, Atos, João e outras jornadas em
              áudio. Esta área foi pensada para trabalho no desktop.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/nova-serie"
              className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-xl shadow-blue-950/20 active:scale-[0.98]"
            >
              + Novo podcast
            </Link>

            <Link
              href="/admin/novo-episodio"
              className="rounded-2xl border border-white/10 bg-slate-900 px-5 py-3 text-sm font-black text-slate-100 active:scale-[0.98]"
            >
              + Novo episódio
            </Link>
          </div>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-5">
            <p className="text-3xl font-black">{loading ? '...' : stats.totalSeries}</p>
            <p className="mt-1 text-sm font-bold text-slate-400">podcasts criados</p>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-5">
            <p className="text-3xl font-black">{loading ? '...' : stats.totalEpisodes}</p>
            <p className="mt-1 text-sm font-bold text-slate-400">episódios vinculados</p>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-5">
            <p className="text-3xl font-black">{loading ? '...' : stats.freeSeries}</p>
            <p className="mt-1 text-sm font-bold text-slate-400">podcasts gratuitos</p>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-5">
            <p className="text-3xl font-black">{loading ? '...' : stats.currentSeries}</p>
            <p className="mt-1 text-sm font-bold text-slate-400">podcasts em destaque</p>
          </div>
        </div>

        <div className="mb-8 rounded-[30px] border border-amber-300/20 bg-amber-300/10 p-5">
          <p className="text-sm font-black text-amber-100">
            Dados técnicos recomendados para capas
          </p>

          <div className="mt-3 grid gap-3 text-sm leading-6 text-amber-50/90 md:grid-cols-2">
            <p>
              Use imagens horizontais em <strong>16:9</strong>, idealmente
              <strong> 1920 x 1080 px</strong>. Mantenha rostos, textos e
              elementos importantes no centro para evitar cortes.
            </p>

            <p>
              Formato recomendado: <strong>JPG ou PNG</strong>. Peso ideal:
              até <strong>500 KB</strong>. Evite texto muito perto das bordas.
            </p>
          </div>
        </div>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar por título, livro ou descrição..."
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-blue-300/60 sm:max-w-md"
          />

          <button
            type="button"
            onClick={loadSeries}
            className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm font-black text-slate-200 active:scale-[0.98]"
          >
            Atualizar
          </button>
        </div>

        {loading ? (
          <div className="rounded-[30px] border border-white/10 bg-slate-900/70 p-8 text-sm font-bold text-slate-400">
            Carregando podcasts...
          </div>
        ) : filteredSeries.length === 0 ? (
          <div className="rounded-[30px] border border-white/10 bg-slate-900/70 p-8 text-center">
            <p className="text-5xl">📚</p>
            <h2 className="mt-4 text-2xl font-black tracking-[-0.05em]">
              Nenhumo podcast encontrada
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              {searchTerm
                ? 'Tente buscar por outro termo.'
                : 'Crie a primeiro podcast para começar a organizar seus episódios.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredSeries.map((serie) => {
              const book = serie.bible_book || serie.book_name || 'Sem livro'
              const isDeleting = actionLoadingId === serie.id

              return (
                <article
                  key={serie.id}
                  className="rounded-[30px] border border-white/10 bg-slate-900/70 p-4 shadow-2xl shadow-black/20"
                >
                  <div className="grid gap-5 lg:grid-cols-[220px_1fr_auto] lg:items-start">
                    <div className="relative h-[124px] overflow-hidden rounded-[24px] border border-white/10 bg-slate-950 lg:h-[140px]">
                      {serie.cover_image_url ? (
                        <img
                          src={serie.cover_image_url}
                          alt={serie.title}
                          className="absolute inset-0 h-full w-full object-cover object-center"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-950 via-slate-950 to-amber-950/30 text-5xl">
                          {serie.icon_emoji || '📖'}
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-2">
                        {serie.is_current && (
                          <span className="rounded-full border border-emerald-300/20 bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-100">
                            Destaque atual
                          </span>
                        )}

                        {serie.is_free === false ? (
                          <span className="rounded-full border border-amber-300/20 bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-100">
                            Premium
                          </span>
                        ) : (
                          <span className="rounded-full border border-blue-300/20 bg-blue-500/10 px-3 py-1 text-xs font-black text-blue-100">
                            Gratuita
                          </span>
                        )}

                        <span className="rounded-full border border-white/10 bg-slate-950 px-3 py-1 text-xs font-black text-slate-300">
                          {serie.episode_count || 0} episódios
                        </span>
                      </div>

                      <h2 className="mt-4 text-2xl font-black leading-tight tracking-[-0.05em] text-white">
                        {serie.title}
                      </h2>

                      <p className="mt-1 text-sm font-bold text-blue-200">
                        {serie.icon_emoji || '📖'} {book}
                      </p>

                      {serie.description && (
                        <p className="mt-3 line-clamp-2 max-w-2xl text-sm leading-6 text-slate-400">
                          {serie.description}
                        </p>
                      )}

                      <p className="mt-3 text-xs font-bold text-slate-600">
                        Criada em {formatDate(serie.created_at)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3 lg:w-[180px] lg:flex-col">
                      <Link
                        href={`/admin/series/${serie.id}`}
                        className="rounded-2xl bg-blue-600 px-4 py-3 text-center text-sm font-black text-white active:scale-[0.98]"
                      >
                        Editar podcast
                      </Link>

                      <Link
                        href={`/admin/series/${serie.id}/episodios`}
                        className="rounded-2xl border border-amber-300/20 bg-amber-500/10 px-4 py-3 text-center text-sm font-black text-amber-100 active:scale-[0.98]"
                      >
                        Gerenciar episódios
                      </Link>

                      <Link
                        href={`/admin/novo-episodio?series_id=${serie.id}`}
                        className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-center text-sm font-black text-slate-100 active:scale-[0.98]"
                      >
                        Novo episódio
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleDelete(serie)}
                        disabled={isDeleting}
                        className="rounded-2xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm font-black text-red-100 active:scale-[0.98] disabled:opacity-50"
                      >
                        {isDeleting ? 'Excluindo...' : 'Excluir'}
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}

