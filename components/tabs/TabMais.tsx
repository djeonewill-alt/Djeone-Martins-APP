'use client'

import { FormEvent, useState } from 'react'
import { supabase } from '@/lib/supabase'
import TesterCenterPreview from '@/components/tester/TesterCenterPreview'

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
