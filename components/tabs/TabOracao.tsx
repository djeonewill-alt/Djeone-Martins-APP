'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { PrayerRequest } from '@/lib/supabase'

export default function TabOracao() {
  const [prayers, setPrayers] = useState<PrayerRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newPrayer, setNewPrayer] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    loadPrayers()
  }, [])

  const loadPrayers = async () => {
    try {
      const { data, error } = await supabase
        .from('prayer_requests')
        .select('*')
        .eq('is_private', false)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPrayers(data || [])
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPrayer.trim()) return

    setSending(true)
    try {
      const { error } = await supabase
        .from('prayer_requests')
        .insert({
          content: newPrayer,
          author_name: authorName.trim() || 'Anônimo',
          is_private: isPrivate,
        })

      if (error) throw error

      // Limpar formulário
      setNewPrayer('')
      setAuthorName('')
      setIsPrivate(false)
      setShowForm(false)
      
      // Recarregar lista
      loadPrayers()
      
      alert('✅ Pedido enviado com sucesso!')
    } catch (error) {
      console.error('Erro ao enviar pedido:', error)
      alert('❌ Erro ao enviar pedido. Verifique sua conexão.')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Carregando pedidos...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wide flex items-center gap-2">
          <div className="w-1 h-4 bg-gradient-to-b from-blue-600 to-yellow-500 rounded" />
          🙏 Mural de Oração
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          {showForm ? '✕ Fechar' : '➕ Novo Pedido'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-4 shadow mb-6">
          <h3 className="font-semibold mb-3">Compartilhe seu pedido</h3>
          
          <input
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="Seu nome (opcional - deixe em branco para Anônimo)"
            className="w-full border-2 border-gray-200 rounded-lg p-3 mb-3 focus:border-blue-500 outline-none"
          />
          
          <textarea
            value={newPrayer}
            onChange={(e) => setNewPrayer(e.target.value)}
            placeholder="Digite seu pedido de oração..."
            className="w-full border-2 border-gray-200 rounded-lg p-3 mb-3 min-h-[100px] focus:border-blue-500 outline-none"
            required
          />
          
          <label className="flex items-center gap-2 mb-4 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="w-4 h-4"
            />
            Pedido privado (apenas eu e o pastor veem)
          </label>
          
          <button
            type="submit"
            disabled={sending}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? '⏳ Enviando...' : '🙏 Enviar Pedido'}
          </button>
        </form>
      )}

      {prayers.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl p-6">
          <p className="text-4xl mb-4">🙏</p>
          <p className="font-semibold text-gray-800 mb-2">Nenhum pedido ainda</p>
          <p className="text-sm text-gray-600">
            Seja o primeiro a compartilhar!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {prayers.map((prayer) => (
            <div
              key={prayer.id}
              className={`bg-white rounded-xl p-4 shadow border-2 ${
                prayer.is_answered 
                  ? 'border-green-200 bg-green-50' 
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">
                    {prayer.author_name || 'Anônimo'}
                  </span>
                  {prayer.is_answered && (
                    <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                      ✅ Respondido
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-500">
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
              
              <button className="text-blue-600 font-semibold text-sm hover:text-blue-700 transition-colors">
                🙏 Eu Oro (0)
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}