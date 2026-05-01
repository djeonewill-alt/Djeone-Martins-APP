'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import type { Series } from '@/lib/supabase'

export default function NovoEpisodio() {
  const router = useRouter()
  const [series, setSeries] = useState<Series[]>([])
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    series_id: '',
    title: '',
    bible_reference: '',
    description: '',
    episode_number: 1,
    audio_url: '',
  })

  useEffect(() => {
    loadSeries()
  }, [])

  const loadSeries = async () => {
    try {
      const { data, error } = await supabase
        .from('series')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setSeries(data || [])
    } catch (error) {
      console.error('Erro ao carregar séries:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Inserir episódio
      const { error } = await supabase
        .from('episodes')
        .insert({
          series_id: formData.series_id,
          title: formData.title,
          bible_reference: formData.bible_reference,
          description: formData.description,
          episode_number: formData.episode_number,
          audio_url: formData.audio_url || 'https://exemplo.com/audio.mp3', // Placeholder
          duration_seconds: 600, // 10 minutos padrão
        })

      if (error) throw error

      // Atualizar contador de episódios da série
      const selectedSeries = series.find(s => s.id === formData.series_id)
      if (selectedSeries) {
        await supabase
          .from('series')
          .update({ total_episodes: selectedSeries.total_episodes + 1 })
          .eq('id', formData.series_id)
      }

      alert('✅ Episódio publicado com sucesso!')
      router.push('/admin')
    } catch (error) {
      console.error('Erro ao criar episódio:', error)
      alert('❌ Erro ao publicar episódio. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
        <div className="max-w-2xl mx-auto">
          <Link href="/admin" className="text-blue-100 hover:text-white mb-2 inline-block">
            ← Voltar
          </Link>
          <h1 className="text-2xl font-bold">🎙️ Novo Episódio</h1>
          <p className="text-blue-100 text-sm mt-1">
            Publicar devocional
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto p-5">
        {series.length === 0 ? (
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 text-center">
            <p className="text-xl mb-2">📚</p>
            <p className="font-semibold text-yellow-900 mb-2">
              Nenhuma série criada ainda
            </p>
            <p className="text-sm text-yellow-800 mb-4">
              Crie uma série primeiro para adicionar episódios
            </p>
            <Link
              href="/admin/nova-serie"
              className="inline-block bg-yellow-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-yellow-700 transition-colors"
            >
              Criar Série
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 shadow space-y-5">
            
            {/* Série */}
            <div>
              <label className="block font-semibold text-gray-900 mb-2">
                Série *
              </label>
              <select
                value={formData.series_id}
                onChange={(e) => setFormData({...formData, series_id: e.target.value})}
                className="w-full border-2 border-gray-300 rounded-lg p-3 focus:border-blue-500 outline-none"
                required
              >
                <option value="">Selecione a série...</option>
                {series.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.icon_emoji} {s.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Número do Episódio */}
            <div>
              <label className="block font-semibold text-gray-900 mb-2">
                Episódio Nº *
              </label>
              <input
                type="number"
                value={formData.episode_number}
                onChange={(e) => setFormData({...formData, episode_number: parseInt(e.target.value)})}
                min="1"
                className="w-full border-2 border-gray-300 rounded-lg p-3 focus:border-blue-500 outline-none"
                required
              />
            </div>

            {/* Referência Bíblica */}
            <div>
              <label className="block font-semibold text-gray-900 mb-2">
                Referência Bíblica *
              </label>
              <input
                type="text"
                value={formData.bible_reference}
                onChange={(e) => setFormData({...formData, bible_reference: e.target.value})}
                placeholder="Ex: João 11:17-27"
                className="w-full border-2 border-gray-300 rounded-lg p-3 focus:border-blue-500 outline-none"
                required
              />
            </div>

            {/* Título */}
            <div>
              <label className="block font-semibold text-gray-900 mb-2">
                Título do Episódio *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Ex: Eu sou a ressurreição e a vida"
                className="w-full border-2 border-gray-300 rounded-lg p-3 focus:border-blue-500 outline-none"
                required
              />
            </div>

            {/* Descrição */}
            <div>
              <label className="block font-semibold text-gray-900 mb-2">
                Descrição (opcional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Resumo do devocional..."
                className="w-full border-2 border-gray-300 rounded-lg p-3 focus:border-blue-500 outline-none min-h-[80px]"
              />
            </div>

            {/* Nota sobre áudio */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <span className="font-semibold">📝 Nota:</span> Por enquanto, o sistema de upload de áudio será adicionado na próxima sessão. O episódio será criado com áudio placeholder.
              </p>
            </div>

            {/* Botões */}
            <div className="flex gap-3 pt-4">
              <Link
                href="/admin"
                className="flex-1 bg-gray-200 text-gray-700 font-bold py-3 rounded-lg text-center hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? '⏳ Publicando...' : '🔔 Publicar Episódio'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
