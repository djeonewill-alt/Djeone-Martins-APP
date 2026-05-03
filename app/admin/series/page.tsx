'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type Series = {
  id: string
  title: string
  bible_book: string
  description: string | null
  cover_image_url: string | null
  is_free: boolean
  is_current: boolean
  created_at: string
  episode_count?: number
}

export default function GerenciarSeries() {
  const [series, setSeries] = useState<Series[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadSeries()
  }, [])

  const loadSeries = async () => {
    try {
      const { data: seriesData, error } = await supabase
        .from('series')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Contar episódios de cada série
      const seriesWithCount = await Promise.all(
        (seriesData || []).map(async (s) => {
          const { count } = await supabase
            .from('episodes')
            .select('id', { count: 'exact' })
            .eq('series_id', s.id)

          return { ...s, episode_count: count || 0 }
        })
      )

      setSeries(seriesWithCount)
    } catch (error) {
      console.error('Erro ao carregar séries:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (serie: Series) => {
    // Verificar se tem episódios
    if (serie.episode_count && serie.episode_count > 0) {
      alert(`❌ Esta série tem ${serie.episode_count} episódio(s)!\n\nExclua os episódios primeiro.`)
      return
    }

    const confirmDelete = confirm(
      `❌ Tem certeza que deseja excluir?\n\n"${serie.title}"\n\n⚠️ Esta ação não pode ser desfeita!`
    )

    if (!confirmDelete) return

    try {
      const { error } = await supabase
        .from('series')
        .delete()
        .eq('id', serie.id)

      if (error) throw error

      alert('✅ Série excluída com sucesso!')
      loadSeries()
    } catch (error) {
      console.error('Erro ao excluir série:', error)
      alert('❌ Erro ao excluir série. Tente novamente.')
    }
  }

  const filteredSeries = series.filter(s => 
    s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.bible_book.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-2">⏳</div>
          <p className="text-slate-400">Carregando séries...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-4xl mx-auto p-6">
          <Link href="/admin" className="text-slate-400 hover:text-white mb-3 inline-block text-sm">
            ← Voltar
          </Link>
          <h1 className="text-2xl font-bold text-white">📚 Gerenciar Séries</h1>
          <p className="text-slate-400 text-sm mt-1">
            {series.length} {series.length === 1 ? 'série' : 'séries'} criadas
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-5">
        <div className="mb-5">
          <input
            type="text"
            placeholder="🔍 Buscar por título ou livro..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg p-3 focus:border-blue-500 outline-none placeholder-slate-500"
          />
        </div>

        {filteredSeries.length === 0 ? (
          <div className="bg-slate-900 rounded-xl p-8 text-center border border-slate-800">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-slate-400">
              {searchTerm ? 'Nenhuma série encontrada' : 'Nenhuma série criada ainda'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSeries.map((serie) => (
              <div
                key={serie.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Imagem da série */}
                  <div className="w-16 h-20 bg-slate-800 rounded-lg overflow-hidden flex-shrink-0">
                    {serie.cover_image_url ? (
                      <img 
                        src={serie.cover_image_url} 
                        alt={serie.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600">
                        📚
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white mb-1">
                      {serie.title}
                    </h3>
                    
                    <p className="text-sm text-slate-400 mb-2">
                      📖 {serie.bible_book}
                    </p>

                    {serie.description && (
                      <p className="text-sm text-slate-500 line-clamp-1 mb-2">
                        {serie.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>🎙️ {serie.episode_count} episódio(s)</span>
                      {serie.is_current && (
                        <span className="text-blue-400">⭐ Série Atual</span>
                      )}
                      {serie.is_free && (
                        <span className="text-green-400">✅ Gratuita</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Link
                      href={`/admin/series/${serie.id}`}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors text-sm"
                    >
                      ✏️ Editar
                    </Link>
                    <button
                      onClick={() => handleDelete(serie)}
                      className="bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white px-4 py-2 rounded-lg font-semibold transition-colors text-sm"
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