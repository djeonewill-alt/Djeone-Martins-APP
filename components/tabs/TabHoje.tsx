'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Episode } from '@/lib/supabase'
import { useAudio } from '@/components/audio/AudioProvider'
import { usePushNotifications } from '@/lib/notifications/usePushNotifications'
import Image from 'next/image'

export default function TabHoje() {
  const { play, currentEpisode, isPlaying } = useAudio()
  const { isSubscribed, loading: notifLoading, subscribe, unsubscribe } = usePushNotifications()
  const [todayEpisode, setTodayEpisode] = useState<Episode | null>(null)
  const [loading, setLoading] = useState(true)
  const [isFavorite, setIsFavorite] = useState(false)

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
        checkFavorite(data[0].id)
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

  const checkFavorite = async (episodeId: string) => {
    const userId = localStorage.getItem('user_id')
    if (!userId) return

    try {
      const { data } = await supabase
        .from('user_favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('episode_id', episodeId)
        .single()

      setIsFavorite(!!data)
    } catch (error) {
      setIsFavorite(false)
    }
  }

  const handleFavorite = async () => {
    if (!todayEpisode) return
    const userId = localStorage.getItem('user_id')
    if (!userId) {
      alert('❌ Faça login para salvar favoritos!')
      return
    }

    try {
      if (isFavorite) {
        await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', userId)
          .eq('episode_id', todayEpisode.id)
        setIsFavorite(false)
      } else {
        await supabase
          .from('user_favorites')
          .insert({
            user_id: userId,
            episode_id: todayEpisode.id,
          })
        setIsFavorite(true)
      }
    } catch (error) {
      console.error('Erro ao favoritar:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <div className="text-4xl mb-2">⏳</div>
          <p className="text-slate-400">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!todayEpisode) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center p-5">
          <div className="text-6xl mb-4">📭</div>
          <h3 className="text-xl font-bold text-white mb-2">
            Nenhum devocional publicado
          </h3>
          <p className="text-slate-400">
            Aguarde o próximo episódio!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-24 pt-16">
      {/* Card do Episódio */}
      <div className="max-w-2xl mx-auto p-5">
        <div className="relative rounded-3xl overflow-hidden shadow-2xl aspect-[4/5]">
          {/* Imagem de fundo da série */}
          <div className="absolute inset-0">
            <Image
              src="/vencendo-tempestades.jpg"
              alt="Vencendo as Tempestades"
              fill
              className="object-cover"
              priority
            />
          </div>
          
          {/* Overlay escuro MAIS FORTE */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/80 to-black/90" />

          {/* Conteúdo centralizado */}
          <div className="absolute inset-0 flex flex-col items-center justify-between p-8">
            
            {/* Textos no topo com sombra forte */}
            <div className="text-center pt-8">
              {/* Referência Bíblica */}
              <h2 
                className="text-3xl font-bold text-white tracking-wide mb-3"
                style={{
                  textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.5)'
                }}
              >
                {todayEpisode.bible_reference}
              </h2>

              {/* Título */}
              <p 
                className="text-lg text-white font-medium max-w-md leading-relaxed"
                style={{
                  textShadow: '0 2px 6px rgba(0,0,0,0.9), 0 0 15px rgba(0,0,0,0.5)'
                }}
              >
                {todayEpisode.title}
              </p>
            </div>

            {/* Botão Play - BEM MAIOR */}
            <button 
              onClick={() => play({
                id: todayEpisode.id,
                title: todayEpisode.title,
                bible_reference: todayEpisode.bible_reference || '',
                audio_url: todayEpisode.audio_url,
                duration_seconds: todayEpisode.duration_seconds || 0,
              })}
              className="group"
            >
              <div className="w-36 h-36 rounded-full bg-white/10 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center transition-all group-hover:bg-white/20 group-hover:scale-110 group-active:scale-95">
                <svg 
                  className="w-16 h-16 text-white ml-2" 
                  fill="currentColor" 
                  viewBox="0 0 24 24"
                >
                  {currentEpisode?.id === todayEpisode.id && isPlaying ? (
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                  ) : (
                    <path d="M8 5v14l11-7z"/>
                  )}
                </svg>
              </div>
            </button>

            {/* Controles inferiores - NOS CANTOS */}
            <div className="w-full flex items-center justify-between px-4 pb-4">
              {/* Favorito - CANTO ESQUERDO */}
              <button 
                onClick={handleFavorite}
                className="group p-3"
              >
                <svg 
                  className={`w-9 h-9 transition-all ${
                    isFavorite 
                      ? 'text-red-500 fill-red-500' 
                      : 'text-white/80 group-hover:text-white group-hover:scale-110'
                  }`}
                  fill={isFavorite ? 'currentColor' : 'none'}
                  stroke="currentColor" 
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
                  />
                </svg>
              </button>

              {/* Notificações - CANTO DIREITO */}
              <button 
                onClick={isSubscribed ? unsubscribe : subscribe}
                disabled={notifLoading}
                className="group p-3 disabled:opacity-50"
              >
                <svg 
                  className={`w-9 h-9 transition-all ${
                    isSubscribed 
                      ? 'text-blue-400' 
                      : 'text-white/80 group-hover:text-white group-hover:scale-110'
                  }`}
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  {isSubscribed ? (
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                      d="M9.143 17.082a24.248 24.248 0 003.844.148m-3.844-.148a23.856 23.856 0 01-5.455-1.31 8.964 8.964 0 002.3-5.542m3.155 6.852a3 3 0 005.667 1.97m1.965-2.277L21 21m-4.225-4.225a23.81 23.81 0 003.536-1.003A8.967 8.967 0 0118 9.75V9A6 6 0 006.53 6.53m10.245 10.245L6.53 6.53M3 3l3.53 3.53" 
                    />
                  ) : (
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
                    />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}