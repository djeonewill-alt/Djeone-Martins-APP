import type { Metadata } from 'next'

import LegalBackButton from '@/components/legal/LegalBackButton'

export const metadata: Metadata = {
  title: 'Termos de Uso | Djeone Martins App',
  description:
    'Termos de Uso do Djeone Martins App, plataforma cristã de devocional diário, oração, leitura bíblica e discipulado.',
}

export default function TermosDeUsoPage() {
  return (
    <main className="min-h-screen bg-[#0b1020] px-5 py-10 text-white">
      <section className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl sm:p-10">
        <LegalBackButton />
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-amber-300">
          Djeone Martins App
        </p>

        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Termos de Uso
        </h1>

        <p className="mt-4 text-sm leading-7 text-slate-300">
          Última atualização: 08 de maio de 2026.
        </p>

        <div className="mt-8 space-y-8 text-sm leading-7 text-slate-200">
          <section>
            <h2 className="text-xl font-semibold text-white">1. Aceitação dos termos</h2>
            <p className="mt-3">
              Ao acessar ou utilizar o Djeone Martins App, o usuário declara estar de
              acordo com estes Termos de Uso e com a Política de Privacidade. Caso não
              concorde, deverá interromper o uso da plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">2. Finalidade do app</h2>
            <p className="mt-3">
              O Djeone Martins App é uma plataforma cristã de conteúdo devocional,
              leitura bíblica, oração, discipulado, ensino, vídeos, séries, projetos
              ministeriais e recursos futuros de assinatura ou contribuição.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">3. Conta do usuário</h2>
            <p className="mt-3">
              Para acessar determinados recursos, o usuário poderá precisar criar uma
              conta. O usuário é responsável por manter seus dados corretos e por
              proteger o acesso à sua conta.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">4. Uso adequado da plataforma</h2>
            <p className="mt-3">
              O usuário se compromete a não publicar conteúdos ofensivos, ilegais,
              abusivos, difamatórios, discriminatórios, violentos, enganosos, invasivos
              à privacidade de terceiros ou incompatíveis com a finalidade cristã e
              ministerial da plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">5. Mural e pedidos de oração</h2>
            <p className="mt-3">
              O usuário deve ter cuidado ao publicar pedidos de oração, especialmente
              quando envolver dados pessoais, familiares, terceiros, saúde, situações
              financeiras, conflitos ou informações sensíveis. A plataforma poderá
              moderar, ocultar, revisar ou remover conteúdos inadequados.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">6. Conteúdo pastoral e limitações</h2>
            <p className="mt-3">
              Os conteúdos do app possuem finalidade devocional, bíblica, pastoral e
              educativa. Eles não substituem atendimento médico, psicológico, jurídico,
              financeiro ou qualquer outro acompanhamento profissional especializado.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">7. Contribuições e assinatura futura</h2>
            <p className="mt-3">
              O app poderá oferecer recursos de contribuição ministerial voluntária,
              projetos missionários, ofertas, conteúdos premium ou assinatura futura.
              As condições específicas serão apresentadas de forma clara quando esses
              recursos estiverem disponíveis.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">8. Propriedade intelectual</h2>
            <p className="mt-3">
              Textos, áudios, vídeos, imagens, identidade visual, organização de
              conteúdo e demais materiais do app pertencem aos seus respectivos
              titulares e não podem ser copiados, redistribuídos ou explorados sem
              autorização.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">9. Suspensão ou remoção de acesso</h2>
            <p className="mt-3">
              A plataforma poderá limitar, suspender ou encerrar o acesso de usuários
              que violem estes termos, comprometam a segurança do app ou utilizem os
              recursos de forma abusiva.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">10. Alterações nos termos</h2>
            <p className="mt-3">
              Estes Termos de Uso poderão ser atualizados para refletir mudanças no
              app, novas funcionalidades, regras de loja, exigências legais ou ajustes
              operacionais.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">11. Contato</h2>
            <p className="mt-3">
              Para dúvidas sobre estes Termos de Uso, utilize os canais oficiais de
              contato informados no app.
            </p>
          </section>
        </div>
      </section>
    </main>
  )
}

