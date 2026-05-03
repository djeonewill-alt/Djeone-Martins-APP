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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 flex items-center justify-center p-5">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-8">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🔐</div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Painel Admin
            </h1>
            <p className="text-slate-400">
              Digite a senha para acessar
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 focus:border-blue-500 outline-none"
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
              className="block text-center text-sm text-slate-400 hover:text-white"
            >
              ← Voltar para o app
            </Link>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-4xl mx-auto p-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">⚙️ Painel Admin</h1>
            <p className="text-slate-400 text-sm mt-1">
              Gerenciar conteúdo
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 rounded-lg text-sm font-semibold text-slate-300 hover:text-white transition-colors"
          >
            🚪 Sair
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-4xl mx-auto p-5">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Link
            href="/admin/series"
            className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 text-center transition-colors group"
          >
            <div className="text-3xl mb-2">📚</div>
            <div className="text-2xl font-bold text-white">{stats.totalSeries}</div>
            <div className="text-sm text-slate-400 group-hover:text-slate-300">Séries</div>
          </Link>
          
          <Link
            href="/admin/episodios"
            className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 text-center transition-colors group"
          >
            <div className="text-3xl mb-2">🎙️</div>
            <div className="text-2xl font-bold text-white">{stats.totalEpisodes}</div>
            <div className="text-sm text-slate-400 group-hover:text-slate-300">Episódios</div>
          </Link>
          
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-center">
            <div className="text-3xl mb-2">👥</div>
            <div className="text-2xl font-bold text-white">{stats.totalUsers}</div>
            <div className="text-sm text-slate-400">Usuários</div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Link
            href="/admin/nova-serie"
            className="block bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl text-center transition-colors"
          >
            📚 Nova Série
          </Link>
          <Link
            href="/admin/novo-episodio"
            className="block bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl text-center transition-colors"
          >
            🎙️ Novo Episódio
          </Link>
          <Link
            href="/admin/episodios"
            className="block bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-xl text-center transition-colors"
          >
            📚 Gerenciar Episódios
          </Link>
          <Link
            href="/"
            className="block bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-bold py-4 rounded-xl text-center transition-colors"
          >
            👁️ Ver App
          </Link>
        </div>
      </div>
    </div>
  )
}