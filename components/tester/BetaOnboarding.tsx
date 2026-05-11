'use client'

import { FormEvent, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { BetaTester, BetaTesterProfile } from '@/lib/beta/betaTester'

type BetaOnboardingProps = {
  betaTester: BetaTester
  betaProfile?: BetaTesterProfile | null
  required?: boolean
  onOpenTesterCenter: () => void
  onDismiss: () => void
  onProfileSaved: () => void
}

type FormState = {
  displayName: string
  deviceLabel: string
  operatingSystem: string
  accessMode: string
  accepted: boolean
}

const operatingSystems = ['iPhone / iOS', 'Android', 'Windows', 'Mac', 'Outro']
const accessModes = [
  'App instalado na tela inicial',
  'Safari',
  'Chrome',
  'Edge',
  'Outro',
]

function isStandalonePwa() {
  if (typeof window === 'undefined') return false

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator &&
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone))
  )
}

function getNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported'
  }

  return Notification.permission
}

function getTechnicalSnapshot() {
  return {
    userAgent: navigator.userAgent || null,
    language: navigator.language || null,
    screenWidth: window.screen?.width || null,
    screenHeight: window.screen?.height || null,
    viewportWidth: window.innerWidth || null,
    viewportHeight: window.innerHeight || null,
    notificationPermission: getNotificationPermission(),
    pushSupported: 'serviceWorker' in navigator && 'PushManager' in window,
    isPwaStandalone: isStandalonePwa(),
    appVersion: '1.0.0',
  }
}

export default function BetaOnboarding({
  betaTester,
  betaProfile,
  required = false,
  onOpenTesterCenter,
  onDismiss,
  onProfileSaved,
}: BetaOnboardingProps) {
  const profileCompleted = Boolean(betaProfile?.accepted_beta_terms)
  const [showProfileForm, setShowProfileForm] = useState(false)
  const [form, setForm] = useState<FormState>({
    displayName: betaTester.name || '',
    deviceLabel: betaProfile?.device_label || '',
    operatingSystem: betaProfile?.operating_system || '',
    accessMode: betaProfile?.access_mode || '',
    accepted: false,
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setErrorMessage('')

    if (!form.displayName.trim()) {
      setErrorMessage('Informe seu nome ou nome de exibição.')
      return
    }

    if (!form.deviceLabel.trim()) {
      setErrorMessage('Informe o modelo do aparelho.')
      return
    }

    if (!form.operatingSystem) {
      setErrorMessage('Escolha o sistema do aparelho.')
      return
    }

    if (!form.accessMode) {
      setErrorMessage('Escolha a forma de acesso ao app.')
      return
    }

    if (!form.accepted) {
      setErrorMessage('Para continuar, confirme que leu e concorda em participar do Beta Fechado.')
      return
    }

    setSaving(true)

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) throw userError
      if (!user) throw new Error('Faça login para salvar seu perfil beta.')

      const technical = getTechnicalSnapshot()
      const profileId = window.localStorage.getItem('user_id') || null
      const now = new Date().toISOString()

      const { error } = await supabase
        .from('beta_tester_profiles')
        .upsert(
          {
            tester_id: betaTester.id,
            auth_user_id: user.id,
            profile_id: profileId,
            accepted_beta_terms: true,
            accepted_beta_terms_at: now,
            device_label: form.deviceLabel.trim(),
            device_type: form.operatingSystem,
            operating_system: form.operatingSystem,
            browser: form.accessMode,
            access_mode: form.accessMode,
            user_agent: technical.userAgent,
            language: technical.language,
            screen_width: technical.screenWidth,
            screen_height: technical.screenHeight,
            viewport_width: technical.viewportWidth,
            viewport_height: technical.viewportHeight,
            notification_permission: technical.notificationPermission,
            push_supported: technical.pushSupported,
            is_pwa_standalone: technical.isPwaStandalone,
            app_version: technical.appVersion,
            last_seen_at: now,
          },
          {
            onConflict: 'tester_id,auth_user_id',
          }
        )

      if (error) throw error

      const { error: firstAccessError } = await supabase
        .from('beta_testers')
        .update({
          name: betaTester.name || form.displayName.trim(),
          first_access_at: betaTester.first_access_at || now,
        })
        .eq('id', betaTester.id)
        .is('first_access_at', null)

      if (firstAccessError) {
        console.warn('Nao foi possivel atualizar first_access_at do beta tester:', firstAccessError)
      }

      setMessage('Perfil de testador salvo.')
      setShowProfileForm(false)
      onProfileSaved()
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Não foi possível salvar seu perfil de testador.'

      setErrorMessage(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/80 px-4 py-6 text-white backdrop-blur-sm">
      <section className="mx-auto max-w-2xl rounded-[32px] border border-purple-300/20 bg-gradient-to-br from-slate-900 via-slate-950 to-purple-950/50 p-6 shadow-2xl shadow-purple-950/30">
        <div className="inline-flex rounded-full border border-purple-300/20 bg-purple-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-purple-100">
          Beta fechado
        </div>

        <h1 className="mt-4 text-3xl font-black leading-tight tracking-[-0.06em]">
          Bem-vindo ao Beta Fechado
        </h1>

        <p className="mt-4 text-sm font-semibold leading-6 text-slate-300">
          Obrigado por ajudar a melhorar o app. Seu tempo e suas respostas vão
          nos ajudar a preparar uma experiência mais clara, estável e edificante
          para todos.
        </p>

        <p className="mt-3 text-sm font-semibold leading-6 text-slate-400">
          Seu painel de testes fica em Mais → Central do Testador Beta.
        </p>

        {required && !profileCompleted && !showProfileForm && (
          <div className="mt-5 rounded-[24px] border border-amber-300/20 bg-amber-500/10 p-4">
            <p className="text-sm font-black text-amber-100">
              Aceite inicial obrigatório
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-amber-50/85">
              Para participar do Beta Fechado, complete seu perfil de testador e
              confirme o aviso de privacidade antes de acessar o app.
            </p>
          </div>
        )}

        {profileCompleted && !showProfileForm && (
          <div className="mt-5 rounded-[24px] border border-emerald-300/20 bg-emerald-500/10 p-4">
            <p className="text-sm font-black text-emerald-100">
              Perfil beta concluído
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-emerald-50/80">
              Seu perfil de testador já está salvo. Você pode ir direto para a
              Central do Testador.
            </p>
          </div>
        )}

        {!showProfileForm && (
          <div className={`mt-6 grid gap-3 ${required && !profileCompleted ? '' : 'sm:grid-cols-3'}`}>
            {(!required || profileCompleted) && (
              <button
                type="button"
                onClick={onOpenTesterCenter}
                className="rounded-2xl bg-purple-600 px-5 py-4 text-sm font-black text-white shadow-xl shadow-purple-950/30 active:scale-[0.98] sm:col-span-2"
              >
                {profileCompleted ? 'Ir para Central do Testador' : 'Abrir Central do Testador'}
              </button>
            )}

            {!profileCompleted && message !== 'Perfil de testador salvo.' && (
              <button
                type="button"
                onClick={() => setShowProfileForm(true)}
                className="rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-sm font-black text-slate-100 active:scale-[0.98]"
              >
                Completar perfil de testador
              </button>
            )}

            {profileCompleted && (
              <button
                type="button"
                onClick={onDismiss}
                className="rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-sm font-black text-slate-100 active:scale-[0.98]"
              >
                Agora não
              </button>
            )}
          </div>
        )}

        {!required && !profileCompleted && !showProfileForm && (
          <button
            type="button"
            onClick={onDismiss}
            className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-slate-200 active:scale-[0.98]"
          >
            Agora não
          </button>
        )}

        {showProfileForm && (
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-bold text-slate-300">
                Nome ou nome de exibição
                <input
                  value={form.displayName}
                  onChange={(event) => updateField('displayName', event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-purple-300"
                  placeholder="Como devemos te identificar"
                />
              </label>

              <label className="block text-sm font-bold text-slate-300">
                Modelo do aparelho
                <input
                  value={form.deviceLabel}
                  onChange={(event) => updateField('deviceLabel', event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-purple-300"
                  placeholder="Ex.: iPhone 13, Galaxy A54"
                />
              </label>

              <label className="block text-sm font-bold text-slate-300">
                Sistema
                <select
                  value={form.operatingSystem}
                  onChange={(event) => updateField('operatingSystem', event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-purple-300"
                >
                  <option value="">Selecione</option>
                  {operatingSystems.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-bold text-slate-300">
                Forma de acesso
                <select
                  value={form.accessMode}
                  onChange={(event) => updateField('accessMode', event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-purple-300"
                >
                  <option value="">Selecione</option>
                  {accessModes.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="rounded-[24px] border border-blue-300/20 bg-blue-500/10 p-4">
              <p className="text-sm font-black text-blue-100">
                Instalação na tela inicial
              </p>
              <div className="mt-3 grid gap-4 text-sm font-semibold leading-6 text-blue-50/80 sm:grid-cols-2">
                <div>
                  <p className="font-black text-white">iPhone / Safari</p>
                  <ol className="mt-2 list-decimal space-y-1 pl-5">
                    <li>Abra no Safari.</li>
                    <li>Toque em Compartilhar.</li>
                    <li>Toque em Adicionar à Tela de Início.</li>
                  </ol>
                </div>
                <div>
                  <p className="font-black text-white">Android / Chrome</p>
                  <ol className="mt-2 list-decimal space-y-1 pl-5">
                    <li>Abra no Chrome.</li>
                    <li>Toque nos três pontinhos.</li>
                    <li>Toque em Adicionar à tela inicial ou Instalar app.</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-4">
              <p className="text-sm font-black text-white">Notificações</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
                As notificações poderão ser usadas para lembrar missões pendentes
                e avisar novas rodadas de teste. A permissão não será pedida agora.
              </p>
            </div>

            <div className="rounded-[24px] border border-amber-300/20 bg-amber-500/10 p-4">
              <p className="text-sm font-black text-amber-100">
                Aviso de privacidade do Beta
              </p>
              <div className="mt-3 space-y-3 text-sm font-semibold leading-6 text-amber-50/85">
                <p>
                  Durante o Beta Fechado, coletaremos algumas informações
                  fornecidas por você, como nome, e-mail, modelo do aparelho,
                  sistema operacional e forma de acesso ao app.
                </p>
                <p>
                  Também poderemos registrar informações técnicas básicas do
                  navegador e do aparelho, como tipo de navegador, tamanho da
                  tela, idioma, versão do app, status de notificações e se o app
                  está sendo usado instalado na tela inicial ou pelo navegador.
                </p>
                <p>
                  Essas informações serão usadas apenas para liberar seu acesso
                  como testador, identificar problemas por tipo de aparelho,
                  melhorar áudio, navegação, notificações e layout, e organizar
                  relatórios internos de teste.
                </p>
                <p>
                  Não acessaremos seus contatos, fotos, arquivos, microfone,
                  câmera ou localização precisa.
                </p>
                <p>
                  Seus dados não serão vendidos nem compartilhados com
                  anunciantes. Seus relatos poderão ser analisados por ferramentas
                  de inteligência artificial apenas para organizar e resumir
                  problemas para o administrador.
                </p>
                <p>
                  Ao continuar, você confirma que leu este aviso e concorda em
                  participar do Beta Fechado.
                </p>
              </div>

              <label className="mt-4 flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-3 text-sm font-bold text-white">
                <input
                  type="checkbox"
                  checked={form.accepted}
                  onChange={(event) => updateField('accepted', event.target.checked)}
                  className="mt-1 h-4 w-4"
                />
                <span>Li e concordo em participar do Beta Fechado.</span>
              </label>
            </div>

            {(message || errorMessage) && (
              <div className="space-y-2">
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

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-purple-600 px-5 py-4 text-sm font-black text-white disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar perfil de testador'}
              </button>
              <button
                type="button"
                onClick={() => setShowProfileForm(false)}
                className="rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-sm font-black text-slate-100"
              >
                Voltar
              </button>
            </div>
          </form>
        )}

        {message === 'Perfil de testador salvo.' && !showProfileForm && (
          <button
            type="button"
            onClick={onOpenTesterCenter}
            className="mt-4 w-full rounded-2xl bg-emerald-600 px-5 py-4 text-sm font-black text-white"
          >
            Ir para Central do Testador
          </button>
        )}
      </section>
    </div>
  )
}
