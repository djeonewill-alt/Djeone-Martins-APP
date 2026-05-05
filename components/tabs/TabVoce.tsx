'use client'

type TabVoceProps = {
  onOpenFavoritos?: () => void
}

export default function TabVoce({ onOpenFavoritos }: TabVoceProps) {
  const items = [
    {
      icon: '🏅',
      title: 'Badges',
      desc: 'Conquistas espirituais',
      action: undefined,
    },
    {
      icon: '❤️',
      title: 'Favoritos',
      desc: 'Palavras salvas',
      action: onOpenFavoritos,
    },
    {
      icon: '🔔',
      title: 'Notificações',
      desc: 'Lembretes do app',
      action: undefined,
    },
    {
      icon: '👤',
      title: 'Perfil',
      desc: 'Seus dados',
      action: undefined,
    },
  ]

  return (
    <div className="min-h-screen bg-slate-950 px-5 pb-32 pt-20 text-white">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-300">
            Você
          </p>

          <h1 className="mt-2 text-3xl font-black leading-tight tracking-[-0.05em]">
            Sua jornada espiritual
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Acompanhe seu crescimento, favoritos, notificações e progresso no discipulado diário.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {items.map((item) => (
            <button
              key={item.title}
              type="button"
              onClick={item.action}
              className="rounded-[24px] border border-white/10 bg-slate-900/80 p-4 text-left shadow-[0_12px_35px_rgba(0,0,0,0.25)] active:scale-[0.99]"
            >
              <div className="mb-3 text-3xl">{item.icon}</div>

              <h2 className="text-base font-black">
                {item.title}
              </h2>

              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                {item.desc}
              </p>
            </button>
          ))}
        </div>

        <section className="mt-5 rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
          <h2 className="text-lg font-black">
            Progresso
          </h2>

          <div className="mt-4 space-y-4">
            {[
              ['Leitura', '0 capítulos lidos'],
              ['Oração', '0 pedidos intercedidos'],
              ['Compartilhamento', '0 envios'],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="font-bold text-slate-300">{label}</span>
                  <span className="text-slate-500">{value}</span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-[8%] rounded-full bg-blue-400" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
