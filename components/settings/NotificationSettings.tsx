'use client'

import SettingsOptionItem from './SettingsOptionItem'

type NotificationSettingsProps = {
  isSubscribed: boolean
  loading: boolean
  onToggle: () => void
}

export default function NotificationSettings({
  isSubscribed,
  loading,
  onToggle,
}: NotificationSettingsProps) {
  return (
    <>
      <SettingsOptionItem
        icon="🔔"
        title={isSubscribed ? 'Desativar notificações' : 'Ativar notificações'}
        subtitle={
          isSubscribed
            ? 'Pare de receber lembretes neste dispositivo.'
            : 'Receba lembretes da Palavra do Dia, oração e novidades.'
        }
        badge={loading ? 'Carregando' : isSubscribed ? 'Ativo' : 'Inativo'}
        onClick={onToggle}
        disabled={loading}
      />

      <SettingsOptionItem
        icon="⏰"
        title="Horário dos lembretes"
        subtitle="Em breve você poderá escolher o melhor horário para receber os devocionais."
        badge="Em breve"
        disabled
      />

      <SettingsOptionItem
        icon="🎧"
        title="Novas séries e áudios"
        subtitle="Receba avisos quando novos conteúdos forem publicados."
        badge="Em breve"
        disabled
      />
    </>
  )
}
