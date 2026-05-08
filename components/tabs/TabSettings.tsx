'use client'

import { useState } from 'react'

import { usePushNotifications } from '@/lib/notifications/usePushNotifications'
import AccountSettings from '@/components/settings/AccountSettings'
import BillingSettings from '@/components/settings/BillingSettings'
import HelpSettings from '@/components/settings/HelpSettings'
import NotificationSettings from '@/components/settings/NotificationSettings'
import PrivacySecuritySettings from '@/components/settings/PrivacySecuritySettings'
import TechnicalStatusSettings from '@/components/settings/TechnicalStatusSettings'

type SectionKey =
  | 'account'
  | 'notifications'
  | 'privacy'
  | 'billing'
  | 'help'
  | 'technical'

type SettingsSectionProps = {
  sectionKey: SectionKey
  openSection: SectionKey | null
  onToggle: (section: SectionKey) => void
  icon: string
  title: string
  subtitle: string
  badge?: string
  children: React.ReactNode
}

function SettingsSection({
  sectionKey,
  openSection,
  onToggle,
  icon,
  title,
  subtitle,
  badge,
  children,
}: SettingsSectionProps) {
  const isOpen = openSection === sectionKey

  return (
    <section className="overflow-hidden rounded-[30px] border border-white/10 bg-slate-900/70 shadow-2xl shadow-black/20">
      <button
        type="button"
        onClick={() => onToggle(sectionKey)}
        className="flex w-full items-start gap-4 p-5 text-left active:scale-[0.99]"
      >
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] border border-white/10 bg-white/[0.055] text-2xl">
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-black tracking-[-0.045em] text-white">
              {title}
            </h2>

            <div className="flex shrink-0 items-center gap-2">
              {badge && (
                <span className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-blue-100">
                  {badge}
                </span>
              )}

              <span className="text-lg font-black text-slate-500">
                {isOpen ? '−' : '+'}
              </span>
            </div>
          </div>

          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            {subtitle}
          </p>
        </div>
      </button>

      {isOpen && (
        <div className="space-y-3 border-t border-white/10 p-4">
          {children}
        </div>
      )}
    </section>
  )
}

export default function TabSettings() {
  const [openSection, setOpenSection] = useState<SectionKey | null>('account')

  const pushNotifications = usePushNotifications() as any

  const isSubscribed = Boolean(pushNotifications.isSubscribed)
  const notificationLoading = Boolean(
    pushNotifications.loading || pushNotifications.isLoading
  )

  const isPremium = false
  const planLabel = isPremium ? 'Premium' : 'Gratuito'

  function handleToggleSection(section: SectionKey) {
    setOpenSection((current) => (current === section ? null : section))
  }

  async function handleToggleNotifications() {
    try {
      if (typeof pushNotifications.toggle === 'function') {
        await pushNotifications.toggle()
        return
      }

      if (
        isSubscribed &&
        typeof pushNotifications.unsubscribe === 'function'
      ) {
        await pushNotifications.unsubscribe()
        return
      }

      if (
        isSubscribed &&
        typeof pushNotifications.unsubscribeFromPush === 'function'
      ) {
        await pushNotifications.unsubscribeFromPush()
        return
      }

      if (
        !isSubscribed &&
        typeof pushNotifications.subscribe === 'function'
      ) {
        await pushNotifications.subscribe()
        return
      }

      if (
        !isSubscribed &&
        typeof pushNotifications.subscribeToPush === 'function'
      ) {
        await pushNotifications.subscribeToPush()
        return
      }

      alert('As notificações ainda não estão disponíveis neste dispositivo.')
    } catch (error) {
      console.error('Erro ao alternar notificações:', error)
      alert('Não foi possível alterar as notificações agora.')
    }
  }

  function handleContactSupport() {
    window.location.href =
      'mailto:djeonewill@gmail.com?subject=Suporte%20-%20Djeone%20Martins%20App'
  }

  async function handleCopyVersion() {
    const versionText =
      'Djeone Martins App - ' + new Date().toLocaleString('pt-BR')

    try {
      await navigator.clipboard.writeText(versionText)
      alert('Informações copiadas.')
    } catch {
      alert(versionText)
    }
  }

  function clearLocalCache() {
    const confirmed = confirm(
      'Limpar dados locais deste dispositivo?\n\nIsso pode remover preferências salvas apenas neste aparelho.'
    )

    if (!confirmed) return

    const prefixesToClear = [
      'djeone-',
      'prayer-',
      'reading-',
      'audio-progress-',
    ]

    Object.keys(window.localStorage).forEach((key) => {
      if (prefixesToClear.some((prefix) => key.startsWith(prefix))) {
        window.localStorage.removeItem(key)
      }
    })

    alert('Dados locais limpos com sucesso.')
  }

  return (
    <div className="min-h-screen bg-slate-950 px-5 pb-32 pt-4 text-white">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-300">
            Configurações
          </p>

          <h1 className="mt-2 text-3xl font-black leading-tight tracking-[-0.06em]">
            Ajustes do aplicativo
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Gerencie conta, notificações, privacidade, assinatura e suporte.
          </p>
        </div>

        <div className="space-y-4">
          <SettingsSection
            sectionKey="account"
            openSection={openSection}
            onToggle={handleToggleSection}
            icon="👤"
            title="Minha conta"
            subtitle="Dados pessoais, preferências e acesso."
            badge={planLabel}
          >
            <AccountSettings />
          </SettingsSection>

          <SettingsSection
            sectionKey="notifications"
            openSection={openSection}
            onToggle={handleToggleSection}
            icon="🔔"
            title="Notificações"
            subtitle={
              isSubscribed
                ? 'Notificações ativas neste dispositivo.'
                : 'Lembretes da Palavra, oração e novidades.'
            }
            badge={
              notificationLoading
                ? 'Carregando'
                : isSubscribed
                  ? 'Ativo'
                  : 'Inativo'
            }
          >
            <NotificationSettings
              isSubscribed={isSubscribed}
              loading={notificationLoading}
              onToggle={handleToggleNotifications}
            />
          </SettingsSection>

          <SettingsSection
            sectionKey="privacy"
            openSection={openSection}
            onToggle={handleToggleSection}
            icon="🔒"
            title="Privacidade e segurança"
            subtitle="Termos, dados locais e proteção da conta."
          >
            <PrivacySecuritySettings onClearLocalCache={clearLocalCache} />
          </SettingsSection>

          <SettingsSection
            sectionKey="billing"
            openSection={openSection}
            onToggle={handleToggleSection}
            icon="⭐"
            title="Assinatura e cobrança"
            subtitle={
              isPremium
                ? 'Seu plano premium está ativo.'
                : 'Plano gratuito ativo.'
            }
            badge={planLabel}
          >
            <BillingSettings isPremium={isPremium} />
          </SettingsSection>

          <SettingsSection
            sectionKey="help"
            openSection={openSection}
            onToggle={handleToggleSection}
            icon="💬"
            title="Ajuda e contato"
            subtitle="Suporte, dúvidas e canais oficiais."
          >
            <HelpSettings onContact={handleContactSupport} />
          </SettingsSection>

          <SettingsSection
            sectionKey="technical"
            openSection={openSection}
            onToggle={handleToggleSection}
            icon="🛠️"
            title="Status técnico"
            subtitle="Informações de instalação, PWA e dispositivo."
          >
            <TechnicalStatusSettings
              appVersion="1.0.0"
              isSubscribed={isSubscribed}
              onCopyVersion={handleCopyVersion}
            />
          </SettingsSection>
        </div>
      </div>
    </div>
  )
}



