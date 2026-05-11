'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'

type BetaTester = {
  id: string
  email: string
  name: string | null
  is_active: boolean
  invited_at: string | null
  first_access_at: string | null
  notes: string | null
  founder_number: number | null
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

export default function AdminBetaTestersPage() {
  const [adminPassword, setAdminPassword] = useState('')
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [testers, setTesters] = useState<BetaTester[]>([])
  const [form, setForm] = useState<TesterForm>(initialForm)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

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
                  {testers.length} e-mails cadastrados.
                </p>
              </div>
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
              {testers.length === 0 && (
                <p className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-5 text-sm font-semibold text-slate-400">
                  Nenhum testador beta cadastrado ainda.
                </p>
              )}

              {testers.map((tester) => (
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
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleTester(tester)}
                      className={`shrink-0 rounded-2xl px-4 py-3 text-xs font-black text-white ${
                        tester.is_active
                          ? 'bg-red-600 hover:bg-red-500'
                          : 'bg-emerald-600 hover:bg-emerald-500'
                      }`}
                    >
                      {tester.is_active ? 'Inativar' : 'Ativar'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>
      </div>
    </main>
  )
}
