'use client'

import SettingsOptionItem from './SettingsOptionItem'

type BillingSettingsProps = {
  isPremium: boolean
  premiumExpiresAt?: string | null
}

export default function BillingSettings({
  isPremium,
  premiumExpiresAt,
}: BillingSettingsProps) {
  const planLabel = isPremium ? 'Premium' : 'Gratuito'

  const premiumText = premiumExpiresAt
    ? `Premium ativo até ${new Date(premiumExpiresAt).toLocaleDateString('pt-BR')}.`
    : 'Premium ativo.'

  return (
    <>
      <SettingsOptionItem
        icon="⭐"
        title="Plano atual"
        subtitle={
          isPremium
            ? premiumText
            : 'Você está usando a versão gratuita do aplicativo.'
        }
        badge={planLabel}
        disabled
      />

      <SettingsOptionItem
        icon="💳"
        title="Gerenciar assinatura"
        subtitle="Cancelar premium, restaurar assinatura ou alterar plano."
        badge="Em breve"
        disabled
      />

      <SettingsOptionItem
        icon="🧾"
        title="Histórico de pagamentos"
        subtitle="Consulte cobranças e recibos da assinatura."
        badge="Em breve"
        disabled
      />
    </>
  )
}
