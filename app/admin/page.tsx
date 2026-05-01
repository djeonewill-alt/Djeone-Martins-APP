'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalEpisodes: 0,
    totalSeries: 0,
    prayerRequests: 0,
    pendingTestimonies: 0,
    totalReactions: 0,
    totalPrayers: 0,
    totalShares: 0,
  })
  const [loading, setLoading] = useState(true)
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = () => {
    const adminAuth = localStorage.getItem('admin_auth')
    if (adminAuth === 'authenticated') {
      setIsAuthenticated(true)
      loadStats()
    } else {
      setLoading(false)
    }
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    // Senha simples por enquanto (mudar depois)
    if (password === 'djeone2025') {
      localStorage.setItem('admin_auth', 'authenticated')
      setIsAuthenticated(true)
      loadStats()
    } else {
      alert('❌ Senha incorreta!')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_auth')
    setIsAuthenticated(false)
    setPassword('')
  }

  const loadStats = async () => {
    try {
      // Buscar estatísticas
      const [users, episodes, series, prayers, testimonies, reactions, prayerCount, shares] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('episodes').select('id', { count: 'exact', head: true }),
        supabase.from('series').select('id', { count: 'exact', head: true }),
        supabase.from('prayer_requests').select('id', { count: 'exact', head: true }),
        supabase.from('testimonies').select('id', { count: 'exact', head: true }).eq('is_approved', false),
        supabase.from('episode_reactions').select('id', { count: 'exact', head: true }),
        supabase.from('prayers').select('id', { count: 'exact', head: true }),
        supabase.from('shares').select('id', { count: 'exact', head: true }),
      ])

      setStats({
        totalUsers: users.count || 0,
        totalEpisodes: episodes.count || 0,
        totalSeries: series.count || 0,
        prayerRequests: prayers.count || 0,
        pendingTestimonies: testimonies.count || 0,
        totalReactions: reactions.count || 0,
        totalPrayers: prayerCount.count || 0,
        totalShares: shares.count || 0,
      })
    } catch (error) {
      console.error('Erro ao carregar stats:', error)
    } finally {
      setLoading(false)
    }
  }

  // Tela de login
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-5">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🔐</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Admin
            </h1>
            <p className="text-gray-600">
              Painel Administrativo
            </p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Senha de Acesso
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite a senha"
                  className="w-full border-2 border-gray-300 rounded-lg p-4 text-lg focus:border-blue-500 outline-none pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-2xl"
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white font-bold py-4 rounded-lg hover:bg-blue-700 transition-colors text-lg"
            >
              🔓 Entrar
            </button>
          </form>

          <p className="text-xs text-gray-500 text-center mt-6">
            Acesso restrito ao administrador
          </p>
        </div>
      </div>
    )
  }

  // Dashboard Admin
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">👨‍💼 Admin</h1>
            <button
              onClick={handleLogout}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              🚪 Sair
            </button>
          </div>
          <p className="text-blue-100 text-sm">
            Painel de Controle - Djeone Martins App
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-4xl mx-auto p-5">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow">
            <div className="text-3xl mb-2">👥</div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalUsers}</div>
            <div className="text-sm text-gray-600">Usuários</div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow">
            <div className="text-3xl mb-2">🎙️</div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalEpisodes}</div>
            <div className="text-sm text-gray-600">Episódios</div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow">
            <div className="text-3xl mb-2">📚</div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalSeries}</div>
            <div className="text-sm text-gray-600">Séries</div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow">
            <div className="text-3xl mb-2">🙏</div>
            <div className="text-2xl font-bold text-gray-900">{stats.prayerRequests}</div>
            <div className="text-sm text-gray-600">Pedidos</div>
          </div>
        </div>

        {/* Pendências */}
        {stats.pendingTestimonies > 0 && (
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 mb-6">
            <p className="font-semibold text-yellow-900 mb-1">
              ⚠️ Ações Pendentes
            </p>
            <p className="text-sm text-yellow-800">
              • {stats.pendingTestimonies} testemunhos aguardando aprovação
            </p>
          </div>
        )}

        {/* Ações Rápidas */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900 mb-3">
            ⚡ Ações Rápidas
          </h2>

          <Link
            href="/admin/nova-serie"
            className="block bg-white border-2 border-gray-200 hover:border-blue-500 rounded-xl p-4 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="text-3xl">📚</div>
              <div className="flex-1">
                <div className="font-bold text-gray-900">Nova Série</div>
                <div className="text-sm text-gray-600">Criar série de devocionais</div>
              </div>
              <div className="text-2xl text-gray-400">→</div>
            </div>
          </Link>

          <Link
            href="/admin/novo-episodio"
            className="block bg-white border-2 border-gray-200 hover:border-blue-500 rounded-xl p-4 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="text-3xl">🎙️</div>
              <div className="flex-1">
                <div className="font-bold text-gray-900">Novo Episódio</div>
                <div className="text-sm text-gray-600">Publicar devocional</div>
              </div>
              <div className="text-2xl text-gray-400">→</div>
            </div>
          </Link>

          <Link
            href="/admin/oracoes"
            className="block bg-white border-2 border-gray-200 hover:border-blue-500 rounded-xl p-4 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="text-3xl">🙏</div>
              <div className="flex-1">
                <div className="font-bold text-gray-900">Pedidos de Oração</div>
                <div className="text-sm text-gray-600">Ver todos os pedidos</div>
              </div>
              <div className="text-2xl text-gray-400">→</div>
            </div>
          </Link>

          <Link
            href="/"
            className="block bg-blue-50 border-2 border-blue-200 rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <div className="text-3xl">🏠</div>
              <div className="flex-1">
                <div className="font-bold text-blue-900">Ver App</div>
                <div className="text-sm text-blue-700">Voltar para o aplicativo</div>
              </div>
              <div className="text-2xl text-blue-400">→</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}