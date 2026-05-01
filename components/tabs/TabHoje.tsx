'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Episode } from '@/lib/supabase'

export default function TabHoje() {
  const [todayEpisode, setTodayEpisode] = useState<Episode | null>(null)
  const [reactions, setReactions] = useState<Record<string, number>>({
    '🙏': 0,
    '❤️': 0,
    '📖': 0,
    '🔥': 0,
    '😇': 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTodayEpisode()
  }, [])

  const loadTodayEpisode = async () => {
    try {
      // Buscar episódio mais recente
      const { data, error } = await supabase
        .from('episodes')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(1)
        .single()

      if (error) throw error
      setTodayEpisode(data)

      // Buscar reações
      if (data) {
        const { data: reactionsData } = await supabase
          .from('episode_reactions')
          .select('emoji')
          .eq('episode_id', data.id)

        if (reactionsData) {
          const counts: Record<string, number> = {
            '🙏': 0,
            '❤️': 0,
            '📖': 0,
            '🔥': 0,
            '😇': 0,
          }
          reactionsData.forEach((r) => {
            if (r.emoji in counts) {
              counts[r.emoji]++
            }
          })
          setReactions(counts)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar episódio:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReaction = async (emoji: string) => {
    if (!todayEpisode) return
    
    // Por enquanto apenas incrementa localmente
    // TODO: Adicionar autenticação e salvar no banco
    setReactions(prev => ({
      ...prev,
      [emoji]: prev[emoji] + 1
    }))
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Carregando...</p>
      </div>
    )
  }

  if (!todayEpisode) {
    return (
      <div className="text-center py-12 bg-yellow-50 rounded-xl border-2 border-yellow-200 p-6">
        <p className="text-xl mb-2">📖</p>
        <p className="font-semibold text-gray-800">Nenhum devocional publicado ainda</p>
        <p className="text-sm text-gray-600 mt-2">Em breve teremos conteúdo novo!</p>
      </div>
    )
  }

  return (
    <>
      {/* Card do devocional de hoje */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-xl mb-6">
        <div className="text-sm mb-3 opacity-90">
          📅 {new Date().toLocaleDateString('pt-BR', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long' 
          })}
        </div>
        
        <div className="border-t border-b border-white/20 py-3 mb-3">
          <h2 className="text-2xl font-bold mb-2">
            📖 {todayEpisode.bible_reference || 'Devocional do dia'}
          </h2>
          
          <p className="text-lg italic opacity-95">
            {todayEpisode.title}
          </p>
        </div>
        
        <button className="w-full bg-gradient-to-r from-yellow-500 to-yellow-400 text-blue-900 font-bold py-4 rounded-xl shadow-lg hover:scale-105 transition-transform flex items-center justify-center gap-2">
          <span className="text-xl">▶️</span>
          <span>OUVIR AGORA</span>
        </button>
        
        <div className="text-center text-sm mt-3 opacity-80 flex items-center justify-center gap-2">
          <span>⏱️</span>
          <span>{todayEpisode.duration_seconds ? `${Math.floor(todayEpisode.duration_seconds / 60)} minutos` : '10 minutos'}</span>
        </div>
      </div>

      {/* Reações */}
      <div className="bg-white rounded-xl p-4 shadow mb-6">
        <p className="text-sm font-semibold text-gray-600 mb-3 text-center">
          💬 Como você se sentiu?
        </p>
        <div className="flex gap-2">
          {Object.entries(reactions).map(([emoji, count]) => (
            <button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              className="flex-1 bg-gray-100 hover:bg-blue-100 border-2 border-transparent hover:border-blue-500 rounded-lg py-3 text-center transition-all"
            >
              <div className="text-2xl mb-1">{emoji}</div>
              <div className="text-xs font-semibold text-gray-600">{count}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Compartilhar */}
      <button className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-colors mb-6">
        <span>📤</span>
        <span>Compartilhar no WhatsApp</span>
      </button>

      {/* Status */}
      <div className="text-center text-sm text-gray-600 p-4 bg-green-50 rounded-xl border-2 border-green-200">
        <p className="font-semibold text-green-800">✅ Conectado ao Supabase!</p>
        <p className="mt-1 text-xs">Dados vindo do banco de dados</p>
      </div>
    </>
  )
}
