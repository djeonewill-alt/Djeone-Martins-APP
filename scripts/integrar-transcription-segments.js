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

function replaceOnce(from, to, label) {
  if (!content.includes(from)) {
    console.log(`ℹ️ Trecho não encontrado ou já alterado: ${label}`)
    return
  }

  content = content.replace(from, to)
  console.log(`✅ ${label}`)
}

replaceOnce(
  `  const [transcriptionText, setTranscriptionText] = useState('')`,
  `  const [transcriptionText, setTranscriptionText] = useState('')
  const [transcriptionSegments, setTranscriptionSegments] = useState<Array<{ start: number; end: number; text: string }>>([])`,
  'Estado transcriptionSegments'
)

replaceOnce(
  `    setTranscriptionText('')`,
  `    setTranscriptionText('')
    setTranscriptionSegments([])`,
  'Reset dos segmentos'
)

replaceOnce(
  `      setTranscriptionText(data.transcriptionText || '')`,
  `      setTranscriptionText(data.transcriptionText || '')
      setTranscriptionSegments(Array.isArray(data.transcriptionSegments) ? data.transcriptionSegments : [])`,
  'Segmentos após transcrição direta'
)

replaceOnce(
  `      setTranscriptionText(generatedTranscription)`,
  `      const generatedSegments = Array.isArray(transcribeData.transcriptionSegments)
        ? transcribeData.transcriptionSegments
        : []

      setTranscriptionText(generatedTranscription)
      setTranscriptionSegments(generatedSegments)`,
  'Segmentos após gravação/transcrição'
)

replaceOnce(
  `            transcription_text: hasTranscription ? transcriptionText.trim() : null,`,
  `            transcription_text: hasTranscription ? transcriptionText.trim() : null,
            transcription_segments:
              hasTranscription && transcriptionSegments.length > 0
                ? transcriptionSegments
                : null,`,
  'Salvar transcription_segments'
)

fs.writeFileSync(filePath, content, 'utf8')

console.log('✅ Admin ajustado para guardar segmentos da transcrição.')
