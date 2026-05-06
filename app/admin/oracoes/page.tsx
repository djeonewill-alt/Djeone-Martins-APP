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
    <div className="admin-prayers-page min-h-screen bg-gray-50">
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
    
      <style jsx global>{`
        .admin-prayers-page {
          min-height: 100vh !important;
          background:
            radial-gradient(circle at top left, rgba(37, 99, 235, 0.18), transparent 34rem),
            radial-gradient(circle at top right, rgba(245, 158, 11, 0.14), transparent 30rem),
            #030712 !important;
          color: #f8fafc !important;
        }

        .admin-prayers-page > div:first-child {
          background:
            linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 64, 175, 0.28)) !important;
          border-bottom: 1px solid rgba(148, 163, 184, 0.16) !important;
          box-shadow: 0 20px 80px rgba(0, 0, 0, 0.22) !important;
          position: relative !important;
          overflow: hidden !important;
        }

        .admin-prayers-page > div:first-child::before {
          content: "" !important;
          position: absolute !important;
          inset: 0 !important;
          background:
            radial-gradient(circle at 12% 20%, rgba(96, 165, 250, 0.18), transparent 28rem),
            radial-gradient(circle at 88% 20%, rgba(245, 158, 11, 0.12), transparent 26rem) !important;
          pointer-events: none !important;
        }

        .admin-prayers-page > div:first-child > div,
        .admin-prayers-page > div:nth-child(2) {
          max-width: 1180px !important;
          margin-left: auto !important;
          margin-right: auto !important;
          position: relative !important;
          z-index: 1 !important;
        }

        .admin-prayers-page > div:first-child > div {
          padding-top: 34px !important;
          padding-bottom: 28px !important;
        }

        .admin-prayers-page > div:nth-child(2) {
          padding-top: 32px !important;
          padding-bottom: 64px !important;
        }

        .admin-prayers-page h1 {
          font-size: clamp(2.1rem, 4vw, 3.2rem) !important;
          line-height: 0.98 !important;
          letter-spacing: -0.07em !important;
          color: #f8fafc !important;
        }

        .admin-prayers-page h1::after {
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

        .admin-prayers-page a[href="/admin"] {
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

        .admin-prayers-page > div:nth-child(2) > div.grid {
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          background: rgba(15, 23, 42, 0.62) !important;
          border: 1px solid rgba(148, 163, 184, 0.14) !important;
          border-radius: 22px !important;
          padding: 6px !important;
          box-shadow: none !important;
        }

        .admin-prayers-page > div:nth-child(2) > div.grid button {
          min-height: 48px !important;
          border-radius: 16px !important;
        }

        .admin-prayers-page .bg-white,
        .admin-prayers-page .bg-gray-100,
        .admin-prayers-page .bg-green-50,
        .admin-prayers-page .bg-yellow-50\/30 {
          background:
            linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(15, 23, 42, 0.72)) !important;
          border: 1px solid rgba(148, 163, 184, 0.16) !important;
          box-shadow: 0 22px 70px rgba(0, 0, 0, 0.22) !important;
          border-radius: 26px !important;
        }

        .admin-prayers-page .space-y-4 > div {
          transition:
            transform 0.2s ease,
            border-color 0.2s ease,
            background 0.2s ease !important;
        }

        .admin-prayers-page .space-y-4 > div:hover {
          transform: translateY(-2px) !important;
          border-color: rgba(147, 197, 253, 0.34) !important;
        }

        .admin-prayers-page button,
        .admin-prayers-page a {
          border-radius: 16px !important;
          font-weight: 900 !important;
          transition:
            transform 0.2s ease,
            border-color 0.2s ease,
            background 0.2s ease,
            opacity 0.2s ease !important;
        }

        .admin-prayers-page button:hover,
        .admin-prayers-page a:hover {
          transform: translateY(-1px);
        }

        .admin-prayers-page .bg-blue-600 {
          background: linear-gradient(135deg, #2563eb, #1d4ed8) !important;
          color: #ffffff !important;
          box-shadow: 0 14px 34px rgba(37, 99, 235, 0.18) !important;
        }

        .admin-prayers-page .bg-green-600,
        .admin-prayers-page .bg-green-500 {
          background: linear-gradient(135deg, #059669, #047857) !important;
          color: #ffffff !important;
        }

        .admin-prayers-page .bg-yellow-500 {
          background: linear-gradient(135deg, #d97706, #92400e) !important;
          color: #ffffff !important;
        }

        .admin-prayers-page .border-green-200,
        .admin-prayers-page .border-yellow-200,
        .admin-prayers-page .border-gray-200 {
          border-color: rgba(148, 163, 184, 0.18) !important;
        }

        .admin-prayers-page .border-green-500 {
          border-color: rgba(34, 197, 94, 0.7) !important;
        }

        .admin-prayers-page .text-gray-900,
        .admin-prayers-page .text-gray-800,
        .admin-prayers-page .text-gray-700,
        .admin-prayers-page .text-gray-600,
        .admin-prayers-page .text-gray-500 {
          color: #dbeafe !important;
        }

        .admin-prayers-page .text-blue-100 {
          color: #bfdbfe !important;
        }

        .admin-prayers-page .text-green-600,
        .admin-prayers-page .text-green-700,
        .admin-prayers-page .text-green-800 {
          color: #86efac !important;
        }

        .admin-prayers-page .hover\:bg-gray-100:hover {
          background: rgba(30, 41, 59, 0.7) !important;
        }

        .admin-prayers-page .animate-spin {
          border-color: rgba(147, 197, 253, 0.24) !important;
          border-bottom-color: #60a5fa !important;
        }

        @media (max-width: 768px) {
          .admin-prayers-page > div:first-child > div,
          .admin-prayers-page > div:nth-child(2) {
            padding-left: 14px !important;
            padding-right: 14px !important;
          }

          .admin-prayers-page > div:nth-child(2) > div.grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .admin-prayers-page h1 {
            font-size: 2.1rem !important;
          }

          .admin-prayers-page h1::after {
            display: none !important;
          }

          .admin-prayers-page .space-y-4 > div {
            border-radius: 24px !important;
          }
        }
      `}</style>

</div>
  )
}