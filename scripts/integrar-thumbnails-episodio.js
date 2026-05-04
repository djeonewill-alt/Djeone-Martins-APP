const fs = require('fs')
const path = require('path')

const filePath = path.join(
  process.cwd(),
  'app',
  'admin',
  'novo-episodio',
  'page.tsx'
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

if (!content.includes('episodeThumbnailOptions')) {
  replaceOrFail(
    `  const [episodeImageUrl, setEpisodeImageUrl] = useState('')
  const [useSeriesImage, setUseSeriesImage] = useState(true)
  const [selectedSeriesImage, setSelectedSeriesImage] = useState<string | null>(null)`,
    `  const [episodeImageUrl, setEpisodeImageUrl] = useState('')
  const [useSeriesImage, setUseSeriesImage] = useState(true)
  const [selectedSeriesImage, setSelectedSeriesImage] = useState<string | null>(null)
  const [episodeThumbnailOptions, setEpisodeThumbnailOptions] = useState<BackgroundImage[]>([])
  const [selectedEpisodeThumbnailIndex, setSelectedEpisodeThumbnailIndex] = useState<number | null>(null)
  const [generatingEpisodeThumbnails, setGeneratingEpisodeThumbnails] = useState(false)`,
    'Estados de thumbnail adicionados'
  )
} else {
  console.log('ℹ️ Estados de thumbnail já existem.')
}

if (!content.includes('const handleGenerateEpisodeThumbnails')) {
  const insertBefore = `  const handleTranscribeAudio = async () => {`

  const newFunctions = `  const handleGenerateEpisodeThumbnails = async () => {
    const sourceText = [
      formData.title,
      formData.description,
      formData.bible_reference,
      selectedDailyQuote,
      transcriptionText.slice(0, 900),
    ]
      .filter(Boolean)
      .join('\\n')
      .trim()

    if (sourceText.length < 20) {
      alert('❌ Preencha pelo menos o título, descrição ou transcrição para buscar thumbnails.')
      return
    }

    setGeneratingEpisodeThumbnails(true)

    try {
      const response = await fetch('/api/images/search-backgrounds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quoteText: sourceText,
        }),
      })

      const data = await response.json()

      if (!response.ok && !data.images) {
        throw new Error(data.error || 'Erro ao buscar thumbnails.')
      }

      const images = ((data.images || []) as BackgroundImage[]).slice(0, 3)

      if (!images.length) {
        throw new Error('Nenhuma imagem encontrada.')
      }

      setEpisodeThumbnailOptions(images)
      setSelectedEpisodeThumbnailIndex(0)
      setEpisodeImageUrl(images[0].url)
      setUseSeriesImage(false)

      alert('✅ 3 thumbnails foram sugeridas. Escolha a melhor para o episódio.')
    } catch (error) {
      console.error('Erro ao gerar thumbnails:', error)
      alert('❌ ' + getErrorMessage(error))
    } finally {
      setGeneratingEpisodeThumbnails(false)
    }
  }

  const handleSelectEpisodeThumbnail = (image: BackgroundImage, index: number) => {
    setSelectedEpisodeThumbnailIndex(index)
    setEpisodeImageUrl(image.url)
    setUseSeriesImage(false)
  }

`

  replaceOrFail(
    insertBefore,
    newFunctions + insertBefore,
    'Funções de thumbnail adicionadas'
  )
} else {
  console.log('ℹ️ Funções de thumbnail já existem.')
}

if (!content.includes('Sugerir 3 thumbnails com Pexels')) {
  replaceOrFail(
    `            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">`,
    `            <div className="space-y-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h5 className="text-sm font-bold text-white">
                      🎧 Thumbnail do Áudio
                    </h5>

                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                      Gere 3 opções com base no título, descrição e transcrição. A imagem escolhida será usada no card do áudio.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateEpisodeThumbnails}
                  disabled={generatingEpisodeThumbnails}
                  className="mt-4 w-full rounded-lg bg-blue-600 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  {generatingEpisodeThumbnails
                    ? '⏳ Buscando thumbnails...'
                    : '🎨 Sugerir 3 thumbnails com Pexels'}
                </button>

                {episodeThumbnailOptions.length > 0 && (
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {episodeThumbnailOptions.map((image, index) => (
                      <button
                        key={image.id || image.url}
                        type="button"
                        onClick={() => handleSelectEpisodeThumbnail(image, index)}
                        className={
                          selectedEpisodeThumbnailIndex === index
                            ? 'overflow-hidden rounded-xl border-2 border-blue-400 bg-slate-900 text-left'
                            : 'overflow-hidden rounded-xl border-2 border-slate-700 bg-slate-900 text-left hover:border-slate-500'
                        }
                      >
                        <img
                          src={image.preview_url || image.url}
                          alt={image.alt || 'Thumbnail sugerida'}
                          className="h-28 w-full object-cover"
                        />

                        <div className="p-3">
                          <p className="text-xs font-semibold text-white">
                            Opção {index + 1}
                          </p>

                          <p className="mt-1 text-[11px] text-slate-500">
                            {selectedEpisodeThumbnailIndex === index
                              ? '✅ Thumbnail escolhida'
                              : 'Clique para escolher'}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <label className="flex items-center gap-2 cursor-pointer">`,
    'UI de thumbnails adicionada'
  )
} else {
  console.log('ℹ️ UI de thumbnails já existe.')
}

fs.writeFileSync(filePath, content, 'utf8')

console.log('✅ Integração de thumbnails do episódio concluída.')