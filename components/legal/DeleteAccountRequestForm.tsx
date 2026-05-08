'use client'

import { FormEvent, useMemo, useState } from 'react'

import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

export default function DeleteAccountRequestForm() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])

  const [email, setEmail] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setLoading(true)
    setSuccessMessage('')
    setErrorMessage('')

    try {
      const normalizedEmail = email.trim().toLowerCase()

      if (!normalizedEmail || !normalizedEmail.includes('@')) {
        setErrorMessage('Informe o e-mail usado na sua conta.')
        return
      }

      const { error } = await supabase
        .from('account_deletion_requests')
        .insert({
          email: normalizedEmail,
          reason: reason.trim() || null,
          source: 'public_delete_account_page',
          user_agent:
            typeof navigator !== 'undefined' ? navigator.userAgent : null,
        })

      if (error) {
        throw error
      }

      setSuccessMessage(
        'Solicitação enviada com sucesso. O ministério analisará seu pedido e poderá entrar em contato pelo e-mail informado.'
      )
      setEmail('')
      setReason('')
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Não foi possível enviar sua solicitação agora. Tente novamente.'

      setErrorMessage(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 rounded-3xl border border-white/10 bg-slate-950/45 p-5"
    >
      <div>
        <label className="text-sm font-bold text-slate-100">
          E-mail usado na conta *
        </label>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="voce@email.com"
          required
          className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-amber-300/60"
        />
      </div>

      <div className="mt-5">
        <label className="text-sm font-bold text-slate-100">
          Motivo da solicitação, opcional
        </label>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Você pode explicar brevemente o motivo, se desejar."
          rows={4}
          className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-amber-300/60"
        />
      </div>

      {successMessage && (
        <div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-4 text-sm font-bold leading-6 text-emerald-100">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="mt-5 rounded-2xl border border-red-300/20 bg-red-400/10 p-4 text-sm font-bold leading-6 text-red-100">
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full rounded-2xl bg-red-500 px-5 py-4 text-sm font-black uppercase tracking-[0.12em] text-white shadow-xl shadow-red-950/20 transition active:scale-[0.99] disabled:opacity-60"
      >
        {loading ? 'Enviando solicitação...' : 'Solicitar exclusão da conta'}
      </button>

      <p className="mt-4 text-xs leading-6 text-slate-500">
        A solicitação não exclui sua conta automaticamente. Ela será registrada
        para análise e processamento conforme as regras de privacidade e
        segurança do app.
      </p>
    </form>
  )
}
