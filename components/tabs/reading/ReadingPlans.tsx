import { READING_PLANS } from './planUtils'
import type { ReadingState } from './types'

type ReadingPlansProps = {
  state: ReadingState
  onStartPlan: (planId: string) => void
}

export default function ReadingPlans({
  state,
  onStartPlan,
}: ReadingPlansProps) {
  return (
    <div className="space-y-5">
      <section className="rounded-[30px] border border-white/10 bg-slate-900/80 p-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-300">
          Planos gratuitos
        </p>

        <h2 className="mt-2 text-2xl font-black tracking-[-0.04em]">
          Escolha sua jornada
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Comece com um plano pronto. Depois do lançamento, teremos planos personalizados para assinantes.
        </p>
      </section>

      <div className="space-y-3">
        {READING_PLANS.map((plan) => {
          const isActive = state.activePlanId === plan.id

          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => onStartPlan(plan.id)}
              className={
                isActive
                  ? 'w-full rounded-[26px] border border-blue-300/25 bg-blue-500/15 p-5 text-left'
                  : 'w-full rounded-[26px] border border-white/10 bg-slate-900/80 p-5 text-left'
              }
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-white">
                    {plan.title}
                  </h3>

                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    {plan.subtitle}
                  </p>
                </div>

                <span className="shrink-0 rounded-full border border-white/10 bg-slate-950/50 px-3 py-1 text-xs font-black text-blue-200">
                  {plan.days}d
                </span>
              </div>

              <div className="mt-4 rounded-2xl bg-slate-950/45 px-4 py-3 text-center text-sm font-black text-white">
                {isActive ? 'Plano ativo' : 'Começar plano'}
              </div>
            </button>
          )
        })}
      </div>

      <section className="rounded-[28px] border border-yellow-300/15 bg-yellow-500/10 p-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-200">
          Premium futuro
        </p>

        <h2 className="mt-2 text-lg font-black">
          Plano personalizado
        </h2>

        <p className="mt-2 text-sm leading-relaxed text-yellow-50/70">
          Depois do lançamento, assinantes poderão criar planos por livro, tempo disponível por dia e ritmo de leitura.
        </p>
      </section>
    </div>
  )
}
