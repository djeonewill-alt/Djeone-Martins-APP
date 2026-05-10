'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAudio } from '@/components/audio/AudioProvider'
import FavoriteButton from '@/components/favorites/FavoriteButton'
import type { Episode } from '@/lib/supabase'

export default function TabFavoritos() {
  const { play, currentEpisode, isPlaying } = useAudio()
  const [favorites, setFavorites] = useState<Episode[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFavorites()
  }, [])

  const loadFavorites = async () => {
    const userId = localStorage.getItem('user_id')
    
    if (!userId) {
      setLoading(false)
      return
    }

    try {
      const { data: favData, error: favError } = await supabase
        .from('user_favorites')
        .select('episode_id')
        .eq('user_id', userId)

      if (favError) throw favError

      if (!favData || favData.length === 0) {
        setFavorites([])
        setLoading(false)
        return
      }

      const episodeIds = favData.map(f => f.episode_id)
      
      const { data: episodes, error: epError } = await supabase
        .from('episodes')
        .select('*')
        .in('id', episodeIds)
        .order('created_at', { ascending: false })

      if (epError) throw epError

      setFavorites(episodes || [])
    } catch (error) {
      console.error('Erro ao carregar favoritos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveFavorite = () => {
    loadFavorites()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-4xl mb-2">⏳</div>
          <p className="text-gray-600">Carregando favoritos...</p>
        </div>
      </div>
    )
  }

  if (!localStorage.getItem('user_id')) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center p-5">
          <div className="text-6xl mb-4">🔒</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Faça login
          </h3>
          <p className="text-gray-600 mb-4">
            Cadastre-se para salvar seus favoritos!
          </p>
          <button
            onClick={() => window.location.href = '/cadastro'}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors"
          >
            Criar Conta Grátis
          </button>
        </div>
      </div>
    )
  }

  if (favorites.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center p-5">
          <div className="text-6xl mb-4">💔</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Nenhum favorito ainda
          </h3>
          <p className="text-gray-600">
            Toque no ❤️ para salvar seus episódios favoritos!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-5 pb-24 max-w-2xl mx-auto">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">
          ❤️ Meus Favoritos
        </h2>
        <p className="text-sm text-gray-600">
          {favorites.length} {favorites.length === 1 ? 'episódio' : 'episódios'} salvos
        </p>
      </div>

      <div className="space-y-3">
        {favorites.map((episode) => (
          <div
            key={episode.id}
            className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start gap-3">
              <button
                onClick={() => play({
                  id: episode.id,
                  title: episode.title,
                  bible_reference: episode.bible_reference || '',
                  audio_url: episode.audio_url,
                  audio_url_compatible: episode.audio_url_compatible,
                  audio_compatible_type: episode.audio_compatible_type,
                  duration_seconds: episode.duration_seconds || 0,
                })}
                className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors"
              >
                <span className="text-xl">
                  {currentEpisode?.id === episode.id && isPlaying ? '⏸️' : '▶️'}
                </span>
              </button>

              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 mb-1 truncate">
                  📖 {episode.bible_reference}
                </h3>
                <p className="text-sm text-gray-700 line-clamp-2">
                  "{episode.title}"
                </p>
                {episode.description && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                    {episode.description}
                  </p>
                )}
              </div>

              <div className="flex-shrink-0" onClick={handleRemoveFavorite}>
                <FavoriteButton episodeId={episode.id} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}