'use client'

import { useState, useEffect, FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AudioRecorder from '@/components/recorder/AudioRecorder'
import type { DailyQuoteSuggestion } from '@/lib/supabase'
import { CARD_TEMPLATES, dataUrlToBlob, generateCardDataUrl, type CardTemplate } from '@/lib/daily-quote-card-generator'

type Series = {
  id: string
  title: string
  cover_image_url: string | null
}

type BackgroundImage = {
  id: string
  provider: string
  url: string
  preview_url: string
  photographer?: string
  photographer_url?: string
  source_page_url?: string
  alt?: string
  query: string
  theme_keywords: string[]
  quote_background_id?: string | null
  pexels_photo_id?: string | null
}

type CardOption = {
  id: string
  template: CardTemplate
  label: string
  source_image_url: string
  source_image_provider: string
  theme_keywords: string[]
  preview_data_url: string
  photographer?: string | null
  photographer_url?: string | null
  source_page_url?: string | null
  quote_background_id?: string | null
  pexels_photo_id?: string | null
  query_used?: string | null
}

function getLocalDateString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  try {
    return JSON.stringify(error)
  } catch {
    return 'Erro desconhecido'
  }
}

function normalizeBasicPortuguese(text: string) {
  let value = text
    .replace(/\s+/g, ' ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim()

  const replacements: [RegExp, string][] = [
    [/\bjesus\b/gi, 'Jesus'],
    [/\bdeus\b/gi, 'Deus'],
    [/\bsenhor\b/gi, 'Senhor'],
    [/\bespirito santo\b/gi, 'Espírito Santo'],
    [/\bespirito\b/gi, 'Espírito'],
    [/\bnao\b/gi, 'não'],
    [/\bvoce\b/gi, 'você'],
    [/\bagua\b/gi, 'água'],
    [/\bgraca\b/gi, 'graça'],
    [/\bfe\b/gi, 'fé'],
    [/\bcoracao\b/gi, 'coração'],
    [/\boracao\b/gi, 'oração'],
    [/\bprotecao\b/gi, 'proteção'],
    [/\blibertacao\b/gi, 'libertação'],
    [/\bsalvacao\b/gi, 'salvação'],
    [/\bperdao\b/gi, 'perdão'],
  ]

  replacements.forEach(([regex, replacement]) => {
    value = value.replace(regex, replacement)
  })

  value = value.replace(/\s+([,.!?;:])/g, '$1')
  value = value.replace(/([,.!?;:])([^\s])/g, '$1 $2')

  if (value.length > 0) {
    value = value.charAt(0).toUpperCase() + value.slice(1)
  }

  if (value && !/[.!?…]$/.test(value)) {
    value += '.'
  }

  return value
}

export default function NovoEpisodio() {
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<'record' | 'upload'>('record')
  const [series, setSeries] = useState<Series[]>([])

  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [generatingQuote, setGeneratingQuote] = useState(false)
  const [generatingCards, setGeneratingCards] = useState(false)
  const [correctingQuote, setCorrectingQuote] = useState(false)

  const [audioUrl, setAudioUrl] = useState('')
  const [audioDuration, setAudioDuration] = useState(0)

  const [episodeImageUrl, setEpisodeImageUrl] = useState('')
  const [useSeriesImage, setUseSeriesImage] = useState(true)
  const [selectedSeriesImage, setSelectedSeriesImage] = useState<string | null>(null)
  const [episodeThumbnailOptions, setEpisodeThumbnailOptions] = useState<BackgroundImage[]>([])
  const [selectedEpisodeThumbnailIndex, setSelectedEpisodeThumbnailIndex] = useState<number | null>(null)
  const [generatingEpisodeThumbnails, setGeneratingEpisodeThumbnails] = useState(false)

  const [useDefaultTime, setUseDefaultTime] = useState(false)
  const [autoGenerateEpisodeMetadata, setAutoGenerateEpisodeMetadata] = useState(true)
  const [generatingEpisodeMetadata, setGeneratingEpisodeMetadata] = useState(false)

  const [enableDailyQuote, setEnableDailyQuote] = useState(true)
  const [transcriptionText, setTranscriptionText] = useState('')
  const [transcriptionSegments, setTranscriptionSegments] = useState<Array<{ start: number; end: number; text: string }>>([])
  const [quoteSuggestions, setQuoteSuggestions] = useState<DailyQuoteSuggestion[]>([])
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<number | null>(null)
  const [selectedDailyQuote, setSelectedDailyQuote] = useState('')
  const [correctionNote, setCorrectionNote] = useState('')

  const [cardOptions, setCardOptions] = useState<CardOption[]>([])
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null)

  const [formData, setFormData] = useState({
    series_id: '',
    episode_number: 1,
    bible_reference: '',
    title: '',
    description: '',
    status: 'draft' as 'draft' | 'published',
    scheduled_date: '',
    scheduled_time: '06:00',
  })

  useEffect(() => {
    loadSeries()
  }, [])

  useEffect(() => {
    if (formData.series_id) {
      const selectedSeries = series.find((s) => s.id === formData.series_id)
      setSelectedSeriesImage(selectedSeries?.cover_image_url || null)
    }
  }, [formData.series_id, series])

  const resetCardData = () => {
    setCardOptions([])
    setSelectedCardIndex(null)
  }

  const resetAutomationData = () => {
    setTranscriptionText('')
    setTranscriptionSegments([])
    setQuoteSuggestions([])
    setSelectedSuggestionIndex(null)
    setSelectedDailyQuote('')
    setCorrectionNote('')
    resetCardData()
  }

  const loadSeries = async () => {
    try {
      const { data, error } = await supabase
        .from('series')
        .select('id, title, cover_image_url')
        .order('created_at', { ascending: false })

      if (error) throw error

      setSeries(data || [])
    } catch (error) {
      console.error('Erro ao carregar séries:', error)
    }
  }

  const handleRecordingComplete = async (blob: Blob, duration: number) => {
    setUploading(true)

    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', blob, 'recording.webm')
      uploadFormData.append('type', 'audio')

      const response = await fetch('/api/upload-audio', {
        method: 'POST',
        body: uploadFormData,
      })

      const data = await response.json()

      if (data.url) {
        setAudioUrl(data.url)
        setAudioDuration(Math.round(duration))
        resetAutomationData()
        alert('✅ Gravação enviada com sucesso!')
      } else {
        throw new Error(data.error || 'Erro ao fazer upload')
      }
    } catch (error) {
      console.error('Erro no upload:', error)
      alert('❌ Erro ao enviar gravação. Tente novamente.')
    } finally {
      setUploading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]

    if (!file) return

    setUploading(true)

    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      uploadFormData.append('type', 'audio')

      const response = await fetch('/api/upload-audio', {
        method: 'POST',
        body: uploadFormData,
      })

      const data = await response.json()

      if (data.url) {
        setAudioUrl(data.url)
        resetAutomationData()

        const audio = new Audio(data.url)

        audio.addEventListener('loadedmetadata', () => {
          setAudioDuration(Math.round(audio.duration))
        })

        alert('✅ Arquivo enviado com sucesso!')
      } else {
        throw new Error(data.error || 'Erro ao fazer upload')
      }
    } catch (error) {
      console.error('Erro no upload:', error)
      alert('❌ Erro ao enviar arquivo. Tente novamente.')
    } finally {
      setUploading(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]

    if (!file) return

    setUploading(true)

    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      uploadFormData.append('type', 'cover')

      const response = await fetch('/api/upload-audio', {
        method: 'POST',
        body: uploadFormData,
      })

      const data = await response.json()

      if (data.url) {
        setEpisodeImageUrl(data.url)
        setUseSeriesImage(false)
        alert('✅ Imagem carregada!')
      } else {
        throw new Error(data.error || 'Erro ao fazer upload')
      }
    } catch (error) {
      console.error('Erro no upload:', error)
      alert('❌ Erro ao fazer upload da imagem. Tente novamente.')
    } finally {
      setUploading(false)
    }
  }

  const handleGenerateEpisodeThumbnails = async () => {
    const sourceText = [
      formData.title,
      formData.description,
      formData.bible_reference,
      selectedDailyQuote,
      transcriptionText.slice(0, 900),
    ]
      .filter(Boolean)
      .join('\n')
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

  const handleTranscribeAudio = async () => {
    if (!audioUrl) {
      alert('❌ Envie ou grave um áudio primeiro.')
      return
    }

    setTranscribing(true)

    try {
      const response = await fetch('/api/ai/transcribe-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioUrl,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao transcrever áudio.')
      }

      setTranscriptionText(data.transcriptionText || '')
      setTranscriptionSegments(Array.isArray(data.transcriptionSegments) ? data.transcriptionSegments : [])
      alert('✅ Transcrição gerada com sucesso!')
    } catch (error) {
      console.error('Erro ao transcrever:', error)
      alert(`❌ ${getErrorMessage(error)}`)
    } finally {
      setTranscribing(false)
    }
  }

  const handleGenerateEpisodeMetadataFromTranscription = async (sourceText: string) => {
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

  const handleGenerateDailyQuote = async () => {
    const cleanedTranscription = transcriptionText.trim()

    if (cleanedTranscription.length < 100) {
      alert('❌ A transcrição está muito curta. Gere ou cole uma transcrição maior.')
      return
    }

    setGeneratingQuote(true)

    try {
      const response = await fetch('/api/ai/generate-daily-quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcriptionText: cleanedTranscription,
          title: formData.title,
          bibleReference: formData.bible_reference,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar sugestões.')
      }

      const suggestions = (data.suggestions || []) as DailyQuoteSuggestion[]

      if (!suggestions.length) {
        throw new Error('Nenhuma sugestão foi gerada.')
      }

      setQuoteSuggestions(suggestions)
      setSelectedSuggestionIndex(0)
      setSelectedDailyQuote(suggestions[0].quote_text)
      setCorrectionNote('')
      resetCardData()

      const providerMessage =
        data.provider === 'openai'
          ? 'com IA'
          : 'com modo local'

      alert(`✅ Sugestões geradas ${providerMessage}!`)
    } catch (error) {
      console.error('Erro ao gerar Palavra do Dia:', error)
      alert(`❌ ${getErrorMessage(error)}`)
    } finally {
      setGeneratingQuote(false)
    }
  }

  const handleTranscribeAndGenerateQuote = async () => {
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

      const generatedSegments = Array.isArray(transcribeData.transcriptionSegments)
        ? transcribeData.transcriptionSegments
        : []

      setTranscriptionText(generatedTranscription)
      setTranscriptionSegments(generatedSegments)

      if (autoGenerateEpisodeMetadata) {
        await handleGenerateEpisodeMetadataFromTranscription(generatedTranscription)
      }

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

  const handleSelectSuggestion = (suggestion: DailyQuoteSuggestion, index: number) => {
    setSelectedSuggestionIndex(index)
    setSelectedDailyQuote(suggestion.quote_text)
    setCorrectionNote('')
    resetCardData()
  }

  const handleDailyQuoteChange = (text: string) => {
    setSelectedDailyQuote(text)
    setCorrectionNote('')
    resetCardData()
  }

  const handleCorrectDailyQuote = async () => {
    const currentText = selectedDailyQuote.trim()

    if (!currentText) {
      alert('❌ Escreva ou escolha uma frase primeiro.')
      return
    }

    setCorrectingQuote(true)

    try {
      const response = await fetch('/api/ai/correct-daily-quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: currentText,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao corrigir frase.')
      }

      const correctedText = String(data.correctedText || '').trim()

      if (!correctedText) {
        throw new Error('A correção retornou uma frase vazia.')
      }

      setSelectedDailyQuote(correctedText)
      setCorrectionNote(
        data.provider === 'openai'
          ? data.notes || 'Frase revisada com IA.'
          : data.notes || 'Frase revisada com correção local.'
      )
      resetCardData()

      alert(
        data.changed
          ? '✅ Frase corrigida. Revise antes de gerar os cards.'
          : '✅ A frase já parecia correta.'
      )
    } catch (error) {
      console.error('Erro ao corrigir frase:', error)

      const correctedText = normalizeBasicPortuguese(currentText)
      setSelectedDailyQuote(correctedText)
      setCorrectionNote('A correção com IA falhou. Foi aplicada uma correção local básica.')
      resetCardData()

      alert(`⚠️ ${getErrorMessage(error)} Correção local aplicada.`)
    } finally {
      setCorrectingQuote(false)
    }
  }

  const handleGenerateCardOptions = async () => {
    const quoteText = selectedDailyQuote.trim()

    if (!quoteText) {
      alert('❌ Escolha ou escreva uma frase primeiro.')
      return
    }

    setGeneratingCards(true)

    try {
      const response = await fetch('/api/images/search-backgrounds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quoteText,
        }),
      })

      const data = await response.json()

      if (!response.ok && !data.images) {
        throw new Error(data.error || 'Erro ao buscar imagens.')
      }

      const images = ((data.images || []) as BackgroundImage[]).slice(0, 3)

      if (!images.length) {
        throw new Error('Nenhuma imagem encontrada.')
      }

      const options: CardOption[] = []

      for (let index = 0; index < CARD_TEMPLATES.length; index += 1) {
        const template = CARD_TEMPLATES[index]
        const image = images[index] || images[0]

        const previewDataUrl = await generateCardDataUrl({
          quoteText,
          bibleReference: formData.bible_reference,
          episodeTitle: formData.title,
          imageUrl: image.url,
          template: template.template,
        })

        options.push({
          id: `${template.template}-${Date.now()}-${index}`,
          template: template.template,
          label: template.label,
          source_image_url: image.url,
          source_image_provider: image.provider,
          theme_keywords: image.theme_keywords || data.theme_keywords || [],
          preview_data_url: previewDataUrl,
          photographer: image.photographer || null,
          photographer_url: image.photographer_url || null,
          source_page_url: image.source_page_url || null,
          quote_background_id: image.quote_background_id || null,
          pexels_photo_id: image.pexels_photo_id || null,
          query_used: image.query || data.query || null,
        })
      }

      setCardOptions(options)
      setSelectedCardIndex(0)
      alert('✅ 3 opções de card foram geradas!')
    } catch (error) {
      console.error('Erro ao gerar cards:', error)
      alert(`❌ ${getErrorMessage(error)}`)
    } finally {
      setGeneratingCards(false)
    }
  }

  const uploadGeneratedCard = async (dataUrl: string) => {
    const blob = dataUrlToBlob(dataUrl)
    const uploadFormData = new FormData()

    uploadFormData.append(
      'file',
      blob,
      `palavra-do-dia-${Date.now()}.png`
    )
    uploadFormData.append('type', 'cover')

    const response = await fetch('/api/upload-audio', {
      method: 'POST',
      body: uploadFormData,
    })

    const data = await response.json()

    if (!response.ok || !data.url) {
      throw new Error(data.error || 'Erro ao salvar card no R2.')
    }

    return data.url as string
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    const safeEpisodeNumber =
      Number.isFinite(Number(formData.episode_number)) &&
      Number(formData.episode_number) > 0
        ? Number(formData.episode_number)
        : 1

    if (!formData.series_id || !formData.bible_reference || !formData.title) {
      alert('❌ Preencha todos os campos obrigatórios!')
      return
    }

    if (formData.status === 'published' && !audioUrl) {
      alert('❌ Grave ou faça upload do áudio antes de publicar!')
      return
    }

    if (formData.scheduled_date && !audioUrl) {
      alert('❌ Grave ou faça upload do áudio antes de agendar!')
      return
    }

    if (enableDailyQuote && selectedDailyQuote.trim().length > 0 && selectedDailyQuote.trim().length < 20) {
      alert('❌ A Palavra do Dia está muito curta.')
      return
    }

    setLoading(true)

    try {
      const finalImageUrl = useSeriesImage ? null : episodeImageUrl || null

      let scheduledPublishAt = null

      if (formData.scheduled_date) {
        const time = useDefaultTime ? '06:00' : formData.scheduled_time
        scheduledPublishAt = `${formData.scheduled_date}T${time}:00`
      }

      const hasTranscription = transcriptionText.trim().length > 0
      const hasQuoteSuggestions = quoteSuggestions.length > 0
      const hasDailyQuote = enableDailyQuote && selectedDailyQuote.trim().length > 0

      const { data: newEpisode, error } = await supabase
        .from('episodes')
        .insert([
          {
            series_id: formData.series_id,
            episode_number: safeEpisodeNumber,
            bible_reference: formData.bible_reference,
            title: formData.title,
            description: formData.description,
            audio_url: audioUrl || null,
            duration_seconds: audioDuration,
            cover_image_url: finalImageUrl,
            status: scheduledPublishAt ? 'draft' : formData.status,
            scheduled_publish_at: scheduledPublishAt,

            transcription_text: hasTranscription ? transcriptionText.trim() : null,
            transcription_segments:
              hasTranscription && transcriptionSegments.length > 0
                ? transcriptionSegments
                : null,
            transcription_status: hasTranscription ? 'completed' : 'not_started',
            transcription_error: null,
            transcription_generated_at: hasTranscription ? new Date().toISOString() : null,

            daily_quote_status: hasDailyQuote ? 'completed' : 'not_started',
            daily_quote_suggestions: hasQuoteSuggestions ? quoteSuggestions : null,
            daily_quote_generated_at: hasQuoteSuggestions ? new Date().toISOString() : null,
          },
        ])
        .select('id')
        .single()

      if (error) throw error

      if (hasDailyQuote && newEpisode?.id) {
        const selectedCard =
          selectedCardIndex !== null
            ? cardOptions[selectedCardIndex]
            : null

        let finalCardImageUrl: string | null = null

        if (selectedCard?.preview_data_url) {
          finalCardImageUrl = await uploadGeneratedCard(selectedCard.preview_data_url)
        }

        const quoteStatus = scheduledPublishAt
          ? 'scheduled'
          : formData.status === 'published'
          ? 'published'
          : 'draft'

        const quoteDate = formData.scheduled_date || getLocalDateString()

        const generatedCardOptionsForDb = cardOptions.map((option) => ({
          id: option.id,
          template: option.template,
          label: option.label,
          source_image_url: option.source_image_url,
          source_image_provider: option.source_image_provider,
          theme_keywords: option.theme_keywords,
          photographer: option.photographer || null,
          photographer_url: option.photographer_url || null,
          source_page_url: option.source_page_url || null,
          quote_background_id: option.quote_background_id || null,
          pexels_photo_id: option.pexels_photo_id || null,
          query_used: option.query_used || null,
        }))

        const quotePayload = {
          episode_id: newEpisode.id,
          quote_text: selectedDailyQuote.trim(),
          background_image_url:
            selectedCard?.source_image_url || finalImageUrl || selectedSeriesImage || null,
          card_image_url: finalCardImageUrl,
          date: quoteDate,
          status: quoteStatus,
          scheduled_publish_at: scheduledPublishAt,
          published_at: quoteStatus === 'published' ? new Date().toISOString() : null,
          source_type: hasQuoteSuggestions ? 'ai_suggested' : 'manual',
          ai_suggestions: hasQuoteSuggestions ? quoteSuggestions : null,
          selected_suggestion_index: selectedSuggestionIndex,
          share_count: 0,
          like_count: 0,

          theme_keywords: selectedCard?.theme_keywords || null,
          source_image_provider: selectedCard?.source_image_provider || null,
          source_image_url: selectedCard?.source_image_url || null,
          selected_template: selectedCard?.template || null,
          generated_card_options:
            generatedCardOptionsForDb.length > 0 ? generatedCardOptionsForDb : null,
          card_generation_status: finalCardImageUrl
            ? 'completed'
            : cardOptions.length > 0
            ? 'completed'
            : 'not_started',
          card_generation_error: null,
          card_generated_at: finalCardImageUrl ? new Date().toISOString() : null,
          quote_background_id: selectedCard?.quote_background_id || null,
        }

        const { data: existingDailyQuote, error: existingDailyQuoteError } = await supabase
          .from('daily_quotes')
          .select('id, date, quote_text')
          .eq('date', quoteDate)
          .maybeSingle()

        if (existingDailyQuoteError) throw existingDailyQuoteError

        if (existingDailyQuote?.id) {
          const shouldReplace = window.confirm(
            'Já existe uma Palavra do Dia para esta data. Deseja substituir pela nova?'
          )

          if (shouldReplace) {
            const { error: updateQuoteError } = await supabase
              .from('daily_quotes')
              .update(quotePayload)
              .eq('id', existingDailyQuote.id)

            if (updateQuoteError) throw updateQuoteError
          }
        } else {
          const { error: quoteError } = await supabase
            .from('daily_quotes')
            .insert([quotePayload])

          if (quoteError) throw quoteError
        }
      }

      const message = scheduledPublishAt
        ? hasDailyQuote
          ? `✅ Episódio e Palavra do Dia agendados para ${new Date(scheduledPublishAt).toLocaleString('pt-BR')}!`
          : `✅ Episódio agendado para ${new Date(scheduledPublishAt).toLocaleString('pt-BR')}!`
        : formData.status === 'published'
        ? hasDailyQuote
          ? '✅ Episódio e Palavra do Dia publicados com sucesso!'
          : '✅ Episódio publicado com sucesso!'
        : hasDailyQuote
        ? '✅ Rascunho salvo com Palavra do Dia!'
        : '✅ Rascunho salvo com sucesso!'

      alert(message)
      router.push('/admin')
    } catch (error) {
      console.error('Erro ao criar episódio:', error)
      alert(`❌ Erro ao criar episódio: ${getErrorMessage(error)}`)
    } finally {
      setLoading(false)
    }
  }

  const selectedTime = useDefaultTime ? '06:00' : formData.scheduled_time

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-4xl mx-auto p-6">
          <Link href="/admin" className="text-slate-400 hover:text-white mb-3 inline-block text-sm">
            ← Voltar
          </Link>

          <h1 className="text-2xl font-bold text-white">🎙️ Novo Episódio</h1>

          <p className="text-slate-400 text-sm mt-1">
            Publicar ou agendar devocional com Palavra do Dia automática
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-5">
        <div className="flex gap-2 mb-5">
          <button
            type="button"
            onClick={() => setActiveTab('record')}
            className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
              activeTab === 'record'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            🎙️ Gravar Agora
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
              activeTab === 'upload'
                ? 'bg-yellow-500 text-white'
                : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            📁 Upload de Arquivo
          </button>
        </div>

        {activeTab === 'record' ? (
          <div className="bg-red-600 rounded-xl p-6 mb-5 text-center shadow-lg">
            <AudioRecorder onRecordingComplete={handleRecordingComplete} />

            {uploading && (
              <p className="text-sm text-white/80 mt-3">
                ⏳ Enviando gravação...
              </p>
            )}

            {audioUrl && (
              <div className="mt-4">
                <audio src={audioUrl} controls className="w-full" />
                <p className="text-sm text-white mt-2">✅ Áudio carregado!</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-5">
            <label className="block">
              <span className="text-sm font-semibold text-slate-300 mb-2 block">
                Selecione o arquivo de áudio
              </span>

              <input
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                disabled={uploading}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 focus:border-blue-500 outline-none disabled:opacity-50"
              />
            </label>

            {uploading && (
              <p className="text-sm text-slate-400 mt-2">
                ⏳ Enviando arquivo...
              </p>
            )}

            {audioUrl && (
              <div className="mt-4">
                <audio src={audioUrl} controls className="w-full" />
                <p className="text-sm text-green-400 mt-2">✅ Áudio carregado!</p>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
          <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-3">
            📝 Informações
          </h3>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Série *
            </label>

            <select
              value={formData.series_id}
              onChange={(e) => setFormData({ ...formData, series_id: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 focus:border-blue-500 outline-none"
              required
            >
              <option value="">Selecione a série...</option>

              {series.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Episódio Nº *
            </label>

            <input
              type="number"
              min="1"
              value={
                Number.isFinite(Number(formData.episode_number))
                  ? formData.episode_number
                  : 1
              }
              onChange={(e) => {
                const value = Number(e.target.value)

                setFormData({
                  ...formData,
                  episode_number: Number.isFinite(value) && value > 0 ? value : 1,
                })
              }}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 focus:border-blue-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Referência Bíblica *
            </label>

            <input
              type="text"
              value={formData.bible_reference}
              onChange={(e) => setFormData({ ...formData, bible_reference: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 focus:border-blue-500 outline-none"
              placeholder="Ex: João 11:17-27"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Título do Episódio *
            </label>

            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 focus:border-blue-500 outline-none"
              placeholder="Ex: Eu sou a ressurreição e a vida"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Descrição (opcional)
            </label>

            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 focus:border-blue-500 outline-none"
              rows={3}
              placeholder="Resumo do devocional..."
            />
          </div>

          <div className="border-t border-slate-800 pt-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h4 className="text-sm font-semibold text-slate-300">
                  ✨ Palavra do Dia automática
                </h4>

                <p className="text-xs text-slate-500 mt-1">
                  Transcreva o áudio, gere frases fortes e crie 3 cards prontos para escolher.
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableDailyQuote}
                  onChange={(e) => setEnableDailyQuote(e.target.checked)}
                />

                <span className="text-sm text-slate-300">Ativar</span>
              </label>
            </div>

            {enableDailyQuote && (
              <div className="space-y-4 bg-slate-950 border border-slate-800 rounded-xl p-4">
                <div className="bg-blue-950/40 border border-blue-900/60 rounded-lg p-3">
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
                </label>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleTranscribeAudio}
                    disabled={!audioUrl || transcribing}
                    className="flex-1 bg-purple-600 text-white font-bold py-3 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    {transcribing ? '⏳ Transcrevendo...' : '🎧 Transcrever áudio'}
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerateDailyQuote}
                    disabled={transcriptionText.trim().length < 100 || generatingQuote}
                    className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    {generatingQuote ? '⏳ Gerando...' : '✨ Gerar frases'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleTranscribeAndGenerateQuote}
                  disabled={!audioUrl || transcribing || generatingQuote || generatingEpisodeMetadata}
                  className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {transcribing || generatingQuote
                    ? '⏳ Processando áudio, título e frases...'
                    : '🚀 Transcrever e gerar frases'}
                </button>

                {!audioUrl && (
                  <p className="text-xs text-yellow-400">
                    Envie ou grave um áudio para liberar a transcrição automática.
                  </p>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Transcrição do áudio
                  </label>

                  <textarea
                    value={transcriptionText}
                    onChange={(e) => setTranscriptionText(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 focus:border-purple-500 outline-none"
                    rows={6}
                    placeholder="A transcrição automática aparecerá aqui. Você também pode colar uma transcrição manualmente..."
                  />

                  <p className="text-xs text-slate-500 mt-1">
                    Caracteres: {transcriptionText.trim().length}
                  </p>
                </div>

                {quoteSuggestions.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-3">
                      Sugestões geradas
                    </label>

                    <div className="space-y-3">
                      {quoteSuggestions.map((suggestion, index) => (
                        <button
                          key={`${suggestion.quote_text}-${index}`}
                          type="button"
                          onClick={() => handleSelectSuggestion(suggestion, index)}
                          className={`w-full text-left rounded-xl p-4 border transition-colors ${
                            selectedSuggestionIndex === index
                              ? 'bg-blue-600/20 border-blue-500'
                              : 'bg-slate-800 border-slate-700 hover:border-slate-500'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-1 w-5 h-5 rounded-full border flex items-center justify-center ${
                              selectedSuggestionIndex === index
                                ? 'border-blue-400 bg-blue-500'
                                : 'border-slate-500'
                            }`}>
                              {selectedSuggestionIndex === index && (
                                <div className="w-2 h-2 bg-white rounded-full" />
                              )}
                            </div>

                            <div className="flex-1">
                              <p className="text-white font-medium leading-relaxed">
                                “{suggestion.quote_text}”
                              </p>

                              {suggestion.reason && (
                                <p className="text-xs text-slate-400 mt-2">
                                  {suggestion.reason}
                                </p>
                              )}

                              {typeof suggestion.score === 'number' && (
                                <p className="text-xs text-blue-300 mt-2">
                                  Força devocional: {suggestion.score}/10
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <label className="block text-sm font-semibold text-slate-300">
                      Frase escolhida para a Palavra do Dia
                    </label>

                    <button
                      type="button"
                      onClick={handleCorrectDailyQuote}
                      disabled={!selectedDailyQuote.trim() || correctingQuote}
                      className="rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1.5 text-xs font-bold text-blue-100 hover:bg-blue-500/20 disabled:opacity-50"
                    >
                      {correctingQuote ? '⏳ Corrigindo...' : '✨ Corrigir frase'}
                    </button>
                  </div>

                  <textarea
                    value={selectedDailyQuote}
                    onChange={(e) => handleDailyQuoteChange(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 focus:border-blue-500 outline-none"
                    rows={3}
                    placeholder="Escolha uma sugestão ou escreva a frase final..."
                  />

                  {correctionNote && (
                    <p className="text-xs text-blue-300 mt-2">
                      {correctionNote}
                    </p>
                  )}

                  <p className="text-xs text-slate-500 mt-1">
                    Se editar ou corrigir a frase, gere os cards novamente para atualizar o visual.
                  </p>
                </div>

                {selectedDailyQuote && (
                  <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-blue-300 font-semibold mb-3">
                      Preview textual
                    </p>

                    <blockquote className="text-lg text-white font-semibold leading-relaxed">
                      “{selectedDailyQuote}”
                    </blockquote>

                    <div className="mt-4 pt-3 border-t border-slate-800">
                      <p className="text-blue-200 text-sm font-medium">
                        {formData.bible_reference || 'Referência bíblica'}
                      </p>

                      <p className="text-slate-400 text-sm mt-1">
                        {formData.title || 'Título do episódio'}
                      </p>

                      {formData.scheduled_date && (
                        <p className="text-green-300 text-xs mt-2">
                          Programada para {formData.scheduled_date} às {selectedTime}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="border-t border-slate-800 pt-4">
                  <div className="mb-3">
                    <h5 className="text-sm font-bold text-white">
                      🖼️ Cards prontos
                    </h5>

                    <p className="text-xs text-slate-500 mt-1">
                      O sistema vai buscar imagens e montar 3 opções já com a frase aplicada.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateCardOptions}
                    disabled={!selectedDailyQuote.trim() || generatingCards}
                    className="w-full bg-amber-500 text-slate-950 font-bold py-3 rounded-lg hover:bg-amber-400 transition-colors disabled:opacity-50"
                  >
                    {generatingCards ? '⏳ Gerando cards...' : '🎨 Gerar 3 cards prontos'}
                  </button>

                  {cardOptions.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
                      {cardOptions.map((option, index) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setSelectedCardIndex(index)}
                          className={`rounded-2xl overflow-hidden border-2 text-left transition-all ${
                            selectedCardIndex === index
                              ? 'border-amber-400 scale-[1.02]'
                              : 'border-slate-700 hover:border-slate-500'
                          }`}
                        >
                          <img
                            src={option.preview_data_url}
                            alt={option.label}
                            className="w-full aspect-square object-cover bg-slate-800"
                          />

                          <div className="p-3 bg-slate-900">
                            <p className="text-sm font-bold text-white">
                              {index + 1}. {option.label}
                            </p>

                            <p className="text-xs text-slate-400 mt-1">
                              Tema: {option.theme_keywords.join(', ') || 'devocional'}
                            </p>

                            {option.photographer && (
                              <p className="text-[11px] text-slate-500 mt-1">
                                Foto: {option.photographer}
                              </p>
                            )}

                            <p className={`text-xs font-semibold mt-2 ${
                              selectedCardIndex === index
                                ? 'text-amber-300'
                                : 'text-slate-500'
                            }`}>
                              {selectedCardIndex === index
                                ? '✅ Card escolhido'
                                : 'Clique para escolher'}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedDailyQuote && cardOptions.length === 0 && (
                    <p className="text-xs text-slate-500 mt-3">
                      Nenhum card gerado ainda. A Palavra do Dia pode ser salva sem card, mas o ideal é gerar e escolher uma opção.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-800 pt-5">
            <h4 className="text-sm font-semibold text-slate-300 mb-3">
              🖼️ Imagem do Episódio
            </h4>

            <div className="space-y-3">
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

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={useSeriesImage}
                  onChange={() => setUseSeriesImage(true)}
                />

                <span className="text-sm text-slate-300">Usar imagem da série</span>
              </label>

              {selectedSeriesImage && useSeriesImage && (
                <div className="ml-6">
                  <img
                    src={selectedSeriesImage}
                    alt="Capa da série"
                    className="w-24 h-32 object-cover rounded-lg"
                  />
                </div>
              )}

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!useSeriesImage}
                  onChange={() => setUseSeriesImage(false)}
                />

                <span className="text-sm text-slate-300">Imagem específica deste episódio</span>
              </label>

              {!useSeriesImage && (
                <div className="ml-6">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 text-sm disabled:opacity-50"
                  />

                  {episodeImageUrl && (
                    <img
                      src={episodeImageUrl}
                      alt="Preview"
                      className="w-24 h-32 object-cover rounded-lg mt-2"
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-800 pt-5">
            <h4 className="text-sm font-semibold text-slate-300 mb-3">
              ⏰ Agendamento
            </h4>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Data de Publicação
                </label>

                <input
                  type="date"
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 focus:border-blue-500 outline-none"
                />

                <p className="text-xs text-slate-500 mt-1">
                  Deixe em branco para publicar imediatamente
                </p>
              </div>

              {formData.scheduled_date && (
                <>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useDefaultTime}
                      onChange={(e) => setUseDefaultTime(e.target.checked)}
                    />

                    <span className="text-sm text-slate-300">Sempre publicar às 6:00 da manhã</span>
                  </label>

                  {!useDefaultTime && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">
                        Horário
                      </label>

                      <input
                        type="time"
                        value={formData.scheduled_time}
                        onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 focus:border-blue-500 outline-none"
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {!formData.scheduled_date && (
            <div className="border-t border-slate-800 pt-5">
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Status *
              </label>

              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'draft' | 'published' })}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 focus:border-blue-500 outline-none"
              >
                <option value="draft">💾 Salvar como Rascunho</option>
                <option value="published">✅ Publicar Agora</option>
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Link
              href="/admin"
              className="flex-1 bg-slate-800 text-slate-300 font-bold py-3 rounded-lg text-center hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading
                ? '⏳ Salvando...'
                : formData.scheduled_date
                ? enableDailyQuote && selectedDailyQuote
                  ? '📅 Agendar Episódio + Palavra'
                  : '📅 Agendar Publicação'
                : formData.status === 'published'
                ? enableDailyQuote && selectedDailyQuote
                  ? '📤 Publicar Episódio + Palavra'
                  : '📤 Publicar Agora'
                : enableDailyQuote && selectedDailyQuote
                ? '💾 Salvar Rascunho + Palavra'
                : '💾 Salvar Rascunho'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}