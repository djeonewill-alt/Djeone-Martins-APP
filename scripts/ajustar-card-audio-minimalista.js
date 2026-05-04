const fs = require('fs')
const path = require('path')

const filePath = path.join(
  process.cwd(),
  'components',
  'tabs',
  'TabHoje.tsx'
)

let content = fs.readFileSync(filePath, 'utf8')

const newAudioSection = `
        {/* Áudio do Dia */}
        <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-slate-900/70 p-4 shadow-[0_18px_55px_rgba(0,0,0,0.32)] backdrop-blur-sm">
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-blue-500/18 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-16 h-44 w-44 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_35%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(2,6,23,0.98))]" />

          <div className="relative">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-300">
                  Áudio de hoje
                </p>

                <h2 className="mt-2 text-[1.3rem] font-black leading-tight tracking-[-0.04em] text-white">
                  {todayEpisode.title}
                </h2>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
                    {todayEpisode.bible_reference || 'Devocional Diário'}
                  </span>

                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
                    {durationLabel}
                  </span>

                  {todayEpisode.series?.title && (
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
                      {todayEpisode.series.icon_emoji} {todayEpisode.series.title}
                    </span>
                  )}
                </div>
              </div>

              <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-300/20 bg-blue-500/10 text-xl text-blue-100 sm:flex">
                🎧
              </div>
            </div>

            <div className="rounded-[26px] border border-white/10 bg-black/18 p-4">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={handlePlay}
                  className="group flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.08] text-white shadow-[0_14px_38px_rgba(0,0,0,0.32)] backdrop-blur-md transition-all hover:scale-105 hover:bg-white/[0.12] active:scale-95"
                  aria-label="Tocar episódio"
                >
                  <span className="absolute h-20 w-20 rounded-full bg-blue-500/20 blur-xl transition-all group-hover:bg-blue-400/25" />

                  <svg
                    className={isCurrentEpisodePlaying ? 'relative h-8 w-8' : 'relative h-8 w-8 ml-1'}
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {isCurrentEpisodePlaying ? (
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    ) : (
                      <path d="M8 5v14l11-7z" />
                    )}
                  </svg>
                </button>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">
                    {isCurrentEpisodePlaying ? 'Ouvindo agora' : 'Pronto para ouvir'}
                  </p>

                  <p className="mt-1 text-sm leading-relaxed text-slate-400">
                    Toque para iniciar o devocional. Depois, abra o player completo para acompanhar a transcrição.
                  </p>

                  <button
                    type="button"
                    onClick={handlePlay}
                    className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-full bg-blue-600 text-sm font-bold text-white shadow-[0_10px_30px_rgba(37,99,235,0.28)] transition-all hover:bg-blue-500 active:scale-[0.98]"
                  >
                    <span>{isCurrentEpisodePlaying ? '⏸' : '▶'}</span>
                    <span>{isCurrentEpisodePlaying ? 'Pausar áudio' : 'Ouvir agora'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleFavorite}
                className={
                  isFavorite
                    ? 'flex h-10 items-center justify-center gap-2 rounded-full border border-red-300/20 bg-red-500/15 px-3 text-xs font-semibold text-red-100 transition-all active:scale-[0.98]'
                    : 'flex h-10 items-center justify-center gap-2 rounded-full border border-white/10 bg-black/18 px-3 text-xs font-semibold text-white/78 transition-all hover:bg-black/28 active:scale-[0.98]'
                }
              >
                <span>{isFavorite ? '❤️' : '♡'}</span>
                <span>{isFavorite ? 'Salvo' : 'Favorito'}</span>
              </button>

              <button
                type="button"
                onClick={handleShareEpisode}
                disabled={sharingEpisode}
                className="flex h-10 items-center justify-center gap-2 rounded-full border border-white/10 bg-black/18 px-3 text-xs font-semibold text-white/78 transition-all hover:bg-black/28 active:scale-[0.98] disabled:opacity-60"
              >
                <span>{sharingEpisode ? '…' : '↗'}</span>
                <span>Compartilhar</span>
              </button>

              <button
                type="button"
                onClick={isSubscribed ? unsubscribe : subscribe}
                disabled={notifLoading}
                className={
                  isSubscribed
                    ? 'flex h-10 items-center justify-center gap-2 rounded-full border border-blue-300/20 bg-blue-500/15 px-3 text-xs font-semibold text-blue-100 transition-all active:scale-[0.98] disabled:opacity-50'
                    : 'flex h-10 items-center justify-center gap-2 rounded-full border border-white/10 bg-black/18 px-3 text-xs font-semibold text-white/78 transition-all hover:bg-black/28 active:scale-[0.98] disabled:opacity-50'
                }
              >
                <span>{isSubscribed ? '🔔' : '🔕'}</span>
                <span>Lembrete</span>
              </button>
            </div>
          </div>
        </section>
`

const audioSectionRegex =
  /\s*{\/\* Áudio do Dia \*\/}\s*<section[\s\S]*?<\/section>\s*/

if (!audioSectionRegex.test(content)) {
  console.error('❌ Não encontrei o bloco do Áudio do Dia em TabHoje.tsx.')
  process.exit(1)
}

content = content.replace(audioSectionRegex, `\n${newAudioSection}\n`)

content = content.replace(
  /\n\s*const coverImage =\s*\n\s*todayEpisode\?\.cover_image_url \|\|\s*\n\s*todayEpisode\?\.series\?\.cover_image_url \|\|\s*\n\s*'\/vencendo-tempestades\.jpg'\s*\n/,
  '\n'
)

fs.writeFileSync(filePath, content, 'utf8')

console.log('✅ Card do Áudio de Hoje atualizado para versão minimalista premium.')