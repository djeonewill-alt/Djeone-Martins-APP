type BetaWelcomeNoticeProps = {
  testerName?: string | null
  onOpenTesterCenter: () => void
  onDismiss: () => void
}

export default function BetaWelcomeNotice({
  testerName,
  onOpenTesterCenter,
  onDismiss,
}: BetaWelcomeNoticeProps) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end bg-slate-950/75 px-4 pb-5 pt-20 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6">
      <section className="mx-auto w-full max-w-lg rounded-[32px] border border-purple-300/20 bg-gradient-to-br from-slate-900 via-slate-950 to-purple-950/50 p-6 text-white shadow-2xl shadow-purple-950/30">
        <div className="inline-flex rounded-full border border-purple-300/20 bg-purple-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-purple-100">
          Beta fechado
        </div>

        <h1 className="mt-4 text-3xl font-black leading-tight tracking-[-0.06em]">
          Bem-vindo ao Beta Fechado
        </h1>

        <p className="mt-4 text-sm font-semibold leading-6 text-slate-300">
          {testerName ? `${testerName}, o` : 'O'}brigado por ajudar a melhorar o app.
          Seu tempo e suas respostas vão nos ajudar a preparar uma experiência
          mais clara, estável e edificante para todos.
        </p>

        <p className="mt-3 text-sm font-semibold leading-6 text-slate-400">
          Seu painel de testes fica em Mais → Central do Testador Beta.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onOpenTesterCenter}
            className="rounded-2xl bg-purple-600 px-5 py-4 text-sm font-black text-white shadow-xl shadow-purple-950/30 active:scale-[0.98]"
          >
            Abrir Central do Testador
          </button>

          <button
            type="button"
            onClick={onDismiss}
            className="rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-sm font-black text-slate-100 active:scale-[0.98]"
          >
            Agora não
          </button>
        </div>
      </section>
    </div>
  )
}
