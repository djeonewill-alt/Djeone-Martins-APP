'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const ADMIN_PASSWORD = 'djeone2025'

export default function Admin() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [stats, setStats] = useState({
    totalSeries: 0,
    totalEpisodes: 0,
    totalUsers: 0,
  })

  useEffect(() => {
    const adminLoggedIn = localStorage.getItem('admin_logged_in')
    if (adminLoggedIn === 'true') {
      setIsAuthenticated(true)
      loadStats()
    }
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      localStorage.setItem('admin_logged_in', 'true')
      setIsAuthenticated(true)
      loadStats()
    } else {
      alert('❌ Senha incorreta!')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_logged_in')
    setIsAuthenticated(false)
    setPassword('')
  }

  const loadStats = async () => {
    try {
      const [seriesRes, episodesRes, usersRes] = await Promise.all([
        supabase.from('series').select('id', { count: 'exact' }),
        supabase.from('episodes').select('id', { count: 'exact' }),
        supabase.from('profiles').select('id', { count: 'exact' }),
      ])

      setStats({
        totalSeries: seriesRes.count || 0,
        totalEpisodes: episodesRes.count || 0,
        totalUsers: usersRes.count || 0,
      })
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-5">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🔐</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Painel Admin
            </h1>
            <p className="text-gray-600">
              Digite a senha para acessar
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-2 border-gray-300 rounded-lg p-3 focus:border-blue-500 outline-none"
                placeholder="Digite a senha..."
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Entrar
            </button>

            <Link
              href="/"
              className="block text-center text-sm text-gray-600 hover:text-gray-900"
            >
              ← Voltar para o app
            </Link>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">⚙️ Painel Admin</h1>
            <p className="text-blue-100 text-sm mt-1">
              Gerenciar conteúdo
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            🚪 Sair
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-4xl mx-auto p-5">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 shadow text-center">
            <div className="text-3xl mb-2">📚</div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalSeries}</div>
            <div className="text-sm text-gray-600">Séries</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow text-center">
            <div className="text-3xl mb-2">🎙️</div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalEpisodes}</div>
            <div className="text-sm text-gray-600">Episódios</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow text-center">
            <div className="text-3xl mb-2">👥</div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalUsers}</div>
            <div className="text-sm text-gray-600">Usuários</div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Link
            href="/admin/nova-serie"
            className="block bg-blue-600 text-white font-bold py-4 rounded-xl text-center hover:bg-blue-700 transition-colors"
          >
            📚 Nova Série
          </Link>
          <Link
            href="/admin/novo-episodio"
            className="block bg-green-600 text-white font-bold py-4 rounded-xl text-center hover:bg-green-700 transition-colors"
          >
            🎙️ Novo Episódio
          </Link>
          <Link
            href="/"
            className="block bg-gray-200 text-gray-700 font-bold py-4 rounded-xl text-center hover:bg-gray-300 transition-colors"
          >
            👁️ Ver App
          </Link>
        </div>
      </div>
    </div>
  )
}