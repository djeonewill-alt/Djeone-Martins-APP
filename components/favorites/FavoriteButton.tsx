'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type FavoriteButtonProps = {
  episodeId: string
  size?: 'small' | 'large'
}

export default function FavoriteButton({ episodeId, size = 'small' }: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    checkIfFavorite()
  }, [episodeId])

  const checkIfFavorite = async () => {
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
      // Não é favorito
      setIsFavorite(false)
    }
  }

  const toggleFavorite = async () => {
    const userId = localStorage.getItem('user_id')
    
    if (!userId) {
      alert('❌ Faça login para salvar favoritos!')
      return
    }

    setLoading(true)

    try {
      if (isFavorite) {
        // Remover favorito
        await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', userId)
          .eq('episode_id', episodeId)

        setIsFavorite(false)
      } else {
        // Adicionar favorito
        await supabase
          .from('user_favorites')
          .insert({
            user_id: userId,
            episode_id: episodeId,
          })

        setIsFavorite(true)
      }
    } catch (error) {
      console.error('Erro ao favoritar:', error)
      alert('❌ Erro ao salvar favorito. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const iconSize = size === 'large' ? 'text-3xl' : 'text-xl'

  return (
    <button
      onClick={toggleFavorite}
      disabled={loading}
      className={`${iconSize} transition-all ${loading ? 'opacity-50' : 'hover:scale-110'}`}
      title={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
    >
      {isFavorite ? '❤️' : '🤍'}
    </button>
  )
}