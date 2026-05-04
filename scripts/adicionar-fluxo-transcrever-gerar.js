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

const functionName = 'const handleTranscribeAndGenerateQuote'

if (!content.includes(functionName)) {
  const insertBefore = '  const handleSelectSuggestion = (suggestion: DailyQuoteSuggestion, index: number) => {'

  if (!content.includes(insertBefore)) {
    console.error('❌ Não encontrei o ponto para inserir a função automática.')
    console.error('Procurei por:', insertBefore)
    process.exit(1)
  }

  const newFunction = `  const handleTranscribeAndGenerateQuote = async () => {
    if (!audioUrl) {
      alert('❌ Envie ou grave um áudio primeiro.')
      return
    }

    setTranscribing(true)
    setGeneratingQuote(true)

    try {
      const transcribeResponse = await fetch('/api/ai/transcribe-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioUrl,
        }),
      })

      const transcribeData = await transcribeResponse.json()

      if (!transcribeResponse.ok) {
        throw new Error(transcribeData.error || 'Erro ao transcrever áudio.')
      }

      const generatedTranscription = String(
        transcribeData.transcriptionText || ''
      ).trim()

      if (generatedTranscription.length < 100) {
        throw new Error(
          'A transcrição gerada ficou muito curta. Verifique se o áudio foi enviado corretamente.'
        )
      }

      setTranscriptionText(generatedTranscription)

      const quoteResponse = await fetch('/api/ai/generate-daily-quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcriptionText: generatedTranscription,
          title: formData.title,
          bibleReference: formData.bible_reference,
        }),
      })

      const quoteData = await quoteResponse.json()

      if (!quoteResponse.ok) {
        throw new Error(quoteData.error || 'Erro ao gerar sugestões.')
      }

      const suggestions = (quoteData.suggestions || []) as DailyQuoteSuggestion[]

      if (!suggestions.length) {
        throw new Error('Nenhuma sugestão foi gerada.')
      }

      setQuoteSuggestions(suggestions)
      setSelectedSuggestionIndex(0)
      setSelectedDailyQuote(suggestions[0].quote_text)
      setCorrectionNote('')
      resetCardData()

      const providerMessage =
        quoteData.provider === 'openai'
          ? 'com IA'
          : 'com modo local'

      alert('✅ Transcrição e sugestões geradas ' + providerMessage + '!')
    } catch (error) {
      console.error('Erro no fluxo automático:', error)
      alert('❌ ' + getErrorMessage(error))
    } finally {
      setTranscribing(false)
      setGeneratingQuote(false)
    }
  }

`

  content = content.replace(insertBefore, newFunction + insertBefore)
  console.log('✅ Função handleTranscribeAndGenerateQuote adicionada.')
} else {
  console.log('ℹ️ A função automática já existe. Não adicionei de novo.')
}

const buttonText = 'Transcrever e gerar frases'

if (!content.includes(buttonText)) {
  const uiMarker = `                {!audioUrl && (`

  if (!content.includes(uiMarker)) {
    console.error('❌ Não encontrei o ponto para inserir o botão automático.')
    console.error('Procurei por:', uiMarker)
    process.exit(1)
  }

  const newButton = `                <button
                  type="button"
                  onClick={handleTranscribeAndGenerateQuote}
                  disabled={!audioUrl || transcribing || generatingQuote}
                  className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {transcribing || generatingQuote
                    ? '⏳ Processando áudio e frases...'
                    : '🚀 Transcrever e gerar frases'}
                </button>

`

  content = content.replace(uiMarker, newButton + uiMarker)
  console.log('✅ Botão “Transcrever e gerar frases” adicionado.')
} else {
  console.log('ℹ️ O botão automático já existe. Não adicionei de novo.')
}

fs.writeFileSync(filePath, content, 'utf8')

console.log('✅ Fluxo automático adicionado com sucesso.')