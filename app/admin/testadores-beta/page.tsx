'use client'

import Link from 'next/link'
import { FormEvent, useMemo, useState } from 'react'

type FilterValue = 'all' | 'problem' | 'confusing' | 'active' | 'profile'

type BetaTesterProfile = {
  accepted_beta_terms: boolean | null
  accepted_beta_terms_at: string | null
  device_label: string | null
  operating_system: string | null
  browser: string | null
  access_mode: string | null
  user_agent: string | null
  language: string | null
  screen_width: number | null
  screen_height: number | null
  viewport_width: number | null
  viewport_height: number | null
  notification_permission: string | null
  push_supported: boolean | null
  is_pwa_standalone: boolean | null
  app_version: string | null
  last_seen_at: string | null
}

type BetaMissionResult = {
  mission_key: string
  app_area: string
  section: string | null
  status: string
  report: string | null
  technical_snapshot: {
    userAgent?: string | null
    language?: string | null
    screenWidth?: number | null
    screenHeight?: number | null
    viewportWidth?: number | null
    viewportHeight?: number | null
    notificationPermission?: string | null
    isPwaStandalone?: boolean | null
    currentUrl?: string | null
    timestamp?: string | null
  } | null
  started_at: string | null
  completed_at: string | null
  updated_at: string | null
}

type BetaTesterSummary = {
  total_results: number
  completed_count: number
  problem_count: number
  confusing_count: number
  postponed_count: number
  started_count: number
  last_result_at: string | null
}

type BetaTester = {
  id: string
  email: string
  name: string | null
  is_active: boolean
  invited_at: string | null
  first_access_at: string | null
  notes: string | null
  founder_number: number | null
  profile: BetaTesterProfile | null
  results: BetaMissionResult[]
  summary: BetaTesterSummary
}

type TesterForm = {
  email: string
  name: string
  notes: string
  founder_number: string
}

const initialForm: TesterForm = {
  email: '',
  name: '',
  notes: '',
  founder_number: '',
}

function formatDate(value?: string | null) {
  if (!value) return 'Ainda nao acessou'

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    success: 'Funcionou',
    problem: 'Deu problema',
    confusing: 'Não entendi',
    postponed: 'Deixada para depois',
    started: 'Em andamento',
  }

  return labels[status] || status
}

function getStatusClasses(status: string) {
  if (status === 'problem') return 'border-red-300/20 bg-red-500/10 text-red-100'
  if (status === 'confusing') return 'border-amber-300/20 bg-amber-500/10 text-amber-100'
  if (status === 'success') return 'border-emerald-300/20 bg-emerald-500/10 text-emerald-100'
  if (status === 'postponed') return 'border-slate-300/20 bg-slate-500/10 text-slate-100'
  return 'border-blue-300/20 bg-blue-500/10 text-blue-100'
}

export default function AdminBetaTestersPage() {
  const [adminPassword, setAdminPassword] = useState('')
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [testers, setTesters] = useState<BetaTester[]>([])
  const [form, setForm] = useState<TesterForm>(initialForm)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [filter, setFilter] = useState<FilterValue>('all')
  const [expandedTesterId, setExpandedTesterId] = useState<string | null>(null)

  const dashboardSummary = useMemo(() => {
    return testers.reduce(
      (summary, tester) => {
        summary.total += 1
        if (tester.is_active) summary.active += 1
        if (tester.profile?.accepted_beta_terms) summary.profileCompleted += 1
        summary.totalResults += tester.summary?.total_results || 0
        summary.problems += tester.summary?.problem_count || 0
        summary.confusing += tester.summary?.confusing_count || 0
        return summary
      },
      {
        total: 0,
        active: 0,
        profileCompleted: 0,
        totalResults: 0,
        problems: 0,
        confusing: 0,
      }
    )
  }, [testers])

  const filteredTesters = useMemo(() => {
    if (filter === 'problem') {
      return testers.filter((tester) => (tester.summary?.problem_count || 0) > 0)
    }

    if (filter === 'confusing') {
      return testers.filter((tester) => (tester.summary?.confusing_count || 0) > 0)
    }

    if (filter === 'active') {
      return testers.filter((tester) => tester.is_active)
    }

    if (filter === 'profile') {
      return testers.filter((tester) => Boolean(tester.profile?.accepted_beta_terms))
    }

    return testers
  }, [filter, testers])

  async function apiFetch(init?: RequestInit) {
    return fetch('/api/admin/beta-testers', {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': adminPassword,
        ...(init?.headers || {}),
      },
    })
  }

  async function loadTesters() {
    setLoading(true)
    setErrorMessage('')

    try {
      const response = await apiFetch()
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Nao foi possivel carregar testadores.')
      }

      setTesters(data.testers || [])
      setIsAuthorized(true)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Nao foi possivel carregar testadores.'

      setErrorMessage(message)
      setIsAuthorized(false)
    } finally {
      setLoading(false)
    }
  }

  async function handleAdminAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await loadTesters()
  }

  function updateForm(field: keyof TesterForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  async function handleCreateTester(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const email = normalizeEmail(form.email)

    setMessage('')
    setErrorMessage('')

    if (!isValidEmail(email)) {
      setErrorMessage('Informe um e-mail valido.')
      return
    }

    setSaving(true)

    try {
      const response = await apiFetch({
        method: 'POST',
        body: JSON.stringify({
          email,
          name: form.name,
          notes: form.notes,
          founder_number: form.founder_number,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Nao foi possivel cadastrar testador.')
      }

      setTesters((current) => [data.tester, ...current])
      setForm(initialForm)
      setMessage('Testador beta cadastrado com sucesso.')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Nao foi possivel cadastrar testador.'

      setErrorMessage(message)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleTester(tester: BetaTester) {
    setMessage('')
    setErrorMessage('')

    try {
      const response = await apiFetch({
        method: 'PATCH',
        body: JSON.stringify({
          id: tester.id,
          is_active: !tester.is_active,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Nao foi possivel atualizar testador.')
      }

      setTesters((current) =>
        current.map((item) => (item.id === tester.id ? data.tester : item))
      )
      setMessage(
        data.tester.is_active
          ? 'Testador ativado com sucesso.'
          : 'Testador inativado com sucesso.'
      )
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Nao foi possivel atualizar testador.'

      setErrorMessage(message)
    }
  }

  if (!isAuthorized) {
    return (
      <main className="min-h-screen bg-slate-950 px-5 py-8 text-white">
        <section className="mx-auto max-w-lg rounded-[30px] border border-white/10 bg-slate-900 p-6 shadow-2xl shadow-black/30">
          <Link href="/admin" className="text-sm font-bold text-slate-400 hover:text-white">
            Voltar ao Admin
          </Link>

          <p className="mt-6 text-[11px] font-black uppercase tracking-[0.22em] text-blue-300">
            Beta fechado
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.06em]">
            Testadores Beta
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Informe a senha administrativa para listar e gerenciar os e-mails
            autorizados para o Beta Fechado.
          </p>

          <form onSubmit={handleAdminAccess} className="mt-6 space-y-4">
            <label className="block text-sm font-bold text-slate-300">
              Senha administrativa
              <input
                type="password"
                value={adminPassword}
                onChange={(event) => setAdminPassword(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-400"
                placeholder="Digite a senha"
              />
            </label>

            {errorMessage && (
              <p className="rounded-2xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={!adminPassword.trim() || loading}
              className="w-full rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col gap-4 rounded-[32px] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-black/25 md:flex-row md:items-center md:justify-between">
          <div>
            <Link href="/admin" className="text-sm font-bold text-slate-400 hover:text-white">
              Voltar ao Admin
            </Link>
            <p className="mt-5 text-[11px] font-black uppercase tracking-[0.22em] text-blue-300">
              Beta fechado
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-[-0.07em]">
              Testadores Beta
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Cadastre, acompanhe e controle os e-mails autorizados para testar
              o app antes do lancamento oficial.
            </p>
          </div>

          <button
            type="button"
            onClick={loadTesters}
            disabled={loading}
            className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-black text-white disabled:opacity-50"
          >
            {loading ? 'Atualizando...' : 'Atualizar lista'}
          </button>
        </header>

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <SummaryCard label="Cadastrados" value={dashboardSummary.total} />
          <SummaryCard label="Ativos" value={dashboardSummary.active} />
          <SummaryCard label="Perfil concluído" value={dashboardSummary.profileCompleted} />
          <SummaryCard label="Respostas" value={dashboardSummary.totalResults} />
          <SummaryCard label="Problemas" value={dashboardSummary.problems} tone="red" />
          <SummaryCard label="Não entendi" value={dashboardSummary.confusing} tone="amber" />
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-[360px_1fr]">
          <form
            onSubmit={handleCreateTester}
            className="rounded-[30px] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-black/20"
          >
            <h2 className="text-xl font-black tracking-[-0.04em]">
              Cadastrar testador
            </h2>

            <div className="mt-5 space-y-4">
              <label className="block text-sm font-bold text-slate-300">
                E-mail
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => updateForm('email', event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-400"
                  placeholder="tester@email.com"
                />
              </label>

              <label className="block text-sm font-bold text-slate-300">
                Nome opcional
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => updateForm('name', event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-400"
                  placeholder="Nome do testador"
                />
              </label>

              <label className="block text-sm font-bold text-slate-300">
                Numero fundador opcional
                <input
                  type="number"
                  min="1"
                  value={form.founder_number}
                  onChange={(event) => updateForm('founder_number', event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-400"
                  placeholder="Ex.: 1"
                />
              </label>

              <label className="block text-sm font-bold text-slate-300">
                Observacao opcional
                <textarea
                  value={form.notes}
                  onChange={(event) => updateForm('notes', event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-400"
                  rows={4}
                  placeholder="Contexto, grupo ou observacao pastoral."
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="mt-5 w-full rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50"
            >
              {saving ? 'Cadastrando...' : 'Cadastrar testador'}
            </button>
          </form>

          <section className="rounded-[30px] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-black/20">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black tracking-[-0.04em]">
                  Lista de testadores
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  {filteredTesters.length} de {testers.length} e-mails cadastrados.
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {[
                ['all', 'Todos'],
                ['problem', 'Com problema'],
                ['confusing', 'Não entendi'],
                ['active', 'Ativos'],
                ['profile', 'Perfil concluído'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value as FilterValue)}
                  className={`rounded-full border px-3 py-2 text-xs font-black ${
                    filter === value
                      ? 'border-blue-300/30 bg-blue-500/20 text-blue-100'
                      : 'border-white/10 bg-white/[0.04] text-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {(message || errorMessage) && (
              <div className="mt-4 space-y-2">
                {message && (
                  <p className="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-100">
                    {message}
                  </p>
                )}
                {errorMessage && (
                  <p className="rounded-2xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">
                    {errorMessage}
                  </p>
                )}
              </div>
            )}

            <div className="mt-5 space-y-3">
              {filteredTesters.length === 0 && (
                <p className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-5 text-sm font-semibold text-slate-400">
                  Nenhum testador encontrado para este filtro.
                </p>
              )}

              {filteredTesters.map((tester) => (
                <article
                  key={tester.id}
                  className="rounded-[24px] border border-white/10 bg-slate-950/80 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-black text-white">
                          {tester.name || tester.email}
                        </h3>
                        <span
                          className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                            tester.is_active
                              ? 'border-emerald-300/20 bg-emerald-500/10 text-emerald-100'
                              : 'border-red-300/20 bg-red-500/10 text-red-100'
                          }`}
                        >
                          {tester.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                        {tester.founder_number && (
                          <span className="rounded-full border border-amber-300/20 bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-100">
                            Fundador #{tester.founder_number}
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-sm font-semibold text-blue-200">
                        {tester.email}
                      </p>
                      {tester.notes && (
                        <p className="mt-3 text-sm leading-6 text-slate-400">
                          {tester.notes}
                        </p>
                      )}
                      <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-500 sm:grid-cols-2">
                        <span>Convidado: {formatDate(tester.invited_at)}</span>
                        <span>Primeiro acesso: {formatDate(tester.first_access_at)}</span>
                      </div>

                      <div className="mt-4 grid gap-2 text-xs font-semibold text-slate-400 sm:grid-cols-2 lg:grid-cols-3">
                        <InfoBox
                          label="Perfil beta"
                          value={tester.profile?.accepted_beta_terms ? 'Concluído' : 'Pendente'}
                        />
                        <InfoBox
                          label="Aparelho"
                          value={tester.profile?.device_label || 'Não informado'}
                        />
                        <InfoBox
                          label="Sistema/acesso"
                          value={
                            tester.profile
                              ? `${tester.profile.operating_system || 'Sistema?'} · ${tester.profile.access_mode || tester.profile.browser || 'Acesso?'}`
                              : 'Não informado'
                          }
                        />
                        <InfoBox
                          label="Concluídas"
                          value={String(tester.summary?.completed_count || 0)}
                        />
                        <InfoBox
                          label="Problemas"
                          value={String(tester.summary?.problem_count || 0)}
                        />
                        <InfoBox
                          label="Não entendi"
                          value={String(tester.summary?.confusing_count || 0)}
                        />
                        <InfoBox
                          label="Último teste"
                          value={formatDate(tester.summary?.last_result_at)}
                        />
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-row gap-2 sm:flex-col">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedTesterId((current) =>
                            current === tester.id ? null : tester.id
                          )
                        }
                        className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-xs font-black text-white"
                      >
                        {expandedTesterId === tester.id ? 'Ocultar' : 'Ver resultados'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleTester(tester)}
                        className={`rounded-2xl px-4 py-3 text-xs font-black text-white ${
                          tester.is_active
                            ? 'bg-red-600 hover:bg-red-500'
                            : 'bg-emerald-600 hover:bg-emerald-500'
                        }`}
                      >
                        {tester.is_active ? 'Inativar' : 'Ativar'}
                      </button>
                    </div>
                  </div>

                  {expandedTesterId === tester.id && (
                    <TesterResultsDetails tester={tester} />
                  )}
                </article>
              ))}
            </div>
          </section>
        </section>
      </div>
    </main>
  )
}

function SummaryCard({
  label,
  value,
  tone = 'blue',
}: {
  label: string
  value: number
  tone?: 'blue' | 'red' | 'amber'
}) {
  const toneClasses = {
    blue: 'border-blue-300/20 bg-blue-500/10 text-blue-100',
    red: 'border-red-300/20 bg-red-500/10 text-red-100',
    amber: 'border-amber-300/20 bg-amber-500/10 text-amber-100',
  }

  return (
    <div className={`rounded-[22px] border p-4 ${toneClasses[tone]}`}>
      <p className="text-2xl font-black">{value}</p>
      <p className="mt-1 text-[11px] font-black uppercase tracking-[0.12em] opacity-80">
        {label}
      </p>
    </div>
  )
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-xs font-bold text-slate-200">{value}</p>
    </div>
  )
}

function TesterResultsDetails({ tester }: { tester: BetaTester }) {
  const resultsByArea = tester.results.reduce<Record<string, BetaMissionResult[]>>(
    (groups, result) => {
      if (!groups[result.app_area]) groups[result.app_area] = []
      groups[result.app_area].push(result)
      return groups
    },
    {}
  )

  return (
    <div className="mt-4 rounded-[22px] border border-white/10 bg-slate-900/80 p-4">
      <div className="grid gap-3 text-xs font-semibold text-slate-400 md:grid-cols-2">
        <InfoBox
          label="Aceite beta"
          value={
            tester.profile?.accepted_beta_terms
              ? `Sim · ${formatDate(tester.profile.accepted_beta_terms_at)}`
              : 'Pendente'
          }
        />
        <InfoBox
          label="Última presença"
          value={formatDate(tester.profile?.last_seen_at)}
        />
        <InfoBox
          label="Tela"
          value={
            tester.profile?.screen_width && tester.profile?.screen_height
              ? `${tester.profile.screen_width}x${tester.profile.screen_height}`
              : 'Não informado'
          }
        />
        <InfoBox
          label="Notificações"
          value={tester.profile?.notification_permission || 'Não informado'}
        />
      </div>

      <div className="mt-5">
        <h4 className="text-sm font-black text-white">Resultados por área</h4>
        {Object.keys(resultsByArea).length === 0 && (
          <p className="mt-3 rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-sm font-semibold text-slate-400">
            Nenhum resultado de missão registrado ainda.
          </p>
        )}

        <div className="mt-3 space-y-4">
          {Object.entries(resultsByArea).map(([area, results]) => (
            <section key={area} className="rounded-[20px] border border-white/10 bg-slate-950/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h5 className="text-sm font-black text-white">{area}</h5>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black text-slate-200">
                    {results.length} registros
                  </span>
                  <span className="rounded-full border border-red-300/20 bg-red-500/10 px-3 py-1 text-[10px] font-black text-red-100">
                    {results.filter((result) => result.status === 'problem').length} problemas
                  </span>
                  <span className="rounded-full border border-amber-300/20 bg-amber-500/10 px-3 py-1 text-[10px] font-black text-amber-100">
                    {results.filter((result) => result.status === 'confusing').length} dúvidas
                  </span>
                </div>
              </div>

              <div className="mt-3 space-y-3">
                {results.map((result) => (
                  <article
                    key={result.mission_key}
                    className={`rounded-2xl border p-3 ${
                      result.status === 'problem' || result.status === 'confusing'
                        ? 'border-amber-300/20 bg-amber-500/10'
                        : 'border-white/10 bg-white/[0.035]'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-white">
                          {result.mission_key}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-400">
                          {result.section || 'Sem seção'} · Atualizado em {formatDate(result.updated_at)}
                        </p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] ${getStatusClasses(result.status)}`}>
                        {getStatusLabel(result.status)}
                      </span>
                    </div>

                    {result.report && (
                      <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/70 p-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                          Relato
                        </p>
                        <p className="mt-2 text-sm font-semibold leading-6 text-slate-200">
                          {result.report}
                        </p>
                      </div>
                    )}

                    {result.technical_snapshot && (
                      <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-500 sm:grid-cols-2">
                        <span>
                          URL: {result.technical_snapshot.currentUrl || 'Não informado'}
                        </span>
                        <span>
                          Tela: {result.technical_snapshot.screenWidth || '?'}x{result.technical_snapshot.screenHeight || '?'}
                        </span>
                        <span>
                          Viewport: {result.technical_snapshot.viewportWidth || '?'}x{result.technical_snapshot.viewportHeight || '?'}
                        </span>
                        <span>
                          PWA: {result.technical_snapshot.isPwaStandalone ? 'Sim' : 'Não'}
                        </span>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
