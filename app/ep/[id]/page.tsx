'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAudio } from '@/components/audio/AudioProvider'
import type { Episode } from '@/lib/supabase'

export default function EpisodePage() {
  const router = useRouter()
  const params = useParams()
  const { play } = useAudio()
  const [episode, setEpisode] = useState<Episode | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEpisode()
  }, [params.id])

  const loadEpisode = async () => {
    try {
      const { data, error } = await supabase
        .from('episodes')
        .select(`
          *,
          series:series_id (
            id,
            title,
            icon_emoji
          )
        `)
        .eq('id', params.id)
        .single()

      if (error) throw error
      setEpisode(data)

      // Auto-play
      if (data) {
        play({
          id: data.id,
          title: data.title,
          bible_reference: data.bible_reference || '',
          audio_url: data.audio_url,
          duration_seconds: data.duration_seconds || 0,
          series_title: data.series?.title,
          icon_emoji: data.series?.icon_emoji,
        })
      }
    } catch (error) {
      console.error('Erro ao carregar episódio:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-600 to-blue-800 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-6xl mb-4">🎙️</div>
          <p className="text-xl">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!episode) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-600 to-blue-800 flex items-center justify-center p-5">
        <div className="text-white text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold mb-2">Episódio não encontrado</h1>
          <p className="mb-6 opacity-80">Este episódio não existe ou foi removido.</p>
          <button
            onClick={() => router.push('/')}
            className="bg-white text-blue-600 px-6 py-3 rounded-lg font-bold hover:bg-blue-50 transition-colors"
          >
            Voltar para Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-600 to-blue-800 flex items-center justify-center p-5">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
        {/* Icon */}
        <div className="text-8xl mb-6">
          {episode.series?.icon_emoji || '🎙️'}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          📖 {episode.bible_reference}
        </h1>
        <p className="text-lg text-gray-700 mb-1">
          "{episode.title}"
        </p>
        {episode.series?.title && (
          <p className="text-sm text-gray-500 mb-6">
            {episode.series.title}
          </p>
        )}

        {/* Description */}
        {episode.description && (
          <p className="text-gray-600 text-sm mb-6 leading-relaxed">
            {episode.description}
          </p>
        )}

        {/* Info */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-600">
            ✨ O áudio já está tocando!
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Abra o player para controlar a reprodução
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => router.push('/')}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold py-4 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg"
          >
            📱 Abrir App Completo
          </button>

          <p className="text-xs text-gray-500">
            Instale o app para receber devocionais diários!
          </p>
        </div>
      </div>
    </div>
  )
}