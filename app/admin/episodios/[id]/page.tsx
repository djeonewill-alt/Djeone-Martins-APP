'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

import AdminAudioPlayer from '@/components/admin/AdminAudioPlayer'
import { supabase } from '@/lib/supabase'

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
  is_preview: boolean
  published_at: string | null
  created_at: string | null
  transcription_text: string | null
}

export default function AdminEditEpisodePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const episodeId = params.id

  const [episode, setEpisode] = useState<EpisodeRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [bibleReference, setBibleReference] = useState('')
  const [episodeNumber, setEpisodeNumber] = useState('')
  const [status, setStatus] = useState('draft')
  const [isPreview, setIsPreview] = useState(false)
  const [transcriptionText, setTranscriptionText] = useState('')

  useEffect(() => {
    async function loadEpisode() {
      try {
        setLoading(true)

        const { data, error } = await supabase
          .from('episodes')
          .select(
            'id, series_id, title, description, bible_reference, audio_url, duration_seconds, episode_number, status, is_preview, published_at, created_at, transcription_text'
          )
          .eq('id', episodeId)
          .single()

        if (error) throw error

        const row = data as EpisodeRow

        setEpisode(row)
        setTitle(row.title || '')
        setDescription(row.description || '')
        setBibleReference(row.bible_reference || '')
        setEpisodeNumber(
          row.episode_number === null || row.episode_number === undefined
            ? ''
            : String(row.episode_number)
        )
        setStatus(row.status || 'draft')
        setIsPreview(Boolean(row.is_preview))
        setTranscriptionText(row.transcription_text || '')
      } catch (error) {
        console.error('Erro ao carregar episódio:', error)
        alert('Não foi possível carregar este episódio.')
        router.push('/admin/series')
      } finally {
        setLoading(false)
      }
    }

    loadEpisode()
  }, [episodeId, router])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!episode) return

    if (!title.trim()) {
      alert('Informe o título do episódio.')
      return
    }

    const parsedEpisodeNumber = episodeNumber.trim()
      ? Number.parseInt(episodeNumber.trim(), 10)
      : null

    if (episodeNumber.trim() && Number.isNaN(parsedEpisodeNumber)) {
      alert('Informe um número de episódio válido.')
      return
    }

    try {
      setSaving(true)

      if (isPreview && episode.series_id) {
        const { error: clearPreviewError } = await supabase
          .from('episodes')
          .update({ is_preview: false })
          .eq('series_id', episode.series_id)
          .neq('id', episode.id)

        if (clearPreviewError) throw clearPreviewError
      }

      const nextPublishedAt =
        status === 'published'
          ? episode.published_at || new Date().toISOString()
          : status === 'draft'
            ? null
            : episode.published_at

      const { error } = await supabase
        .from('episodes')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          bible_reference: bibleReference.trim() || null,
          episode_number: parsedEpisodeNumber,
          status,
          is_preview: isPreview,
          transcription_text: transcriptionText.trim() || null,
          published_at: nextPublishedAt,
        })
        .eq('id', episode.id)

      if (error) throw error

      alert('Episódio atualizado com sucesso.')

      if (episode.series_id) {
        router.push(`/admin/series/${episode.series_id}/episodios`)
      } else {
        router.push('/admin/episodios')
      }
    } catch (error) {
      console.error('Erro ao salvar episódio:', error)
      alert('Não foi possível salvar as alterações agora.')
    } finally {
      setSaving(false)
    }
  }

  const backHref = episode?.series_id
    ? `/admin/series/${episode.series_id}/episodios`
    : '/admin/episodios'

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-6 text-white">
        <section className="mx-auto max-w-6xl">
          <div className="rounded-[32px] border border-white/10 bg-slate-900/70 p-8 text-sm font-bold text-slate-400">
            Carregando episódio...
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-6xl">
        <Link
          href={backHref}
          className="inline-flex rounded-full border border-white/10 bg-slate-900/90 px-4 py-2 text-sm font-black text-blue-200 shadow-lg shadow-black/10 active:scale-[0.98]"
        >
          ← Voltar para episódios
        </Link>

        <header className="mt-6 rounded-[34px] border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-300">
            Admin / Episódios
          </p>

          <h1 className="mt-2 text-3xl font-black leading-none tracking-[-0.06em] sm:text-4xl">
            Editar episódio
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400">
            Edite o título, descrição, referência bíblica, status e texto
            transcrito do episódio.
          </p>
        </header>

        {episode?.audio_url && (
          <section className="mt-5 rounded-[30px] border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-black/10">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-blue-200">
              Áudio atual
            </p>

            <AdminAudioPlayer
              src={episode.audio_url}
              title={episode.title}
            />
          </section>
        )}

        <form
          onSubmit={handleSubmit}
          className="mt-5 rounded-[34px] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-black/20 sm:p-7"
        >
          <div className="grid gap-6">
            <div>
              <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-200">
                Título do episódio *
              </label>

              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-2 min-h-12 w-full rounded-2xl border border-white/10 bg-slate-950/90 px-4 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-blue-300/70 focus:bg-slate-950 focus:shadow-lg focus:shadow-blue-950/20"
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              <div>
                <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-200">
                  Referência bíblica
                </label>

                <input
                  value={bibleReference}
                  onChange={(event) => setBibleReference(event.target.value)}
                  className="mt-2 min-h-12 w-full rounded-2xl border border-white/10 bg-slate-950/90 px-4 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-blue-300/70 focus:bg-slate-950 focus:shadow-lg focus:shadow-blue-950/20"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-200">
                  Número
                </label>

                <input
                  type="number"
                  min="1"
                  value={episodeNumber}
                  onChange={(event) => setEpisodeNumber(event.target.value)}
                  className="mt-2 min-h-12 w-full rounded-2xl border border-white/10 bg-slate-950/90 px-4 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-blue-300/70 focus:bg-slate-950 focus:shadow-lg focus:shadow-blue-950/20"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-200">
                  Status
                </label>

                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="mt-2 min-h-12 w-full rounded-2xl border border-white/10 bg-slate-950/90 px-4 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-blue-300/70 focus:bg-slate-950 focus:shadow-lg focus:shadow-blue-950/20"
                >
                  <option value="draft">Rascunho</option>
                  <option value="published">Publicado</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-200">
                Descrição / resumo
              </label>

              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/90 px-4 py-3 text-sm font-bold leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-300/70 focus:bg-slate-950 focus:shadow-lg focus:shadow-blue-950/20"
              />
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-[26px] border border-amber-300/20 bg-amber-500/10 p-5 shadow-lg shadow-black/10">
              <input
                type="checkbox"
                checked={isPreview}
                onChange={(event) => setIsPreview(event.target.checked)}
                className="mt-1 h-5 w-5 accent-amber-400"
              />

              <span>
                <span className="block text-sm font-black text-amber-100">
                  Marcar como episódio degustativo
                </span>

                <span className="mt-1 block text-xs leading-5 text-slate-400">
                  Em podcast premium, este episódio poderá ficar liberado como
                  amostra.
                </span>
              </span>
            </label>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-200">
                Texto transcrito do episódio
              </label>

              <textarea
                value={transcriptionText}
                onChange={(event) => setTranscriptionText(event.target.value)}
                rows={20}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/90 px-4 py-4 text-sm font-medium leading-7 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-300/70 focus:bg-slate-950 focus:shadow-lg focus:shadow-blue-950/20"
              />
            </div>
          </div>

          <div className="mt-7 flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row">
            <Link
              href={backHref}
              className="flex-1 rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-center text-xs font-black uppercase tracking-[0.14em] text-slate-200 active:scale-[0.98]"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-2xl bg-blue-600 px-5 py-4 text-sm font-black text-white shadow-xl shadow-blue-950/30 transition hover:bg-blue-500 active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}