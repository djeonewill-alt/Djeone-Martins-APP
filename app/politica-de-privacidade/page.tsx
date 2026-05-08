import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Política de Privacidade | Djeone Martins App',
  description:
    'Política de Privacidade do Djeone Martins App, plataforma cristã de devocional diário, oração, leitura bíblica e discipulado.',
}

export default function PoliticaDePrivacidadePage() {
  return (
    <main className="min-h-screen bg-[#0b1020] px-5 py-10 text-white">
      <section className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl sm:p-10">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-amber-300">
          Djeone Martins App
        </p>

        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Política de Privacidade
        </h1>

        <p className="mt-4 text-sm leading-7 text-slate-300">
          Última atualização: 08 de maio de 2026.
        </p>

        <div className="mt-8 space-y-8 text-sm leading-7 text-slate-200">
          <section>
            <h2 className="text-xl font-semibold text-white">1. Finalidade desta política</h2>
            <p className="mt-3">
              Esta Política de Privacidade explica como o Djeone Martins App coleta,
              utiliza, armazena e protege dados pessoais dos usuários. O app tem
              finalidade cristã, devocional e ministerial, oferecendo conteúdos como
              Palavra do Dia, áudio devocional, leitura bíblica, pedidos de oração,
              séries, vídeos, notificações e recursos futuros de discipulado.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">2. Dados que podemos coletar</h2>
            <p className="mt-3">
              Podemos coletar dados fornecidos diretamente pelo usuário, como nome,
              e-mail, telefone, data de nascimento, gênero, cidade, bairro e país.
              Também podemos tratar informações relacionadas ao uso do app, como
              favoritos, leitura bíblica, pedidos de oração, preferências de
              notificação, interações com conteúdos e status de assinatura futura.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">3. Pedidos de oração</h2>
            <p className="mt-3">
              Pedidos de oração podem conter informações pessoais ou sensíveis. Por
              isso, o usuário deve evitar publicar dados íntimos, dados de terceiros
              sem autorização, documentos, endereços, informações médicas detalhadas
              ou qualquer conteúdo que exponha outras pessoas indevidamente.
            </p>
            <p className="mt-3">
              O app poderá oferecer opções de pedido público ou privado, moderação,
              ocultação e denúncia de conteúdos inadequados.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">4. Como usamos os dados</h2>
            <p className="mt-3">
              Os dados são utilizados para identificar a conta do usuário, entregar
              conteúdos devocionais, salvar preferências, permitir recursos de oração,
              enviar notificações autorizadas, melhorar a experiência no app, proteger
              a segurança da plataforma e cumprir obrigações legais ou regulatórias.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">5. Notificações</h2>
            <p className="mt-3">
              O usuário poderá permitir ou bloquear notificações. Futuramente, o app
              poderá permitir a escolha de categorias, como devocional diário, oração,
              podcasts, vídeos, lives, eventos locais, missões, campanhas e comunicados
              importantes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">6. Compartilhamento de dados</h2>
            <p className="mt-3">
              Não vendemos dados pessoais dos usuários. Dados podem ser tratados por
              serviços técnicos necessários ao funcionamento do app, como autenticação,
              banco de dados, hospedagem, notificações, pagamentos futuros, análise
              técnica e segurança.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">7. Segurança</h2>
            <p className="mt-3">
              Utilizamos medidas técnicas e organizacionais para proteger os dados dos
              usuários. Ainda assim, nenhum sistema digital é absolutamente imune a
              falhas, ataques ou indisponibilidades. O usuário também deve proteger
              seu acesso, senha e dispositivo.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">8. Direitos do usuário</h2>
            <p className="mt-3">
              O usuário poderá solicitar acesso, correção, atualização ou exclusão de
              seus dados pessoais, conforme aplicável. Também poderá solicitar
              informações sobre o tratamento de dados e revogar permissões quando isso
              for tecnicamente possível.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">9. Exclusão de conta</h2>
            <p className="mt-3">
              O usuário poderá solicitar a exclusão da conta e dos dados associados por
              meio da página pública de exclusão de conta ou pelas configurações do app,
              quando essa função estiver disponível.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">10. Alterações nesta política</h2>
            <p className="mt-3">
              Esta Política de Privacidade poderá ser atualizada para refletir mudanças
              no app, novas funcionalidades, exigências legais ou ajustes de segurança.
              Quando necessário, os usuários poderão ser avisados dentro do app.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">11. Contato</h2>
            <p className="mt-3">
              Para dúvidas, solicitações ou pedidos relacionados à privacidade e dados
              pessoais, entre em contato pelos canais oficiais informados no app.
            </p>
          </section>
        </div>
      </section>
    </main>
  )
}
