'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Series } from '@/lib/supabase'

export default function TabSeries() {
  const [series, setSeries] = useState<Series[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSeries()
  }, [])

  const loadSeries = async () => {
    try {
      const { data, error } = await supabase
        .from('series')
        .select('*')
        .order('order_index', { ascending: true })

      if (error) throw error
      setSeries(data || [])
    } catch (error) {
      console.error('Erro ao carregar séries:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Carregando séries...</p>
      </div>
    )
  }

  if (series.length === 0) {
    return (
      <div className="text-center py-12 bg-yellow-50 rounded-xl border-2 border-yellow-200 p-6">
        <p className="text-4xl mb-4">📚</p>
        <p className="font-semibold text-gray-800 text-lg mb-2">Nenhuma série ainda</p>
        <p className="text-sm text-gray-600">
          Em breve teremos séries de devocionais para você!
        </p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-4 flex items-center gap-2">
        <div className="w-1 h-4 bg-gradient-to-b from-blue-600 to-yellow-500 rounded" />
        📚 Séries Disponíveis
      </h2>

      <div className="space-y-4">
        {series.map((serie) => (
          <div
            key={serie.id}
            className="bg-white border-2 border-gray-200 hover:border-blue-500 rounded-xl p-4 cursor-pointer transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="text-4xl">{serie.icon_emoji || '📖'}</div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 text-lg mb-1">
                  {serie.title}
                </h3>
                {serie.description && (
                  <p className="text-sm text-gray-600 mb-2">
                    {serie.description}
                  </p>
                )}
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>📊 {serie.total_episodes} episódios</span>
                  {serie.is_current && (
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full font-semibold">
                      ✨ Atual
                    </span>
                  )}
                  {!serie.is_free && (
                    <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-semibold">
                      💎 Premium
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
