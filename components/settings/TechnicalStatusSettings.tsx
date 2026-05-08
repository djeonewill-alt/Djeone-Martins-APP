'use client'

import SettingsOptionItem from './SettingsOptionItem'

type TechnicalStatusSettingsProps = {
  appVersion: string
  userEmail?: string | null
  isSubscribed: boolean
  onCopyVersion: () => void
}

export default function TechnicalStatusSettings({
  appVersion,
  userEmail,
  isSubscribed,
  onCopyVersion,
}: TechnicalStatusSettingsProps) {
  return (
    <>
      <SettingsOptionItem
        icon="📱"
        title="Versão do aplicativo"
        subtitle={`Djeone Martins App versão ${appVersion}`}
        badge="Copiar"
        onClick={onCopyVersion}
      />

      <SettingsOptionItem
        icon="✅"
        title="Status de login"
        subtitle={
          userEmail
            ? 'Sessão ativa neste dispositivo.'
            : 'Nenhuma sessão ativa encontrada.'
        }
        badge={userEmail ? 'Conectado' : 'Desconectado'}
        disabled
      />

      <SettingsOptionItem
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
    </>
  )
}
