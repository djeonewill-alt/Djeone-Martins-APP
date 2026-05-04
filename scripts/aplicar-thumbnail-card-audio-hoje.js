const fs = require('fs')
const path = require('path')

const filePath = path.join(
  process.cwd(),
  'components',
  'tabs',
  'TabHoje.tsx'
)

let content = fs.readFileSync(filePath, 'utf8')

function replaceOrFail(from, to, label) {
  if (!content.includes(from)) {
    console.error(`❌ Não encontrei o trecho: ${label}`)
    process.exit(1)
  }

  content = content.replace(from, to)
  console.log(`✅ ${label}`)
}

if (!content.includes('const coverImage =')) {
  replaceOrFail(
    `  const isCurrentEpisodePlaying =
    currentEpisode?.id === todayEpisode?.id && isPlaying`,
    `  const coverImage =
    todayEpisode?.cover_image_url ||
    todayEpisode?.series?.cover_image_url ||
    ''

  const isCurrentEpisodePlaying =
    currentEpisode?.id === todayEpisode?.id && isPlaying`,
    'coverImage adicionado'
  )
} else {
  console.log('ℹ️ coverImage já existe.')
}

const newAudioSection = `
        {/* Áudio do Dia */}
        <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-slate-900/80 p-4 shadow-[0_18px_55px_rgba(0,0,0,0.32)] backdrop-blur-sm">
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-16 h-44 w-44 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.16),transparent_36%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))]" />

          <div className="relative">
            <div className="mb-4">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-300">
                Áudio de hoje
              </p>

              <h2 className="mt-1.5 text-[1.25rem] font-black leading-tight tracking-[-0.04em] text-white">
                {todayEpisode.title}
              </h2>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-slate-300">
                  {todayEpisode.bible_reference || 'Devocional Diário'}
                </span>

                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-slate-300">
                  {durationLabel}
                </span>

                {todayEpisode.series?.title && (
                  <span className="rounded-full border border-blue-300/15 bg-blue-500/10 px-2.5 py-1 text-blue-100">
                    {todayEpisode.series.icon_emoji} {todayEpisode.series.title}
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handlePlay}
              className="group relative block w-full overflow-hidden rounded-[26px] border border-white/10 bg-slate-950/60 text-left shadow-inner"
              aria-label="Tocar episódio"
            >
              <div className="relative aspect-video w-full overflow-hidden">
                {coverImage ? (
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                    style={{
                      backgroundImage: \`url(\${coverImage})\`,
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-slate-950 to-slate-900" />
                )}

                <div className="absolute inset-0 bg-gradient-to-br from-black/35 via-black/25 to-black/72" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10" />

                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-white/25 bg-white/14 text-white shadow-[0_16px_38px_rgba(0,0,0,0.42)] backdrop-blur-md transition-all group-hover:scale-105 group-hover:bg-white/20">
                    <span className="absolute h-16 w-16 rounded-full bg-blue-500/20 blur-xl" />

                    <svg
                      className={isCurrentEpisodePlaying ? 'relative h-7 w-7' : 'relative h-7 w-7 ml-0.5'}
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      {isCurrentEpisodePlaying ? (
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                      ) : (
                        <path d="M8 5v14l11-7z" />
                      )}
                    </svg>
                  </div>
                </div>

                <div className="absolute bottom-4 left-4 right-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-200/90">
                    {isCurrentEpisodePlaying ? 'Ouvindo agora' : 'Tocar devocional'}
                  </p>
                </div>
              </div>
            </button>

            <div className="mt-4 rounded-[22px] border border-white/10 bg-slate-950/45 p-4">
              <p className="text-sm leading-relaxed text-slate-300">
                {todayEpisode.description ||
                  'Receba a reflexão de hoje e acompanhe a Palavra enquanto ouve.'}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleFavorite}
                className={
                  isFavorite
                    ? 'flex h-10 items-center justify-center gap-2 rounded-full border border-red-300/20 bg-red-500/15 px-3 text-xs font-semibold text-red-100 transition-all active:scale-[0.98]'
                    : 'flex h-10 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 text-xs font-semibold text-white/80 transition-all hover:bg-white/10 active:scale-[0.98]'
                }
              >
                <span>{isFavorite ? '❤️' : '♡'}</span>
                <span>{isFavorite ? 'Salvo' : 'Favorito'}</span>
              </button>

              <button
                type="button"
                onClick={handleShareEpisode}
                disabled={sharingEpisode}
                className="flex h-10 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 text-xs font-semibold text-white/80 transition-all hover:bg-white/10 active:scale-[0.98] disabled:opacity-60"
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
                    : 'flex h-10 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 text-xs font-semibold text-white/80 transition-all hover:bg-white/10 active:scale-[0.98] disabled:opacity-50'
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

fs.writeFileSync(filePath, content, 'utf8')

console.log('✅ Card do Áudio de Hoje agora usa thumbnail do episódio.')