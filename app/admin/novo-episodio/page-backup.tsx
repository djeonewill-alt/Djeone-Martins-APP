'use client'

import { useState, useEffect, FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AudioRecorder from '@/components/recorder/AudioRecorder'
import type { DailyQuoteSuggestion } from '@/lib/supabase'

type Series = {
  id: string
  title: string
  cover_image_url: string | null
}

function getLocalDateString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export default function NovoEpisodio() {
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<'record' | 'upload'>('record')
  const [series, setSeries] = useState<Series[]>([])

  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [generatingQuote, setGeneratingQuote] = useState(false)

  const [audioUrl, setAudioUrl] = useState('')
  const [audioDuration, setAudioDuration] = useState(0)

  const [episodeImageUrl, setEpisodeImageUrl] = useState('')
  const [useSeriesImage, setUseSeriesImage] = useState(true)
  const [selectedSeriesImage, setSelectedSeriesImage] = useState<string | null>(null)

  const [useDefaultTime, setUseDefaultTime] = useState(false)

  const [enableDailyQuote, setEnableDailyQuote] = useState(true)
  const [transcriptionText, setTranscriptionText] = useState('')
  const [quoteSuggestions, setQuoteSuggestions] = useState<DailyQuoteSuggestion[]>([])
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<number | null>(null)
  const [selectedDailyQuote, setSelectedDailyQuote] = useState('')

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

  const resetAutomationData = () => {
    setTranscriptionText('')
    setQuoteSuggestions([])
    setSelectedSuggestionIndex(null)
    setSelectedDailyQuote('')
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
      alert('✅ Transcrição gerada com sucesso!')
    } catch (error) {
      console.error('Erro ao transcrever:', error)

      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao transcrever áudio.'

      alert(`❌ ${message}`)
    } finally {
      setTranscribing(false)
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

      const providerMessage =
        data.provider === 'openai'
          ? 'com IA'
          : 'com modo local'

      alert(`✅ Sugestões geradas ${providerMessage}!`)
    } catch (error) {
      console.error('Erro ao gerar Palavra do Dia:', error)

      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao gerar Palavra do Dia.'

      alert(`❌ ${message}`)
    } finally {
      setGeneratingQuote(false)
    }
  }

  const handleSelectSuggestion = (suggestion: DailyQuoteSuggestion, index: number) => {
    setSelectedSuggestionIndex(index)
    setSelectedDailyQuote(suggestion.quote_text)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

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
            episode_number: formData.episode_number,
            bible_reference: formData.bible_reference,
            title: formData.title,
            description: formData.description,
            audio_url: audioUrl || null,
            duration_seconds: audioDuration,
            cover_image_url: finalImageUrl,
            status: scheduledPublishAt ? 'draft' : formData.status,
            scheduled_publish_at: scheduledPublishAt,

            transcription_text: hasTranscription ? transcriptionText.trim() : null,
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
        const quoteStatus = scheduledPublishAt
          ? 'scheduled'
          : formData.status === 'published'
          ? 'published'
          : 'draft'

        const quoteDate = formData.scheduled_date || getLocalDateString()

        const { error: quoteError } = await supabase
          .from('daily_quotes')
          .insert([
            {
              episode_id: newEpisode.id,
              quote_text: selectedDailyQuote.trim(),
              background_image_url: finalImageUrl || selectedSeriesImage || null,
              card_image_url: null,
              date: quoteDate,
              status: quoteStatus,
              scheduled_publish_at: scheduledPublishAt,
              published_at: quoteStatus === 'published' ? new Date().toISOString() : null,
              source_type: hasQuoteSuggestions ? 'ai_suggested' : 'manual',
              ai_suggestions: hasQuoteSuggestions ? quoteSuggestions : null,
              selected_suggestion_index: selectedSuggestionIndex,
              share_count: 0,
              like_count: 0,
            },
          ])

        if (quoteError) throw quoteError
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
      alert('❌ Erro ao criar episódio. Tente novamente.')
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
              value={formData.episode_number}
              onChange={(e) => setFormData({ ...formData, episode_number: parseInt(e.target.value) })}
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
                  Transcreva o áudio, gere frases fortes e deixe a Palavra do Dia programada junto com o episódio.
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
                    Fluxo recomendado: envie o áudio → clique em transcrever → gere sugestões → escolha ou edite a frase.
                    Se a transcrição automática ainda não estiver configurada, você pode colar a transcrição manualmente abaixo.
                  </p>
                </div>

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
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Frase escolhida para a Palavra do Dia
                  </label>

                  <textarea
                    value={selectedDailyQuote}
                    onChange={(e) => setSelectedDailyQuote(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 focus:border-blue-500 outline-none"
                    rows={3}
                    placeholder="Escolha uma sugestão ou escreva a frase final..."
                  />

                  <p className="text-xs text-slate-500 mt-1">
                    Essa frase será salva junto com o episódio. Se houver agendamento, ela será programada para a mesma data.
                  </p>
                </div>

                {selectedDailyQuote && (
                  <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-blue-300 font-semibold mb-3">
                      Preview da Palavra do Dia
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
              </div>
            )}
          </div>

          <div className="border-t border-slate-800 pt-5">
            <h4 className="text-sm font-semibold text-slate-300 mb-3">
              🖼️ Imagem do Episódio
            </h4>

            <div className="space-y-3">
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