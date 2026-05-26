'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

type EventName =
  | 'app_opened'
  | 'episode_viewed'
  | 'audio_started'
  | 'audio_paused'
  | 'audio_progress_25'
  | 'audio_progress_50'
  | 'audio_progress_75'
  | 'audio_completed'
  | 'share_clicked'
  | 'quote_share_clicked'
  | 'notification_enabled'
  | 'public_episode_opened'
  | 'public_episode_audio_started'
  | 'public_episode_audio_progress_25'
  | 'public_episode_audio_progress_50'
  | 'public_episode_audio_progress_75'
  | 'public_episode_audio_completed'
  | 'public_episode_share_clicked'
  | 'public_episode_open_app_clicked'
  | 'public_quote_opened'
  | 'public_quote_share_clicked'
  | 'public_quote_open_app_clicked'

type EventCounts = Record<EventName, number>

type LatestEvent = {
  id: string
  event_name: string
  entity_type: string | null
  entity_id: string | null
  source: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

type AnalyticsResponse = {
  period: {
    label: string
    since: string
    until: string
  }
  metrics: {
    totalUsers: number
    newUsers: number
    totalEvents: number
    activeUsers: number
    betaPendingIssues: number
    eventCounts: EventCounts
  }
  funnel: Pick<
    EventCounts,
    | 'audio_started'
    | 'audio_progress_25'
    | 'audio_progress_50'
    | 'audio_progress_75'
    | 'audio_completed'
  >
  latestEvents: LatestEvent[]
}

const initialEventCounts: EventCounts = {
  app_opened: 0,
  episode_viewed: 0,
  audio_started: 0,
  audio_paused: 0,
  audio_progress_25: 0,
  audio_progress_50: 0,
  audio_progress_75: 0,
  audio_completed: 0,
  share_clicked: 0,
  quote_share_clicked: 0,
  notification_enabled: 0,
  public_episode_opened: 0,
  public_episode_audio_started: 0,
  public_episode_audio_progress_25: 0,
  public_episode_audio_progress_50: 0,
  public_episode_audio_progress_75: 0,
  public_episode_audio_completed: 0,
  public_episode_share_clicked: 0,
  public_episode_open_app_clicked: 0,
  public_quote_opened: 0,
  public_quote_share_clicked: 0,
  public_quote_open_app_clicked: 0,
}

const initialData: AnalyticsResponse = {
  period: {
    label: 'ultimas 24h',
    since: '',
    until: '',
  },
  metrics: {
    totalUsers: 0,
    newUsers: 0,
    totalEvents: 0,
    activeUsers: 0,
    betaPendingIssues: 0,
    eventCounts: initialEventCounts,
  },
  funnel: {
    audio_started: 0,
    audio_progress_25: 0,
    audio_progress_50: 0,
    audio_progress_75: 0,
    audio_completed: 0,
  },
  latestEvents: [],
}

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? ''

type MetricTone = 'blue' | 'green' | 'gold' | 'purple' | 'rose' | 'stone'

type MetricItem = {
  title: string
  value: number
  helper: string
  tone?: MetricTone
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR').format(value)
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value))
  } catch {
    return 'Sem data'
  }
}

function summarizeMetadata(metadata: Record<string, unknown> | null) {
  if (!metadata) return 'Sem metadata'

  const entries = Object.entries(metadata)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .slice(0, 4)

  if (entries.length === 0) return 'Sem metadata'

  return entries
    .map(([key, value]) => {
      const text =
        typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
          ? String(value)
          : JSON.stringify(value)

      return key + ': ' + text.slice(0, 80)
    })
    .join(' | ')
}

function MetricCard({
  title,
  value,
  helper,
  tone = 'blue',
}: {
  title: string
  value: number
  helper: string
  tone?: MetricTone
}) {
  const toneClass =
    tone === 'green'
      ? 'border-emerald-300/20 bg-emerald-500/10 text-emerald-100'
      : tone === 'gold'
        ? 'border-yellow-300/20 bg-yellow-500/10 text-yellow-100'
        : tone === 'purple'
          ? 'border-purple-300/20 bg-purple-500/10 text-purple-100'
          : tone === 'rose'
            ? 'border-rose-300/20 bg-rose-500/10 text-rose-100'
            : tone === 'stone'
              ? 'border-slate-300/20 bg-slate-500/10 text-slate-100'
              : 'border-blue-300/20 bg-blue-500/10 text-blue-100'

  return (
    <article className={'rounded-[28px] border p-5 shadow-2xl shadow-black/20 ' + toneClass}>
      <p className="text-3xl font-black tracking-[-0.06em] text-white">
        {formatNumber(value)}
      </p>
      <h3 className="mt-3 text-xs font-black uppercase tracking-[0.14em]">
        {title}
      </h3>
      <p className="mt-2 text-xs leading-5 text-slate-400">{helper}</p>
    </article>
  )
}

function MetricSection({
  title,
  eyebrow,
  description,
  metrics,
}: {
  title: string
  eyebrow: string
  description?: string
  metrics: MetricItem[]
}) {
  return (
    <section className="rounded-[32px] border border-white/10 bg-slate-900/55 p-5 shadow-2xl shadow-black/20">
      <div className="mb-5">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-300">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-[-0.05em]">
          {title}
        </h2>
        {description && (
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            {description}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </div>
    </section>
  )
}

function FunnelBar({ label, value, max }: { label: string; value: number; max: number }) {
  const percentage = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-black text-slate-100">{label}</span>
        <span className="text-sm font-black tabular-nums text-blue-100">
          {formatNumber(value)}
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-blue-500 shadow-[0_0_18px_rgba(96,165,250,0.5)]"
          style={{ width: percentage + '%' }}
        />
      </div>
      <p className="mt-2 text-[11px] font-bold text-slate-500">
        {percentage}% de quem deu play
      </p>
    </div>
  )
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse>(initialData)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [lastUpdated, setLastUpdated] = useState('')

  async function loadAnalytics() {
    try {
      setLoading(true)
      setLoadError('')

      const response = await fetch('/api/admin/analytics', {
        headers: {
          'x-admin-password': ADMIN_PASSWORD,
        },
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'Nao foi possivel carregar analytics.')
      }

      setData(payload as AnalyticsResponse)
      setLastUpdated(
        new Intl.DateTimeFormat('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }).format(new Date())
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao carregar analytics.'
      console.error('Erro ao carregar analytics:', error)
      setLoadError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAnalytics()
  }, [])

  const funnel = useMemo(
    () => [
      { label: 'Deram play', value: data.funnel.audio_started },
      { label: 'Ouviram 25%', value: data.funnel.audio_progress_25 },
      { label: 'Ouviram 50%', value: data.funnel.audio_progress_50 },
      { label: 'Ouviram 75%', value: data.funnel.audio_progress_75 },
      { label: 'Concluiram audio', value: data.funnel.audio_completed },
    ],
    [data.funnel]
  )

  const funnelMax = Math.max(data.funnel.audio_started || 0, 1)
  const eventCounts = data.metrics.eventCounts

  const growthMetrics: MetricItem[] = [
    { title: 'Usuarios cadastrados', value: data.metrics.totalUsers, helper: 'Total em profiles', tone: 'blue' },
    { title: 'Novos 24h', value: data.metrics.newUsers, helper: 'Profiles criados nas ultimas 24h', tone: 'green' },
    { title: 'Ativos 24h', value: data.metrics.activeUsers, helper: 'Qualquer user, device ou sessao com evento registrado', tone: 'gold' },
    { title: 'Eventos 24h', value: data.metrics.totalEvents, helper: 'Total registrado em app_events', tone: 'stone' },
  ]

  const audioMetrics: MetricItem[] = [
    { title: 'Episodio carregado na Aba Hoje', value: eventCounts.episode_viewed, helper: 'A Aba Hoje exibiu o episodio; nao significa audio ouvido', tone: 'stone' },
    { title: 'Deram play no audio', value: eventCounts.audio_started, helper: 'Eventos audio_started', tone: 'purple' },
    { title: 'Ouviram 25%', value: eventCounts.audio_progress_25, helper: 'Eventos audio_progress_25', tone: 'blue' },
    { title: 'Ouviram 50%', value: eventCounts.audio_progress_50, helper: 'Eventos audio_progress_50', tone: 'blue' },
    { title: 'Ouviram 75%', value: eventCounts.audio_progress_75, helper: 'Eventos audio_progress_75', tone: 'blue' },
    { title: 'Concluiram audio', value: eventCounts.audio_completed, helper: 'Eventos audio_completed', tone: 'green' },
  ]

  const shareMetrics: MetricItem[] = [
    { title: 'Compartilharam audio no app', value: eventCounts.share_clicked, helper: 'Cliques em compartilhar episodio na Aba Hoje', tone: 'blue' },
    { title: 'Compartilharam Palavra no app', value: eventCounts.quote_share_clicked, helper: 'Cliques no card Palavra do Dia dentro do app', tone: 'purple' },
    { title: 'Compartilharam episodio publico', value: eventCounts.public_episode_share_clicked, helper: 'Cliques em compartilhar na pagina /ep', tone: 'green' },
    { title: 'Compartilharam Palavra publica', value: eventCounts.public_quote_share_clicked, helper: 'Cliques em compartilhar na pagina /palavra', tone: 'gold' },
  ]

  const publicPageMetrics: MetricItem[] = [
    { title: 'Pagina publica do episodio aberta', value: eventCounts.public_episode_opened, helper: 'Aberturas da pagina /ep', tone: 'blue' },
    { title: 'Play na pagina publica do episodio', value: eventCounts.public_episode_audio_started, helper: 'Play especifico no fluxo publico /ep', tone: 'purple' },
    { title: 'Pagina publica da Palavra aberta', value: eventCounts.public_quote_opened, helper: 'Aberturas da pagina /palavra', tone: 'green' },
    {
      title: 'Cliques para abrir app pela pagina publica',
      value: eventCounts.public_episode_open_app_clicked + eventCounts.public_quote_open_app_clicked,
      helper: 'Soma dos CTAs public_episode_open_app_clicked e public_quote_open_app_clicked',
      tone: 'gold',
    },
  ]

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              href="/admin"
              className="inline-flex rounded-full border border-white/10 bg-slate-900/90 px-4 py-2 text-sm font-black text-blue-200 shadow-lg shadow-black/10 active:scale-[0.98]"
            >
              Voltar ao Admin
            </Link>

            <p className="mt-6 text-[11px] font-black uppercase tracking-[0.24em] text-blue-300">
              Admin / Analytics
            </p>
            <h1 className="mt-2 text-3xl font-black leading-none tracking-[-0.06em] sm:text-5xl">
              Metricas do aplicativo
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400">
              Leitura via service role no servidor. Periodo: {data.period.label}.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            <button
              type="button"
              onClick={loadAnalytics}
              disabled={loading}
              className="rounded-2xl border border-white/10 bg-slate-900 px-5 py-3 text-sm font-black text-slate-100 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? 'Atualizando...' : 'Atualizar'}
            </button>
            {lastUpdated && (
              <span className="text-xs font-bold text-slate-500">
                Atualizado as {lastUpdated}
              </span>
            )}
          </div>
        </header>

        {loadError && (
          <div className="mb-6 rounded-2xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">
            {loadError}
          </div>
        )}

        <section className="mb-6 grid gap-3 lg:grid-cols-3">
          <p className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm leading-6 text-slate-300">
            Episodio carregado significa que a Aba Hoje exibiu o episodio, nao que o audio foi ouvido.
          </p>
          <p className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm leading-6 text-slate-300">
            Deram play indica tentativa/clique de reproducao do audio.
          </p>
          <p className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm leading-6 text-slate-300">
            Ativos 24h considera qualquer interacao registrada no app ou pagina publica.
          </p>
        </section>

        <div className="space-y-6">
          <MetricSection
            eyebrow="Bloco 1"
            title="Crescimento"
            metrics={growthMetrics}
          />

          <MetricSection
            eyebrow="Bloco 2"
            title="Audio no app"
            description="Episodio carregado fica separado do funil de escuta para nao parecer que houve play."
            metrics={audioMetrics}
          />

          <section className="rounded-[32px] border border-white/10 bg-slate-900/55 p-5 shadow-2xl shadow-black/20">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-300">
              Funil do audio
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.05em]">
              Escuta do devocional
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              O funil comeca em quem deu play. Episodio carregado na Aba Hoje nao entra como topo do funil de audio.
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {funnel.map((item) => (
                <FunnelBar key={item.label} label={item.label} value={item.value} max={funnelMax} />
              ))}
            </div>
          </section>

          <MetricSection
            eyebrow="Bloco 3"
            title="Compartilhamento"
            metrics={shareMetrics}
          />

          <MetricSection
            eyebrow="Bloco 4"
            title="Pagina publica"
            metrics={publicPageMetrics}
          />

          <section className="rounded-[32px] border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/20">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-300">
                  Bloco 5 / Saude tecnica
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.05em]">
                  Ultimos eventos
                </h2>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-sm font-black text-rose-100">
                  Problemas pendentes: {formatNumber(data.metrics.betaPendingIssues)}
                </p>
                <span className="text-xs font-bold text-slate-500">
                  Ultimos 30 registros
                </span>
              </div>
            </div>

            {loading ? (
              <p className="mt-6 rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-sm font-bold text-slate-400">
                Carregando eventos...
              </p>
            ) : data.latestEvents.length === 0 ? (
              <p className="mt-6 rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-sm leading-6 text-slate-400">
                Ainda nao ha eventos em app_events para exibir.
              </p>
            ) : (
              <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
                <div className="grid grid-cols-[130px_110px_1fr] gap-3 bg-slate-950/80 px-4 py-3 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500 lg:grid-cols-[170px_120px_150px_1fr]">
                  <span>Evento</span>
                  <span>Data</span>
                  <span className="hidden lg:block">Entidade</span>
                  <span>Resumo</span>
                </div>

                <div className="divide-y divide-white/10">
                  {data.latestEvents.map((event) => (
                    <article
                      key={event.id}
                      className="grid grid-cols-[130px_110px_1fr] gap-3 bg-slate-900/40 px-4 py-3 text-xs lg:grid-cols-[170px_120px_150px_1fr]"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-black text-blue-100">{event.event_name}</p>
                        <p className="mt-1 truncate text-[11px] font-bold text-slate-500">
                          {event.source || 'sem source'}
                        </p>
                      </div>

                      <span className="font-bold tabular-nums text-slate-400">
                        {formatDate(event.created_at)}
                      </span>

                      <span className="hidden min-w-0 truncate font-bold text-slate-400 lg:block">
                        {event.entity_type || '-'}
                        {event.entity_id ? ' / ' + event.entity_id.slice(0, 8) : ''}
                      </span>

                      <span className="min-w-0 truncate font-semibold text-slate-300">
                        {summarizeMetadata(event.metadata)}
                      </span>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  )
}
