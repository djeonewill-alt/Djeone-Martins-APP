'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type Episode = {
  id: string
  title: string
  bible_reference: string
  episode_number: number
  audio_url: string
  duration_seconds: number
  created_at: string
  series: {
    title: string
    icon_emoji: string
  }
}

export default function GerenciarEpisodios() {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadEpisodes()
  }, [])

  const loadEpisodes = async () => {
    try {
      const { data, error } = await supabase
        .from('episodes')
        .select(`
          *,
          series:series_id (
            title,
            icon_emoji
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setEpisodes(data || [])
    } catch (error) {
      console.error('Erro ao carregar episódios:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (episode: Episode) => {
    const confirmDelete = confirm(
      `❌ Tem certeza que deseja excluir?\n\n📖 ${episode.bible_reference}\n"${episode.title}"\n\n⚠️ Esta ação não pode ser desfeita!`
    )

    if (!confirmDelete) return

    try {
      const { error } = await supabase
        .from('episodes')
        .delete()
        .eq('id', episode.id)

      if (error) throw error

      alert('✅ Episódio excluído com sucesso!')
      loadEpisodes()
    } catch (error) {
      console.error('Erro ao excluir episódio:', error)
      alert('❌ Erro ao excluir episódio. Tente novamente.')
    }
  }

  const filteredEpisodes = episodes.filter(ep => 
    ep.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ep.bible_reference.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-2">⏳</div>
          <p className="text-gray-600">Carregando episódios...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
        <div className="max-w-4xl mx-auto">
          <Link href="/admin" className="text-blue-100 hover:text-white mb-2 inline-block">
            ← Voltar
          </Link>
          <h1 className="text-2xl font-bold">📚 Gerenciar Episódios</h1>
          <p className="text-blue-100 text-sm mt-1">
            {episodes.length} {episodes.length === 1 ? 'episódio' : 'episódios'} publicados
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-5">
        <div className="mb-5">
          <input
            type="text"
            placeholder="🔍 Buscar por título ou referência..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border-2 border-gray-300 rounded-lg p-3 focus:border-blue-500 outline-none"
          />
        </div>

        {filteredEpisodes.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center shadow">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-gray-600">
              {searchTerm ? 'Nenhum episódio encontrado' : 'Nenhum episódio publicado ainda'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEpisodes.map((episode) => (
              <div
                key={episode.id}
                className="bg-white rounded-xl p-4 shadow hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{episode.series?.icon_emoji || '🎙️'}</span>
                      <span className="text-xs text-gray-500">
                        {episode.series?.title || 'Sem série'}
                      </span>
                    </div>
                    
                    <h3 className="font-bold text-gray-900 mb-1">
                      📖 {episode.bible_reference}
                    </h3>
                    
                    <p className="text-sm text-gray-700 line-clamp-1 mb-2">
                      "{episode.title}"
                    </p>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Episódio #{episode.episode_number}</span>
                      <span>⏱️ {formatDuration(episode.duration_seconds)}</span>
                      <span>📅 {formatDate(episode.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleDelete(episode)}
                      className="bg-red-100 text-red-700 px-4 py-2 rounded-lg font-semibold hover:bg-red-200 transition-colors"
                    >
                      🗑️ Excluir
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}