'use client'

type TabMaisProps = {
  onOpenSeries?: () => void
  onOpenOferta?: () => void
}

function MoreFeatureCard({
  title,
  subtitle,
  icon,
  badge,
  accent = 'blue',
  onClick,
  disabled = false,
}: {
  title: string
  subtitle: string
  icon: string
  badge?: string
  accent?: 'blue' | 'gold' | 'green' | 'purple'
  onClick?: () => void
  disabled?: boolean
}) {
  const accentClass =
    accent === 'gold'
      ? 'from-yellow-500/14 via-slate-900/80 to-slate-950 border-yellow-300/15'
      : accent === 'green'
        ? 'from-emerald-500/12 via-slate-900/80 to-slate-950 border-emerald-300/15'
        : accent === 'purple'
          ? 'from-purple-500/14 via-slate-900/80 to-slate-950 border-purple-300/15'
          : 'from-blue-500/14 via-slate-900/80 to-slate-950 border-blue-300/15'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative w-full overflow-hidden rounded-[32px] border bg-gradient-to-br p-5 text-left shadow-[0_18px_55px_rgba(0,0,0,0.28)] active:scale-[0.99] disabled:opacity-70 ${accentClass}`}
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/10 blur-3xl" />

      <div className="relative flex items-start gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] border border-white/10 bg-white/[0.055] text-3xl">
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-xl font-black leading-tight tracking-[-0.05em] text-white">
              {title}
            </h3>

            {badge && (
              <span className="shrink-0 rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-blue-100">
                {badge}
              </span>
            )}
          </div>

          <p className="mt-2 text-sm leading-relaxed text-slate-400">
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
}: TabMaisProps) {
  return (
    <div className="min-h-screen bg-slate-950 px-5 pb-32 pt-20 text-white">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-300">
            Mais
          </p>

          <h1 className="mt-2 text-3xl font-black leading-tight tracking-[-0.06em]">
            Recursos e caminhos
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Acesse séries, ofertas, assinatura e ferramentas futuras do seu discipulado diário.
          </p>
        </div>

        <section className="relative mb-5 overflow-hidden rounded-[34px] border border-white/10 bg-slate-900/80 p-5 shadow-[0_22px_70px_rgba(0,0,0,0.35)]">
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">
              Central de recursos
            </p>

            <h2 className="mt-2 text-4xl font-black leading-none tracking-[-0.075em]">
              Continue crescendo
            </h2>

            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              Aqui ficam os recursos extras do app: séries antigas, contribuição, assinatura e configurações.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <MoreFeatureCard
            title="Séries"
            subtitle="Acesse devocionais antigos, jornadas temáticas e conteúdos premium."
            icon="🎧"
            badge="Catálogo"
            accent="blue"
            onClick={onOpenSeries}
          />

          <MoreFeatureCard
            title="Oferta"
            subtitle="Contribua com este projeto e ajude a Palavra a alcançar mais pessoas."
            icon="🤲"
            badge="Apoiar"
            accent="gold"
            onClick={onOpenOferta}
          />

          <MoreFeatureCard
            title="Assinatura"
            subtitle="Planos personalizados, séries premium e recursos avançados em breve."
            icon="⭐"
            badge="Premium"
            accent="purple"
            disabled
          />

          <MoreFeatureCard
            title="Configurações"
            subtitle="Preferências do app, conta, notificações e ajustes gerais."
            icon="⚙️"
            badge="Em breve"
            accent="green"
            disabled
          />
        </section>
      </div>
    </div>
  )
}
