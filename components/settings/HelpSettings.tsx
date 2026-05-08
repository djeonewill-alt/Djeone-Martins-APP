'use client'

import SettingsOptionItem from './SettingsOptionItem'

type HelpSettingsProps = {
  onContact: () => void
}

export default function HelpSettings({ onContact }: HelpSettingsProps) {
  return (
    <>
      <SettingsOptionItem
        icon="✉️"
        title="Falar com o ministério"
        subtitle="Envie uma mensagem para suporte, dúvidas ou testemunhos."
        onClick={onContact}
      />

      <SettingsOptionItem
        icon="🛠️"
        title="Relatar problema"
        subtitle="Informe erro de áudio, login, pagamento ou funcionamento do app."
        onClick={onContact}
      />

      <SettingsOptionItem
        icon="ℹ️"
        title="Sobre o app"
        subtitle="Conheça a visão do Devocional Diário e do ministério."
        badge="Em breve"
        disabled
      />
    </>
  )
}
