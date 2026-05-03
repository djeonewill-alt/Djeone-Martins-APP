'use client'

import { useState, useEffect, FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AudioRecorder from '@/components/recorder/AudioRecorder'

type Series = {
  id: string
  title: string
  cover_image_url: string | null
}

export default function NovoEpisodio() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'record' | 'upload'>('record')
  const [series, setSeries] = useState<Series[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [audioUrl, setAudioUrl] = useState('')
  const [audioDuration, setAudioDuration] = useState(0)
  const [episodeImageUrl, setEpisodeImageUrl] = useState('')
  const [useSeriesImage, setUseSeriesImage] = useState(true)
  const [selectedSeriesImage, setSelectedSeriesImage] = useState<string | null>(null)
  const [useDefaultTime, setUseDefaultTime] = useState(false)

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
      const selectedSeries = series.find(s => s.id === formData.series_id)
      setSelectedSeriesImage(selectedSeries?.cover_image_url || null)
    }
  }, [formData.series_id, series])

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
      const formData = new FormData()
      formData.append('file', blob, 'recording.webm')
      formData.append('type', 'audio')

      const response = await fetch('/api/upload-audio', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.url) {
        setAudioUrl(data.url)
        setAudioDuration(Math.round(duration))
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
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'audio')

      const response = await fetch('/api/upload-audio', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.url) {
        setAudioUrl(data.url)
        
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
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'cover')

      const response = await fetch('/api/upload-audio', {
        method: 'POST',
        body: formData,
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!formData.series_id || !formData.bible_reference || !formData.title) {
      alert('❌ Preencha todos os campos obrigatórios!')
      return
    }

    // Se está publicando agora, precisa de áudio
    if (formData.status === 'published' && !audioUrl) {
      alert('❌ Grave ou faça upload do áudio antes de publicar!')
      return
    }

    // Se agendou, precisa de data
    if (formData.scheduled_date && !audioUrl) {
      alert('❌ Grave ou faça upload do áudio antes de agendar!')
      return
    }

    setLoading(true)

    try {
      const finalImageUrl = useSeriesImage ? null : (episodeImageUrl || null)
      
      // Calcular scheduled_publish_at
      let scheduledPublishAt = null
      if (formData.scheduled_date) {
        const time = useDefaultTime ? '06:00' : formData.scheduled_time
        scheduledPublishAt = `${formData.scheduled_date}T${time}:00`
      }

      const { error } = await supabase
        .from('episodes')
        .insert([{
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
        }])

      if (error) throw error

      const message = scheduledPublishAt
        ? `✅ Episódio agendado para ${new Date(scheduledPublishAt).toLocaleString('pt-BR')}!`
        : formData.status === 'published'
        ? '✅ Episódio publicado com sucesso!'
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

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-4xl mx-auto p-6">
          <Link href="/admin" className="text-slate-400 hover:text-white mb-3 inline-block text-sm">
            ← Voltar
          </Link>
          <h1 className="text-2xl font-bold text-white">🎙️ Novo Episódio</h1>
          <p className="text-slate-400 text-sm mt-1">Publicar ou agendar devocional</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-5">
        {/* Tabs Áudio */}
        <div className="flex gap-2 mb-5">
          <button
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

        {/* Gravador ou Upload */}
        {activeTab === 'record' ? (
          <div className="bg-red-600 rounded-xl p-6 mb-5 text-center shadow-lg">
            <AudioRecorder onRecordingComplete={handleRecordingComplete} />
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
            {uploading && <p className="text-sm text-slate-400 mt-2">⏳ Enviando arquivo...</p>}
            {audioUrl && (
              <div className="mt-4">
                <audio src={audioUrl} controls className="w-full" />
                <p className="text-sm text-green-400 mt-2">✅ Áudio carregado!</p>
              </div>
            )}
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
          <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-3">📝 Informações</h3>

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

          {/* Imagem do Episódio */}
          <div className="border-t border-slate-800 pt-5">
            <h4 className="text-sm font-semibold text-slate-300 mb-3">🖼️ Imagem do Episódio</h4>
            
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
                  <img src={selectedSeriesImage} alt="Capa da série" className="w-24 h-32 object-cover rounded-lg" />
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
                    <img src={episodeImageUrl} alt="Preview" className="w-24 h-32 object-cover rounded-lg mt-2" />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Agendamento */}
          <div className="border-t border-slate-800 pt-5">
            <h4 className="text-sm font-semibold text-slate-300 mb-3">⏰ Agendamento</h4>
            
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

          {/* Status */}
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
              {loading ? '⏳ Salvando...' : 
               formData.scheduled_date ? '📅 Agendar Publicação' :
               formData.status === 'published' ? '📤 Publicar Agora' : 
               '💾 Salvar Rascunho'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}