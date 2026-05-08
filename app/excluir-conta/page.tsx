import type { Metadata } from 'next'

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
            <h2 className="text-xl font-semibold text-white">1. Sobre esta página</h2>
            <p className="mt-3">
              Esta página existe para permitir que usuários do Djeone Martins App
              solicitem a exclusão da conta e dos dados pessoais associados, conforme
              aplicável.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">2. O que pode ser excluído</h2>
            <p className="mt-3">
              A solicitação poderá envolver dados de perfil, preferências, interações,
              favoritos, pedidos de oração vinculados à conta e outros registros
              associados ao usuário, respeitando obrigações legais, registros técnicos
              necessários e limitações operacionais.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">3. Antes de solicitar</h2>
            <p className="mt-3">
              A exclusão da conta pode remover acesso a conteúdos, preferências,
              histórico e recursos personalizados. Algumas informações poderão ser
              mantidas temporariamente quando necessário para segurança, prevenção de
              abuso, cumprimento legal ou registro administrativo.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">4. Como solicitar</h2>
            <p className="mt-3">
              No momento, a solicitação deve ser feita pelos canais oficiais de contato
              informados no app. Informe o e-mail usado na conta e escreva no assunto:
              Solicitação de exclusão de conta.
            </p>
            <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-5 text-amber-100">
              <p className="font-semibold">Modelo de mensagem:</p>
              <p className="mt-3">
                Olá, desejo solicitar a exclusão da minha conta no Djeone Martins App.
                Meu e-mail de cadastro é: [informe seu e-mail].
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">5. Próxima etapa técnica</h2>
            <p className="mt-3">
              Futuramente, esta página poderá ter um formulário automático integrado ao
              banco de dados, gerando uma solicitação interna para análise e
              processamento pelo administrador.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">6. Contato</h2>
            <p className="mt-3">
              Para solicitar exclusão de conta, utilize os canais oficiais de contato
              informados no app.
            </p>
          </section>
        </div>
      </section>
    </main>
  )
}

