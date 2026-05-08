import type { Metadata } from 'next'

import LegalBackButton from '@/components/legal/LegalBackButton'

export const metadata: Metadata = {
  title: 'Termos de Assinatura e Cobrança | Djeone Martins App',
  description:
    'Termos de assinatura, cobrança, premium, contribuição voluntária e cancelamento do Djeone Martins App.',
}

export default function TermosDeAssinaturaECobrancaPage() {
  return (
    <main className="min-h-screen bg-[#0b1020] px-5 py-10 text-white">
      <section className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl sm:p-10">
        <LegalBackButton />
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-amber-300">
          Djeone Martins App
        </p>

        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Termos de Assinatura e Cobrança
        </h1>

        <p className="mt-4 text-sm leading-7 text-slate-300">
          Última atualização: 08 de maio de 2026.
        </p>

        <div className="mt-8 space-y-8 text-sm leading-7 text-slate-200">
          <section>
            <h2 className="text-xl font-semibold text-white">1. Finalidade destes termos</h2>
            <p className="mt-3">
              Estes termos explicam as regras aplicáveis a recursos pagos, assinatura
              premium, cobrança, cancelamento, contribuição voluntária e ofertas dentro
              do Djeone Martins App.
            </p>
            <p className="mt-3">
              No momento, o app pode funcionar sem assinatura premium ativa. Esta página
              existe para deixar a base jurídica e operacional preparada para recursos
              futuros.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">2. Diferença entre assinatura e contribuição</h2>
            <p className="mt-3">
              A assinatura premium, quando disponível, será uma contratação de acesso a
              recursos digitais específicos, como conteúdos, séries, planos ou funções
              adicionais.
            </p>
            <p className="mt-3">
              A contribuição ministerial, oferta ou doação voluntária terá natureza
              diferente: será uma contribuição espontânea para apoio do ministério,
              projetos, ações missionárias ou manutenção da obra, sem promessa obrigatória
              de benefício digital individual.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">3. Assinatura premium futura</h2>
            <p className="mt-3">
              Caso o app ofereça assinatura premium, o usuário será informado de forma
              clara sobre preço, periodicidade, benefícios incluídos, forma de pagamento,
              renovação, cancelamento e eventuais limitações antes da contratação.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">4. Cobrança e renovação</h2>
            <p className="mt-3">
              Quando houver assinatura recorrente, a cobrança poderá ocorrer conforme o
              plano escolhido pelo usuário. A renovação, quando aplicável, seguirá as
              condições apresentadas no momento da contratação e as regras da plataforma
              de pagamento ou loja de aplicativos utilizada.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">5. Cancelamento</h2>
            <p className="mt-3">
              O usuário poderá cancelar a assinatura conforme o método de contratação.
              Se a assinatura for feita pela loja de aplicativos, o cancelamento deverá
              seguir as regras e ferramentas da própria loja. Se for feita por outro
              meio autorizado, o cancelamento seguirá as instruções informadas no app ou
              no checkout.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">6. Reembolsos</h2>
            <p className="mt-3">
              Reembolsos, quando aplicáveis, dependerão das regras da loja, gateway,
              plataforma de pagamento ou legislação aplicável. O app poderá avaliar
              solicitações de forma administrativa quando a contratação não tiver sido
              processada diretamente por uma loja de aplicativos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">7. Alterações de preço ou benefícios</h2>
            <p className="mt-3">
              Planos, preços e benefícios poderão ser alterados no futuro. Quando houver
              mudança relevante, o usuário será informado pelos canais disponíveis, de
              acordo com a legislação aplicável e as regras da plataforma utilizada.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">8. Conteúdos gratuitos e pagos</h2>
            <p className="mt-3">
              O app poderá oferecer conteúdos gratuitos e conteúdos pagos. A existência
              de recursos premium não impede que o app continue oferecendo conteúdos
              devocionais gratuitos, conforme a visão ministerial da plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">9. Contribuições para projetos</h2>
            <p className="mt-3">
              Projetos ministeriais, campanhas, missões ou contribuições específicas
              poderão ter informações próprias, como objetivo, descrição, meta,
              atualizações e prestação de contas, quando esse módulo estiver disponível.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">10. Contato</h2>
            <p className="mt-3">
              Para dúvidas sobre assinatura, cobrança, cancelamento, contribuição ou
              oferta, utilize os canais oficiais de contato informados no app.
            </p>
          </section>
        </div>
      </section>
    </main>
  )
}

