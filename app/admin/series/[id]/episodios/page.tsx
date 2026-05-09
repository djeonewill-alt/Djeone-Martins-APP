'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

import AdminAudioPlayer from '@/components/admin/AdminAudioPlayer'
import { supabase } from '@/lib/supabase'

type PodcastRow = {
  id: string
  title: string
  description: string | null
  cover_image_url: string | null
  is_free: boolean | null
}

type EpisodeRow = {
  id: string
  series_id: string | null
  title: string
  description: string | null
  bible_reference: string | null
  audio_url: string | null
  duration_seconds: number | null
  episode_number: number | null
  status: string | null
  is_preview: boolean | null
  published_at: string | null
  created_at: string | null
}

function formatDate(date?: string | null) {
  if (!date) return 'Sem data'

  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatDuration(seconds?: number | null) {
  if (!seconds) return 'Sem duração'

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
}

export default function AdminPodcastEpisodesPage() {
  const params = useParams<{ id: string }>()
  const podcastId = params.id

  const [podcast, setPodcast] = useState<PodcastRow | null>(null)
  const [episodes, setEpisodes] = useState<EpisodeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [podcastId])

  async function loadData() {
    try {
      setLoading(true)

      const { data: podcastData, error: podcastError } = await supabase
        .from('series')
        .select('id, title, description, cover_image_url, is_free')
        .eq('id', podcastId)
        .single()

      if (podcastError) throw podcastError

      const { data: episodeData, error: episodeError } = await supabase
        .from('episodes')
        .select(
          'id, series_id, title, description, bible_reference, audio_url, duration_seconds, episode_number, status, is_preview, published_at, created_at'
        )
        .eq('series_id', podcastId)
        .order('episode_number', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true })

      if (episodeError) throw episodeError

      setPodcast(podcastData as PodcastRow)
      setEpisodes((episodeData || []) as EpisodeRow[])
    } catch (error) {
      console.error('Erro ao carregar episódios do podcast:', error)
      alert('Não foi possível carregar os episódios agora.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSetPreview(episode: EpisodeRow) {
    const nextValue = !episode.is_preview

    const confirmed = confirm(
      nextValue
        ? `Definir "${episode.title}" como episódio degustativo?`
        : `Remover "${episode.title}" como episódio degustativo?`
    )

    if (!confirmed) return

    try {
      setActionLoadingId(episode.id)

      if (nextValue) {
        const { error: clearError } = await supabase
          .from('episodes')
          .update({ is_preview: false })
          .eq('series_id', podcastId)

        if (clearError) throw clearError
      }

      const { error } = await supabase
        .from('episodes')
        .update({ is_preview: nextValue })
        .eq('id', episode.id)

      if (error) throw error

      await loadData()
    } catch (error) {
      console.error('Erro ao atualizar degustativo:', error)
      alert('Não foi possível atualizar o episódio degustativo agora.')
    } finally {
      setActionLoadingId(null)
    }
  }

  async function handleDeleteEpisode(episode: EpisodeRow) {
    const confirmed = confirm(
      `Excluir o episódio "${episode.title}"?\n\nEsta ação remove o episódio do banco de dados e não pode ser desfeita.`
    )

    if (!confirmed) return

    const secondConfirm = confirm(
      'Confirme novamente: deseja realmente excluir este episódio?'
    )

    if (!secondConfirm) return

    try {
      setActionLoadingId(episode.id)

      const { error } = await supabase
        .from('episodes')
        .delete()
        .eq('id', episode.id)

      if (error) throw error

      await loadData()
      alert('Episódio excluído com sucesso.')
    } catch (error) {
      console.error('Erro ao excluir episódio:', error)
      alert('Não foi possível excluir este episódio agora.')
    } finally {
      setActionLoadingId(null)
    }
  }

  const isPremiumPodcast = podcast?.is_free === false
  const previewEpisode = episodes.find((episode) => episode.is_preview)

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              href="/admin/series"
              className="inline-flex rounded-full border border-white/10 bg-slate-900/80 px-4 py-2 text-sm font-black text-blue-200 active:scale-[0.98]"
            >
              ← Voltar para podcasts
            </Link>

            <p className="mt-6 text-[11px] font-black uppercase tracking-[0.24em] text-blue-300">
              Podcasts
            </p>

            <h1 className="mt-2 text-3xl font-black leading-none tracking-[-0.06em] sm:text-4xl">
              Gerenciar episódios
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400">
              {podcast?.title || 'Podcast'} — revise episódios, escolha o
              degustativo e exclua conteúdos quando necessário.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/admin/series/${podcastId}`}
              className="rounded-2xl border border-white/10 bg-slate-900 px-5 py-3 text-sm font-black text-slate-100 active:scale-[0.98]"
            >
              Editar podcast
            </Link>

            <Link
              href={`/admin/series/${podcastId}/episodios/novo`}
              className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-xl shadow-blue-950/20 active:scale-[0.98]"
            >
              + Novo episódio
            </Link>
          </div>
        </div>

        {podcast && (
          <div className="mb-6 grid overflow-hidden rounded-[34px] border border-white/10 bg-slate-900/70 shadow-2xl shadow-black/20 lg:grid-cols-[220px_1fr]">
            <div className="relative min-h-[150px] overflow-hidden bg-slate-900 lg:min-h-full">
              {podcast.cover_image_url ? (
                <img
                  src={podcast.cover_image_url}
                  alt={podcast.title}
                  className="absolute inset-0 h-full w-full object-cover object-center"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-slate-950 to-amber-950/30" />
              )}
            </div>

            <div className="p-5 lg:p-6">
              <div className="flex flex-wrap gap-2">
                <span
                  className={
                    isPremiumPodcast
                      ? 'rounded-full border border-amber-300/20 bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-100'
                      : 'rounded-full border border-blue-300/20 bg-blue-500/10 px-3 py-1 text-xs font-black text-blue-100'
                  }
                >
                  {isPremiumPodcast ? 'Premium' : 'Gratuito'}
                </span>

                <span className="rounded-full border border-white/10 bg-slate-950 px-3 py-1 text-xs font-black text-slate-300">
                  {episodes.length} episódios
                </span>

                {previewEpisode && (
                  <span className="rounded-full border border-emerald-300/20 bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-100">
                    Degustativo: Ep. {previewEpisode.episode_number || '?'}
                  </span>
                )}
              </div>

              <h2 className="mt-4 text-2xl font-black tracking-[-0.05em]">
                {podcast.title}
              </h2>

              {podcast.description && (
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  {podcast.description}
                </p>
              )}

              {isPremiumPodcast && !previewEpisode && (
                <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-500/10 p-4">
                  <p className="text-sm font-black text-amber-100">
                    Nenhum episódio degustativo definido.
                  </p>

                  <p className="mt-2 text-xs font-semibold leading-5 text-amber-50/90">
                    Se você não escolher um degustativo, o app ainda pode liberar
                    automaticamente o primeiro episódio como amostra.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div className="rounded-[30px] border border-white/10 bg-slate-900/70 p-8 text-sm font-bold text-slate-400">
            Carregando episódios...
          </div>
        ) : episodes.length === 0 ? (
          <div className="rounded-[30px] border border-white/10 bg-slate-900/70 p-8 text-center">
            <p className="text-5xl">🎧</p>
            <h2 className="mt-4 text-2xl font-black tracking-[-0.05em]">
              Nenhum episódio neste podcast
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Crie o primeiro episódio vinculado a este podcast.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {episodes.map((episode) => {
              const isActionLoading = actionLoadingId === episode.id

              return (
                <article
                  key={episode.id}
                  className="relative overflow-hidden rounded-[30px] border border-slate-600/80 bg-slate-900 p-5 shadow-[0_22px_70px_rgba(0,0,0,0.42)] ring-1 ring-white/10 transition hover:border-blue-300/35 hover:ring-blue-300/15"
                >
                  <div className="grid gap-5 lg:grid-cols-[1fr_190px] lg:items-center">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-white/10 bg-slate-950 px-3 py-1 text-xs font-black text-slate-300">
                          Ep. {episode.episode_number || '?'}
                        </span>

                        <span
                          className={
                            episode.status === 'published'
                              ? 'rounded-full border border-emerald-300/20 bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-100'
                              : 'rounded-full border border-slate-300/20 bg-slate-500/10 px-3 py-1 text-xs font-black text-slate-200'
                          }
                        >
                          {episode.status === 'published'
                            ? 'Publicado'
                            : episode.status || 'Rascunho'}
                        </span>

                        {episode.is_preview && (
                          <span className="rounded-full border border-amber-300/20 bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-100">
                            Degustativo
                          </span>
                        )}
                      </div>

                      <h3 className="mt-3 text-lg font-black leading-tight tracking-[-0.04em]">
                        {episode.title}
                      </h3>

                      {episode.bible_reference && (
                        <p className="mt-1 text-sm font-bold text-blue-200">
                          {episode.bible_reference}
                        </p>
                      )}

                      {episode.description && (
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">
                          {episode.description}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
                        <span>{formatDuration(episode.duration_seconds)}</span>
                        <span>Criado em {formatDate(episode.created_at)}</span>
                        {episode.published_at && (
                          <span>Publicado em {formatDate(episode.published_at)}</span>
                        )}
                      </div>

                      {episode.audio_url && (
                        <div className="mt-3 max-w-3xl">
                          <AdminAudioPlayer
                            src={episode.audio_url}
                            title={episode.title}
                            compact
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-row flex-wrap gap-2 lg:flex-col lg:justify-center">
                      <Link
                        href={`/admin/episodios/${episode.id}`}
                        className="inline-flex min-h-10 items-center justify-center rounded-xl border border-blue-300/30 bg-blue-500/18 px-4 py-2.5 text-center text-xs font-black text-blue-100 shadow-lg shadow-blue-950/20 transition hover:border-blue-300/60 hover:bg-blue-500/28 active:scale-[0.98]"
                      >
                        Editar episódio
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleSetPreview(episode)}
                        disabled={isActionLoading}
                        className={
                          episode.is_preview
                            ? 'inline-flex min-h-10 items-center justify-center rounded-xl border border-emerald-300/35 bg-emerald-500/16 px-4 py-2.5 text-xs font-black text-emerald-100 shadow-lg shadow-emerald-950/20 transition hover:border-emerald-300/60 hover:bg-emerald-500/25 active:scale-[0.98] disabled:opacity-50'
                            : 'inline-flex min-h-10 items-center justify-center rounded-xl border border-amber-300/35 bg-amber-500/18 px-4 py-2.5 text-xs font-black text-amber-100 shadow-lg shadow-amber-950/20 transition hover:border-amber-300/60 hover:bg-amber-500/28 active:scale-[0.98] disabled:opacity-50'
                        }
                      >
                        {episode.is_preview
                          ? 'Remover degustativo'
                          : 'Definir degustativo'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteEpisode(episode)}
                        disabled={isActionLoading}
                        className="inline-flex min-h-10 items-center justify-center rounded-xl border border-rose-300/25 bg-rose-500/12 px-4 py-2.5 text-xs font-black text-rose-100/90 shadow-lg shadow-rose-950/20 transition hover:border-rose-300/50 hover:bg-rose-500/22 active:scale-[0.98] disabled:opacity-50"
                      >
                        Excluir episódio
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
