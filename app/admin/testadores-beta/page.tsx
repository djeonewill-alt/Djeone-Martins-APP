'use client'

import Link from 'next/link'
import { FormEvent, useMemo, useState, type Dispatch, type SetStateAction } from 'react'

type FilterValue = 'all' | 'problem' | 'confusing' | 'active' | 'profile' | 'responded'

type IssueFilterValue =
  | 'all'
  | 'new'
  | 'reviewing'
  | 'fixing'
  | 'retest_requested'
  | 'resolved'
  | 'ignored'
  | 'still_problem'
  | 'problem'
  | 'confusing'

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

type BetaFinalFeedback = {
  overall_experience: string | null
  favorite_area: string | null
  most_confusing_area: string | null
  biggest_problem: string | null
  pastoral_feedback: string | null
  would_recommend: boolean | null
  submitted_at: string | null
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
  feedback: BetaFinalFeedback | null
}

type BetaIssueEvent = {
  id: string
  event_type: string
  message: string | null
  status_from: string | null
  status_to: string | null
  created_at: string | null
}

type BetaIssueReport = {
  id: string
  tester_id: string
  auth_user_id: string
  mission_result_id: string | null
  mission_key: string
  app_area: string
  section: string | null
  issue_type: 'problem' | 'confusing'
  status: string
  priority: string
  report: string
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
  admin_notes: string | null
  retest_requested_at: string | null
  resolved_at: string | null
  created_at: string | null
  updated_at: string | null
  tester: {
    id: string
    email: string
    name: string | null
    founder_number: number | null
  } | null
  profile: {
    device_label: string | null
    operating_system: string | null
    browser: string | null
    access_mode: string | null
    is_pwa_standalone: boolean | null
  } | null
  events: BetaIssueEvent[]
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

const filterLabels: Record<FilterValue, string> = {
  all: 'Cadastrados',
  active: 'Ativos',
  profile: 'Perfil concluído',
  responded: 'Respostas',
  problem: 'Problemas',
  confusing: 'Não entendi',
}

const issueFilterLabels: Record<IssueFilterValue, string> = {
  all: 'Todos',
  new: 'Novos',
  reviewing: 'Em análise',
  fixing: 'Em correção',
  retest_requested: 'Reteste liberado',
  resolved: 'Resolvidos',
  ignored: 'Ignorados',
  still_problem: 'Ainda com problema',
  problem: 'Problemas',
  confusing: 'Dúvidas',
}

const issueStatusLabels: Record<string, string> = {
  new: 'Novo',
  reviewing: 'Em análise',
  fixing: 'Em correção',
  retest_requested: 'Reteste liberado',
  resolved: 'Resolvido',
  ignored: 'Ignorado',
  still_problem: 'Ainda com problema',
}

const issueTypeLabels: Record<BetaIssueReport['issue_type'], string> = {
  problem: 'Problema',
  confusing: 'Dúvida',
}

function getIssueStatusClasses(status: string) {
  if (status === 'resolved') return 'border-emerald-300/20 bg-emerald-500/10 text-emerald-100'
  if (status === 'retest_requested') return 'border-amber-300/25 bg-amber-500/15 text-amber-100'
  if (status === 'fixing') return 'border-blue-300/20 bg-blue-500/10 text-blue-100'
  if (status === 'reviewing') return 'border-purple-300/20 bg-purple-500/10 text-purple-100'
  if (status === 'ignored') return 'border-slate-300/20 bg-slate-500/10 text-slate-100'
  if (status === 'still_problem') return 'border-red-300/25 bg-red-500/10 text-red-100'
  return 'border-orange-300/25 bg-orange-500/10 text-orange-100'
}

function isRetestEvent(eventType: string) {
  return ['retest_success', 'retest_problem', 'retest_confusing'].includes(eventType)
}

function getRetestEventLabel(eventType: string) {
  const labels: Record<string, string> = {
    retest_success: 'Reteste recebido: agora funcionou',
    retest_problem: 'Reteste recebido: ainda deu problema',
    retest_confusing: 'Reteste recebido: ainda não entendi',
  }

  return labels[eventType] || eventType
}

function getRetestEventDescription(eventType: string) {
  const descriptions: Record<string, string> = {
    retest_success: 'Resolvido pelo testador no reteste.',
    retest_problem: 'Reteste indicou que ainda precisa de ajuste.',
    retest_confusing: 'Reteste indicou que a experiência ainda precisa ficar mais clara.',
  }

  return descriptions[eventType] || ''
}

function getRetestEventClasses(eventType: string) {
  if (eventType === 'retest_success') {
    return 'border-emerald-300/25 bg-emerald-500/10 text-emerald-100'
  }

  if (eventType === 'retest_confusing') {
    return 'border-purple-300/25 bg-purple-500/10 text-purple-100'
  }

  return 'border-red-300/25 bg-red-500/10 text-red-100'
}

function getEventDisplayLabel(eventType: string) {
  const labels: Record<string, string> = {
    created: 'Relato criado',
    admin_reviewing: 'Admin marcou em análise',
    admin_fixing: 'Admin marcou em correção',
    retest_requested: 'Admin liberou reteste',
    retest_success: 'O testador respondeu ao reteste: agora funcionou',
    retest_problem: 'O testador respondeu ao reteste: ainda deu problema',
    retest_confusing: 'O testador respondeu ao reteste: ainda não entendi',
    resolved: 'Admin marcou resolvido',
    ignored: 'Admin ignorou o relato',
    admin_note: 'Nota administrativa',
  }

  return labels[eventType] || eventType
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
  const [issueReports, setIssueReports] = useState<BetaIssueReport[]>([])
  const [issueFilter, setIssueFilter] = useState<IssueFilterValue>('all')
  const [issueUpdatingId, setIssueUpdatingId] = useState<string | null>(null)
  const [issueNotesDrafts, setIssueNotesDrafts] = useState<Record<string, string>>({})

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

    if (filter === 'responded') {
      return testers.filter((tester) => (tester.summary?.total_results || 0) > 0)
    }

    return testers
  }, [filter, testers])

  const issueSummary = useMemo(() => {
    return issueReports.reduce(
      (summary, issue) => {
        if (issue.status === 'new') summary.new += 1
        if (issue.status === 'reviewing') summary.reviewing += 1
        if (issue.status === 'fixing') summary.fixing += 1
        if (issue.status === 'retest_requested') summary.retestRequested += 1
        if (issue.status === 'resolved') summary.resolved += 1
        if (issue.status === 'ignored') summary.ignored += 1
        if (issue.status === 'still_problem') summary.stillProblem += 1
        return summary
      },
      {
        new: 0,
        reviewing: 0,
        fixing: 0,
        retestRequested: 0,
        resolved: 0,
        ignored: 0,
        stillProblem: 0,
      }
    )
  }, [issueReports])

  const filteredIssueReports = useMemo(() => {
    if (issueFilter === 'problem' || issueFilter === 'confusing') {
      return issueReports.filter((issue) => issue.issue_type === issueFilter)
    }

    if (issueFilter === 'all') return issueReports

    return issueReports.filter((issue) => issue.status === issueFilter)
  }, [issueFilter, issueReports])

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

  async function issueApiFetch(init?: RequestInit) {
    return fetch('/api/admin/beta-issue-reports', {
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

      const issueResponse = await issueApiFetch()
      const issueData = await issueResponse.json()

      if (!issueResponse.ok) {
        throw new Error(issueData.error || 'Nao foi possivel carregar relatos beta.')
      }

      setIssueReports(issueData.issueReports || [])
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

  async function handleIssueStatus(issue: BetaIssueReport, status: string) {
    setMessage('')
    setErrorMessage('')
    setIssueUpdatingId(issue.id)

    try {
      const response = await issueApiFetch({
        method: 'PATCH',
        body: JSON.stringify({
          id: issue.id,
          status,
          admin_notes: issueNotesDrafts[issue.id],
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Nao foi possivel atualizar relato beta.')
      }

      setIssueReports(data.issueReports || [])
      setMessage('Relato beta atualizado com sucesso.')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Nao foi possivel atualizar relato beta.'

      setErrorMessage(message)
    } finally {
      setIssueUpdatingId(null)
    }
  }

  async function handleSaveIssueNote(issue: BetaIssueReport) {
    setMessage('')
    setErrorMessage('')
    setIssueUpdatingId(issue.id)

    try {
      const response = await issueApiFetch({
        method: 'PATCH',
        body: JSON.stringify({
          id: issue.id,
          admin_notes: issueNotesDrafts[issue.id] ?? issue.admin_notes ?? '',
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Nao foi possivel salvar nota administrativa.')
      }

      setIssueReports(data.issueReports || [])
      setMessage('Nota administrativa salva.')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Nao foi possivel salvar nota administrativa.'

      setErrorMessage(message)
    } finally {
      setIssueUpdatingId(null)
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
          <SummaryCard
            label="Cadastrados"
            value={dashboardSummary.total}
            active={filter === 'all'}
            onClick={() => setFilter('all')}
          />
          <SummaryCard
            label="Ativos"
            value={dashboardSummary.active}
            active={filter === 'active'}
            onClick={() => setFilter('active')}
          />
          <SummaryCard
            label="Perfil concluído"
            value={dashboardSummary.profileCompleted}
            active={filter === 'profile'}
            onClick={() => setFilter('profile')}
          />
          <SummaryCard
            label="Respostas"
            value={dashboardSummary.totalResults}
            active={filter === 'responded'}
            onClick={() => setFilter('responded')}
          />
          <SummaryCard
            label="Problemas"
            value={dashboardSummary.problems}
            tone="red"
            active={filter === 'problem'}
            onClick={() => setFilter('problem')}
          />
          <SummaryCard
            label="Não entendi"
            value={dashboardSummary.confusing}
            tone="amber"
            active={filter === 'confusing'}
            onClick={() => setFilter('confusing')}
          />
        </section>

        <IssueQueueSection
          issueReports={filteredIssueReports}
          issueFilter={issueFilter}
          setIssueFilter={setIssueFilter}
          issueSummary={issueSummary}
          issueUpdatingId={issueUpdatingId}
          notesDrafts={issueNotesDrafts}
          setNotesDrafts={setIssueNotesDrafts}
          onStatusChange={handleIssueStatus}
          onSaveNote={handleSaveIssueNote}
        />

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
                <p className="mt-2 text-xs font-black uppercase tracking-[0.14em] text-blue-200">
                  Filtro ativo: {filterLabels[filter]}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {[
                ['all', 'Todos'],
                ['problem', 'Com problema'],
                ['confusing', 'Não entendi'],
                ['responded', 'Respostas'],
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
  active,
  onClick,
}: {
  label: string
  value: number
  tone?: 'blue' | 'red' | 'amber'
  active: boolean
  onClick: () => void
}) {
  const toneClasses = {
    blue: 'border-blue-300/20 bg-blue-500/10 text-blue-100',
    red: 'border-red-300/20 bg-red-500/10 text-red-100',
    amber: 'border-amber-300/20 bg-amber-500/10 text-amber-100',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[22px] border p-4 text-left transition hover:-translate-y-0.5 hover:border-white/30 ${
        toneClasses[tone]
      } ${active ? 'ring-2 ring-white/30 shadow-xl shadow-black/20' : ''}`}
    >
      <p className="text-2xl font-black">{value}</p>
      <p className="mt-1 text-[11px] font-black uppercase tracking-[0.12em] opacity-80">
        {label}
      </p>
    </button>
  )
}

function IssueQueueSection({
  issueReports,
  issueFilter,
  setIssueFilter,
  issueSummary,
  issueUpdatingId,
  notesDrafts,
  setNotesDrafts,
  onStatusChange,
  onSaveNote,
}: {
  issueReports: BetaIssueReport[]
  issueFilter: IssueFilterValue
  setIssueFilter: (filter: IssueFilterValue) => void
  issueSummary: {
    new: number
    reviewing: number
    fixing: number
    retestRequested: number
    resolved: number
    ignored: number
    stillProblem: number
  }
  issueUpdatingId: string | null
  notesDrafts: Record<string, string>
  setNotesDrafts: Dispatch<SetStateAction<Record<string, string>>>
  onStatusChange: (issue: BetaIssueReport, status: string) => void
  onSaveNote: (issue: BetaIssueReport) => void
}) {
  const filterItems: Array<[IssueFilterValue, string]> = [
    ['all', 'Todos'],
    ['new', 'Novos'],
    ['reviewing', 'Em análise'],
    ['fixing', 'Em correção'],
    ['retest_requested', 'Reteste liberado'],
    ['resolved', 'Resolvidos'],
    ['ignored', 'Ignorados'],
    ['still_problem', 'Ainda com problema'],
    ['problem', 'Problemas'],
    ['confusing', 'Dúvidas'],
  ]

  return (
    <section className="mt-5 rounded-[30px] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-black/20">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-200">
            Fila administrativa
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-white">
            Fila de relatos do Beta
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Acompanhe problemas e dúvidas enviados pelos testadores, marque o andamento
            da correção e libere missões para reteste.
          </p>
        </div>

        <p className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-xs font-bold text-slate-300">
          Filtro ativo: {issueFilterLabels[issueFilter]}
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
        <IssueSummaryButton
          label="Novos"
          value={issueSummary.new}
          active={issueFilter === 'new'}
          onClick={() => setIssueFilter('new')}
        />
        <IssueSummaryButton
          label="Em análise"
          value={issueSummary.reviewing}
          active={issueFilter === 'reviewing'}
          onClick={() => setIssueFilter('reviewing')}
        />
        <IssueSummaryButton
          label="Em correção"
          value={issueSummary.fixing}
          active={issueFilter === 'fixing'}
          onClick={() => setIssueFilter('fixing')}
        />
        <IssueSummaryButton
          label="Reteste liberado"
          value={issueSummary.retestRequested}
          active={issueFilter === 'retest_requested'}
          onClick={() => setIssueFilter('retest_requested')}
          tone="amber"
        />
        <IssueSummaryButton
          label="Resolvidos"
          value={issueSummary.resolved}
          active={issueFilter === 'resolved'}
          onClick={() => setIssueFilter('resolved')}
          tone="green"
        />
        <IssueSummaryButton
          label="Ignorados"
          value={issueSummary.ignored}
          active={issueFilter === 'ignored'}
          onClick={() => setIssueFilter('ignored')}
          tone="slate"
        />
        <IssueSummaryButton
          label="Ainda com problema"
          value={issueSummary.stillProblem}
          active={issueFilter === 'still_problem'}
          onClick={() => setIssueFilter('still_problem')}
          tone="red"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {filterItems.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setIssueFilter(value)}
            className={`rounded-full border px-3 py-2 text-xs font-black ${
              issueFilter === value
                ? 'border-amber-300/30 bg-amber-500/20 text-amber-100'
                : 'border-white/10 bg-white/[0.04] text-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-4">
        {issueReports.length === 0 && (
          <p className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-5 text-sm font-semibold text-slate-400">
            Nenhum relato encontrado para este filtro.
          </p>
        )}

        {issueReports.map((issue) => {
          const noteValue = notesDrafts[issue.id] ?? issue.admin_notes ?? ''
          const isUpdating = issueUpdatingId === issue.id
          const latestEvent = issue.events[0]
          const latestRetestEvent =
            latestEvent && isRetestEvent(latestEvent.event_type) ? latestEvent : null

          return (
            <article
              key={issue.id}
              className={`rounded-[24px] border p-4 ${
                issue.issue_type === 'problem'
                  ? 'border-red-300/20 bg-red-500/10'
                  : 'border-purple-300/20 bg-purple-500/10'
              }`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${getIssueStatusClasses(issue.status)}`}>
                      {issueStatusLabels[issue.status] || issue.status}
                    </span>
                    <span
                      className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                        issue.issue_type === 'problem'
                          ? 'border-red-300/20 bg-red-500/10 text-red-100'
                          : 'border-purple-300/20 bg-purple-500/10 text-purple-100'
                      }`}
                    >
                      {issueTypeLabels[issue.issue_type]}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-200">
                      Prioridade {issue.priority}
                    </span>
                  </div>

                  <h3 className="mt-3 text-lg font-black leading-6 text-white">
                    {issue.app_area} · {issue.section || 'Sem seção'}
                  </h3>
                  <p className="mt-1 break-words text-sm font-semibold text-blue-100">
                    {issue.mission_key}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-slate-400">
                    {issue.tester?.name || issue.tester?.email || 'Testador não encontrado'} · {issue.tester?.email || 'sem e-mail'} · criado em {formatDate(issue.created_at)}
                  </p>

                  {latestRetestEvent && (
                    <div className={`mt-3 rounded-2xl border p-4 ${getRetestEventClasses(latestRetestEvent.event_type)}`}>
                      <p className="text-sm font-black">
                        {getRetestEventLabel(latestRetestEvent.event_type)}
                      </p>
                      <p className="mt-1 text-sm font-semibold leading-6 opacity-85">
                        {getRetestEventDescription(latestRetestEvent.event_type)}
                      </p>
                      {latestRetestEvent.message && (
                        <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 opacity-90">
                          {latestRetestEvent.message}
                        </p>
                      )}
                      <p className="mt-2 text-xs font-bold opacity-70">
                        Recebido em {formatDate(latestRetestEvent.created_at)}
                      </p>
                    </div>
                  )}

                  <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-300 sm:grid-cols-2 lg:grid-cols-4">
                    <InfoBox label="Aparelho" value={issue.profile?.device_label || 'Não informado'} />
                    <InfoBox label="Sistema" value={issue.profile?.operating_system || 'Não informado'} />
                    <InfoBox
                      label="Acesso"
                      value={issue.profile?.access_mode || issue.profile?.browser || 'Não informado'}
                    />
                    <InfoBox
                      label="PWA"
                      value={formatBoolean(issue.profile?.is_pwa_standalone)}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 lg:max-w-xs lg:justify-end">
                  <IssueActionButton
                    label="Marcar em análise"
                    disabled={isUpdating}
                    onClick={() => onStatusChange(issue, 'reviewing')}
                  />
                  <IssueActionButton
                    label="Marcar em correção"
                    disabled={isUpdating}
                    onClick={() => onStatusChange(issue, 'fixing')}
                  />
                  <IssueActionButton
                    label="Liberar reteste"
                    disabled={isUpdating}
                    onClick={() => onStatusChange(issue, 'retest_requested')}
                  />
                  <IssueActionButton
                    label="Marcar resolvido"
                    disabled={isUpdating}
                    onClick={() => onStatusChange(issue, 'resolved')}
                    tone="green"
                  />
                  <IssueActionButton
                    label="Ignorar"
                    disabled={isUpdating}
                    onClick={() => onStatusChange(issue, 'ignored')}
                    tone="slate"
                  />
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                  Relato do testador
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-100">
                  {issue.report}
                </p>
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                    Snapshot técnico
                  </p>
                  <div className="mt-2 grid gap-2 text-xs font-semibold text-slate-400">
                    <span>URL: {issue.technical_snapshot?.currentUrl || 'Não informado'}</span>
                    <span>
                      Tela: {issue.technical_snapshot?.screenWidth || '?'}x{issue.technical_snapshot?.screenHeight || '?'}
                    </span>
                    <span>
                      Viewport: {issue.technical_snapshot?.viewportWidth || '?'}x{issue.technical_snapshot?.viewportHeight || '?'}
                    </span>
                    <span>Notificações: {issue.technical_snapshot?.notificationPermission || 'Não informado'}</span>
                    <span>PWA: {issue.technical_snapshot?.isPwaStandalone ? 'Sim' : 'Não'}</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                    Nota administrativa
                  </p>
                  <textarea
                    value={noteValue}
                    onChange={(event) =>
                      setNotesDrafts((current) => ({
                        ...current,
                        [issue.id]: event.target.value,
                      }))
                    }
                    rows={4}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm font-semibold text-white outline-none focus:border-blue-400"
                    placeholder="Anote a análise, possível causa ou o que foi corrigido."
                  />
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => onSaveNote(issue)}
                    className="mt-3 rounded-2xl bg-blue-600 px-4 py-3 text-xs font-black text-white disabled:opacity-50"
                  >
                    {isUpdating ? 'Salvando...' : 'Salvar nota'}
                  </button>
                </div>
              </div>

              {issue.events.length > 0 && (
                <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                    Histórico
                  </p>
                  <div className="mt-3 space-y-2">
                    {issue.events.slice(0, 5).map((event) => (
                      <div
                        key={event.id}
                        className={`rounded-xl border px-3 py-2 ${
                          isRetestEvent(event.event_type)
                            ? getRetestEventClasses(event.event_type)
                            : 'border-white/10 bg-white/[0.035]'
                        }`}
                      >
                        <p className="text-xs font-black text-slate-100">
                          {getEventDisplayLabel(event.event_type)} · {formatDate(event.created_at)}
                        </p>
                        {(event.status_from || event.status_to) && (
                          <p className="mt-1 text-xs font-semibold text-slate-400">
                            {event.status_from || 'sem status'} → {event.status_to || 'sem status'}
                          </p>
                        )}
                        {event.message && (
                          <p className="mt-1 text-xs font-semibold leading-5 text-slate-300">
                            {event.message}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}

function IssueSummaryButton({
  label,
  value,
  active,
  onClick,
  tone = 'blue',
}: {
  label: string
  value: number
  active: boolean
  onClick: () => void
  tone?: 'blue' | 'amber' | 'green' | 'red' | 'slate'
}) {
  const toneClasses = {
    blue: 'border-blue-300/20 bg-blue-500/10 text-blue-100',
    amber: 'border-amber-300/20 bg-amber-500/10 text-amber-100',
    green: 'border-emerald-300/20 bg-emerald-500/10 text-emerald-100',
    red: 'border-red-300/20 bg-red-500/10 text-red-100',
    slate: 'border-slate-300/20 bg-slate-500/10 text-slate-100',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[20px] border p-3 text-left transition hover:-translate-y-0.5 ${
        toneClasses[tone]
      } ${active ? 'ring-2 ring-white/25' : ''}`}
    >
      <p className="text-xl font-black">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.1em] opacity-80">
        {label}
      </p>
    </button>
  )
}

function IssueActionButton({
  label,
  disabled,
  onClick,
  tone = 'blue',
}: {
  label: string
  disabled: boolean
  onClick: () => void
  tone?: 'blue' | 'green' | 'slate'
}) {
  const toneClasses = {
    blue: 'border-blue-300/20 bg-blue-500/10 text-blue-100 hover:bg-blue-500/20',
    green: 'border-emerald-300/20 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20',
    slate: 'border-slate-300/20 bg-slate-500/10 text-slate-100 hover:bg-slate-500/20',
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-2xl border px-3 py-2 text-xs font-black disabled:opacity-50 ${toneClasses[tone]}`}
    >
      {label}
    </button>
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

function formatBoolean(value?: boolean | null) {
  if (value === true) return 'Sim'
  if (value === false) return 'Não'
  return 'Não informado'
}

function SectionTitle({ children }: { children: string }) {
  return <h4 className="text-sm font-black text-white">{children}</h4>
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
      <div>
        <SectionTitle>Dados preenchidos</SectionTitle>
        <div className="mt-3 grid gap-3 text-xs font-semibold text-slate-400 md:grid-cols-2 lg:grid-cols-3">
          <InfoBox label="Nome" value={tester.name || 'Não informado'} />
          <InfoBox label="E-mail" value={tester.email} />
          <InfoBox
            label="Número fundador"
            value={tester.founder_number ? `#${tester.founder_number}` : 'Não informado'}
          />
          <InfoBox label="Status" value={tester.is_active ? 'Ativo' : 'Inativo'} />
          <InfoBox label="Convidado em" value={formatDate(tester.invited_at)} />
          <InfoBox label="Primeiro acesso" value={formatDate(tester.first_access_at)} />
          <InfoBox label="Observações" value={tester.notes || 'Sem observações'} />
        </div>
      </div>

      <div className="mt-5">
        <SectionTitle>Perfil beta</SectionTitle>
        <div className="mt-3 grid gap-3 text-xs font-semibold text-slate-400 md:grid-cols-2 lg:grid-cols-3">
          <InfoBox
            label="Aceite LGPD beta"
            value={tester.profile?.accepted_beta_terms ? 'Sim' : 'Pendente'}
          />
          <InfoBox
            label="Data do aceite"
            value={formatDate(tester.profile?.accepted_beta_terms_at)}
          />
          <InfoBox
            label="Modelo do aparelho"
            value={tester.profile?.device_label || 'Não informado'}
          />
          <InfoBox
            label="Sistema operacional"
            value={tester.profile?.operating_system || 'Não informado'}
          />
          <InfoBox
            label="Navegador"
            value={tester.profile?.browser || 'Não informado'}
          />
          <InfoBox
            label="Modo de acesso"
            value={tester.profile?.access_mode || 'Não informado'}
          />
        </div>
      </div>

      <div className="mt-5">
        <SectionTitle>Dados técnicos</SectionTitle>
        <div className="mt-3 grid gap-3 text-xs font-semibold text-slate-400 md:grid-cols-2 lg:grid-cols-3">
          <InfoBox label="Idioma" value={tester.profile?.language || 'Não informado'} />
          <InfoBox
            label="Tela"
            value={
              tester.profile?.screen_width && tester.profile?.screen_height
                ? `${tester.profile.screen_width}x${tester.profile.screen_height}`
                : 'Não informado'
            }
          />
          <InfoBox
            label="Viewport"
            value={
              tester.profile?.viewport_width && tester.profile?.viewport_height
                ? `${tester.profile.viewport_width}x${tester.profile.viewport_height}`
                : 'Não informado'
            }
          />
          <InfoBox
            label="Notificações"
            value={tester.profile?.notification_permission || 'Não informado'}
          />
          <InfoBox
            label="Push suportado"
            value={formatBoolean(tester.profile?.push_supported)}
          />
          <InfoBox
            label="PWA instalado"
            value={formatBoolean(tester.profile?.is_pwa_standalone)}
          />
          <InfoBox label="Versão do app" value={tester.profile?.app_version || 'Não informado'} />
          <InfoBox label="Última presença" value={formatDate(tester.profile?.last_seen_at)} />
        </div>
        {tester.profile?.user_agent && (
          <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950/70 p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
              User agent
            </p>
            <p className="mt-2 break-words text-xs font-semibold leading-5 text-slate-300">
              {tester.profile.user_agent}
            </p>
          </div>
        )}
      </div>

      <div className="mt-5">
        <SectionTitle>Feedback final</SectionTitle>
        {tester.feedback ? (
          <div className="mt-3 grid gap-3 text-xs font-semibold text-slate-400 md:grid-cols-2">
            <InfoBox
              label="Experiência geral"
              value={tester.feedback.overall_experience || 'Não informado'}
            />
            <InfoBox
              label="Área favorita"
              value={tester.feedback.favorite_area || 'Não informado'}
            />
            <InfoBox
              label="Área mais confusa"
              value={tester.feedback.most_confusing_area || 'Não informado'}
            />
            <InfoBox
              label="Maior problema"
              value={tester.feedback.biggest_problem || 'Não informado'}
            />
            <InfoBox
              label="Recomendaria"
              value={formatBoolean(tester.feedback.would_recommend)}
            />
            <InfoBox label="Enviado em" value={formatDate(tester.feedback.submitted_at)} />
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 md:col-span-2">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                Feedback pastoral
              </p>
              <p className="mt-1 text-xs font-bold leading-5 text-slate-200">
                {tester.feedback.pastoral_feedback || 'Não informado'}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-3 rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-sm font-semibold text-slate-400">
            Feedback final ainda não enviado.
          </p>
        )}
      </div>

      <div className="mt-5 grid gap-3 text-xs font-semibold text-slate-400 md:grid-cols-2">
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
        <SectionTitle>Missões por área</SectionTitle>
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
