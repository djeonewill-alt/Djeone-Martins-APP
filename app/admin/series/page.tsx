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
      <div className="admin-series-page min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-2">⏳</div>
          <p className="text-slate-400">Carregando séries...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-series-page min-h-screen bg-slate-950">
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
    
      <style jsx global>{`
        .admin-series-page {
          min-height: 100vh !important;
          background:
            radial-gradient(circle at top left, rgba(37, 99, 235, 0.18), transparent 34rem),
            radial-gradient(circle at top right, rgba(245, 158, 11, 0.14), transparent 30rem),
            #030712 !important;
          color: #f8fafc !important;
        }

        .admin-series-page > div:first-child {
          background:
            linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 64, 175, 0.28)) !important;
          border-bottom: 1px solid rgba(148, 163, 184, 0.16) !important;
          box-shadow: 0 20px 80px rgba(0, 0, 0, 0.22) !important;
          position: relative !important;
          overflow: hidden !important;
        }

        .admin-series-page > div:first-child::before {
          content: "" !important;
          position: absolute !important;
          inset: 0 !important;
          background:
            radial-gradient(circle at 12% 20%, rgba(96, 165, 250, 0.18), transparent 28rem),
            radial-gradient(circle at 88% 20%, rgba(245, 158, 11, 0.12), transparent 26rem) !important;
          pointer-events: none !important;
        }

        .admin-series-page > div:first-child > div,
        .admin-series-page > div:nth-child(2) {
          max-width: 1180px !important;
          margin-left: auto !important;
          margin-right: auto !important;
          position: relative !important;
          z-index: 1 !important;
        }

        .admin-series-page > div:first-child > div {
          padding-top: 34px !important;
          padding-bottom: 28px !important;
        }

        .admin-series-page > div:nth-child(2) {
          padding-top: 32px !important;
          padding-bottom: 64px !important;
        }

        .admin-series-page h1 {
          font-size: clamp(2.1rem, 4vw, 3.2rem) !important;
          line-height: 0.98 !important;
          letter-spacing: -0.07em !important;
          color: #f8fafc !important;
        }

        .admin-series-page h1::after {
          content: "Admin" !important;
          display: inline-flex !important;
          margin-left: 12px !important;
          transform: translateY(-5px) !important;
          font-size: 0.72rem !important;
          letter-spacing: 0.18em !important;
          text-transform: uppercase !important;
          color: #93c5fd !important;
          background: rgba(59, 130, 246, 0.14) !important;
          border: 1px solid rgba(147, 197, 253, 0.22) !important;
          padding: 7px 10px !important;
          border-radius: 999px !important;
        }

        .admin-series-page h2,
        .admin-series-page h3 {
          color: #f8fafc !important;
          letter-spacing: -0.04em !important;
        }

        .admin-series-page a[href="/admin"] {
          display: inline-flex !important;
          align-items: center !important;
          gap: 6px !important;
          color: #bfdbfe !important;
          background: rgba(15, 23, 42, 0.58) !important;
          border: 1px solid rgba(148, 163, 184, 0.18) !important;
          padding: 8px 12px !important;
          border-radius: 999px !important;
          text-decoration: none !important;
        }

        .admin-series-page input {
          background: rgba(2, 6, 23, 0.72) !important;
          border: 1px solid rgba(148, 163, 184, 0.24) !important;
          color: #f8fafc !important;
          border-radius: 16px !important;
          padding: 13px 15px !important;
          min-height: 48px !important;
          outline: none !important;
        }

        .admin-series-page input:focus {
          border-color: rgba(147, 197, 253, 0.62) !important;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12) !important;
        }

        .admin-series-page .bg-slate-900 {
          background:
            linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(15, 23, 42, 0.72)) !important;
          border: 1px solid rgba(148, 163, 184, 0.16) !important;
          box-shadow: 0 22px 70px rgba(0, 0, 0, 0.22) !important;
          border-radius: 26px !important;
        }

        .admin-series-page .bg-slate-800 {
          background: rgba(15, 23, 42, 0.74) !important;
          border: 1px solid rgba(148, 163, 184, 0.16) !important;
        }

        .admin-series-page .space-y-3 > div {
          transition:
            transform 0.2s ease,
            border-color 0.2s ease,
            background 0.2s ease !important;
        }

        .admin-series-page .space-y-3 > div:hover {
          transform: translateY(-2px) !important;
          border-color: rgba(147, 197, 253, 0.34) !important;
        }

        .admin-series-page button,
        .admin-series-page a {
          border-radius: 16px !important;
          font-weight: 900 !important;
          transition:
            transform 0.2s ease,
            border-color 0.2s ease,
            background 0.2s ease,
            opacity 0.2s ease !important;
        }

        .admin-series-page button:hover,
        .admin-series-page a:hover {
          transform: translateY(-1px);
        }

        .admin-series-page .bg-blue-600 {
          background: linear-gradient(135deg, #2563eb, #1d4ed8) !important;
          color: #ffffff !important;
          box-shadow: 0 14px 34px rgba(37, 99, 235, 0.18) !important;
        }

        .admin-series-page .hover\:bg-red-600:hover {
          background: linear-gradient(135deg, #e11d48, #9f1239) !important;
          color: #ffffff !important;
        }

        .admin-series-page .text-slate-400,
        .admin-series-page .text-slate-500,
        .admin-series-page .text-slate-300,
        .admin-series-page .text-slate-600 {
          color: #bfdbfe !important;
        }

        .admin-series-page .text-blue-400 {
          color: #93c5fd !important;
        }

        .admin-series-page .text-green-400 {
          color: #86efac !important;
        }

        .admin-series-page .border-slate-800,
        .admin-series-page .border-slate-700 {
          border-color: rgba(148, 163, 184, 0.18) !important;
        }

        .admin-series-page img {
          border-radius: 18px !important;
        }

        .admin-series-page ::placeholder {
          color: rgba(191, 219, 254, 0.46) !important;
        }

        @media (max-width: 768px) {
          .admin-series-page > div:first-child > div,
          .admin-series-page > div:nth-child(2) {
            padding-left: 14px !important;
            padding-right: 14px !important;
          }

          .admin-series-page h1 {
            font-size: 2.1rem !important;
          }

          .admin-series-page h1::after {
            display: none !important;
          }

          .admin-series-page .space-y-3 > div > div {
            flex-direction: column !important;
          }
        }
      `}</style>

</div>
  )
}