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

if (!content.includes('autoGenerateEpisodeMetadata')) {
  replaceOrFail(
    `  const [useDefaultTime, setUseDefaultTime] = useState(false)`,
    `  const [useDefaultTime, setUseDefaultTime] = useState(false)
  const [autoGenerateEpisodeMetadata, setAutoGenerateEpisodeMetadata] = useState(true)
  const [generatingEpisodeMetadata, setGeneratingEpisodeMetadata] = useState(false)`,
    'Estados de metadados adicionados'
  )
} else {
  console.log('ℹ️ Estados de metadados já existem.')
}

if (!content.includes('const handleGenerateEpisodeMetadataFromTranscription')) {
  const insertBefore = `  const handleGenerateDailyQuote = async () => {`

  const metadataFunction = `  const handleGenerateEpisodeMetadataFromTranscription = async (sourceText: string) => {
    const cleanedTranscription = sourceText.trim()

    if (cleanedTranscription.length < 100) {
      return null
    }

    setGeneratingEpisodeMetadata(true)

    try {
      const response = await fetch('/api/ai/generate-episode-metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcriptionText: cleanedTranscription,
          bibleReference: formData.bible_reference,
          currentTitle: formData.title,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar título e descrição.')
      }

      const generatedTitle = String(data.title || '').trim()
      const generatedDescription = String(data.description || '').trim()

      setFormData((current) => ({
        ...current,
        title: generatedTitle || current.title,
        description: generatedDescription || current.description,
      }))

      return {
        title: generatedTitle,
        description: generatedDescription,
        themeKeywords: data.theme_keywords || [],
      }
    } catch (error) {
      console.error('Erro ao gerar título e descrição:', error)
      alert('⚠️ Não consegui gerar título e descrição automaticamente. Vou continuar gerando as frases.')
      return null
    } finally {
      setGeneratingEpisodeMetadata(false)
    }
  }

`

  replaceOrFail(
    insertBefore,
    metadataFunction + insertBefore,
    'Função de gerar título/descrição adicionada'
  )
} else {
  console.log('ℹ️ Função de metadados já existe.')
}

if (!content.includes('await handleGenerateEpisodeMetadataFromTranscription(generatedTranscription)')) {
  replaceOrFail(
    `      setTranscriptionText(generatedTranscription)

      const quoteResponse = await fetch('/api/ai/generate-daily-quote', {`,
    `      setTranscriptionText(generatedTranscription)

      if (autoGenerateEpisodeMetadata) {
        await handleGenerateEpisodeMetadataFromTranscription(generatedTranscription)
      }

      const quoteResponse = await fetch('/api/ai/generate-daily-quote', {`,
    'Chamada automática de título/descrição adicionada'
  )
} else {
  console.log('ℹ️ Chamada automática já existe.')
}

if (!content.includes('Gerar título e descrição automaticamente')) {
  replaceOrFail(
    `                <div className="bg-blue-950/40 border border-blue-900/60 rounded-lg p-3">
                  <p className="text-xs text-blue-100 leading-relaxed">
                    Fluxo recomendado: envie o áudio → transcreva → gere frases → escolha a frase → corrija se necessário → gere 3 cards → escolha o card final.
                  </p>
                </div>`,
    `                <div className="bg-blue-950/40 border border-blue-900/60 rounded-lg p-3">
                  <p className="text-xs text-blue-100 leading-relaxed">
                    Fluxo recomendado: envie o áudio → transcreva → gere título/descrição → gere frases → escolha a frase → corrija se necessário → gere 3 cards → escolha o card final.
                  </p>
                </div>

                <label className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-900/70 p-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoGenerateEpisodeMetadata}
                    onChange={(e) => setAutoGenerateEpisodeMetadata(e.target.checked)}
                    className="mt-1"
                  />

                  <div>
                    <p className="text-sm font-semibold text-slate-200">
                      Gerar título e descrição automaticamente
                    </p>

                    <p className="text-xs text-slate-500 mt-1">
                      Use nos áudios novos do dia. Para séries antigas com título pronto, desmarque esta opção.
                    </p>

                    {generatingEpisodeMetadata && (
                      <p className="text-xs text-blue-300 mt-2">
                        ⏳ Gerando título e descrição...
                      </p>
                    )}
                  </div>
                </label>`,
    'Checkbox de título/descrição adicionado'
  )
} else {
  console.log('ℹ️ Checkbox já existe.')
}

content = content.replace(
  `disabled={!audioUrl || transcribing || generatingQuote}`,
  `disabled={!audioUrl || transcribing || generatingQuote || generatingEpisodeMetadata}`
)

content = content.replace(
  `? '⏳ Processando áudio e frases...'`,
  `? '⏳ Processando áudio, título e frases...'`
)

fs.writeFileSync(filePath, content, 'utf8')

console.log('✅ Integração de título e descrição concluída.')