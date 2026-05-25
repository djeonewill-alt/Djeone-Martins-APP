'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

import { supabase } from '@/lib/supabase'

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

type AnalyticsStats = {
  totalUsers: number
  newUsersToday: number
  eventsToday: number
  activeToday: number
  betaPendingIssues: number
  eventCounts: EventCounts
  latestEvents: LatestEvent[]
}

const eventNames: EventName[] = [
  'app_opened',
  'episode_viewed',
  'audio_started',
  'audio_paused',
  'audio_progress_25',
  'audio_progress_50',
  'audio_progress_75',
  'audio_completed',
  'share_clicked',
  'quote_share_clicked',
  'notification_enabled',
]

const initialEventCounts = eventNames.reduce((acc, eventName) => {
  acc[eventName] = 0
  return acc
}, {} as EventCounts)

const initialStats: AnalyticsStats = {
  totalUsers: 0,
  newUsersToday: 0,
  eventsToday: 0,
  activeToday: 0,
  betaPendingIssues: 0,
  eventCounts: initialEventCounts,
  latestEvents: [],
}

function getTodayStartIso() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return today.toISOString()
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

async function safeCount(
  tableName: string,
  filter?: (query: any) => any
): Promise<number> {
  try {
    let query = supabase
      .from(tableName)
      .select('id', { count: 'exact', head: true })

    if (filter) query = filter(query)

    const { count, error } = await query

    if (error) {
      console.warn('[analytics-admin] erro ao contar ' + tableName, error.message)
      return 0
    }

    return count || 0
  } catch (error) {
    console.warn('[analytics-admin] erro inesperado ao contar ' + tableName, error)
    return 0
  }
}

async function loadEventCounts(todayStartIso: string) {
  const countPairs = await Promise.all(
    eventNames.map(async (eventName) => {
      const count = await safeCount('app_events', (query) =>
        query.eq('event_name', eventName).gte('created_at', todayStartIso)
      )

      return [eventName, count] as const
    })
  )

  return countPairs.reduce((acc, [eventName, count]) => {
    acc[eventName] = count
    return acc
  }, { ...initialEventCounts })
}

async function loadActiveToday(todayStartIso: string) {
  try {
    const { data, error } = await supabase
      .from('app_events')
      .select('device_id, session_id')
      .eq('event_name', 'app_opened')
      .gte('created_at', todayStartIso)
      .limit(2000)

    if (error) throw error

    const activeKeys = new Set<string>()

    ;(data || []).forEach((event) => {
      const deviceId = typeof event.device_id === 'string' ? event.device_id : ''
      const sessionId = typeof event.session_id === 'string' ? event.session_id : ''
      const key = deviceId || sessionId

      if (key) activeKeys.add(key)
    })

    return activeKeys.size
  } catch (error) {
    console.warn('[analytics-admin] erro ao calcular ativos hoje', error)
    return 0
  }
}

async function loadLatestEvents() {
  const { data, error } = await supabase
    .from('app_events')
    .select('id, event_name, entity_type, entity_id, source, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) throw error

  return (data || []) as LatestEvent[]
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
  tone?: 'blue' | 'green' | 'gold' | 'purple' | 'rose' | 'stone'
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
      <h2 className="mt-3 text-xs font-black uppercase tracking-[0.14em]">
        {title}
      </h2>
      <p className="mt-2 text-xs leading-5 text-slate-400">{helper}</p>
    </article>
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
        {percentage}% do topo do funil
      </p>
    </div>
  )
}

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<AnalyticsStats>(initialStats)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [lastUpdated, setLastUpdated] = useState('')

  async function loadAnalytics() {
    try {
      setLoading(true)
      setLoadError('')

      const todayStartIso = getTodayStartIso()

      const [
        totalUsers,
        newUsersToday,
        eventsToday,
        activeToday,
        betaPendingIssues,
        eventCounts,
        latestEvents,
      ] = await Promise.all([
        safeCount('profiles'),
        safeCount('profiles', (query) => query.gte('created_at', todayStartIso)),
        safeCount('app_events', (query) => query.gte('created_at', todayStartIso)),
        loadActiveToday(todayStartIso),
        safeCount('beta_issue_reports', (query) => query.neq('status', 'resolved')),
        loadEventCounts(todayStartIso),
        loadLatestEvents(),
      ])

      setStats({
        totalUsers,
        newUsersToday,
        eventsToday,
        activeToday,
        betaPendingIssues,
        eventCounts,
        latestEvents,
      })

      setLastUpdated(
        new Intl.DateTimeFormat('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }).format(new Date())
      )
    } catch (error) {
      console.error('Erro ao carregar analytics:', error)
      setLoadError('Nao foi possivel carregar as metricas agora.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAnalytics()
  }, [])

  const funnel = useMemo(
    () => [
      { label: 'Episodio visualizado', value: stats.eventCounts.episode_viewed },
      { label: 'Play', value: stats.eventCounts.audio_started },
      { label: '25%', value: stats.eventCounts.audio_progress_25 },
      { label: '50%', value: stats.eventCounts.audio_progress_50 },
      { label: '75%', value: stats.eventCounts.audio_progress_75 },
      { label: 'Concluido', value: stats.eventCounts.audio_completed },
    ],
    [stats.eventCounts]
  )

  const funnelMax = Math.max(funnel[0]?.value || 0, ...funnel.map((item) => item.value), 1)

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
              Primeira visao operacional baseada em app_events e dados administrativos ja existentes.
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

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <MetricCard title="Usuarios cadastrados" value={stats.totalUsers} helper="Total em profiles" tone="blue" />
          <MetricCard title="Novos hoje" value={stats.newUsersToday} helper="Profiles criados hoje" tone="green" />
          <MetricCard title="Ativos hoje" value={stats.activeToday} helper="Dispositivos/sessoes com app_opened" tone="gold" />
          <MetricCard title="Plays hoje" value={stats.eventCounts.audio_started} helper="Eventos audio_started" tone="purple" />
          <MetricCard title="Concluiram audio" value={stats.eventCounts.audio_completed} helper="Eventos audio_completed" tone="green" />
          <MetricCard title="Compartilharam audio" value={stats.eventCounts.share_clicked} helper="Cliques em compartilhar episodio" tone="blue" />
          <MetricCard title="Compartilharam Palavra" value={stats.eventCounts.quote_share_clicked} helper="Cliques em compartilhar Palavra" tone="purple" />
          <MetricCard title="Notificacoes ativadas" value={stats.eventCounts.notification_enabled} helper="Eventos notification_enabled" tone="gold" />
          <MetricCard title="Problemas pendentes" value={stats.betaPendingIssues} helper="Beta issues nao resolvidas" tone="rose" />
          <MetricCard title="Eventos hoje" value={stats.eventsToday} helper="Total em app_events hoje" tone="stone" />
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[420px_1fr]">
          <div className="rounded-[32px] border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/20">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-300">
              Funil do audio de hoje
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.05em]">
              Escuta do devocional
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Conta os eventos emitidos hoje. Nesta versao, o funil ainda nao separa por episodio especifico.
            </p>

            <div className="mt-5 grid gap-3">
              {funnel.map((item) => (
                <FunnelBar key={item.label} label={item.label} value={item.value} max={funnelMax} />
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/20">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-300">
                  Ultimos eventos
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.05em]">
                  Atividade recente
                </h2>
              </div>
              <span className="text-xs font-bold text-slate-500">
                Ultimos 30 registros
              </span>
            </div>

            {loading ? (
              <p className="mt-6 rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-sm font-bold text-slate-400">
                Carregando eventos...
              </p>
            ) : stats.latestEvents.length === 0 ? (
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
                  {stats.latestEvents.map((event) => (
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
          </div>
        </section>
      </section>
    </main>
  )
}
