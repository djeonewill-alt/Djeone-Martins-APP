'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type Episode = {
  id: string
  title: string
  bible_reference: string
  series_id: string | null
  episode_number: number
  is_preview: boolean
  audio_url: string
  duration_seconds: number
  created_at: string
  series: {
    title: string
    icon_emoji: string
  }
}

export default function GerenciarEpisodios() {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadEpisodes()
  }, [])

  const loadEpisodes = async () => {
    try {
      const { data, error } = await supabase
        .from('episodes')
        .select(`
          *,
          series:series_id (
            title,
            icon_emoji
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setEpisodes(data || [])
    } catch (error) {
      console.error('Erro ao carregar episÃ³dios:', error)
    } finally {
      setLoading(false)
    }
  }


  const handleTogglePreview = async (episode: Episode) => {
    const nextValue = !episode.is_preview

    const confirmed = confirm(
      nextValue
        ? 'Marcar este episódio como degustativo?'
        : 'Remover este episódio como degustativo?'
    )

    if (!confirmed) return

    try {
      if (nextValue && episode.series_id) {
        await supabase
          .from('episodes')
          .update({ is_preview: false })
          .eq('series_id', episode.series_id)
      }

      const { error } = await supabase
        .from('episodes')
        .update({ is_preview: nextValue })
        .eq('id', episode.id)

      if (error) throw error

      alert(
        nextValue
          ? 'Episódio marcado como degustativo.'
          : 'Episódio removido dos degustativos.'
      )

      loadEpisodes()
    } catch (error) {
      console.error('Erro ao atualizar degustativo:', error)
      alert('Não foi possível atualizar o episódio degustativo agora.')
    }
  }
  const handleDelete = async (episode: Episode) => {
    const confirmDelete = confirm(
      `âŒ Tem certeza que deseja excluir?\n\nðŸ“– ${episode.bible_reference}\n"${episode.title}"\n\nâš ï¸ Esta aÃ§Ã£o nÃ£o pode ser desfeita!`
    )

    if (!confirmDelete) return

    try {
      const { error } = await supabase
        .from('episodes')
        .delete()
        .eq('id', episode.id)

      if (error) throw error

      alert('âœ… EpisÃ³dio excluÃ­do com sucesso!')
      loadEpisodes()
    } catch (error) {
      console.error('Erro ao excluir episÃ³dio:', error)
      alert('âŒ Erro ao excluir episÃ³dio. Tente novamente.')
    }
  }

  const filteredEpisodes = episodes.filter(ep => 
    ep.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ep.bible_reference.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    })
  }

  if (loading) {
    return (
      <div className="admin-episodes-page min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-2">â³</div>
          <p className="text-gray-600">Carregando episÃ³dios...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-episodes-page min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
        <div className="max-w-4xl mx-auto">
          <Link href="/admin" className="text-blue-100 hover:text-white mb-2 inline-block">
            â† Voltar
          </Link>
          <h1 className="text-2xl font-bold">ðŸ“š Gerenciar EpisÃ³dios</h1>
          <p className="text-blue-100 text-sm mt-1">
            {episodes.length} {episodes.length === 1 ? 'episÃ³dio' : 'episÃ³dios'} publicados
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-5">
        <div className="mb-5">
          <input
            type="text"
            placeholder="ðŸ” Buscar por tÃ­tulo ou referÃªncia..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border-2 border-gray-300 rounded-lg p-3 focus:border-blue-500 outline-none"
          />
        </div>

        {filteredEpisodes.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center shadow">
            <div className="text-6xl mb-4">ðŸ“­</div>
            <p className="text-gray-600">
              {searchTerm ? 'Nenhum episÃ³dio encontrado' : 'Nenhum episÃ³dio publicado ainda'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEpisodes.map((episode) => (
              <div
                key={episode.id}
                className="bg-white rounded-xl p-4 shadow hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{episode.series?.icon_emoji || 'ðŸŽ™ï¸'}</span>
                      <span className="text-xs text-gray-500">
                        {episode.series?.title || 'Sem sÃ©rie'}
                      </span>
                    </div>
                    
                    <h3 className="font-bold text-gray-900 mb-1">
                      ðŸ“– {episode.bible_reference}
                    </h3>
                    
                    <p className="text-sm text-gray-700 line-clamp-1 mb-2">
                      "{episode.title}"
                    </p>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>EpisÃ³dio #{episode.episode_number}</span>
                      <span>â±ï¸ {formatDuration(episode.duration_seconds)}</span>
                      <span>ðŸ“… {formatDate(episode.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleTogglePreview(episode)}
                      className="bg-amber-100 text-amber-700 px-4 py-2 rounded-lg font-semibold hover:bg-amber-200 transition-colors"
                    >
                      {episode.is_preview ? "Remover degustativo" : "Marcar degustativo"}
                    </button>
                    <button
                      onClick={() => handleDelete(episode)}
                      className="bg-red-100 text-red-700 px-4 py-2 rounded-lg font-semibold hover:bg-red-200 transition-colors"
                    >
                      ðŸ—‘ï¸ Excluir
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    
      <style jsx global>{`
        .admin-episodes-page {
          min-height: 100vh !important;
          background:
            radial-gradient(circle at top left, rgba(37, 99, 235, 0.18), transparent 34rem),
            radial-gradient(circle at top right, rgba(245, 158, 11, 0.14), transparent 30rem),
            #030712 !important;
          color: #f8fafc !important;
        }

        .admin-episodes-page > div:first-child {
          background:
            linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 64, 175, 0.28)) !important;
          border-bottom: 1px solid rgba(148, 163, 184, 0.16) !important;
          box-shadow: 0 20px 80px rgba(0, 0, 0, 0.22) !important;
          position: relative !important;
          overflow: hidden !important;
        }

        .admin-episodes-page > div:first-child::before {
          content: "" !important;
          position: absolute !important;
          inset: 0 !important;
          background:
            radial-gradient(circle at 12% 20%, rgba(96, 165, 250, 0.18), transparent 28rem),
            radial-gradient(circle at 88% 20%, rgba(245, 158, 11, 0.12), transparent 26rem) !important;
          pointer-events: none !important;
        }

        .admin-episodes-page > div:first-child > div,
        .admin-episodes-page > div:nth-child(2) {
          max-width: 1180px !important;
          margin-left: auto !important;
          margin-right: auto !important;
          position: relative !important;
          z-index: 1 !important;
        }

        .admin-episodes-page > div:first-child > div {
          padding-top: 34px !important;
          padding-bottom: 28px !important;
        }

        .admin-episodes-page > div:nth-child(2) {
          padding-top: 32px !important;
          padding-bottom: 64px !important;
        }

        .admin-episodes-page h1 {
          font-size: clamp(2.1rem, 4vw, 3.2rem) !important;
          line-height: 0.98 !important;
          letter-spacing: -0.07em !important;
          color: #f8fafc !important;
        }

        .admin-episodes-page h1::after {
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

        .admin-episodes-page h2,
        .admin-episodes-page h3 {
          color: #f8fafc !important;
          letter-spacing: -0.04em !important;
        }

        .admin-episodes-page p,
        .admin-episodes-page span {
          color: inherit;
        }

        .admin-episodes-page label {
          color: #dbeafe !important;
          font-weight: 800 !important;
        }

        .admin-episodes-page > div:first-child a {
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

        .admin-episodes-page form,
        .admin-episodes-page article,
        .admin-episodes-page table,
        .admin-episodes-page .bg-white,
        .admin-episodes-page .bg-gray-50,
        .admin-episodes-page .bg-gray-100,
        .admin-episodes-page .bg-slate-900,
        .admin-episodes-page .bg-gray-900,
        .admin-episodes-page .bg-slate-800,
        .admin-episodes-page .bg-gray-800 {
          background:
            linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(15, 23, 42, 0.72)) !important;
          border: 1px solid rgba(148, 163, 184, 0.16) !important;
          box-shadow: 0 22px 70px rgba(0, 0, 0, 0.22) !important;
          border-radius: 28px !important;
        }

        .admin-episodes-page table {
          overflow: hidden !important;
        }

        .admin-episodes-page tr {
          border-color: rgba(148, 163, 184, 0.14) !important;
        }

        .admin-episodes-page th {
          color: #93c5fd !important;
          text-transform: uppercase !important;
          letter-spacing: 0.14em !important;
          font-size: 0.72rem !important;
        }

        .admin-episodes-page td {
          color: #dbeafe !important;
        }

        .admin-episodes-page input,
        .admin-episodes-page textarea,
        .admin-episodes-page select {
          background: rgba(2, 6, 23, 0.72) !important;
          border: 1px solid rgba(148, 163, 184, 0.24) !important;
          color: #f8fafc !important;
          border-radius: 16px !important;
          padding: 13px 15px !important;
          min-height: 48px !important;
          outline: none !important;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03) !important;
        }

        .admin-episodes-page input:focus,
        .admin-episodes-page textarea:focus,
        .admin-episodes-page select:focus {
          border-color: rgba(147, 197, 253, 0.62) !important;
          box-shadow:
            0 0 0 3px rgba(59, 130, 246, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.03) !important;
        }

        .admin-episodes-page button,
        .admin-episodes-page a {
          border-radius: 16px !important;
          font-weight: 900 !important;
          transition:
            transform 0.2s ease,
            border-color 0.2s ease,
            background 0.2s ease,
            opacity 0.2s ease !important;
        }

        .admin-episodes-page button:hover,
        .admin-episodes-page a:hover {
          transform: translateY(-1px);
        }

        .admin-episodes-page button:disabled {
          opacity: 0.55 !important;
          cursor: not-allowed !important;
          transform: none !important;
        }

        .admin-episodes-page .bg-blue-600,
        .admin-episodes-page .bg-indigo-600 {
          background: linear-gradient(135deg, #2563eb, #1d4ed8) !important;
          border-color: rgba(147, 197, 253, 0.34) !important;
          color: #ffffff !important;
          box-shadow: 0 18px 44px rgba(37, 99, 235, 0.2) !important;
        }

        .admin-episodes-page .bg-green-600,
        .admin-episodes-page .bg-emerald-600 {
          background: linear-gradient(135deg, #059669, #047857) !important;
          color: #ffffff !important;
        }

        .admin-episodes-page .bg-red-600,
        .admin-episodes-page .bg-rose-600 {
          background: linear-gradient(135deg, #e11d48, #9f1239) !important;
          color: #ffffff !important;
        }

        .admin-episodes-page .bg-yellow-600,
        .admin-episodes-page .bg-amber-600 {
          background: linear-gradient(135deg, #d97706, #92400e) !important;
          color: #ffffff !important;
        }

        .admin-episodes-page .bg-gray-200,
        .admin-episodes-page .bg-slate-800 {
          background: rgba(15, 23, 42, 0.72) !important;
          border: 1px solid rgba(148, 163, 184, 0.18) !important;
          color: #dbeafe !important;
        }

        .admin-episodes-page .text-gray-900,
        .admin-episodes-page .text-slate-900,
        .admin-episodes-page .text-black {
          color: #f8fafc !important;
        }

        .admin-episodes-page .text-gray-700,
        .admin-episodes-page .text-gray-600,
        .admin-episodes-page .text-gray-500,
        .admin-episodes-page .text-gray-400,
        .admin-episodes-page .text-slate-400,
        .admin-episodes-page .text-slate-500,
        .admin-episodes-page .text-slate-300 {
          color: #bfdbfe !important;
        }

        .admin-episodes-page .border-gray-200,
        .admin-episodes-page .border-gray-300,
        .admin-episodes-page .border-slate-800,
        .admin-episodes-page .border-slate-700 {
          border-color: rgba(148, 163, 184, 0.18) !important;
        }

        .admin-episodes-page img {
          border-radius: 18px !important;
        }

        .admin-episodes-page ::placeholder {
          color: rgba(191, 219, 254, 0.46) !important;
        }

        @media (max-width: 768px) {
          .admin-episodes-page > div:first-child > div,
          .admin-episodes-page > div:nth-child(2) {
            padding-left: 14px !important;
            padding-right: 14px !important;
          }

          .admin-episodes-page h1 {
            font-size: 2.1rem !important;
          }

          .admin-episodes-page h1::after {
            display: none !important;
          }

          .admin-episodes-page article,
          .admin-episodes-page table,
          .admin-episodes-page .bg-white {
            border-radius: 24px !important;
          }
        }
      `}</style>
      <div className="admin-episodes-style-marker" />


      <style jsx global>{`
        .admin-episodes-page {
          min-height: 100vh !important;
          background:
            radial-gradient(circle at top left, rgba(37, 99, 235, 0.18), transparent 34rem),
            radial-gradient(circle at top right, rgba(245, 158, 11, 0.14), transparent 30rem),
            #030712 !important;
          color: #f8fafc !important;
        }

        .admin-episodes-page > div:first-child,
        .admin-episodes-page header {
          background:
            linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 64, 175, 0.28)) !important;
          border-bottom: 1px solid rgba(148, 163, 184, 0.16) !important;
          box-shadow: 0 20px 80px rgba(0, 0, 0, 0.22) !important;
          position: relative !important;
          overflow: hidden !important;
        }

        .admin-episodes-page > div:first-child::before,
        .admin-episodes-page header::before {
          content: "" !important;
          position: absolute !important;
          inset: 0 !important;
          background:
            radial-gradient(circle at 12% 20%, rgba(96, 165, 250, 0.18), transparent 28rem),
            radial-gradient(circle at 88% 20%, rgba(245, 158, 11, 0.12), transparent 26rem) !important;
          pointer-events: none !important;
        }

        .admin-episodes-page > div:first-child > div,
        .admin-episodes-page header > div,
        .admin-episodes-page > div:nth-child(2),
        .admin-episodes-page main {
          max-width: 1180px !important;
          margin-left: auto !important;
          margin-right: auto !important;
          position: relative !important;
          z-index: 1 !important;
        }

        .admin-episodes-page > div:first-child > div,
        .admin-episodes-page header > div {
          padding-top: 34px !important;
          padding-bottom: 28px !important;
        }

        .admin-episodes-page > div:nth-child(2),
        .admin-episodes-page main {
          padding-top: 32px !important;
          padding-bottom: 64px !important;
        }

        .admin-episodes-page h1 {
          font-size: clamp(2.1rem, 4vw, 3.2rem) !important;
          line-height: 0.98 !important;
          letter-spacing: -0.07em !important;
          color: #f8fafc !important;
        }

        .admin-episodes-page h1::after {
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

        .admin-episodes-page h2,
        .admin-episodes-page h3 {
          color: #f8fafc !important;
          letter-spacing: -0.04em !important;
        }

        .admin-episodes-page a[href="/admin"] {
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

        .admin-episodes-page input {
          background: rgba(2, 6, 23, 0.72) !important;
          border: 1px solid rgba(148, 163, 184, 0.24) !important;
          color: #f8fafc !important;
          border-radius: 16px !important;
          padding: 13px 15px !important;
          min-height: 48px !important;
          outline: none !important;
        }

        .admin-episodes-page input:focus {
          border-color: rgba(147, 197, 253, 0.62) !important;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12) !important;
        }

        .admin-episodes-page article,
        .admin-episodes-page li,
        .admin-episodes-page .bg-white,
        .admin-episodes-page .bg-gray-50,
        .admin-episodes-page .bg-gray-100,
        .admin-episodes-page .bg-slate-900,
        .admin-episodes-page .bg-slate-800 {
          background:
            linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(15, 23, 42, 0.72)) !important;
          border: 1px solid rgba(148, 163, 184, 0.16) !important;
          box-shadow: 0 22px 70px rgba(0, 0, 0, 0.22) !important;
          border-radius: 26px !important;
        }

        .admin-episodes-page article,
        .admin-episodes-page li {
          transition:
            transform 0.2s ease,
            border-color 0.2s ease,
            background 0.2s ease !important;
        }

        .admin-episodes-page article:hover,
        .admin-episodes-page li:hover {
          transform: translateY(-2px) !important;
          border-color: rgba(147, 197, 253, 0.34) !important;
        }

        .admin-episodes-page button,
        .admin-episodes-page a {
          border-radius: 16px !important;
          font-weight: 900 !important;
          transition:
            transform 0.2s ease,
            border-color 0.2s ease,
            background 0.2s ease,
            opacity 0.2s ease !important;
        }

        .admin-episodes-page button:hover,
        .admin-episodes-page a:hover {
          transform: translateY(-1px);
        }

        .admin-episodes-page .bg-blue-600,
        .admin-episodes-page .bg-indigo-600 {
          background: linear-gradient(135deg, #2563eb, #1d4ed8) !important;
          color: #ffffff !important;
        }

        .admin-episodes-page .bg-red-100,
        .admin-episodes-page .bg-red-600,
        .admin-episodes-page .bg-rose-600 {
          background: linear-gradient(135deg, rgba(225, 29, 72, 0.22), rgba(127, 29, 29, 0.28)) !important;
          border: 1px solid rgba(251, 113, 133, 0.24) !important;
          color: #fecdd3 !important;
        }

        .admin-episodes-page .text-red-600,
        .admin-episodes-page .text-red-700 {
          color: #fecdd3 !important;
        }

        .admin-episodes-page .text-gray-900,
        .admin-episodes-page .text-slate-900,
        .admin-episodes-page .text-black {
          color: #f8fafc !important;
        }

        .admin-episodes-page .text-gray-700,
        .admin-episodes-page .text-gray-600,
        .admin-episodes-page .text-gray-500,
        .admin-episodes-page .text-gray-400,
        .admin-episodes-page .text-slate-400,
        .admin-episodes-page .text-slate-500,
        .admin-episodes-page .text-slate-300 {
          color: #bfdbfe !important;
        }

        .admin-episodes-page .border-gray-200,
        .admin-episodes-page .border-gray-300,
        .admin-episodes-page .border-slate-800,
        .admin-episodes-page .border-slate-700 {
          border-color: rgba(148, 163, 184, 0.18) !important;
        }

        .admin-episodes-page ::placeholder {
          color: rgba(191, 219, 254, 0.46) !important;
        }

        @media (max-width: 768px) {
          .admin-episodes-page > div:first-child > div,
          .admin-episodes-page header > div,
          .admin-episodes-page > div:nth-child(2),
          .admin-episodes-page main {
            padding-left: 14px !important;
            padding-right: 14px !important;
          }

          .admin-episodes-page h1 {
            font-size: 2.1rem !important;
          }

          .admin-episodes-page h1::after {
            display: none !important;
          }
        }
      `}</style>
      <div className="admin-episodes-style-marker-v2" />

</div>
  )
}
