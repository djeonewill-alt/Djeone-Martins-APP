'use client'

import { useEffect, useMemo, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { usePushNotifications } from '@/lib/notifications/usePushNotifications'

type TabMaisProps = {
  onOpenSeries?: () => void
  onOpenOferta?: () => void
  settingsOpenToken?: number
}

type MoreView = 'home' | 'settings'

function MoreFeatureCard({
  title,
  subtitle,
  icon,
  badge,
  accent = 'blue',
  onClick,
  disabled = false,
}: {
  title: string
  subtitle: string
  icon: string
  badge?: string
  accent?: 'blue' | 'gold' | 'green' | 'purple'
  onClick?: () => void
  disabled?: boolean
}) {
  const accentClass =
    accent === 'gold'
      ? 'from-yellow-500/14 via-slate-900/80 to-slate-950 border-yellow-300/15'
      : accent === 'green'
        ? 'from-emerald-500/12 via-slate-900/80 to-slate-950 border-emerald-300/15'
        : accent === 'purple'
          ? 'from-purple-500/14 via-slate-900/80 to-slate-950 border-purple-300/15'
          : 'from-blue-500/14 via-slate-900/80 to-slate-950 border-blue-300/15'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative w-full overflow-hidden rounded-[32px] border bg-gradient-to-br p-5 text-left shadow-[0_18px_55px_rgba(0,0,0,0.28)] active:scale-[0.99] disabled:opacity-70 ${accentClass}`}
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/10 blur-3xl" />

      <div className="relative flex items-start gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] border border-white/10 bg-white/[0.055] text-3xl">
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-xl font-black leading-tight tracking-[-0.05em] text-white">
              {title}
            </h3>

            {badge && (
              <span className="shrink-0 rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-blue-100">
                {badge}
              </span>
            )}
          </div>

          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            {subtitle}
          </p>
        </div>
      </div>
    </button>
  )
}

function SettingsItem({
  icon,
  title,
  subtitle,
  badge,
  onClick,
  danger = false,
  disabled = false,
}: {
  icon: string
  title: string
  subtitle: string
  badge?: string
  onClick?: () => void
  danger?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        danger
          ? 'w-full rounded-[28px] border border-red-300/15 bg-red-500/10 p-5 text-left active:scale-[0.99] disabled:opacity-60'
          : 'w-full rounded-[28px] border border-white/10 bg-slate-900/80 p-5 text-left shadow-[0_14px_38px_rgba(0,0,0,0.22)] active:scale-[0.99] disabled:opacity-60'
      }
    >
      <div className="flex items-start gap-4">
        <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-[22px] border border-white/10 bg-white/[0.055] text-2xl">
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-base font-black tracking-[-0.035em] text-white">
              {title}
            </h3>

            {badge && (
              <span className="shrink-0 rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-blue-100">
                {badge}
              </span>
            )}
          </div>

          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            {subtitle}
          </p>
        </div>
      </div>
    </button>
  )
}

function SettingsScreen() {
  const appVersion = '0.1.0'
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const {
    isSubscribed,
    loading: notificationLoading,
    subscribe,
    unsubscribe,
  } = usePushNotifications()

  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [accountLoading, setAccountLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function loadAccount() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!mounted) return

        setUserEmail(user?.email ?? null)

        const metadataName =
          typeof user?.user_metadata?.name === 'string'
            ? user.user_metadata.name
            : typeof user?.user_metadata?.display_name === 'string'
              ? user.user_metadata.display_name
              : null

        setUserName(metadataName)

        if (user?.id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, email')
            .eq('auth_user_id', user.id)
            .maybeSingle()

          if (mounted && profile) {
            setUserName(profile.name || metadataName)
            setUserEmail(profile.email || user.email || null)
          }
        }
      } catch (error) {
        console.error('Erro ao carregar conta nas configurações:', error)
      } finally {
        if (mounted) {
          setAccountLoading(false)
        }
      }
    }

    loadAccount()

    return () => {
      mounted = false
    }
  }, [supabase])

  const accountLabel = accountLoading
    ? 'Carregando conta...'
    : userEmail
      ? userName || userEmail
      : 'Usuário não conectado'

  const accountSubtitle = userEmail
    ? userEmail
    : 'Entre na sua conta para sincronizar favoritos, orações e preferências.'

  const clearLocalCache = () => {
    const confirmed = window.confirm(
      'Deseja limpar dados locais deste dispositivo? Isso pode remover marcações locais de leitura, oração e preferências ainda não sincronizadas.'
    )

    if (!confirmed) return

    const keysToRemove = [
      'djeone-reading-state-v1',
      'djeone-prayed-ids-v1',
      'djeone-my-prayer-ids-v1',
      'djeone-encouragement-ids-v1',
      'djeone-share-count-v1',
    ]

    keysToRemove.forEach((key) => {
      window.localStorage.removeItem(key)
    })

    alert('Cache local limpo neste dispositivo.')
  }

  const copyVersion = async () => {
    try {
      await navigator.clipboard.writeText(`Djeone App versão ${appVersion}`)
      alert('Versão copiada.')
    } catch {
      alert(`Versão do app: ${appVersion}`)
    }
  }

  const openSupportEmail = () => {
    window.location.href =
      'mailto:djeonewill@gmail.com?subject=Suporte%20Djeone%20Martins%20App'
  }

  const handleToggleNotifications = async () => {
    try {
      if (isSubscribed) {
        await unsubscribe()
      } else {
        await subscribe()
      }
    } catch (error) {
      console.error('Erro ao alterar notificações:', error)
      alert('Não foi possível alterar as notificações agora.')
    }
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-300">
          Configurações
        </p>

        <h1 className="mt-2 text-3xl font-black leading-tight tracking-[-0.06em]">
          Ajustes do aplicativo
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Gerencie sua conta, notificações, privacidade, assinatura e dados deste dispositivo.
        </p>
      </div>

      <section className="relative mb-5 overflow-hidden rounded-[34px] border border-white/10 bg-slate-900/80 p-5 shadow-[0_22px_70px_rgba(0,0,0,0.35)]">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-yellow-400/10 blur-3xl" />

        <div className="relative">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">
            Minha conta
          </p>

          <h2 className="mt-2 text-3xl font-black leading-none tracking-[-0.075em]">
            {accountLabel}
          </h2>

          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            {accountSubtitle}
          </p>
        </div>
      </section>

      <section className="mb-5 space-y-3">
        <p className="px-1 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
          Minha conta
        </p>

        <SettingsItem
          icon="👤"
          title="Perfil"
          subtitle="Editar nome, foto, cidade e preferências pessoais."
          badge="Em breve"
          disabled
        />

        <SettingsItem
          icon="🌙"
          title="Preferências do app"
          subtitle="Modo claro/escuro, tamanho da fonte e idioma do aplicativo."
          badge="Em breve"
          disabled
        />
      </section>

      <section className="mb-5 space-y-3">
        <p className="px-1 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
          Notificações
        </p>

        <SettingsItem
          icon="🔔"
          title={isSubscribed ? 'Notificações ativadas' : 'Ativar notificações'}
          subtitle={
            isSubscribed
              ? 'Você pode desativar os lembretes deste dispositivo.'
              : 'Receba lembretes da Palavra do Dia, oração e novidades do app.'
          }
          badge={notificationLoading ? 'Carregando' : isSubscribed ? 'Ativo' : 'Inativo'}
          onClick={handleToggleNotifications}
          disabled={notificationLoading}
        />

        <SettingsItem
          icon="⏰"
          title="Horário dos lembretes"
          subtitle="Escolha o melhor horário para receber devocionais e avisos."
          badge="Em breve"
          disabled
        />
      </section>

      <section className="mb-5 space-y-3">
        <p className="px-1 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
          Privacidade e segurança
        </p>

        <SettingsItem
          icon="🔒"
          title="Política de privacidade"
          subtitle="Entenda como seus dados serão tratados dentro do aplicativo."
          badge="Em breve"
          disabled
        />

        <SettingsItem
          icon="📜"
          title="Termos de uso"
          subtitle="Leia as condições de uso do aplicativo."
          badge="Em breve"
          disabled
        />

        <SettingsItem
          icon="🧹"
          title="Limpar dados locais"
          subtitle="Remove dados salvos apenas neste dispositivo."
          onClick={clearLocalCache}
          danger
        />
      </section>

      <section className="mb-5 space-y-3">
        <p className="px-1 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
          Assinatura e cobrança
        </p>

        <SettingsItem
          icon="⭐"
          title="Plano atual"
          subtitle="Você está usando a versão gratuita do aplicativo."
          badge="Gratuito"
          disabled
        />

        <SettingsItem
          icon="💳"
          title="Gerenciar assinatura"
          subtitle="Cancelar premium, restaurar assinatura ou alterar plano."
          badge="Em breve"
          disabled
        />
      </section>

      <section className="mb-5 space-y-3">
        <p className="px-1 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
          Ajuda e contato
        </p>

        <SettingsItem
          icon="✉️"
          title="Falar com o ministério"
          subtitle="Envie uma mensagem para suporte, dúvidas ou testemunhos."
          onClick={openSupportEmail}
        />

        <SettingsItem
          icon="🛠️"
          title="Relatar problema"
          subtitle="Informe erro de áudio, login, pagamento ou funcionamento do app."
          onClick={openSupportEmail}
        />
      </section>

      <section className="mb-5 space-y-3">
        <p className="px-1 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
          Status técnico
        </p>

        <SettingsItem
          icon="📱"
          title="Versão do aplicativo"
          subtitle={`Djeone Martins App versão ${appVersion}`}
          badge="Copiar"
          onClick={copyVersion}
        />

        <SettingsItem
          icon="✅"
          title="Status de login"
          subtitle={userEmail ? 'Sessão ativa neste dispositivo.' : 'Nenhuma sessão ativa encontrada.'}
          badge={userEmail ? 'Conectado' : 'Desconectado'}
          disabled
        />

        <SettingsItem
          icon="🔔"
          title="Status das notificações"
          subtitle={
            isSubscribed
              ? 'Este dispositivo está inscrito para receber notificações.'
              : 'Notificações ainda não estão ativas neste dispositivo.'
          }
          badge={isSubscribed ? 'Ativo' : 'Inativo'}
          disabled
        />
      </section>
    </div>
  )
}

export default function TabMais({
  onOpenSeries,
  onOpenOferta,
  settingsOpenToken = 0,
}: TabMaisProps) {
  const [view, setView] = useState<MoreView>('home')

  useEffect(() => {
    if (settingsOpenToken > 0) {
      setView('settings')
    }
  }, [settingsOpenToken])

  if (view === 'settings') {
    return (
      <div className="min-h-screen bg-slate-950 px-5 pb-32 pt-0 text-white">
        <div className="mx-auto max-w-2xl">
          <SettingsScreen />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 px-5 pb-32 pt-0 text-white">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-300">
            Mais
          </p>

          <h1 className="mt-2 text-3xl font-black leading-tight tracking-[-0.06em]">
            Recursos e caminhos
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Acesse séries, ofertas, assinatura e ferramentas futuras do seu discipulado diário.
          </p>
        </div>

        <section className="relative mb-5 overflow-hidden rounded-[34px] border border-white/10 bg-slate-900/80 p-5 shadow-[0_22px_70px_rgba(0,0,0,0.35)]">
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">
              Central de recursos
            </p>

            <h2 className="mt-2 text-4xl font-black leading-none tracking-[-0.075em]">
              Continue crescendo
            </h2>

            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              Aqui ficam os recursos extras do app: séries antigas, contribuição, assinatura e recursos futuros.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <MoreFeatureCard
            title="Séries"
            subtitle="Acesse devocionais antigos, jornadas temáticas e conteúdos premium."
            icon="🎧"
            badge="Catálogo"
            accent="blue"
            onClick={onOpenSeries}
          />

          <MoreFeatureCard
            title="Oferta"
            subtitle="Contribua com este projeto e ajude a Palavra a alcançar mais pessoas."
            icon="🤲"
            badge="Apoiar"
            accent="gold"
            onClick={onOpenOferta}
          />

          <MoreFeatureCard
            title="Assinatura"
            subtitle="Planos personalizados, séries premium e recursos avançados em breve."
            icon="⭐"
            badge="Premium"
            accent="purple"
            disabled
          />
        </section>
      </div>
    </div>
  )
}





