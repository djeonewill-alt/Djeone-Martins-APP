import type { FormEvent } from 'react'
import type { PrayerRequest } from '@/lib/supabase'
import { PRAYER_ENCOURAGEMENT_OPTIONS } from './mockData'
import { formatPrayerDate, getPrayerContent } from './utils'
import type { PrayerEncouragement } from './types'

type PrayerWallProps = {
  prayers: PrayerRequest[]
  loading: boolean
  showForm: boolean
  authorName: string
  newPrayer: string
  isPrivate: boolean
  sending: boolean
  prayedIds: string[]
  prayerCounts: Record<string, number>
  encouragementsByPrayer: Record<string, PrayerEncouragement[]>
  onToggleForm: () => void
  onAuthorNameChange: (value: string) => void
  onNewPrayerChange: (value: string) => void
  onPrivateChange: (value: boolean) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onPray: (prayer: PrayerRequest) => void
  onReport: (prayer: PrayerRequest) => void
  onEncourage: (prayer: PrayerRequest, emoji: string, message: string) => void
}

export default function PrayerWall({
  prayers,
  loading,
  showForm,
  authorName,
  newPrayer,
  isPrivate,
  sending,
  prayedIds,
  prayerCounts,
  encouragementsByPrayer,
  onToggleForm,
  onAuthorNameChange,
  onNewPrayerChange,
  onPrivateChange,
  onSubmit,
  onPray,
  onReport,
  onEncourage,
}: PrayerWallProps) {
  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-slate-900/80 p-5 shadow-[0_22px_70px_rgba(0,0,0,0.35)]">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />

        <div className="relative">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">
            Mural de oração
          </p>

          <h2 className="mt-2 text-3xl font-black tracking-[-0.07em]">
            Ore pela comunidade
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Compartilhe seu pedido ou interceda por alguém. Cada oração importa.
          </p>

          <button
            type="button"
            onClick={onToggleForm}
            className="mt-5 w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-[0_12px_35px_rgba(37,99,235,0.28)]"
          >
            {showForm ? 'Fechar formulário' : '+ Novo pedido'}
          </button>
        </div>
      </section>

      {showForm && (
        <form
          onSubmit={onSubmit}
          className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5"
        >
          <h3 className="text-lg font-black text-white">
            Compartilhe seu pedido
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Evite compartilhar telefone, endereço ou informações sensíveis.
          </p>

          <input
            type="text"
            value={authorName}
            onChange={(event) => onAuthorNameChange(event.target.value)}
            placeholder="Seu nome (opcional)"
            className="mt-4 w-full rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-400/50"
          />

          <textarea
            value={newPrayer}
            onChange={(event) => onNewPrayerChange(event.target.value)}
            placeholder="Digite seu pedido de oração..."
            className="mt-3 min-h-[120px] w-full rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-400/50"
            required
          />

          <label className="mt-4 flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(event) => onPrivateChange(event.target.checked)}
              className="mt-1 h-4 w-4"
            />

            <span>
              <span className="block font-bold text-white">
                Pedido privado
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-slate-500">
                Apenas você e o pastor verão este pedido.
              </span>
            </span>
          </label>

          <button
            type="submit"
            disabled={sending}
            className="mt-4 w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
          >
            {sending ? 'Enviando...' : 'Enviar pedido'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-8 text-center">
          <p className="text-sm font-bold text-slate-400">
            Carregando pedidos...
          </p>
        </div>
      ) : prayers.length === 0 ? (
        <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-8 text-center">
          <p className="text-4xl">🤲</p>
          <h3 className="mt-3 text-lg font-black text-white">
            Nenhum pedido público ainda
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            Seja o primeiro a compartilhar um pedido com a comunidade.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {prayers.map((prayer) => {
            const hasPrayed = prayedIds.includes(prayer.id)
            const content = getPrayerContent(prayer)
            const count = prayerCounts[prayer.id] || 0
            const encouragements = encouragementsByPrayer[prayer.id] || []

            return (
              <article
                key={prayer.id}
                className={
                  prayer.is_answered
                    ? 'rounded-[30px] border border-emerald-300/20 bg-emerald-500/10 p-5'
                    : 'rounded-[30px] border border-white/10 bg-slate-900/80 p-5 shadow-[0_16px_45px_rgba(0,0,0,0.22)]'
                }
              >
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-black text-white">
                      {prayer.author_name || 'Anônimo'}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {formatPrayerDate(prayer.created_at)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {count > 0 && (
                      <span className="rounded-full border border-blue-300/20 bg-blue-500/15 px-3 py-1 text-xs font-black text-blue-100">
                        🙏 {count}
                      </span>
                    )}

                    {prayer.is_answered && (
                      <span className="rounded-full border border-emerald-300/20 bg-emerald-500/15 px-3 py-1 text-[10px] font-black text-emerald-100">
                        Respondido
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-sm leading-relaxed text-slate-300">
                  {content}
                </p>

                {encouragements.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {encouragements.slice(0, 6).map((encouragement) => (
                      <span
                        key={encouragement.id}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-slate-300"
                      >
                        {encouragement.emoji} {encouragement.message}
                      </span>
                    ))}
                  </div>
                )}

                {prayer.is_answered && prayer.testimony_text && (
                  <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-200">
                      Testemunho
                    </p>

                    <p className="mt-2 text-sm leading-relaxed text-slate-200">
                      {prayer.testimony_text}
                    </p>
                  </div>
                )}

                <div className="mt-5 grid grid-cols-2 gap-2">
                  {PRAYER_ENCOURAGEMENT_OPTIONS.map((option) => (
                    <button
                      key={`${prayer.id}-${option.message}`}
                      type="button"
                      onClick={() =>
                        onEncourage(prayer, option.emoji, option.message)
                      }
                      className="rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2 text-left text-xs font-bold text-slate-300 active:scale-[0.98]"
                    >
                      {option.emoji} {option.message}
                    </button>
                  ))}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onPray(prayer)}
                    disabled={hasPrayed}
                    className={
                      hasPrayed
                        ? 'flex-1 rounded-2xl border border-blue-300/20 bg-blue-500/15 px-4 py-3 text-sm font-black text-blue-100 opacity-80'
                        : 'flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-white'
                    }
                  >
                    {hasPrayed ? 'Eu orei' : 'Eu vou orar'}
                  </button>

                  <button
                    type="button"
                    onClick={() => onReport(prayer)}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-slate-400"
                  >
                    ⚑
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
