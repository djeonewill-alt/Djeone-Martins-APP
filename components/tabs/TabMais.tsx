'use client'

import { FormEvent, useState } from 'react'
import { supabase } from '@/lib/supabase'

type TabMaisProps = {
  onOpenSeries?: () => void
  onOpenOferta?: () => void
  settingsOpenToken?: number
}

type FeatureAccent = 'blue' | 'gold' | 'purple' | 'green' | 'red'

const premiumInterestAreas = [
  'Vida devocional',
  'Oração',
  'Medo, ansiedade e desânimo',
  'Família e casamento',
  'Leitura bíblica',
  'Fortalecimento espiritual',
  'Batalha espiritual',
  'Chamado e ministério',
]

type MoreFeatureCardProps = {
  title: string
  subtitle: string
  icon: string
  badge?: string
  accent?: FeatureAccent
  disabled?: boolean
  onClick?: () => void
}

function getAccentClasses(accent: FeatureAccent = 'blue') {
  const accents: Record<FeatureAccent, string> = {
    blue: 'border-blue-300/20 bg-blue-500/10 text-blue-100',
    gold: 'border-amber-300/20 bg-amber-500/10 text-amber-100',
    purple: 'border-purple-300/20 bg-purple-500/10 text-purple-100',
    green: 'border-emerald-300/20 bg-emerald-500/10 text-emerald-100',
    red: 'border-red-300/20 bg-red-500/10 text-red-100',
  }

  return accents[accent]
}

function MoreFeatureCard({
  title,
  subtitle,
  icon,
  badge,
  accent = 'blue',
  disabled = false,
  onClick,
}: MoreFeatureCardProps) {
  const accentClasses = getAccentClasses(accent)

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="group w-full rounded-[30px] border border-white/10 bg-slate-900/70 p-5 text-left shadow-2xl shadow-black/20 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <div className="flex items-start gap-4">
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] border text-2xl ${accentClasses}`}
        >
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-black tracking-[-0.045em] text-white">
              {title}
            </h3>

            {badge && (
              <span className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${accentClasses}`}>
                {badge}
              </span>
            )}
          </div>

          <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
            {subtitle}
          </p>
        </div>
      </div>
    </button>
  )
}

type TesterCenterPreviewProps = {
  onBack: () => void
}

type TesterMissionFlow = 'idle' | 'started' | 'postponed' | 'completed'

function TesterCenterPreview({ onBack }: TesterCenterPreviewProps) {
  const [missionFlow, setMissionFlow] = useState<TesterMissionFlow>('idle')

  const futureMissionAreas = [
    'Aba Hoje',
    'Aba Oração',
    'Aba Você',
    'Aba Leitura',
    'Configurações',
    'Notificações',
  ]

  return (
    <div className="min-h-screen bg-slate-950 px-5 pb-32 pt-4 text-white">
      <div className="mx-auto max-w-2xl">
        <button
          type="button"
          onClick={onBack}
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-black text-slate-200 active:scale-[0.98]"
        >
          <span aria-hidden="true">←</span>
          Voltar para Mais
        </button>

        <section className="overflow-hidden rounded-[34px] border border-purple-300/20 bg-gradient-to-br from-slate-900 via-slate-950 to-purple-950/40 p-6 shadow-2xl shadow-purple-950/20">
          <div className="inline-flex rounded-full border border-purple-300/20 bg-purple-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-purple-100">
            Beta fechado
          </div>

          <h1 className="mt-4 text-4xl font-black leading-[0.95] tracking-[-0.075em] text-white">
            Central do Testador
          </h1>

          <p className="mt-4 text-sm font-semibold leading-6 text-slate-300">
            Cada missão será criada a partir de um diagnóstico real do app. Assim, o testador recebe instruções claras: onde entrar, onde tocar, o que observar e como relatar.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-2xl font-black text-white">1</p>
              <p className="mt-1 text-xs font-bold leading-5 text-slate-400">
                Veja o tempo estimado.
              </p>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-2xl font-black text-white">2</p>
              <p className="mt-1 text-xs font-bold leading-5 text-slate-400">
                Siga o passo a passo.
              </p>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-2xl font-black text-white">3</p>
              <p className="mt-1 text-xs font-bold leading-5 text-slate-400">
                Marque o resultado.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-4">
          <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-200">
                  Missão 01 · Áudio
                </p>

                <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-white">
                  Testar o áudio de um episódio do Salmo 23
                </h2>
              </div>

              <span className="shrink-0 rounded-full border border-purple-300/20 bg-purple-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-purple-100">
                7 min
              </span>
            </div>

            <p className="mt-3 text-sm font-semibold leading-6 text-slate-400">
              Esta missão verifica se o episódio abre corretamente, se o áudio toca no seu aparelho, se os controles do player funcionam e se a legenda sincronizada aparece sem travar a tela.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-blue-300/20 bg-blue-500/10 px-3 py-2 text-xs font-black text-blue-100">
                Podcasts
              </span>

              <span className="rounded-full border border-emerald-300/20 bg-emerald-500/10 px-3 py-2 text-xs font-black text-emerald-100">
                Salmo 23
              </span>

              <span className="rounded-full border border-amber-300/20 bg-amber-500/10 px-3 py-2 text-xs font-black text-amber-100">
                Tempo estimado: 7 minutos
              </span>
            </div>

            {missionFlow === 'idle' && (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setMissionFlow('started')}
                  className="rounded-2xl bg-purple-600 px-5 py-4 text-sm font-black text-white shadow-xl shadow-purple-950/30 active:scale-[0.98]"
                >
                  Tenho esse tempo. Começar agora
                </button>

                <button
                  type="button"
                  onClick={() => setMissionFlow('postponed')}
                  className="rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-sm font-black text-slate-100 active:scale-[0.98]"
                >
                  Deixar para depois
                </button>
              </div>
            )}

            {missionFlow === 'started' && (
              <div className="mt-5 space-y-4">
                <div className="rounded-[24px] border border-blue-300/20 bg-blue-500/10 p-4">
                  <p className="text-sm font-black text-blue-100">
                    Antes de começar
                  </p>

                  <ul className="mt-3 space-y-2 text-sm font-semibold leading-6 text-blue-50/85">
                    <li>• Faça o teste no aparelho que você realmente usa para acessar o app.</li>
                    <li>• Se possível, deixe o volume do celular audível.</li>
                    <li>• Se estiver no iPhone, teste do jeito que você normalmente abre o app: Safari ou app instalado na tela inicial.</li>
                  </ul>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-sm font-black text-white">
                    Passo a passo
                  </p>

                  <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm font-semibold leading-6 text-slate-300">
                    <li>Entre na aba <strong>Mais</strong>.</li>
                    <li>Toque em <strong>Podcasts devocionais</strong>.</li>
                    <li>Abra a série <strong>Salmo 23</strong>.</li>
                    <li>Na tela da série, procure a seção <strong>Episódios</strong>.</li>
                    <li>Toque em qualquer episódio liberado da série.</li>
                    <li>Confira se abriu a tela do episódio com capa, título, referência bíblica e descrição.</li>
                    <li>Toque em <strong>← Voltar aos episódios</strong>.</li>
                    <li>Abra novamente o mesmo episódio.</li>
                    <li>Toque no botão azul de <strong>play</strong>.</li>
                    <li>Aguarde o áudio começar e observe se o tempo atual começa a andar.</li>
                    <li>Toque novamente no botão para pausar.</li>
                    <li>Toque outra vez para continuar.</li>
                    <li>Use o botão <strong>+15s</strong> para avançar.</li>
                    <li>Use o botão <strong>−15s</strong> para voltar.</li>
                    <li>Arraste a barra de progresso para outro ponto do áudio.</li>
                    <li>Se aparecer <strong>Legenda sincronizada</strong>, toque em <strong>Ocultar</strong> e depois em <strong>Mostrar</strong>.</li>
                    <li>Volte para a lista de episódios e confira se o app não travou.</li>
                  </ol>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-4">
                  <p className="text-sm font-black text-white">
                    O que observar
                  </p>

                  <ul className="mt-3 space-y-2 text-sm font-semibold leading-6 text-slate-300">
                    <li>• O episódio abriu sem tela branca ou travamento?</li>
                    <li>• O áudio começou depois de tocar no play?</li>
                    <li>• O botão mudou de play para pausa?</li>
                    <li>• O tempo atual e o tempo total apareceram corretamente?</li>
                    <li>• A barra de progresso respondeu ao toque?</li>
                    <li>• Os botões +15s e −15s funcionaram?</li>
                    <li>• A legenda sincronizada apareceu, ocultou e mostrou novamente?</li>
                    <li>• No seu aparelho, especialmente iPhone/Safari, o som saiu normalmente?</li>
                    <li>• Ao voltar para os episódios, o app continuou estável?</li>
                  </ul>
                </div>

                <div className="rounded-[24px] border border-emerald-300/20 bg-emerald-500/10 p-4">
                  <p className="text-sm font-black text-emerald-100">
                    Como responder
                  </p>

                  <div className="mt-4 grid gap-3">
                    <button
                      type="button"
                      onClick={() => setMissionFlow('completed')}
                      className="rounded-2xl bg-emerald-600 px-4 py-3 text-left text-xs font-black text-white active:scale-[0.98]"
                    >
                      Funcionou — consegui abrir o episódio, tocar, pausar, avançar, voltar e usar a legenda sem problema.
                    </button>

                    <button
                      type="button"
                      onClick={() => setMissionFlow('completed')}
                      className="rounded-2xl bg-red-600 px-4 py-3 text-left text-xs font-black text-white active:scale-[0.98]"
                    >
                      Deu problema — o áudio não tocou, travou, ficou sem som, a tela quebrou ou algum controle não funcionou.
                    </button>

                    <button
                      type="button"
                      onClick={() => setMissionFlow('completed')}
                      className="rounded-2xl bg-amber-600 px-4 py-3 text-left text-xs font-black text-white active:scale-[0.98]"
                    >
                      Não entendi — não soube onde clicar, não encontrei a série, não entendi o player ou fiquei confuso em algum passo.
                    </button>
                  </div>
                </div>
              </div>
            )}

            {missionFlow === 'postponed' && (
              <div className="mt-5 rounded-[24px] border border-amber-300/20 bg-amber-500/10 p-4">
                <p className="text-sm font-black text-amber-100">
                  Missão deixada para depois
                </p>

                <p className="mt-2 text-sm font-semibold leading-6 text-amber-50/80">
                  Futuramente, quando as notificações push estiverem ativas, o app poderá lembrar você de continuar suas missões pendentes.
                </p>

                <button
                  type="button"
                  onClick={() => setMissionFlow('idle')}
                  className="mt-4 rounded-2xl border border-white/10 bg-slate-950 px-5 py-3 text-xs font-black text-slate-100 active:scale-[0.98]"
                >
                  Voltar para a missão
                </button>
              </div>
            )}

            {missionFlow === 'completed' && (
              <div className="mt-5 rounded-[24px] border border-emerald-300/20 bg-emerald-500/10 p-4">
                <p className="text-sm font-black text-emerald-100">
                  Missão concluída
                </p>

                <p className="mt-2 text-sm font-semibold leading-6 text-emerald-50/80">
                  Obrigado. Quando conectarmos ao banco, sua resposta será salva junto com aparelho, sistema, horário e relato, caso exista problema ou dúvida.
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setMissionFlow('idle')}
                    className="rounded-2xl bg-emerald-600 px-5 py-3 text-xs font-black text-white active:scale-[0.98]"
                  >
                    Revisar missão
                  </button>

                  <button
                    type="button"
                    onClick={() => setMissionFlow('postponed')}
                    className="rounded-2xl border border-white/10 bg-slate-950 px-5 py-3 text-xs font-black text-slate-100 active:scale-[0.98]"
                  >
                    Parar por enquanto
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
              Próximas missões
            </p>

            <h3 className="mt-2 text-xl font-black tracking-[-0.04em] text-white">
              Serão criadas após diagnóstico
            </h3>

            <p className="mt-3 text-sm font-semibold leading-6 text-slate-400">
              Para evitar tarefas genéricas, cada missão abaixo será escrita somente depois de analisarmos a tela, botões, menus, rotas e ações reais disponíveis.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {futureMissionAreas.map((area) => (
                <span
                  key={area}
                  className="rounded-full border border-white/10 bg-slate-950 px-3 py-2 text-xs font-black text-slate-200"
                >
                  {area}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-amber-300/20 bg-amber-500/10 p-5">
            <p className="text-sm font-black text-amber-100">
              Ainda visual
            </p>

            <p className="mt-2 text-sm font-semibold leading-6 text-amber-50/80">
              Esta missão ainda não salva dados. Na próxima fase vamos conectar status, relatos, tempo estimado e missões pendentes ao Supabase.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
export default function TabMais({
  onOpenSeries,
  onOpenOferta,
  settingsOpenToken: _settingsOpenToken,
}: TabMaisProps) {
  const [showPremiumInterest, setShowPremiumInterest] = useState(false)
  const [showTesterCenter, setShowTesterCenter] = useState(false)
  const [selectedArea, setSelectedArea] = useState(premiumInterestAreas[0])
  const [note, setNote] = useState('')
  const [savingInterest, setSavingInterest] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSubmitPremiumInterest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      setSavingInterest(true)
      setMessage('')

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) throw userError

      if (!user) {
        setMessage('Entre na sua conta para registrar seu interesse.')
        return
      }

      const { error } = await supabase.from('premium_interest').insert({
        auth_user_id: user.id,
        area: selectedArea,
        note: note.trim() || null,
        source: 'tab_mais_jornadas_premium',
      })

      if (error) throw error

      alert('Obrigado por compartilhar seu interesse! Isso vai nos ajudar a preparar jornadas que realmente sirvam a caminhada das pessoas com Deus.')
      setShowPremiumInterest(false)
      setSelectedArea(premiumInterestAreas[0])
      setNote('')
      setMessage('')
    } catch (error) {
      console.error('Erro ao registrar interesse premium:', error)
      setMessage('Não foi possível registrar seu interesse agora. Tente novamente em instantes.')
    } finally {
      setSavingInterest(false)
    }
  }

  if (showTesterCenter) {
    return <TesterCenterPreview onBack={() => setShowTesterCenter(false)} />
  }
  return (
    <div className="min-h-screen bg-slate-950 px-5 pb-32 pt-4 text-white">
      <div className="mx-auto max-w-2xl">
        <div className="mb-7">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-300">
            Mais
          </p>

          <h1 className="mt-2 text-4xl font-black leading-[0.95] tracking-[-0.075em]">
            Explore o ministério
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Acesse podcasts, contribuições, projetos e recursos extras do app.
          </p>
        </div>

        <section className="space-y-4">
          <MoreFeatureCard
            title="Podcasts devocionais"
            subtitle="Ouça jornadas bíblicas, devocionais antigos e conteúdos organizados por tema."
            icon="🎧"
            badge="Ouvir"
            accent="blue"
            onClick={onOpenSeries}
          />

          <MoreFeatureCard
            title="Central do Testador Beta"
            subtitle="Ajude-nos a testar o app, cumprir missões e relatar problemas antes do lançamento oficial."
            icon="β"
            badge="Beta"
            accent="purple"
            onClick={() => setShowTesterCenter(true)}
          />

          <MoreFeatureCard
            title="Oferta"
            subtitle="Contribua voluntariamente com este projeto e ajude a Palavra a alcançar mais pessoas."
            icon="🤲"
            badge="Apoiar"
            accent="gold"
            onClick={onOpenOferta}
          />

          <MoreFeatureCard
            title="Vídeos"
            subtitle="Lives, estudos, replays e conteúdos em vídeo serão organizados aqui em breve."
            icon="▶️"
            badge="Em breve"
            accent="red"
            disabled
          />

          <MoreFeatureCard
            title="Missões e projetos"
            subtitle="Acompanhe projetos ministeriais, campanhas, transparência e relatórios futuros."
            icon="🌍"
            badge="Futuro"
            accent="green"
            disabled
          />

          <MoreFeatureCard
            title="Jornadas Premium"
            subtitle="Em breve: jornadas guiadas de oração, vida devocional, família, fortalecimento espiritual e aprofundamento bíblico."
            icon="⭐"
            badge="Quero ser avisado"
            accent="purple"
            onClick={() => setShowPremiumInterest(true)}
          />
        </section>

        <div className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm font-black text-white">
            Configurações ficam na engrenagem
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Minha conta, notificações, privacidade, assinatura e status técnico
            continuam acessíveis pelo ícone de engrenagem no topo do app.
          </p>
        </div>
      </div>
        {showPremiumInterest && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-4 pb-4 pt-10 backdrop-blur-sm sm:items-center sm:pb-10">
            <div className="w-full max-w-lg rounded-[32px] border border-white/10 bg-slate-950 p-5 text-white shadow-2xl shadow-black/40 ring-1 ring-white/10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-purple-200">
                    Jornadas Premium
                  </p>

                  <h2 className="mt-2 text-2xl font-black leading-none tracking-[-0.05em]">
                    Quero ser avisado
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-slate-400">
                    Ajude-nos a entender quais jornadas podem servir melhor sua caminhada com Deus.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPremiumInterest(false)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-900 text-lg font-black text-slate-200 active:scale-95"
                  aria-label="Fechar"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmitPremiumInterest} className="mt-5 space-y-4">
                <div>
                  <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-300">
                    Qual área você mais gostaria de fortalecer?
                  </label>

                  <select
                    value={selectedArea}
                    onChange={(event) => setSelectedArea(event.target.value)}
                    className="mt-2 min-h-12 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 text-sm font-bold text-white outline-none focus:border-purple-300/60"
                  >
                    {premiumInterestAreas.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-300">
                    O que você gostaria de encontrar nessa jornada? Opcional
                  </label>

                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    rows={4}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm font-semibold leading-6 text-white outline-none placeholder:text-slate-600 focus:border-purple-300/60"
                    placeholder="Ex.: uma rotina de oração, exercícios práticos, apoio para casamento, constância devocional..."
                  />
                </div>

                {message && (
                  <p className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-bold leading-5 text-slate-200">
                    {message}
                  </p>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setShowPremiumInterest(false)}
                    className="rounded-2xl border border-white/10 bg-slate-900 px-5 py-4 text-sm font-black text-slate-100 active:scale-[0.98]"
                  >
                    Agora não
                  </button>

                  <button
                    type="submit"
                    disabled={savingInterest}
                    className="rounded-2xl bg-purple-600 px-5 py-4 text-sm font-black text-white shadow-xl shadow-purple-950/30 active:scale-[0.98] disabled:opacity-60"
                  >
                    {savingInterest ? 'Salvando...' : 'Registrar interesse'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  )
}
