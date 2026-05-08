'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

function SupportReasonCard({
  icon,
  title,
  description,
}: {
  icon: string
  title: string
  description: string
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-slate-900/80 p-5 shadow-[0_16px_45px_rgba(0,0,0,0.24)]">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[22px] border border-white/10 bg-white/[0.055] text-3xl">
        {icon}
      </div>

      <h3 className="text-lg font-black tracking-[-0.04em] text-white">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-relaxed text-slate-400">
        {description}
      </p>
    </div>
  )
}

function ValuePill({ value }: { value: number }) {
  return (
    <button
      type="button"
      className="rounded-2xl border border-yellow-300/15 bg-yellow-500/10 px-4 py-3 text-sm font-black text-yellow-100 active:scale-[0.98]"
    >
      R$ {value}
    </button>
  )
}

export default function TabOferta() {
  const [pixKey, setPixKey] = useState('')
  const [pixName, setPixName] = useState('')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['pix_key', 'pix_name'])

      if (error) throw error

      const settings = (data || []).reduce<Record<string, string>>((acc, item) => {
        acc[item.key] = item.value || ''
        return acc
      }, {})

      setPixKey(settings.pix_key || '')
      setPixName(settings.pix_name || '')
    } catch (error) {
      console.error('Erro ao carregar configurações de oferta:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyPixKey = async () => {
    if (!pixKey) return

    try {
      await navigator.clipboard.writeText(pixKey)
      setCopied(true)

      setTimeout(() => {
        setCopied(false)
      }, 2200)
    } catch (error) {
      console.error('Erro ao copiar chave PIX:', error)
      alert('Não foi possível copiar a chave PIX agora.')
    }
  }

  const suggestedValues = [10, 20, 50, 100]

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 px-5 pb-32 pt-4 text-white">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 h-20 animate-pulse rounded-[28px] bg-white/10" />
          <div className="h-[360px] animate-pulse rounded-[36px] bg-white/10" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 px-5 pb-32 pt-4 text-white">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-yellow-200">
            Oferta
          </p>

          <h1 className="mt-2 text-4xl font-black leading-[0.95] tracking-[-0.075em]">
            Apoie esta missão
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Sua contribuição ajuda este projeto de discipulado diário a alcançar mais pessoas com a Palavra, oração e cuidado espiritual.
          </p>
        </div>

        <section className="relative mb-6 overflow-hidden rounded-[36px] border border-yellow-300/15 bg-gradient-to-br from-yellow-500/12 via-slate-900/90 to-slate-950 p-5 shadow-[0_26px_85px_rgba(0,0,0,0.42)]">
          <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-yellow-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-60 w-60 rounded-full bg-blue-500/12 blur-3xl" />

          <div className="relative">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[26px] border border-yellow-300/20 bg-yellow-500/10 text-4xl">
              🤲
            </div>

            <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-200">
              Semeie na obra
            </p>

            <h2 className="mt-2 text-3xl font-black leading-[0.98] tracking-[-0.065em] text-white">
              Sua oferta abençoa vidas
            </h2>

            <p className="mt-4 text-sm leading-relaxed text-slate-300">
              Cada contribuição ajuda a manter devocionais, Palavra do Dia, mural de oração, leitura bíblica e futuros recursos de discipulado.
            </p>

            <div className="mt-6 rounded-[28px] border border-white/10 bg-slate-950/55 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                Chave PIX
              </p>

              <div className="mt-3 flex items-center gap-3">
                <div className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm font-black text-white">
                  <p className="truncate">
                    {pixKey || 'PIX não configurado'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={copyPixKey}
                  disabled={!pixKey}
                  className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-40"
                >
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>

              <p className="mt-3 text-xs font-bold text-slate-500">
                {pixName || 'Nome do recebedor não configurado'}
              </p>
            </div>
          </div>
        </section>

        <section className="mb-6 rounded-[34px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.24)]">
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-300">
              Valores sugeridos
            </p>

            <h2 className="mt-1 text-xl font-black">
              Contribua como Deus tocar seu coração
            </h2>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {suggestedValues.map((value) => (
              <ValuePill key={value} value={value} />
            ))}
          </div>

          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            Os valores acima são apenas sugestões. Você pode ofertar qualquer valor diretamente pelo PIX.
          </p>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-3">
          <SupportReasonCard
            icon="📖"
            title="Palavra e discipulado"
            description="Ajude a manter conteúdos diários que fortalecem a fé e conduzem pessoas à Palavra de Deus."
          />

          <SupportReasonCard
            icon="🙏"
            title="Oração e cuidado"
            description="O mural de oração cria um ambiente de intercessão, compaixão e cuidado entre os usuários."
          />

          <SupportReasonCard
            icon="🎧"
            title="Áudios devocionais"
            description="Sua oferta ajuda a sustentar a produção de mensagens, séries e recursos espirituais."
          />
        </section>

        <section className="rounded-[30px] border border-emerald-300/15 bg-emerald-500/10 p-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200">
            Transparência
          </p>

          <h2 className="mt-2 text-xl font-black">
            Uma contribuição para a missão
          </h2>

          <p className="mt-2 text-sm leading-relaxed text-emerald-50/70">
            Este espaço existe para apoiar a continuidade do projeto, mantendo tecnologia, conteúdo, estrutura e expansão ministerial.
          </p>
        </section>
      </div>
    </div>
  )
}

