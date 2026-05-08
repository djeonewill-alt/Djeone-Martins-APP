import Link from 'next/link'

export default function AdminEpisodiosAntigoPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <section className="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center">
        <div className="w-full rounded-[36px] border border-white/10 bg-slate-900/80 p-6 text-center shadow-2xl shadow-black/30 ring-1 ring-white/10 sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-blue-300/20 bg-blue-500/10 text-3xl">
            🎧
          </div>

          <p className="mt-6 text-[11px] font-black uppercase tracking-[0.24em] text-blue-300">
            Área reorganizada
          </p>

          <h1 className="mt-3 text-3xl font-black leading-none tracking-[-0.06em] text-white sm:text-5xl">
            Episódios agora ficam dentro de Podcasts
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-sm font-semibold leading-7 text-slate-400">
            A gestão de episódios foi movida para o fluxo correto do painel:
            escolha um podcast, abra o gerenciador de episódios e edite,
            publique, defina degustativo ou exclua conteúdos por lá.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Link
              href="/admin/series"
              className="rounded-2xl bg-blue-600 px-5 py-4 text-sm font-black text-white shadow-xl shadow-blue-950/30 transition hover:bg-blue-500 active:scale-[0.98]"
            >
              Ir para Podcasts
            </Link>

            <Link
              href="/admin"
              className="rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-sm font-black text-slate-100 transition hover:border-white/20 active:scale-[0.98]"
            >
              Voltar ao Admin
            </Link>
          </div>

          <div className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-500/10 p-4 text-left">
            <p className="text-sm font-black text-amber-100">
              Fluxo recomendado
            </p>

            <p className="mt-2 text-xs font-semibold leading-5 text-amber-50/90">
              Admin → Podcasts → Gerenciar episódios → Editar episódio
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}