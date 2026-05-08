'use client'

import { useRouter } from 'next/navigation'

import SettingsOptionItem from './SettingsOptionItem'

type PrivacySecuritySettingsProps = {
  onClearLocalCache: () => void
}

export default function PrivacySecuritySettings({
  onClearLocalCache,
}: PrivacySecuritySettingsProps) {
  const router = useRouter()

  return (
    <>
      <SettingsOptionItem
        icon="🔒"
        title="Política de privacidade"
        subtitle="Entenda como seus dados são tratados dentro do aplicativo."
        onClick={() => router.push('/politica-de-privacidade')}
      />

      <SettingsOptionItem
        icon="📜"
        title="Termos de uso"
        subtitle="Leia as condições gerais de uso do aplicativo."
        onClick={() => router.push('/termos-de-uso')}
      />

      <SettingsOptionItem
        icon="💳"
        title="Termos de assinatura e cobrança"
        subtitle="Entenda regras futuras de premium, cobrança, cancelamento e contribuição."
        onClick={() => router.push('/termos-de-assinatura-e-cobranca')}
      />

      <SettingsOptionItem
        icon="📄"
        title="Solicitar cópia dos meus dados"
        subtitle="Registre uma solicitação para receber uma cópia dos dados associados à sua conta."
        onClick={() => router.push('/solicitar-dados')}
      />

      <SettingsOptionItem
        icon="🗑️"
        title="Excluir minha conta"
        subtitle="Solicite a exclusão da sua conta e dos dados associados."
        onClick={() => router.push('/excluir-conta')}
        danger
      />

      <SettingsOptionItem
        icon="🧹"
        title="Limpar dados locais"
        subtitle="Remove dados salvos apenas neste dispositivo."
        onClick={onClearLocalCache}
        danger
      />
    </>
  )
}
