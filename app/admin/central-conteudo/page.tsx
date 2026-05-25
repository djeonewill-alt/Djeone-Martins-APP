'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

import { supabase } from '@/lib/supabase'

type EpisodeContentRow = {
  id: string
  title: string
  description: string | null
  bible_reference: string | null
  audio_url: string | null
  audio_url_compatible: string | null
  duration_seconds: number | null
  status: string | null
  scheduled_publish_at: string | null
  published_at: string | null
  created_at: string | null
  transcription_text: string | null
  transcription_segments: unknown[] | null
  transcription_status: string | null
  transcription_error: string | null
  transcription_generated_at: string | null
  daily_quote_suggestions: unknown[] | null
  daily_quote_status: string | null
  daily_quote_generated_at: string | null
}

function formatDate(value?: string | null) {
  if (!value) return 'Sem data'

  return new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return 'Sem duracao'

  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60

  return `${minutes}:${String(rest).padStart(2, '0')}`
}

function getEpisodeDate(episode: EpisodeContentRow) {
  if (episode.published_at) {
    return `Publicado em ${formatDate(episode.published_at)}`
  }

  if (episode.scheduled_publish_at) {
    return `Agendado para ${formatDate(episode.scheduled_publish_at)}`
  }

  return `Criado em ${formatDate(episode.created_at)}`
}

function getReadiness(episode: EpisodeContentRow) {
  if (!episode.transcription_text?.trim()) {
    return 'Sem transcricao'
  }

  if (!episode.audio_url_compatible) {
    return 'Audio incompatível'
  }

  return 'Pronto para gerar conteudo'
}

function StatusPill({
  children,
  tone = 'slate',
}: {
  children: string
  tone?: 'slate' | 'blue' | 'green' | 'amber' | 'rose'
}) {
  const classNameByTone = {
    slate: 'border-white/10 bg-slate-950 text-slate-300',
    blue: 'border-blue-300/20 bg-blue-500/10 text-blue-100',
    green: 'border-emerald-300/20 bg-emerald-500/10 text-emerald-100',
    amber: 'border-amber-300/20 bg-amber-500/10 text-amber-100',
    rose: 'border-rose-300/20 bg-rose-500/10 text-rose-100',
  }

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-black ${classNameByTone[tone]}`}>
      {children}
    </span>
  )
}

export default function AdminContentCenterPage() {
  const [episodes, setEpisodes] = useState<EpisodeContentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    loadEpisodes()
  }, [])

  async function loadEpisodes() {
    try {
      setLoading(true)
      setErrorMessage('')

      const { data, error } = await supabase
        .from('episodes')
        .select(
          [
            'id',
            'title',
            'description',
            'bible_reference',
            'audio_url',
            'audio_url_compatible',
            'duration_seconds',
            'status',
            'scheduled_publish_at',
            'published_at',
            'created_at',
            'transcription_text',
            'transcription_segments',
            'transcription_status',
            'transcription_error',
            'transcription_generated_at',
            'daily_quote_suggestions',
            'daily_quote_status',
            'daily_quote_generated_at',
          ].join(', ')
        )
        .order('published_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(60)

      if (error) throw error

      setEpisodes(((data || []) as unknown) as EpisodeContentRow[])
    } catch (error) {
      console.error('Erro ao carregar Central de Conteudo:', error)
      setErrorMessage('Nao foi possivel carregar os episodios agora.')
    } finally {
      setLoading(false)
    }
  }

  const summary = useMemo(() => {
    const withTranscription = episodes.filter((episode) => episode.transcription_text?.trim()).length
    const ready = episodes.filter(
      (episode) => episode.transcription_text?.trim() && episode.audio_url_compatible
    ).length
    const withSuggestions = episodes.filter(
      (episode) => (episode.daily_quote_suggestions || []).length > 0
    ).length

    return {
      total: episodes.length,
      withTranscription,
      ready,
      withSuggestions,
    }
  }, [episodes])

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              href="/admin"
              className="inline-flex rounded-full border border-white/10 bg-slate-900/80 px-4 py-2 text-sm font-black text-blue-200 active:scale-[0.98]"
            >
              Voltar ao Admin
            </Link>

            <p className="mt-6 text-[11px] font-black uppercase tracking-[0.24em] text-blue-300">
              Central de Conteudo
            </p>

            <h1 className="mt-2 text-3xl font-black leading-none tracking-[-0.06em] sm:text-5xl">
              Transformar episodios em conteudo
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400">
              Primeiro painel estrutural para revisar episodios, transcricoes,
              frases existentes e preparar futuros assets para redes sociais.
            </p>
          </div>

          <button
            type="button"
            onClick={loadEpisodes}
            disabled={loading}
            className="rounded-2xl border border-blue-300/30 bg-blue-500/15 px-5 py-3 text-sm font-black text-blue-100 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-4">
          <div className="rounded-[26px] border border-white/10 bg-slate-900/80 p-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Episodios</p>
            <strong className="mt-2 block text-3xl font-black">{summary.total}</strong>
          </div>

          <div className="rounded-[26px] border border-emerald-300/15 bg-emerald-500/10 p-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-200">Transcritos</p>
            <strong className="mt-2 block text-3xl font-black">{summary.withTranscription}</strong>
          </div>

          <div className="rounded-[26px] border border-blue-300/15 bg-blue-500/10 p-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-200">Prontos</p>
            <strong className="mt-2 block text-3xl font-black">{summary.ready}</strong>
          </div>

          <div className="rounded-[26px] border border-amber-300/15 bg-amber-500/10 p-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-200">Com frases</p>
            <strong className="mt-2 block text-3xl font-black">{summary.withSuggestions}</strong>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-5 rounded-2xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-100">
            {errorMessage}
          </div>
        )}

        {loading ? (
          <div className="rounded-[30px] border border-white/10 bg-slate-900/70 p-8 text-sm font-bold text-slate-400">
            Carregando episodios...
          </div>
        ) : episodes.length === 0 ? (
          <div className="rounded-[30px] border border-white/10 bg-slate-900/70 p-8 text-center">
            <h2 className="text-2xl font-black tracking-[-0.05em]">Nenhum episodio encontrado</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Quando houver episodios, eles aparecerao aqui para virar conteudo.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {episodes.map((episode) => {
              const hasTranscription = Boolean(episode.transcription_text?.trim())
              const segmentCount = (episode.transcription_segments || []).length
              const suggestionCount = (episode.daily_quote_suggestions || []).length
              const readiness = getReadiness(episode)

              return (
                <article
                  key={episode.id}
                  className="rounded-[30px] border border-slate-700 bg-slate-900 p-5 shadow-[0_22px_70px_rgba(0,0,0,0.35)] ring-1 ring-white/10"
                >
                  <div className="grid gap-5 lg:grid-cols-[1fr_180px] lg:items-center">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <StatusPill tone={episode.status === 'published' ? 'green' : 'slate'}>
                          {episode.status || 'rascunho'}
                        </StatusPill>

                        <StatusPill tone={episode.audio_url_compatible ? 'green' : 'amber'}>
                          {episode.audio_url_compatible ? 'Audio compativel' : 'Audio incompativel'}
                        </StatusPill>

                        <StatusPill tone={hasTranscription ? 'green' : 'rose'}>
                          {hasTranscription ? 'Transcricao pronta' : 'Sem transcricao'}
                        </StatusPill>

                        {segmentCount > 0 && (
                          <StatusPill tone="blue">Com segmentos</StatusPill>
                        )}

                        {suggestionCount > 0 && (
                          <StatusPill tone="amber">Com frases fortes</StatusPill>
                        )}
                      </div>

                      <h2 className="mt-3 text-xl font-black leading-tight tracking-[-0.04em]">
                        {episode.title}
                      </h2>

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
                        <span>{getEpisodeDate(episode)}</span>
                        <span>{formatDuration(episode.duration_seconds)}</span>
                        <span>{readiness}</span>
                      </div>
                    </div>

                    <Link
                      href={`/admin/central-conteudo/${episode.id}`}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-blue-300/30 bg-blue-500/18 px-4 py-3 text-center text-xs font-black text-blue-100 shadow-lg shadow-blue-950/20 transition hover:border-blue-300/60 hover:bg-blue-500/28 active:scale-[0.98]"
                    >
                      Abrir estudio
                    </Link>
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
