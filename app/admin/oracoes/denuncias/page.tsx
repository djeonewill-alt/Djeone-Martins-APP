'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

import { supabase } from '@/lib/supabase'

type PrayerReport = {
  id: string
  prayer_request_id: string
  reason: string | null
  status: 'pending' | 'reviewing' | 'resolved' | 'rejected'
  source: string | null
  device_id: string | null
  reporter_auth_user_id: string | null
  user_agent: string | null
  created_at: string
  reviewed_at: string | null
  admin_notes: string | null
  prayer_requests?: {
    id: string
    author_name: string | null
    content: string | null
    is_active: boolean | null
    is_private: boolean | null
    is_answered: boolean | null
    created_at: string | null
  } | null
}

function formatDate(date?: string | null) {
  if (!date) return 'Sem data'

  return new Date(date).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function getPrayerText(report: PrayerReport) {
  return (
    report.prayer_requests?.content ||
    'Pedido sem texto carregado.'
  )
}

export default function AdminPrayerReportsPage() {
  const [reports, setReports] = useState<PrayerReport[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'pending' | 'all'>('pending')

  useEffect(() => {
    loadReports()
  }, [filter])

  async function loadReports() {
    try {
      setLoading(true)

      let query = supabase
        .from('prayer_reports')
        .select(`
          *,
          prayer_requests:prayer_request_id (
            id,
            author_name,
            content,
            is_active,
            is_private,
            is_answered,
            created_at
          )
        `)
        .order('created_at', { ascending: false })

      if (filter === 'pending') {
        query = query.eq('status', 'pending')
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      setReports((data || []) as PrayerReport[])
    } catch (error) {
      console.error('Erro ao carregar denúncias:', error)
      alert('Não foi possível carregar as denúncias.')
    } finally {
      setLoading(false)
    }
  }

  async function updateReportStatus(
    report: PrayerReport,
    status: 'resolved' | 'rejected',
    adminNotes?: string
  ) {
    try {
      setActionLoadingId(report.id)

      const { error } = await supabase
        .from('prayer_reports')
        .update({
          status,
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes || null,
        })
        .eq('id', report.id)

      if (error) {
        throw error
      }

      await loadReports()
    } catch (error) {
      console.error('Erro ao atualizar denúncia:', error)
      alert('Não foi possível atualizar a denúncia.')
    } finally {
      setActionLoadingId(null)
    }
  }

  async function hidePrayerAndResolve(report: PrayerReport) {
    const confirmed = confirm(
      'Ocultar este pedido do mural público e marcar a denúncia como resolvida?'
    )

    if (!confirmed) return

    const adminNotes = window.prompt(
      'Observação administrativa, opcional:',
      'Pedido ocultado após denúncia.'
    )

    try {
      setActionLoadingId(report.id)

      const { error: prayerError } = await supabase
        .from('prayer_requests')
        .update({
          is_active: false,
        })
        .eq('id', report.prayer_request_id)

      if (prayerError) {
        throw prayerError
      }

      const { error: reportError } = await supabase
        .from('prayer_reports')
        .update({
          status: 'resolved',
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes || 'Pedido ocultado após denúncia.',
        })
        .eq('id', report.id)

      if (reportError) {
        throw reportError
      }

      await loadReports()
    } catch (error) {
      console.error('Erro ao ocultar pedido:', error)
      alert('Não foi possível ocultar o pedido agora.')
    } finally {
      setActionLoadingId(null)
    }
  }

  async function rejectReport(report: PrayerReport) {
    const confirmed = confirm(
      'Rejeitar esta denúncia e manter o pedido ativo no mural?'
    )

    if (!confirmed) return

    const adminNotes = window.prompt(
      'Observação administrativa, opcional:',
      'Denúncia revisada e rejeitada.'
    )

    await updateReportStatus(
      report,
      'rejected',
      adminNotes || 'Denúncia revisada e rejeitada.'
    )
  }

  async function resolveOnly(report: PrayerReport) {
    const confirmed = confirm(
      'Marcar esta denúncia como resolvida sem ocultar o pedido?'
    )

    if (!confirmed) return

    const adminNotes = window.prompt(
      'Observação administrativa, opcional:',
      'Denúncia resolvida sem ocultar o pedido.'
    )

    await updateReportStatus(
      report,
      'resolved',
      adminNotes || 'Denúncia resolvida sem ocultar o pedido.'
    )
  }

  const pendingCount = reports.filter((report) => report.status === 'pending').length

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-white">
      <section className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/admin"
              className="text-sm font-bold text-blue-300 underline underline-offset-4"
            >
              ← Voltar ao painel
            </Link>

            <p className="mt-6 text-[11px] font-black uppercase tracking-[0.24em] text-blue-300">
              Moderação
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-[-0.05em]">
              Denúncias de oração
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Revise denúncias enviadas pelos usuários, oculte pedidos
              problemáticos e registre a decisão administrativa.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-4 text-sm">
            <p className="font-black text-white">{pendingCount}</p>
            <p className="text-slate-400">pendentes nesta visão</p>
          </div>
        </div>

        <div className="mb-6 flex gap-3">
          <button
            type="button"
            onClick={() => setFilter('pending')}
            className={
              filter === 'pending'
                ? 'rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white'
                : 'rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm font-black text-slate-300'
            }
          >
            Pendentes
          </button>

          <button
            type="button"
            onClick={() => setFilter('all')}
            className={
              filter === 'all'
                ? 'rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white'
                : 'rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm font-black text-slate-300'
            }
          >
            Todas
          </button>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 text-sm font-bold text-slate-400">
            Carregando denúncias...
          </div>
        ) : reports.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 text-sm leading-6 text-slate-400">
            Nenhuma denúncia encontrada neste filtro.
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => {
              const prayer = report.prayer_requests
              const prayerActive = prayer?.is_active !== false
              const actionLoading = actionLoadingId === report.id

              return (
                <article
                  key={report.id}
                  className="rounded-[30px] border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/20"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1 text-xs font-black text-amber-100">
                          {report.status}
                        </span>

                        <span
                          className={
                            prayerActive
                              ? 'rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-100'
                              : 'rounded-full border border-red-300/20 bg-red-400/10 px-3 py-1 text-xs font-black text-red-100'
                          }
                        >
                          {prayerActive ? 'pedido ativo' : 'pedido oculto'}
                        </span>
                      </div>

                      <h2 className="mt-4 text-lg font-black text-white">
                        {prayer?.author_name || 'Anônimo'}
                      </h2>

                      <p className="mt-1 text-xs text-slate-500">
                        Denunciado em {formatDate(report.created_at)}
                      </p>
                    </div>

                    <p className="text-xs font-bold text-slate-500">
                      Fonte: {report.source || 'app'}
                    </p>
                  </div>

                  <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                      Pedido denunciado
                    </p>

                    <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-7 text-slate-100">
                      {getPrayerText(report)}
                    </p>
                  </div>

                  <div className="mt-4 rounded-2xl border border-red-300/15 bg-red-500/10 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-red-200">
                      Motivo informado
                    </p>

                    <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-7 text-red-50">
                      {report.reason || 'Usuário não informou motivo.'}
                    </p>
                  </div>

                  {report.admin_notes && (
                    <div className="mt-4 rounded-2xl border border-blue-300/15 bg-blue-500/10 p-4">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-200">
                        Nota administrativa
                      </p>

                      <p className="mt-3 text-sm leading-7 text-blue-50">
                        {report.admin_notes}
                      </p>
                    </div>
                  )}

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => hidePrayerAndResolve(report)}
                      disabled={actionLoading || !prayerActive}
                      className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {actionLoading ? 'Processando...' : 'Ocultar pedido'}
                    </button>

                    <button
                      type="button"
                      onClick={() => resolveOnly(report)}
                      disabled={actionLoading}
                      className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Resolver sem ocultar
                    </button>

                    <button
                      type="button"
                      onClick={() => rejectReport(report)}
                      disabled={actionLoading}
                      className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-black text-slate-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Rejeitar denúncia
                    </button>
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

