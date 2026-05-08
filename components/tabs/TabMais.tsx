'use client'

type TabMaisProps = {
  onOpenSeries?: () => void
  onOpenOferta?: () => void
  settingsOpenToken?: number
}

type FeatureAccent = 'blue' | 'gold' | 'purple' | 'green' | 'red'

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
            title="Assinatura"
            subtitle="Podcasts premium e recursos avançados ficarão disponíveis quando a área premium for ativada."
            icon="⭐"
            badge="Premium"
            accent="purple"
            disabled
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
    </div>
  )
}


