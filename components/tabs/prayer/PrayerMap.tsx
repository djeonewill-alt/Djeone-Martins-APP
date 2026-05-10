import PremiumIconTile from '@/components/icons/PremiumIconTile'
import PrayerSvgIcon from '@/components/icons/PrayerSvgIcon'

type PrayerMapProps = {
  onOpenWall: () => void
}

const mapPreviewItems = [
  {
    title: 'Escolha uma área',
    description:
      'Vida devocional, direção, família, casamento, medo, desânimo, chamado ou fortalecimento espiritual.',
    icon: 'path' as const,
    tone: 'sky' as const,
  },
  {
    title: 'Receba um caminho guiado',
    description:
      'Orações, textos bíblicos, reflexões e passos práticos organizados para cada fase da caminhada.',
    icon: 'open-bible' as const,
    tone: 'amber' as const,
  },
  {
    title: 'Acompanhe sua constância',
    description:
      'Veja seu progresso, dias concluídos e próximos passos na jornada de oração.',
    icon: 'light' as const,
    tone: 'cyan' as const,
  },
  {
    title: 'Registre respostas',
    description:
      'Guarde pedidos, decisões, gratidão e testemunhos do que Deus está fazendo.',
    icon: 'heart' as const,
    tone: 'rose' as const,
  },
]

export default function PrayerMap({ onOpenWall }: PrayerMapProps) {
  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-slate-900/80 p-5 shadow-[0_22px_70px_rgba(0,0,0,0.35)]">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-amber-400/10 blur-3xl" />

        <div className="relative">
          <PremiumIconTile tone="cyan" size="lg" className="mb-5">
            <PrayerSvgIcon name="path" className="h-8 w-8" />
          </PremiumIconTile>

          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">
            Em desenvolvimento
          </p>

          <h2 className="mt-2 text-3xl font-black leading-none tracking-[-0.07em] text-white">
            Mapa de Oração
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Em breve, você poderá criar um caminho de oração personalizado para sua fase de vida.
          </p>

          <div className="mt-5 rounded-[24px] border border-cyan-300/15 bg-cyan-500/10 p-4">
            <p className="text-sm font-bold leading-relaxed text-cyan-50/90">
              O app vai ajudar você a orar com direção, acompanhar sua constância,
              registrar respostas de Deus e caminhar por jornadas guiadas de Palavra,
              oração e crescimento espiritual.
            </p>
          </div>
        </div>
      </section>

      <div className="space-y-3">
        {mapPreviewItems.map((item) => (
          <div
            key={item.title}
            className="rounded-[30px] border border-white/10 bg-slate-900/80 p-5 shadow-[0_16px_45px_rgba(0,0,0,0.22)]"
          >
            <div className="flex items-start gap-4">
              <PremiumIconTile tone={item.tone} size="md">
                <PrayerSvgIcon name={item.icon} className="h-8 w-8" />
              </PremiumIconTile>

              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-black text-white">
                  {item.title}
                </h3>

                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {item.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <section className="rounded-[30px] border border-amber-300/15 bg-gradient-to-br from-amber-500/10 via-slate-900/80 to-slate-950 p-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-200">
          Enquanto isso
        </p>

        <h2 className="mt-2 text-xl font-black text-white">
          Comece pelo mural
        </h2>

        <p className="mt-2 text-sm leading-relaxed text-amber-50/70">
          Até o Mapa de Oração ser liberado, você pode compartilhar seus pedidos,
          orar por outras pessoas e acompanhar suas respostas na aba Meus.
        </p>

        <button
          type="button"
          onClick={onOpenWall}
          className="mt-5 rounded-2xl border border-amber-200/20 bg-amber-400/10 px-5 py-3 text-sm font-black text-amber-100 active:scale-[0.98]"
        >
          Ir para o mural
        </button>
      </section>
    </div>
  )
}
