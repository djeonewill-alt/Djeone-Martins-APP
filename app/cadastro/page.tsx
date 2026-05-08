'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

type AuthMode = 'signup' | 'login'

type ProfileForm = {
  email: string
  password: string
  name: string
  phone: string
  birth_date: string
  gender: string
  country: string
  city: string
  neighborhood: string
}

type LegalAcceptance = {
  termsOfUse: boolean
  privacyPolicy: boolean
  billingTerms: boolean
}

const initialForm: ProfileForm = {
  email: '',
  password: '',
  name: '',
  phone: '',
  birth_date: '',
  gender: '',
  country: 'Brasil',
  city: '',
  neighborhood: '',
}

const initialLegalAcceptance: LegalAcceptance = {
  termsOfUse: false,
  privacyPolicy: false,
  billingTerms: false,
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export default function Cadastro() {
  const router = useRouter()
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])

  const [mode, setMode] = useState<AuthMode>('signup')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [formData, setFormData] = useState<ProfileForm>(initialForm)
  const [legalAcceptance, setLegalAcceptance] = useState<LegalAcceptance>(
    initialLegalAcceptance
  )

  const acceptedAllLegalTerms =
    legalAcceptance.termsOfUse &&
    legalAcceptance.privacyPolicy &&
    legalAcceptance.billingTerms

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getUser()

      if (data.user) {
        await syncLocalProfile(data.user.id)
        router.replace('/')
      }
    }

    checkSession()
  }, [router, supabase])

  async function syncLocalProfile(authUserId: string) {
    for (let attempt = 0; attempt < 6; attempt++) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_user_id', authUserId)
        .maybeSingle()

      if (!error && data?.id) {
        window.localStorage.setItem('user_id', data.id)
        return data.id
      }

      await sleep(450)
    }

    return null
  }

  function updateField(field: keyof ProfileForm, value: string) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function updateLegalAcceptance(field: keyof LegalAcceptance, value: boolean) {
    setLegalAcceptance((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function validateForm() {
    const email = formData.email.trim().toLowerCase()
    const password = formData.password.trim()

    if (!email) {
      return 'Informe seu e-mail.'
    }

    if (!email.includes('@')) {
      return 'Informe um e-mail v\u00e1lido.'
    }

    if (!password || password.length < 6) {
      return 'A senha precisa ter pelo menos 6 caracteres.'
    }

    if (mode === 'signup') {
      if (!formData.name.trim()) {
        return 'Informe seu nome completo.'
      }

      if (!formData.phone.trim()) {
        return 'Informe seu telefone.'
      }

      if (!formData.birth_date) {
        return 'Informe sua data de nascimento.'
      }

      if (!formData.gender) {
        return 'Informe seu g\u00eanero.'
      }

      if (!formData.city.trim()) {
        return 'Informe sua cidade.'
      }

      if (!formData.neighborhood.trim()) {
        return 'Informe seu bairro.'
      }

      if (!acceptedAllLegalTerms) {
        return 'Para criar sua conta, leia e aceite os Termos de Uso, a Pol\u00edtica de Privacidade e os Termos de Assinatura e Cobran\u00e7a.'
      }
    }

    return ''
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setSaving(true)
    setMessage('')
    setErrorMessage('')

    try {
      const validationError = validateForm()

      if (validationError) {
        setErrorMessage(validationError)
        return
      }

      const email = formData.email.trim().toLowerCase()
      const password = formData.password.trim()

      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          throw error
        }

        if (data.user) {
          await syncLocalProfile(data.user.id)
        }

        setMessage('Entrada realizada com sucesso.')
        router.replace('/')
        return
      }

      const now = new Date().toISOString()

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin + '/auth/callback?next=/',
          data: {
            name: formData.name.trim(),
            phone: formData.phone.trim(),
            birth_date: formData.birth_date,
            gender: formData.gender,
            country: formData.country,
            city: formData.city.trim(),
            neighborhood: formData.neighborhood.trim(),
            accepted_terms_of_use: true,
            accepted_privacy_policy: true,
            accepted_billing_terms: true,
            accepted_legal_terms_at: now,
            legal_version: '2026-05-08',
          },
        },
      })

      if (error) {
        throw error
      }

      if (data.user) {
        await syncLocalProfile(data.user.id)
      }

      if (!data.session) {
        setMessage(
          'Conta criada. Verifique seu e-mail para confirmar o acesso antes de entrar.'
        )
        setMode('login')
        setLegalAcceptance(initialLegalAcceptance)
        return
      }

      setMessage('Cadastro realizado com sucesso.')
      router.replace('/')
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'N\u00e3o foi poss\u00edvel concluir agora. Tente novamente.'

      setErrorMessage(message)
    } finally {
      setSaving(false)
    }
  }

  async function handleForgotPassword() {
    setMessage('')
    setErrorMessage('')

    const email = formData.email.trim().toLowerCase()

    if (!email || !email.includes('@')) {
      setErrorMessage('Informe seu e-mail para recuperar a senha.')
      return
    }

    setSaving(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/cadastro',
      })

      if (error) {
        throw error
      }

      setMessage('Enviamos um link de recupera\u00e7\u00e3o para o seu e-mail.')
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'N\u00e3o foi poss\u00edvel enviar o e-mail de recupera\u00e7\u00e3o.'

      setErrorMessage(message)
    } finally {
      setSaving(false)
    }
  }

  const isSignup = mode === 'signup'

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand-block">
          <span className="eyebrow">Devocional Di&aacute;rio</span>
          <h1>{isSignup ? 'Crie sua conta' : 'Entre na sua conta'}</h1>
          <p>
            {isSignup ? (
              <>
                Cadastre-se para acompanhar devocionais, leitura b&iacute;blica,
                ora&ccedil;&atilde;o e sua jornada espiritual.
              </>
            ) : (
              <>Entre para continuar sua jornada di&aacute;ria de discipulado.</>
            )}
          </p>
        </div>

        <div className="mode-switch">
          <button
            type="button"
            className={isSignup ? 'active' : ''}
            onClick={() => {
              setMode('signup')
              setMessage('')
              setErrorMessage('')
            }}
          >
            Criar conta
          </button>

          <button
            type="button"
            className={!isSignup ? 'active' : ''}
            onClick={() => {
              setMode('login')
              setLegalAcceptance(initialLegalAcceptance)
              setMessage('')
              setErrorMessage('')
            }}
          >
            Entrar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field">
            <label>E-mail *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(event) => updateField('email', event.target.value)}
              placeholder="voce@email.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="field">
            <label>Senha *</label>
            <input
              type="password"
              value={formData.password}
              onChange={(event) => updateField('password', event.target.value)}
              placeholder="Minimo de 6 caracteres"
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              required
            />
          </div>

          {isSignup && (
            <>
              <div className="field">
                <label>Nome completo *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  placeholder="Ex: Maria Silva"
                  autoComplete="name"
                  required
                />
              </div>

              <div className="field">
                <label>Telefone com DDD *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(event) => updateField('phone', event.target.value)}
                  placeholder="Ex: 11987654321"
                  autoComplete="tel"
                  required
                />
              </div>

              <div className="grid-two">
                <div className="field">
                  <label>Data de nascimento *</label>
                  <input
                    type="date"
                    value={formData.birth_date}
                    onChange={(event) => updateField('birth_date', event.target.value)}
                    required
                  />
                </div>

                <div className="field">
                  <label>G&ecirc;nero *</label>
                  <select
                    value={formData.gender}
                    onChange={(event) => updateField('gender', event.target.value)}
                    required
                  >
                    <option value="">Selecione...</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Feminino">Feminino</option>
                  </select>
                </div>
              </div>

              <div className="field">
                <label>Pa&iacute;s *</label>
                <select
                  value={formData.country}
                  onChange={(event) => updateField('country', event.target.value)}
                  required
                >
                  <option value="Brasil">Brasil</option>
                  <option value="Estados Unidos">Estados Unidos</option>
                  <option value="Portugal">Portugal</option>
                  <option value="Canada">Canada</option>
                  <option value="Reino Unido">Reino Unido</option>
                  <option value="Australia">Australia</option>
                </select>
              </div>

              <div className="grid-two">
                <div className="field">
                  <label>Cidade *</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(event) => updateField('city', event.target.value)}
                    placeholder="Ex: Piracaia"
                    required
                  />
                </div>

                <div className="field">
                  <label>Bairro *</label>
                  <input
                    type="text"
                    value={formData.neighborhood}
                    onChange={(event) => updateField('neighborhood', event.target.value)}
                    placeholder="Ex: Centro"
                    required
                  />
                </div>
              </div>

              <div className="legal-acceptance">
                <p className="legal-title">Antes de criar sua conta</p>
                <p className="legal-intro">
                  Leia os documentos abaixo e marque cada item para confirmar que
                  voc&ecirc; entendeu e aceitou.
                </p>

                <div className="legal-card">
                  <label className="legal-check">
                    <input
                      type="checkbox"
                      checked={legalAcceptance.termsOfUse}
                      onChange={(event) =>
                        updateLegalAcceptance('termsOfUse', event.target.checked)
                      }
                    />

                    <span>
                      <strong>Aceito os Termos de Uso</strong>
                      <small>
                        Explica as regras gerais para usar o app, criar conta,
                        acessar conte&uacute;dos e utilizar os recursos de forma adequada.
                      </small>
                    </span>
                  </label>

                  <Link
                    href="/termos-de-uso"
                    className="legal-link"
                  >
                    Ler Termos de Uso
                  </Link>
                </div>

                <div className="legal-card">
                  <label className="legal-check">
                    <input
                      type="checkbox"
                      checked={legalAcceptance.privacyPolicy}
                      onChange={(event) =>
                        updateLegalAcceptance('privacyPolicy', event.target.checked)
                      }
                    />

                    <span>
                      <strong>Aceito a Pol&iacute;tica de Privacidade</strong>
                      <small>
                        Explica quais dados podem ser coletados, como s&atilde;o usados,
                        protegidos e como voc&ecirc; pode solicitar acesso ou exclus&atilde;o.
                      </small>
                    </span>
                  </label>

                  <Link
                    href="/politica-de-privacidade"
                    className="legal-link"
                  >
                    Ler Pol&iacute;tica de Privacidade
                  </Link>
                </div>

                <div className="legal-card">
                  <label className="legal-check">
                    <input
                      type="checkbox"
                      checked={legalAcceptance.billingTerms}
                      onChange={(event) =>
                        updateLegalAcceptance('billingTerms', event.target.checked)
                      }
                    />

                    <span>
                      <strong>Aceito os Termos de Assinatura e Cobran&ccedil;a</strong>
                      <small>
                        Este aceite n&atilde;o gera cobran&ccedil;a. Ele apenas explica
                        regras futuras caso o usu&aacute;rio escolha um plano premium,
                        assinatura, contribui&ccedil;&atilde;o ou algum recurso pago.
                      </small>
                    </span>
                  </label>

                  <Link
                    href="/termos-de-assinatura-e-cobranca"
                    className="legal-link"
                  >
                    Ler Termos de Assinatura e Cobran&ccedil;a
                  </Link>
                </div>
              </div>
            </>
          )}

          {message && <div className="message success">{message}</div>}
          {errorMessage && <div className="message error">{errorMessage}</div>}

          <button type="submit" disabled={saving} className="submit-button">
            {saving
              ? isSignup
                ? 'Criando conta...'
                : 'Entrando...'
              : isSignup
                ? 'Criar conta e continuar'
                : 'Entrar no app'}
          </button>

          {!isSignup && (
            <button
              type="button"
              className="forgot-button"
              onClick={handleForgotPassword}
              disabled={saving}
            >
              Esqueci minha senha
            </button>
          )}
        </form>

        <p className="footer-note">
          Ao continuar, voc&ecirc; concorda em usar este aplicativo como uma
          jornada di&aacute;ria de discipulado, leitura b&iacute;blica e
          ora&ccedil;&atilde;o.
        </p>
      </section>

      <style jsx>{`
        .auth-page {
          min-height: 100vh;
          background:
            radial-gradient(circle at top left, rgba(37, 99, 235, 0.2), transparent 34rem),
            radial-gradient(circle at top right, rgba(245, 158, 11, 0.14), transparent 30rem),
            #030712;
          color: #f8fafc;
          padding: 28px 16px 56px;
          display: grid;
          place-items: center;
        }

        .auth-card {
          width: min(100%, 560px);
          background:
            linear-gradient(135deg, rgba(15, 23, 42, 0.94), rgba(15, 23, 42, 0.78));
          border: 1px solid rgba(148, 163, 184, 0.18);
          border-radius: 34px;
          padding: 28px;
          box-shadow: 0 26px 90px rgba(0, 0, 0, 0.38);
        }

        .brand-block {
          text-align: center;
          margin-bottom: 22px;
        }

        .eyebrow {
          display: inline-flex;
          color: #93c5fd;
          background: rgba(59, 130, 246, 0.14);
          border: 1px solid rgba(147, 197, 253, 0.22);
          padding: 7px 12px;
          border-radius: 999px;
          font-size: 0.7rem;
          font-weight: 900;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          margin-bottom: 16px;
        }

        h1 {
          margin: 0;
          font-size: clamp(2.1rem, 6vw, 3rem);
          line-height: 0.98;
          letter-spacing: -0.07em;
        }

        p {
          margin: 0;
        }

        .brand-block p {
          color: #bfdbfe;
          line-height: 1.6;
          margin-top: 12px;
        }

        .mode-switch {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          background: rgba(2, 6, 23, 0.55);
          border: 1px solid rgba(148, 163, 184, 0.16);
          padding: 6px;
          border-radius: 20px;
          margin-bottom: 22px;
        }

        .mode-switch button {
          border: 0;
          border-radius: 15px;
          padding: 12px;
          background: transparent;
          color: #bfdbfe;
          font-weight: 900;
          cursor: pointer;
        }

        .mode-switch button.active {
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: white;
          box-shadow: 0 14px 34px rgba(37, 99, 235, 0.22);
        }

        .auth-form {
          display: grid;
          gap: 15px;
        }

        .grid-two {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .field {
          display: grid;
          gap: 7px;
        }

        label {
          color: #dbeafe;
          font-weight: 900;
          font-size: 0.84rem;
        }

        input,
        select {
          width: 100%;
          background: rgba(2, 6, 23, 0.72);
          border: 1px solid rgba(148, 163, 184, 0.24);
          color: #f8fafc;
          border-radius: 16px;
          padding: 13px 15px;
          min-height: 48px;
          outline: none;
        }

        input:focus,
        select:focus {
          border-color: rgba(147, 197, 253, 0.62);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
        }

        ::placeholder {
          color: rgba(191, 219, 254, 0.46);
        }

        .legal-acceptance {
          display: grid;
          gap: 12px;
          border: 1px solid rgba(147, 197, 253, 0.16);
          background: rgba(2, 6, 23, 0.32);
          border-radius: 22px;
          padding: 15px;
        }

        .legal-title {
          color: #f8fafc;
          font-size: 0.92rem;
          font-weight: 950;
          letter-spacing: -0.02em;
        }

        .legal-intro {
          color: #93c5fd;
          font-size: 0.78rem;
          line-height: 1.5;
          margin-top: -6px;
        }

        .legal-card {
          display: grid;
          gap: 10px;
          border: 1px solid rgba(148, 163, 184, 0.18);
          background: rgba(15, 23, 42, 0.66);
          border-radius: 18px;
          padding: 14px;
        }

        .legal-check {
          display: flex;
          align-items: flex-start;
          gap: 11px;
          color: #bfdbfe;
          cursor: pointer;
        }

        .legal-check input {
          width: 18px;
          min-width: 18px;
          height: 18px;
          min-height: 18px;
          margin-top: 3px;
          accent-color: #2563eb;
          cursor: pointer;
        }

        .legal-check span {
          display: grid;
          gap: 4px;
        }

        .legal-check strong {
          color: #f8fafc;
          font-size: 0.86rem;
          line-height: 1.35;
        }

        .legal-check small {
          color: #94a3b8;
          font-size: 0.76rem;
          font-weight: 700;
          line-height: 1.45;
        }

        .legal-link {
          display: inline-flex;
          width: fit-content;
          color: #fbbf24;
          font-size: 0.78rem;
          font-weight: 950;
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        .message {
          border-radius: 16px;
          padding: 13px 15px;
          font-weight: 800;
          line-height: 1.45;
        }

        .message.success {
          color: #bbf7d0;
          background: rgba(22, 101, 52, 0.28);
          border: 1px solid rgba(74, 222, 128, 0.24);
        }

        .message.error {
          color: #fecaca;
          background: rgba(127, 29, 29, 0.28);
          border: 1px solid rgba(248, 113, 113, 0.24);
        }

        .submit-button {
          border: 0;
          border-radius: 18px;
          min-height: 54px;
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: white;
          font-weight: 950;
          font-size: 1rem;
          cursor: pointer;
          box-shadow: 0 18px 44px rgba(37, 99, 235, 0.24);
        }

        .submit-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .forgot-button {
          border: 1px solid rgba(148, 163, 184, 0.18);
          background: rgba(15, 23, 42, 0.72);
          color: #bfdbfe;
          border-radius: 16px;
          min-height: 46px;
          font-weight: 900;
          cursor: pointer;
        }

        .footer-note {
          color: #93c5fd;
          font-size: 0.78rem;
          line-height: 1.55;
          text-align: center;
          margin-top: 22px;
        }

        @media (max-width: 560px) {
          .auth-page {
            padding: 16px 10px 36px;
            align-items: start;
          }

          .auth-card {
            padding: 22px;
            border-radius: 28px;
          }

          .grid-two {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  )
}

