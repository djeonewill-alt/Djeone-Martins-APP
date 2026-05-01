'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import type { PrayerRequest } from '@/lib/supabase'

export default function AdminOracoes() {
  const [prayers, setPrayers] = useState<PrayerRequest[]>([])
  const [filter, setFilter] = useState<'all' | 'public' | 'private' | 'answered'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPrayers()
  }, [filter])

  const loadPrayers = async () => {
    try {
      let query = supabase
        .from('prayer_requests')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (filter === 'public') {
        query = query.eq('is_private', false).eq('is_answered', false)
      } else if (filter === 'private') {
        query = query.eq('is_private', true).eq('is_answered', false)
      } else if (filter === 'answered') {
        query = query.eq('is_answered', true)
      } else if (filter === 'all') {
        query = query.eq('is_answered', false)
      }

      const { data, error } = await query

      if (error) throw error
      setPrayers(data || [])
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAnswered = async (prayerId: string) => {
    if (!confirm('Marcar este pedido como respondido?')) return

    try {
      const { error } = await supabase
        .from('prayer_requests')
        .update({
          is_answered: true,
          answered_at: new Date().toISOString(),
        })
        .eq('id', prayerId)

      if (error) throw error
      
      alert('✅ Pedido marcado como respondido!')
      loadPrayers()
    } catch (error) {
      console.error('Erro:', error)
      alert('❌ Erro ao atualizar pedido')
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
          <h1 className="text-2xl font-bold">🙏 Pedidos de Oração</h1>
          <p className="text-blue-100 text-sm mt-1">
            Todos os pedidos da comunidade
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-5">
        {/* Filtros */}
        <div className="grid grid-cols-2 gap-2 mb-6 bg-white rounded-lg p-2 shadow">
          <button
            onClick={() => setFilter('all')}
            className={`py-2 rounded-lg font-semibold transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Ativos
          </button>
          <button
            onClick={() => setFilter('public')}
            className={`py-2 rounded-lg font-semibold transition-colors ${
              filter === 'public'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Públicos
          </button>
          <button
            onClick={() => setFilter('private')}
            className={`py-2 rounded-lg font-semibold transition-colors ${
              filter === 'private'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Privados
          </button>
          <button
            onClick={() => setFilter('answered')}
            className={`py-2 rounded-lg font-semibold transition-colors ${
              filter === 'answered'
                ? 'bg-green-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            ✅ Respondidos
          </button>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Carregando...</p>
          </div>
        ) : prayers.length === 0 ? (
          <div className="text-center py-12 bg-gray-100 rounded-xl">
            <p className="text-4xl mb-4">🙏</p>
            <p className="font-semibold text-gray-800">Nenhum pedido encontrado</p>
          </div>
        ) : (
          <div className="space-y-4">
            {prayers.map((prayer) => (
              <div
                key={prayer.id}
                className={`bg-white rounded-xl p-4 shadow border-2 ${
                  prayer.is_answered
                    ? 'border-green-200 bg-green-50'
                    : prayer.is_private
                    ? 'border-yellow-200 bg-yellow-50/30'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">
                      {prayer.author_name || 'Anônimo'}
                    </span>
                    {prayer.is_private && (
                      <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                        🔒 Privado
                      </span>
                    )}
                    {prayer.is_answered && (
                      <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                        ✅ Respondido
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                    {new Date(prayer.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>

                <p className="text-gray-700 mb-3">{prayer.content}</p>

                {prayer.is_answered && prayer.testimony_text && (
                  <div className="bg-white border-l-4 border-green-500 pl-3 py-2 mb-3">
                    <p className="text-sm font-semibold text-green-800 mb-1">
                      ✨ Testemunho:
                    </p>
                    <p className="text-sm text-gray-700">{prayer.testimony_text}</p>
                  </div>
                )}

                {!prayer.is_answered && (
                  <button
                    onClick={() => handleMarkAnswered(prayer.id)}
                    className="text-green-600 font-semibold text-sm hover:text-green-700 transition-colors"
                  >
                    ✅ Marcar como Respondido
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}