'use client'

import { useState } from 'react'

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
  acceptedPrayerNotice: boolean
  prayedIds: string[]
  prayerCounts: Record<string, number>
  encouragementsByPrayer: Record<string, PrayerEncouragement[]>
  onToggleForm: () => void
  onAuthorNameChange: (value: string) => void
  onNewPrayerChange: (value: string) => void
  onPrivateChange: (value: boolean) => void
  onPrayerNoticeChange: (value: boolean) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  onPray: (prayer: PrayerRequest) => void
  onReport: (prayer: PrayerRequest) => void
  onEncourage: (prayer: PrayerRequest, emoji: string, message: string) => void
}

function getCountryFlag(country?: string | null) {
  const normalized = (country || '').trim().toLowerCase()

  if (!normalized) return ''

  const flags: Record<string, string> = {
    brasil: '🇧🇷',
    brazil: '🇧🇷',
    'estados unidos': '🇺🇸',
    'united states': '🇺🇸',
    usa: '🇺🇸',
    portugal: '🇵🇹',
    canada: '🇨🇦',
    canadá: '🇨🇦',
    'reino unido': '🇬🇧',
    'united kingdom': '🇬🇧',
    australia: '🇦🇺',
    austrália: '🇦🇺',
  }

  return flags[normalized] || ''
}

function getPrayerCountry(prayer: PrayerRequest) {
  const prayerWithProfile = prayer as PrayerRequest & {
    profiles?: { country?: string | null } | null
  }

  return prayerWithProfile.profiles?.country || ''
}

export default function PrayerWall({
  prayers,
  loading,
  showForm,
  authorName,
  newPrayer,
  isPrivate,
  sending,
  acceptedPrayerNotice,
  prayedIds,
  prayerCounts,
  encouragementsByPrayer,
  onToggleForm,
  onAuthorNameChange,
  onNewPrayerChange,
  onPrivateChange,
  onPrayerNoticeChange,
  onSubmit,
  onPray,
  onReport,
  onEncourage,
}: PrayerWallProps) {
  const [openEncouragementPrayerId, setOpenEncouragementPrayerId] = useState<
    string | null
  >(null)

  function toggleEncouragements(prayerId: string) {
    setOpenEncouragementPrayerId((current) =>
      current === prayerId ? null : prayerId
    )
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[30px] border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/20">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-300">
              Mural de oração
            </p>

            <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-white">
              Ore pela comunidade
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Compartilhe um pedido com cuidado e ore por quem precisa de apoio.
            </p>
          </div>

          <button
            type="button"
            onClick={onToggleForm}
            className="shrink-0 rounded-2xl border border-blue-300/20 bg-blue-500/15 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-blue-100 active:scale-[0.98]"
          >
            {showForm ? 'Fechar' : 'Pedir oração'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <div className="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-4">
              <p className="text-sm font-black text-amber-100">
                Aviso de privacidade antes de publicar
              </p>

              <div className="mt-3 space-y-2 text-xs font-semibold leading-6 text-amber-50/90">
                <p>
                  Evite expor dados sensíveis, como endereço, documentos,
                  detalhes médicos, dados financeiros ou informações de terceiros
                  sem autorização.
                </p>

                <p>
                  Pedido público aparece no mural. Pedido privado fica visível
                  apenas para acompanhamento interno/pessoal, conforme as regras
                  do app.
                </p>
              </div>

              <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-amber-200/15 bg-slate-950/30 p-3 text-xs font-bold leading-5 text-amber-50">
                <input
                  type="checkbox"
                  checked={acceptedPrayerNotice}
                  onChange={(event) =>
                    onPrayerNoticeChange(event.target.checked)
                  }
                  className="mt-1 h-4 w-4 shrink-0 accent-amber-400"
                />

                <span>
                  Entendi o aviso e confirmo que meu pedido não expõe dados
                  sensíveis indevidamente.
                </span>
              </label>
            </div>

            <div>
              <label className="text-sm font-bold text-slate-200">
                Nome no mural, opcional
              </label>
              <input
                type="text"
                value={authorName}
                onChange={(event) => onAuthorNameChange(event.target.value)}
                placeholder="Ex: Sarah"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-300/60"
              />
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Se deixar em branco, aparecerá como Anônimo.
              </p>
            </div>

            <div>
              <label className="text-sm font-bold text-slate-200">
                Seu pedido de oração *
              </label>
              <textarea
                value={newPrayer}
                onChange={(event) => onNewPrayerChange(event.target.value)}
                placeholder="Escreva seu pedido com sabedoria e cuidado..."
                rows={5}
                required
                className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-300/60"
              />
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm font-bold leading-6 text-slate-200">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(event) => onPrivateChange(event.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 accent-blue-500"
              />

              <span>
                Quero enviar como pedido privado. Ele não aparecerá no mural
                público.
              </span>
            </label>

            <button
              type="submit"
              disabled={sending || !newPrayer.trim() || !acceptedPrayerNotice}
              className="w-full rounded-2xl bg-blue-600 px-5 py-4 text-sm font-black uppercase tracking-[0.14em] text-white shadow-xl shadow-blue-950/30 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? 'Enviando...' : isPrivate ? 'Enviar pedido privado' : 'Publicar pedido'}
            </button>
          </form>
        )}
      </div>

      {loading ? (
        <div className="rounded-[30px] border border-white/10 bg-slate-900/60 p-5 text-sm font-bold text-slate-400">
          Carregando pedidos de oração...
        </div>
      ) : prayers.length === 0 ? (
        <div className="rounded-[30px] border border-white/10 bg-slate-900/60 p-5 text-sm leading-6 text-slate-400">
          Ainda não há pedidos públicos no mural. Seja o primeiro a compartilhar
          com sabedoria.
        </div>
      ) : (
        <div className="space-y-4">
          {prayers.map((prayer) => {
            const hasPrayed = prayedIds.includes(prayer.id)
            const content = getPrayerContent(prayer)
            const count = prayerCounts[prayer.id] || 0
            const encouragements = encouragementsByPrayer[prayer.id] || []
            const isEncouragementOpen =
              openEncouragementPrayerId === prayer.id
            const flag = getCountryFlag(getPrayerCountry(prayer))

            return (
              <article
                key={prayer.id}
                className={
                  prayer.is_answered
                    ? 'rounded-[30px] border border-emerald-300/25 bg-emerald-500/10 p-5'
                    : 'rounded-[30px] border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/20'
                }
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-black text-white">
                      {prayer.author_name || 'Anônimo'} {flag && <span>{flag}</span>}
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      {formatPrayerDate(prayer.created_at)}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {count > 0 && (
                      <span className="rounded-full border border-blue-300/20 bg-blue-500/15 px-3 py-1 text-xs font-black text-blue-100">
                        🙏 {count}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => onReport(prayer)}
                      className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-1 text-xs font-black text-slate-400 active:scale-[0.97]"
                      aria-label="Sinalizar pedido"
                      title="Sinalizar pedido"
                    >
                      ⚑
                    </button>
                  </div>
                </div>

                <p className="mt-4 whitespace-pre-wrap text-sm font-semibold leading-7 text-slate-100">
                  {content}
                </p>

                {prayer.is_answered && (
                  <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200">
                      Pedido respondido
                    </p>

                    {prayer.testimony_text && (
                      <p className="mt-2 text-sm leading-6 text-emerald-50">
                        {prayer.testimony_text}
                      </p>
                    )}
                  </div>
                )}

                {encouragements.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {encouragements.slice(0, 3).map((encouragement) => (
                      <span
                        key={encouragement.id}
                        className="rounded-full border border-white/10 bg-slate-950/40 px-3 py-1 text-xs font-bold text-slate-300"
                      >
                        {encouragement.emoji} {encouragement.message}
                      </span>
                    ))}

                    {encouragements.length > 3 && (
                      <span className="rounded-full border border-white/10 bg-slate-950/40 px-3 py-1 text-xs font-bold text-slate-500">
                        +{encouragements.length - 3}
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-5 grid grid-cols-[1fr_auto] gap-3">
                  <button
                    type="button"
                    onClick={() => onPray(prayer)}
                    disabled={hasPrayed}
                    className="rounded-2xl border border-blue-300/20 bg-blue-500/15 px-4 py-3 text-sm font-black text-blue-100 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {hasPrayed ? 'Você já orou' : '🙏 Eu orei'}
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleEncouragements(prayer.id)}
                    className="rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm font-black text-slate-200 active:scale-[0.99]"
                  >
                    💬 Apoio
                  </button>
                </div>

                {isEncouragementOpen && (
                  <div className="mt-3 grid gap-2 rounded-2xl border border-white/10 bg-slate-950/40 p-3 sm:grid-cols-2">
                    {PRAYER_ENCOURAGEMENT_OPTIONS.map((option) => (
                      <button
                        key={`${prayer.id}-${option.message}`}
                        type="button"
                        onClick={() => {
                          onEncourage(prayer, option.emoji, option.message)
                          setOpenEncouragementPrayerId(null)
                        }}
                        className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-left text-xs font-black text-slate-100 active:scale-[0.99]"
                      >
                        {option.emoji} {option.message}
                      </button>
                    ))}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
