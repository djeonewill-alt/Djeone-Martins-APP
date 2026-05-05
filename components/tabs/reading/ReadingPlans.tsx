import { READING_PLANS } from './planUtils'
import type { ReadingState } from './types'

type ReadingPlansProps = {
  state: ReadingState
  onStartPlan: (planId: string) => void
}

const planVisuals: Record<string, { badge: string; gradient: string; accent: string }> = {
  'john-21': {
    badge: 'João',
    gradient: 'from-blue-500/20 via-cyan-500/10 to-slate-950',
    accent: 'text-cyan-200',
  },
  'acts-28': {
    badge: 'Atos',
    gradient: 'from-indigo-500/20 via-blue-500/10 to-slate-950',
    accent: 'text-blue-200',
  },
  'proverbs-31': {
    badge: 'Sabedoria',
    gradient: 'from-yellow-500/20 via-amber-500/10 to-slate-950',
    accent: 'text-yellow-200',
  },
  'psalms-60': {
    badge: 'Oração',
    gradient: 'from-emerald-500/15 via-blue-500/10 to-slate-950',
    accent: 'text-emerald-200',
  },
  'nt-90': {
    badge: 'Novo',
    gradient: 'from-purple-500/20 via-blue-500/10 to-slate-950',
    accent: 'text-purple-200',
  },
  'bible-365': {
    badge: 'Completo',
    gradient: 'from-blue-500/20 via-yellow-500/10 to-slate-950',
    accent: 'text-yellow-100',
  },
}

export default function ReadingPlans({
  state,
  onStartPlan,
}: ReadingPlansProps) {
  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-slate-900/80 p-5 shadow-[0_22px_70px_rgba(0,0,0,0.32)]">
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-blue-500/20 blur-3xl" />

        <div className="relative">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-300">
            Planos gratuitos
          </p>

          <h2 className="mt-2 text-3xl font-black tracking-[-0.06em]">
            Escolha sua jornada
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Comece com um plano pronto. Depois do lançamento, teremos planos personalizados para assinantes.
          </p>
        </div>
      </section>

      <div className="space-y-4">
        {READING_PLANS.map((plan) => {
          const isActive = state.activePlanId === plan.id
          const visual = planVisuals[plan.id] || planVisuals['john-21']

          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => onStartPlan(plan.id)}
              className={
                isActive
                  ? `relative w-full overflow-hidden rounded-[30px] border border-blue-300/25 bg-gradient-to-br ${visual.gradient} p-5 text-left shadow-[0_20px_60px_rgba(37,99,235,0.18)]`
                  : `relative w-full overflow-hidden rounded-[30px] border border-white/10 bg-gradient-to-br ${visual.gradient} p-5 text-left shadow-[0_16px_45px_rgba(0,0,0,0.22)]`
              }
            >
              <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-white/8 blur-3xl" />

              <div className="relative">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${visual.accent}`}>
                      {visual.badge}
                    </p>

                    <h3 className="mt-1 text-xl font-black leading-tight tracking-[-0.04em] text-white">
                      {plan.title}
                    </h3>
                  </div>

                  <span className="shrink-0 rounded-full border border-white/10 bg-slate-950/50 px-3 py-1 text-xs font-black text-blue-100">
                    {plan.days}d
                  </span>
                </div>

                <p className="text-sm leading-relaxed text-slate-400">
                  {plan.subtitle}
                </p>

                <div
                  className={
                    isActive
                      ? 'mt-5 rounded-2xl border border-blue-300/20 bg-blue-500/15 px-4 py-3 text-center text-sm font-black text-blue-100'
                      : 'mt-5 rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 text-center text-sm font-black text-white'
                  }
                >
                  {isActive ? 'Plano ativo' : 'Começar plano'}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <section className="rounded-[30px] border border-yellow-300/15 bg-gradient-to-br from-yellow-500/10 via-slate-900/80 to-slate-950 p-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-200">
          Premium futuro
        </p>

        <h2 className="mt-2 text-xl font-black">
          Plano personalizado
        </h2>

        <p className="mt-2 text-sm leading-relaxed text-yellow-50/70">
          Depois do lançamento, assinantes poderão criar planos por livro, tempo disponível por dia e ritmo de leitura.
        </p>
      </section>
    </div>
  )
}
