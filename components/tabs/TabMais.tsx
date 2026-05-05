'use client'

type TabMaisProps = {
  onOpenSeries?: () => void
  onOpenOferta?: () => void
}

export default function TabMais({
  onOpenSeries,
  onOpenOferta,
}: TabMaisProps) {
  const items = [
    {
      icon: '🎧',
      title: 'Séries',
      desc: 'Devocionais antigos e séries premium',
      action: onOpenSeries,
    },
    {
      icon: '🤲',
      title: 'Oferta',
      desc: 'Contribua com este projeto',
      action: onOpenOferta,
    },
    {
      icon: '⭐',
      title: 'Assinatura',
      desc: 'Recursos premium',
      action: undefined,
    },
    {
      icon: '⚙️',
      title: 'Configurações',
      desc: 'Preferências do aplicativo',
      action: undefined,
    },
  ]

  return (
    <div className="min-h-screen bg-slate-950 px-5 pb-32 pt-20 text-white">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-300">
            Mais
          </p>

          <h1 className="mt-2 text-3xl font-black leading-tight tracking-[-0.05em]">
            Outros recursos
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Acesse séries, ofertas, assinatura e configurações adicionais.
          </p>
        </div>

        <div className="space-y-3">
          {items.map((item) => (
            <button
              key={item.title}
              type="button"
              onClick={item.action}
              className="flex w-full items-center gap-4 rounded-[24px] border border-white/10 bg-slate-900/80 p-4 text-left active:scale-[0.99]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-2xl">
                {item.icon}
              </div>

              <div>
                <h2 className="text-base font-black">
                  {item.title}
                </h2>

                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  {item.desc}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
