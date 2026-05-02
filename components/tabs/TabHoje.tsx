'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Episode } from '@/lib/supabase'
import { useAudio } from '@/components/audio/AudioProvider'
import FavoriteButton from '@/components/favorites/FavoriteButton'
import { usePushNotifications } from '@/lib/notifications/usePushNotifications'

export default function TabHoje() {
  const { play, currentEpisode, isPlaying } = useAudio()
  const { isSubscribed, loading: notifLoading, subscribe, unsubscribe } = usePushNotifications()
  const [todayEpisode, setTodayEpisode] = useState<Episode | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTodayEpisode()
  }, [])

  const loadTodayEpisode = async () => {
    try {
      const { data, error } = await supabase
        .from('episodes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) {
        console.error('Erro Supabase:', error)
        throw error
      }
      
      if (data && data.length > 0) {
        setTodayEpisode(data[0])
      } else {
        setTodayEpisode(null)
      }
    } catch (error) {
      console.error('Erro ao carregar episódio:', error)
      setTodayEpisode(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-4xl mb-2">⏳</div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!todayEpisode) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center p-5">
          <div className="text-6xl mb-4">📭</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Nenhum devocional publicado
          </h3>
          <p className="text-gray-600">
            Aguarde o próximo episódio!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-5 pb-24 max-w-2xl mx-auto">
      {/* Card Principal */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-6 text-white shadow-xl mb-5">
        {/* Ícone da Série */}
        <div className="text-center mb-4">
          <div className="text-7xl mb-3">
            🎙️
          </div>
        </div>

        {/* Referência Bíblica */}
        <h2 className="text-2xl font-bold text-center mb-2">
          📖 {todayEpisode.bible_reference}
        </h2>

        {/* Título */}
        <p className="text-lg text-center mb-4 text-blue-50">
          "{todayEpisode.title}"
        </p>

        {/* Descrição */}
        {todayEpisode.description && (
          <p className="text-sm text-blue-100 text-center mb-6 leading-relaxed">
            {todayEpisode.description}
          </p>
        )}

        {/* Botão Favoritar */}
        <div className="flex justify-center mb-4">
          <FavoriteButton episodeId={todayEpisode.id} size="large" />
        </div>

        {/* Botão Play */}
        <button 
          onClick={() => play({
            id: todayEpisode.id,
            title: todayEpisode.title,
            bible_reference: todayEpisode.bible_reference || '',
            audio_url: todayEpisode.audio_url,
            duration_seconds: todayEpisode.duration_seconds || 0,
          })}
          className="w-full bg-gradient-to-r from-yellow-500 to-yellow-400 text-blue-900 font-bold py-4 rounded-xl shadow-lg hover:scale-105 transition-transform flex items-center justify-center gap-2 mb-3"
        >
          <span className="text-xl">
            {currentEpisode?.id === todayEpisode.id && isPlaying ? '⏸️' : '▶️'}
          </span>
          <span>
            {currentEpisode?.id === todayEpisode.id && isPlaying ? 'PAUSAR' : 'OUVIR AGORA'}
          </span>
        </button>

        {/* Botão Notificações */}
        <button
          onClick={isSubscribed ? unsubscribe : subscribe}
          disabled={notifLoading}
          className="w-full bg-white/20 backdrop-blur-sm text-white font-semibold py-3 rounded-xl hover:bg-white/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <span className="text-lg">{isSubscribed ? '🔕' : '🔔'}</span>
          <span className="text-sm">
            {notifLoading ? 'Aguarde...' : isSubscribed ? 'Parar de me avisar' : 'Me avise quando tiver áudio novo'}
          </span>
        </button>
      </div>

      {/* Versículo do Dia */}
      <div className="bg-white rounded-xl p-5 shadow-md">
        <div className="flex items-start gap-3">
          <div className="text-3xl">💡</div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 mb-1">Reflexão</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Dedique este momento para ouvir e refletir sobre a Palavra de Deus.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}