import type { Metadata } from 'next'

import DeleteAccountRequestForm from '@/components/legal/DeleteAccountRequestForm'
import LegalBackButton from '@/components/legal/LegalBackButton'

export const metadata: Metadata = {
  title: 'Excluir Conta | Djeone Martins App',
  description:
    'Página para solicitação de exclusão de conta e dados associados no Djeone Martins App.',
}

export default function ExcluirContaPage() {
  return (
    <main className="min-h-screen bg-[#0b1020] px-5 py-10 text-white">
      <section className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl sm:p-10">
        <LegalBackButton />

        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-amber-300">
          Djeone Martins App
        </p>

        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Solicitar exclusão de conta
        </h1>

        <p className="mt-4 text-sm leading-7 text-slate-300">
          Última atualização: 08 de maio de 2026.
        </p>

        <div className="mt-8 space-y-8 text-sm leading-7 text-slate-200">
          <section>
            <h2 className="text-xl font-semibold text-white">
              1. Sobre esta solicitação
            </h2>
            <p className="mt-3">
              Esta página permite solicitar a exclusão da sua conta e dos dados
              pessoais associados ao Djeone Martins App, conforme aplicável.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">
              2. O que pode ser excluído
            </h2>
            <p className="mt-3">
              A solicitação poderá envolver dados de perfil, preferências,
              interações, favoritos, pedidos de oração vinculados à conta e
              outros registros associados ao usuário, respeitando obrigações
              legais, registros técnicos necessários e limitações operacionais.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">
              3. Importante antes de solicitar
            </h2>
            <p className="mt-3">
              A exclusão da conta pode remover acesso a conteúdos, preferências,
              histórico e recursos personalizados. Algumas informações poderão
              ser mantidas temporariamente quando necessário para segurança,
              prevenção de abuso, cumprimento legal ou registro administrativo.
            </p>
          </section>
        </div>

        <DeleteAccountRequestForm />
      </section>
    </main>
  )
}
