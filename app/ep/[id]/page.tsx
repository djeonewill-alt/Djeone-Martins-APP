'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAudio } from '@/components/audio/AudioProvider'
import type { Episode } from '@/lib/supabase'

type EpisodeSeries = {
  id: string
  title: string
  icon_emoji?: string | null
}

type PublicEpisode = Episode & {
  series?: EpisodeSeries | null
}

export default function EpisodePage() {
  const router = useRouter()
  const params = useParams()
  const { play } = useAudio()

  const [episode, setEpisode] = useState<PublicEpisode | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEpisode()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  async function loadEpisode() {
    try {
      const episodeId = Array.isArray(params.id) ? params.id[0] : params.id

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
        .eq('id', episodeId)
        .single()

      if (error) throw error

      const typedEpisode = data as PublicEpisode

      setEpisode(typedEpisode)

      if (typedEpisode) {
        play({
          id: typedEpisode.id,
          title: typedEpisode.title,
          bible_reference: typedEpisode.bible_reference || '',
          audio_url: typedEpisode.audio_url,
          duration_seconds: typedEpisode.duration_seconds || 0,
          series_title: typedEpisode.series?.title,
          icon_emoji: typedEpisode.series?.icon_emoji || '🎙️',
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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-600 to-blue-800">
        <div className="text-center text-white">
          <div className="mb-4 text-6xl">🎙️</div>
          <p className="text-xl">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!episode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-600 to-blue-800 p-5">
        <div className="text-center text-white">
          <div className="mb-4 text-6xl">😕</div>
          <h1 className="mb-2 text-2xl font-bold">Episódio não encontrado</h1>
          <p className="mb-6 text-blue-100">
            Não conseguimos carregar este devocional agora.
          </p>

          <button
            type="button"
            onClick={() => router.push('/')}
            className="rounded-xl bg-white px-6 py-3 font-bold text-blue-700 shadow-lg"
          >
            Abrir app
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-600 to-blue-800 p-5">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl">
        <div className="mb-6 text-8xl">
          {episode.series?.icon_emoji || '🎙️'}
        </div>

        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          📖 {episode.bible_reference || 'Devocional'}
        </h1>

        <p className="mb-1 text-lg text-gray-700">
          &quot;{episode.title}&quot;
        </p>

        {episode.series?.title && (
          <p className="mb-6 text-sm text-gray-500">
            {episode.series.title}
          </p>
        )}

        {episode.description && (
          <p className="mb-6 text-sm leading-relaxed text-gray-600">
            {episode.description}
          </p>
        )}

        <div className="mb-6 rounded-2xl bg-blue-50 p-4">
          <p className="text-sm text-gray-700">
            ✨ O áudio já está tocando!
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Abra o player para controlar a reprodução.
          </p>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 py-4 font-bold text-white shadow-lg transition-all hover:from-blue-700 hover:to-blue-800"
          >
            📱 Abrir app completo
          </button>

          <p className="text-xs text-gray-500">
            Instale o app para receber devocionais diários.
          </p>
        </div>
      </div>
    </div>
  )
}