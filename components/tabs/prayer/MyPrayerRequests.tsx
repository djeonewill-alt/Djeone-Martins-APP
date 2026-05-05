import type { PrayerRequest } from '@/lib/supabase'
import { formatPrayerDate, getPrayerContent } from './utils'

type MyPrayerRequestsProps = {
  prayers: PrayerRequest[]
  loading: boolean
  onOpenWall: () => void
  onMarkAnswered: (prayer: PrayerRequest) => void
}

export default function MyPrayerRequests({
  prayers,
  loading,
  onOpenWall,
  onMarkAnswered,
}: MyPrayerRequestsProps) {
  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-slate-900/80 p-5 shadow-[0_22px_70px_rgba(0,0,0,0.35)]">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyan-400/15 blur-3xl" />

        <div className="relative">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">
            Meus pedidos
          </p>

          <h2 className="mt-2 text-3xl font-black tracking-[-0.07em]">
            Sua jornada de oração
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Acompanhe pedidos enviados por este dispositivo.
          </p>

          <button
            type="button"
            onClick={onOpenWall}
            className="mt-5 w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white"
          >
            Criar novo pedido
          </button>
        </div>
      </section>

      {loading ? (
        <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-8 text-center">
          <p className="text-sm font-bold text-slate-400">
            Carregando seus pedidos...
          </p>
        </div>
      ) : prayers.length === 0 ? (
        <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-8 text-center">
          <p className="text-4xl">🙏</p>
          <h3 className="mt-3 text-lg font-black text-white">
            Nenhum pedido enviado ainda
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            Quando você enviar um pedido, ele aparecerá aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {prayers.map((prayer) => {
            const content = getPrayerContent(prayer)

            return (
              <article
                key={prayer.id}
                className={
                  prayer.is_answered
                    ? 'rounded-[30px] border border-emerald-300/20 bg-emerald-500/10 p-5'
                    : prayer.is_private
                      ? 'rounded-[30px] border border-yellow-300/20 bg-yellow-500/10 p-5'
                      : 'rounded-[30px] border border-white/10 bg-slate-900/80 p-5'
                }
              >
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-black text-white">
                      {prayer.is_private ? 'Pedido privado' : 'Pedido público'}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {formatPrayerDate(prayer.created_at)}
                    </p>
                  </div>

                  {prayer.is_answered ? (
                    <span className="rounded-full border border-emerald-300/20 bg-emerald-500/15 px-3 py-1 text-[10px] font-black text-emerald-100">
                      Respondido
                    </span>
                  ) : prayer.is_private ? (
                    <span className="rounded-full border border-yellow-300/20 bg-yellow-500/15 px-3 py-1 text-[10px] font-black text-yellow-100">
                      Privado
                    </span>
                  ) : (
                    <span className="rounded-full border border-blue-300/20 bg-blue-500/15 px-3 py-1 text-[10px] font-black text-blue-100">
                      Público
                    </span>
                  )}
                </div>

                <p className="text-sm leading-relaxed text-slate-300">
                  {content}
                </p>

                {!prayer.is_answered && (
                  <button
                    type="button"
                    onClick={() => onMarkAnswered(prayer)}
                    className="mt-5 w-full rounded-2xl border border-emerald-300/20 bg-emerald-500/10 px-4 py-3 text-sm font-black text-emerald-100"
                  >
                    Marcar como respondido
                  </button>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
