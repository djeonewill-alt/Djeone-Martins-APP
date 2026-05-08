import type { Metadata } from 'next'

import DataExportRequestForm from '@/components/legal/DataExportRequestForm'
import LegalBackButton from '@/components/legal/LegalBackButton'

export const metadata: Metadata = {
  title: 'Solicitar Cópia dos Dados | Djeone Martins App',
  description:
    'Página para solicitação de cópia dos dados pessoais vinculados ao Djeone Martins App.',
}

export default function SolicitarDadosPage() {
  return (
    <main className="min-h-screen bg-[#0b1020] px-5 py-10 text-white">
      <section className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl sm:p-10">
        <LegalBackButton />

        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-amber-300">
          Djeone Martins App
        </p>

        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Solicitar cópia dos meus dados
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
              Esta página permite solicitar uma cópia dos dados pessoais
              associados à sua conta no Djeone Martins App, conforme aplicável.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">
              2. Quais dados podem ser incluídos
            </h2>
            <p className="mt-3">
              A cópia poderá incluir dados de perfil, preferências, interações,
              favoritos, pedidos de oração vinculados à conta e outros registros
              associados ao usuário, respeitando limitações técnicas, segurança e
              obrigações legais.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">
              3. Como o pedido será tratado
            </h2>
            <p className="mt-3">
              A solicitação será registrada para análise administrativa. Quando
              necessário, o ministério poderá confirmar sua identidade ou entrar
              em contato pelo e-mail informado antes de enviar qualquer dado.
            </p>
          </section>
        </div>

        <DataExportRequestForm />
      </section>
    </main>
  )
}
