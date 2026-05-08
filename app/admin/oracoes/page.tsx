'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

import { supabase } from '@/lib/supabase'

type AdminView = 'public' | 'private' | 'answered' | 'hidden' | 'reports' | null

type PrayerRow = {
  id: string
  author_name: string | null
  content: string | null
  is_active: boolean | null
  is_private: boolean | null
  is_answered: boolean | null
  testimony_text: string | null
  created_at: string | null
  answered_at: string | null
}

type PrayerReportRow = {
  id: string
  prayer_request_id: string
  reason: string | null
  status: 'pending' | 'reviewing' | 'resolved' | 'rejected'
  source: string | null
  device_id: string | null
  reporter_auth_user_id: string | null
  created_at: string
  reviewed_at: string | null
  admin_notes: string | null
  prayer_requests?: PrayerRow | PrayerRow[] | null
}

type PrayerStats = {
  publicPrayers: number
  privatePrayers: number
  answeredPrayers: number
  hiddenPrayers: number
  pendingReports: number
}

const initialStats: PrayerStats = {
  publicPrayers: 0,
  privatePrayers: 0,
  answeredPrayers: 0,
  hiddenPrayers: 0,
  pendingReports: 0,
}

function formatDate(date?: string | null) {
  if (!date) return 'Sem data'

  return new Date(date).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function getReportPrayer(report: PrayerReportRow) {
  const prayer = report.prayer_requests

  if (Array.isArray(prayer)) {
    return prayer[0] || null
  }

  return prayer || null
}

function getPrayerText(prayer?: PrayerRow | null) {
  return prayer?.content || 'Pedido sem texto carregado.'
}

function getViewTitle(view: AdminView) {
  if (view === 'public') return 'Pedidos públicos'
  if (view === 'private') return 'Pedidos privados'
  if (view === 'answered') return 'Pedidos respondidos'
  if (view === 'hidden') return 'Pedidos ocultos'
  if (view === 'reports') return 'Denúncias pendentes'
  return 'Resumo de orações'
}

export default function AdminOracoes() {
  const [stats, setStats] = useState<PrayerStats>(initialStats)
  const [activeView, setActiveView] = useState<AdminView>(null)
  const [prayers, setPrayers] = useState<PrayerRow[]>([])
  const [reports, setReports] = useState<PrayerReportRow[]>([])
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  useEffect(() => {
    loadStats()
  }, [])

  useEffect(() => {
    if (activeView) {
      loadDetails(activeView)
    }
  }, [activeView])

  async function countPrayerRequests(
    filter: (query: any) => any
  ): Promise<number> {
    let query = supabase
      .from('prayer_requests')
      .select('id', { count: 'exact', head: true })

    query = filter(query)

    const { count, error } = await query

    if (error) {
      console.error('Erro ao contar pedidos:', error)
      return 0
    }

    return count || 0
  }

  async function countPendingReports(): Promise<number> {
    const { count, error } = await supabase
      .from('prayer_reports')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')

    if (error) {
      console.error('Erro ao contar denúncias:', error)
      return 0
    }

    return count || 0
  }

  async function loadStats() {
    try {
      setLoadingStats(true)

      const [
        publicPrayers,
        privatePrayers,
        answeredPrayers,
        hiddenPrayers,
        pendingReports,
      ] = await Promise.all([
        countPrayerRequests((query) =>
          query.eq('is_private', false).eq('is_active', true)
        ),
        countPrayerRequests((query) =>
          query.eq('is_private', true).eq('is_active', true)
        ),
        countPrayerRequests((query) => query.eq('is_answered', true)),
        countPrayerRequests((query) => query.eq('is_active', false)),
        countPendingReports(),
      ])

      setStats({
        publicPrayers,
        privatePrayers,
        answeredPrayers,
        hiddenPrayers,
        pendingReports,
      })
    } finally {
      setLoadingStats(false)
    }
  }

  async function loadDetails(view: AdminView) {
    if (!view) return

    try {
      setLoadingDetails(true)

      if (view === 'reports') {
        const { data, error } = await supabase
          .from('prayer_reports')
          .select(`
            id,
            prayer_request_id,
            reason,
            status,
            source,
            device_id,
            reporter_auth_user_id,
            created_at,
            reviewed_at,
            admin_notes,
            prayer_requests:prayer_request_id (
              id,
              author_name,
              content,
              is_active,
              is_private,
              is_answered,
              testimony_text,
              created_at,
              answered_at
            )
          `)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })

        if (error) throw error

        setReports((data || []) as PrayerReportRow[])
        setPrayers([])
        return
      }

      let query = supabase
        .from('prayer_requests')
        .select(
          'id, author_name, content, is_active, is_private, is_answered, testimony_text, created_at, answered_at'
        )
        .order('created_at', { ascending: false })

      if (view === 'public') {
        query = query.eq('is_private', false).eq('is_active', true)
      }

      if (view === 'private') {
        query = query.eq('is_private', true).eq('is_active', true)
      }

      if (view === 'answered') {
        query = query.eq('is_answered', true)
      }

      if (view === 'hidden') {
        query = query.eq('is_active', false)
      }

      const { data, error } = await query

      if (error) throw error

      setPrayers((data || []) as PrayerRow[])
      setReports([])
    } catch (error) {
      console.error('Erro ao carregar detalhes de orações:', error)
      alert('Não foi possível carregar esta visão agora.')
    } finally {
      setLoadingDetails(false)
    }
  }

  async function refreshCurrentView() {
    await loadStats()

    if (activeView) {
      await loadDetails(activeView)
    }
  }

  async function hidePrayer(prayerId: string) {
    const confirmed = confirm('Ocultar este pedido do mural público?')

    if (!confirmed) return

    try {
      setActionLoadingId(prayerId)

      const { error } = await supabase
        .from('prayer_requests')
        .update({ is_active: false })
        .eq('id', prayerId)

      if (error) throw error

      await refreshCurrentView()
    } catch (error) {
      console.error('Erro ao ocultar pedido:', error)
      alert('Não foi possível ocultar este pedido agora.')
    } finally {
      setActionLoadingId(null)
    }
  }

  async function hidePrayerAndResolveReport(report: PrayerReportRow) {
    const confirmed = confirm(
      'Ocultar este pedido e marcar a denúncia como resolvida?'
    )

    if (!confirmed) return

    const adminNotes =
      window.prompt(
        'Observação administrativa, opcional:',
        'Pedido ocultado após denúncia.'
      ) || 'Pedido ocultado após denúncia.'

    try {
      setActionLoadingId(report.id)

      const { error: prayerError } = await supabase
        .from('prayer_requests')
        .update({ is_active: false })
        .eq('id', report.prayer_request_id)

      if (prayerError) throw prayerError

      const { error: reportError } = await supabase
        .from('prayer_reports')
        .update({
          status: 'resolved',
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes,
        })
        .eq('id', report.id)

      if (reportError) throw reportError

      await refreshCurrentView()
    } catch (error) {
      console.error('Erro ao moderar denúncia:', error)
      alert('Não foi possível processar esta denúncia agora.')
    } finally {
      setActionLoadingId(null)
    }
  }

  async function resolveReportOnly(report: PrayerReportRow) {
    const confirmed = confirm(
      'Marcar a denúncia como resolvida sem ocultar o pedido?'
    )

    if (!confirmed) return

    const adminNotes =
      window.prompt(
        'Observação administrativa, opcional:',
        'Denúncia resolvida sem ocultar o pedido.'
      ) || 'Denúncia resolvida sem ocultar o pedido.'

    try {
      setActionLoadingId(report.id)

      const { error } = await supabase
        .from('prayer_reports')
        .update({
          status: 'resolved',
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes,
        })
        .eq('id', report.id)

      if (error) throw error

      await refreshCurrentView()
    } catch (error) {
      console.error('Erro ao resolver denúncia:', error)
      alert('Não foi possível resolver esta denúncia agora.')
    } finally {
      setActionLoadingId(null)
    }
  }

  async function rejectReport(report: PrayerReportRow) {
    const confirmed = confirm('Rejeitar esta denúncia e manter o pedido ativo?')

    if (!confirmed) return

    const adminNotes =
      window.prompt(
        'Observação administrativa, opcional:',
        'Denúncia revisada e rejeitada.'
      ) || 'Denúncia revisada e rejeitada.'

    try {
      setActionLoadingId(report.id)

      const { error } = await supabase
        .from('prayer_reports')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes,
        })
        .eq('id', report.id)

      if (error) throw error

      await refreshCurrentView()
    } catch (error) {
      console.error('Erro ao rejeitar denúncia:', error)
      alert('Não foi possível rejeitar esta denúncia agora.')
    } finally {
      setActionLoadingId(null)
    }
  }

  const cards = [
    {
      id: 'public' as const,
      title: 'Pedidos públicos',
      value: stats.publicPrayers,
      subtitle: 'Visíveis no mural',
      emoji: '🌍',
    },
    {
      id: 'private' as const,
      title: 'Pedidos privados',
      value: stats.privatePrayers,
      subtitle: 'Não aparecem no mural',
      emoji: '🔒',
    },
    {
      id: 'answered' as const,
      title: 'Respondidos',
      value: stats.answeredPrayers,
      subtitle: 'Marcados como resposta',
      emoji: '✅',
    },
    {
      id: 'hidden' as const,
      title: 'Ocultos',
      value: stats.hiddenPrayers,
      subtitle: 'Removidos do mural',
      emoji: '🙈',
    },
    {
      id: 'reports' as const,
      title: 'Denúncias',
      value: stats.pendingReports,
      subtitle: 'Pendentes de revisão',
      emoji: '⚑',
      danger: stats.pendingReports > 0,
    },
  ]

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-white">
      <section className="mx-auto max-w-6xl">
        <Link
          href="/admin"
          className="text-sm font-bold text-blue-300 underline underline-offset-4"
        >
          ← Voltar ao painel
        </Link>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-300">
              Oração
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-[-0.05em]">
              Gestão do mural de oração
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Acompanhe os números principais e abra apenas a lista que deseja
              revisar.
            </p>
          </div>

          <button
            type="button"
            onClick={refreshCurrentView}
            className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm font-black text-slate-200 active:scale-[0.99]"
          >
            Atualizar
          </button>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => setActiveView(card.id)}
              className={
                activeView === card.id
                  ? 'rounded-[28px] border border-blue-300/40 bg-blue-600/20 p-5 text-left shadow-2xl shadow-blue-950/20'
                  : card.danger
                    ? 'rounded-[28px] border border-red-300/25 bg-red-500/10 p-5 text-left shadow-2xl shadow-black/20'
                    : 'rounded-[28px] border border-white/10 bg-slate-900/70 p-5 text-left shadow-2xl shadow-black/20'
              }
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-3xl">{card.emoji}</p>
                  <h2 className="mt-4 text-sm font-black text-white">
                    {card.title}
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    {card.subtitle}
                  </p>
                </div>

                <strong className="text-3xl font-black tracking-[-0.05em] text-white">
                  {loadingStats ? '...' : card.value}
                </strong>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-8 rounded-[30px] border border-white/10 bg-slate-900/60 p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">
                Detalhes
              </p>

              <h2 className="mt-2 text-xl font-black text-white">
                {getViewTitle(activeView)}
              </h2>
            </div>

            {activeView && (
              <button
                type="button"
                onClick={() => setActiveView(null)}
                className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-2 text-xs font-black text-slate-300"
              >
                Fechar detalhes
              </button>
            )}
          </div>

          {!activeView ? (
            <p className="mt-5 text-sm leading-6 text-slate-400">
              Clique em um card acima para ver a lista correspondente.
            </p>
          ) : loadingDetails ? (
            <p className="mt-5 text-sm font-bold text-slate-400">
              Carregando detalhes...
            </p>
          ) : activeView === 'reports' ? (
            reports.length === 0 ? (
              <p className="mt-5 text-sm leading-6 text-slate-400">
                Nenhuma denúncia pendente.
              </p>
            ) : (
              <div className="mt-5 space-y-4">
                {reports.map((report) => {
                  const prayer = getReportPrayer(report)
                  const actionLoading = actionLoadingId === report.id

                  return (
                    <article
                      key={report.id}
                      className="rounded-3xl border border-red-300/15 bg-red-500/10 p-5"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-red-200">
                            Denúncia pendente
                          </p>

                          <h3 className="mt-2 text-lg font-black text-white">
                            {prayer?.author_name || 'Anônimo'}
                          </h3>

                          <p className="mt-1 text-xs text-red-100/70">
                            Denunciado em {formatDate(report.created_at)}
                          </p>
                        </div>

                        <span className="rounded-full border border-red-300/20 bg-red-400/10 px-3 py-1 text-xs font-black text-red-100">
                          {report.status}
                        </span>
                      </div>

                      <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                          Pedido denunciado
                        </p>
                        <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-7 text-slate-100">
                          {getPrayerText(prayer)}
                        </p>
                      </div>

                      <div className="mt-4 rounded-2xl border border-red-300/15 bg-red-950/30 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-red-200">
                          Motivo
                        </p>
                        <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-7 text-red-50">
                          {report.reason || 'Usuário não informou motivo.'}
                        </p>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        <button
                          type="button"
                          onClick={() => hidePrayerAndResolveReport(report)}
                          disabled={actionLoading}
                          className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white active:scale-[0.99] disabled:opacity-50"
                        >
                          Ocultar pedido
                        </button>

                        <button
                          type="button"
                          onClick={() => resolveReportOnly(report)}
                          disabled={actionLoading}
                          className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white active:scale-[0.99] disabled:opacity-50"
                        >
                          Resolver sem ocultar
                        </button>

                        <button
                          type="button"
                          onClick={() => rejectReport(report)}
                          disabled={actionLoading}
                          className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-black text-slate-200 active:scale-[0.99] disabled:opacity-50"
                        >
                          Rejeitar denúncia
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            )
          ) : prayers.length === 0 ? (
            <p className="mt-5 text-sm leading-6 text-slate-400">
              Nenhum pedido encontrado nesta visão.
            </p>
          ) : (
            <div className="mt-5 space-y-4">
              {prayers.map((prayer) => (
                <article
                  key={prayer.id}
                  className="rounded-3xl border border-white/10 bg-slate-950/40 p-5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-lg font-black text-white">
                        {prayer.author_name || 'Anônimo'}
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        {formatDate(prayer.created_at)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-white/10 bg-slate-900 px-3 py-1 text-xs font-black text-slate-300">
                        {prayer.is_private ? 'privado' : 'público'}
                      </span>

                      <span
                        className={
                          prayer.is_active === false
                            ? 'rounded-full border border-red-300/20 bg-red-400/10 px-3 py-1 text-xs font-black text-red-100'
                            : 'rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-100'
                        }
                      >
                        {prayer.is_active === false ? 'oculto' : 'ativo'}
                      </span>

                      {prayer.is_answered && (
                        <span className="rounded-full border border-blue-300/20 bg-blue-400/10 px-3 py-1 text-xs font-black text-blue-100">
                          respondido
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="mt-4 whitespace-pre-wrap text-sm font-semibold leading-7 text-slate-100">
                    {getPrayerText(prayer)}
                  </p>

                  {prayer.testimony_text && (
                    <div className="mt-4 rounded-2xl border border-emerald-300/15 bg-emerald-500/10 p-4">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200">
                        Testemunho
                      </p>
                      <p className="mt-3 text-sm leading-7 text-emerald-50">
                        {prayer.testimony_text}
                      </p>
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap gap-3">
                    {prayer.is_active !== false && (
                      <button
                        type="button"
                        onClick={() => hidePrayer(prayer.id)}
                        disabled={actionLoadingId === prayer.id}
                        className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white active:scale-[0.99] disabled:opacity-50"
                      >
                        Ocultar
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

