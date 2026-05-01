'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function NovaSerie() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    book_name: '',
    icon_emoji: '📖',
    is_free: true,
    is_current: false,
  })

  const bookIcons: Record<string, string> = {
    'João': '💧',
    'Salmos': '🎵',
    'Romanos': '⚖️',
    'Gênesis': '🌍',
    'Apocalipse': '🔥',
    'Provérbios': '💡',
    'Mateus': '📜',
    'Marcos': '✝️',
    'Lucas': '📖',
    'Atos': '⚡',
    'Coríntios': '💌',
    'Hebreus': '🏛️',
  }

  const handleBookChange = (book: string) => {
    setFormData({
      ...formData,
      book_name: book,
      icon_emoji: bookIcons[book] || '📖'
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const { error } = await supabase
        .from('series')
        .insert({
          title: formData.title,
          description: formData.description,
          book_name: formData.book_name,
          icon_emoji: formData.icon_emoji,
          is_free: formData.is_free,
          is_current: formData.is_current,
          total_episodes: 0,
          order_index: 0,
        })

      if (error) throw error

      alert('✅ Série criada com sucesso!')
      router.push('/admin')
    } catch (error) {
      console.error('Erro ao criar série:', error)
      alert('❌ Erro ao criar série. Tente novamente.')
    } finally {
      setSaving(false)
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
          <h1 className="text-2xl font-bold">📚 Nova Série</h1>
          <p className="text-blue-100 text-sm mt-1">
            Criar série de devocionais
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto p-5">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 shadow space-y-5">
          
          {/* Título */}
          <div>
            <label className="block font-semibold text-gray-900 mb-2">
              Nome da Série *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="Ex: Evangelho de João"
              className="w-full border-2 border-gray-300 rounded-lg p-3 focus:border-blue-500 outline-none"
              required
            />
          </div>

          {/* Livro Bíblico */}
          <div>
            <label className="block font-semibold text-gray-900 mb-2">
              Livro Bíblico *
            </label>
            <select
              value={formData.book_name}
              onChange={(e) => handleBookChange(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg p-3 focus:border-blue-500 outline-none"
              required
            >
              <option value="">Selecione...</option>
              {Object.keys(bookIcons).map(book => (
                <option key={book} value={book}>
                  {bookIcons[book]} {book}
                </option>
              ))}
            </select>
          </div>

          {/* Ícone Preview */}
          {formData.icon_emoji && (
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-6xl mb-2">{formData.icon_emoji}</div>
              <p className="text-sm text-gray-600">Ícone da série</p>
            </div>
          )}

          {/* Descrição */}
          <div>
            <label className="block font-semibold text-gray-900 mb-2">
              Descrição (opcional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Breve descrição da série..."
              className="w-full border-2 border-gray-300 rounded-lg p-3 focus:border-blue-500 outline-none min-h-[80px]"
            />
          </div>

          {/* Opções */}
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_free}
                onChange={(e) => setFormData({...formData, is_free: e.target.checked})}
                className="w-5 h-5"
              />
              <div>
                <div className="font-semibold text-gray-900">Série Gratuita</div>
                <div className="text-sm text-gray-600">Disponível para todos os usuários</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_current}
                onChange={(e) => setFormData({...formData, is_current: e.target.checked})}
                className="w-5 h-5"
              />
              <div>
                <div className="font-semibold text-gray-900">Série Atual</div>
                <div className="text-sm text-gray-600">Marcar como série em andamento</div>
              </div>
            </label>
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-4">
            <Link
              href="/admin"
              className="flex-1 bg-gray-200 text-gray-700 font-bold py-3 rounded-lg text-center hover:bg-gray-300 transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? '⏳ Salvando...' : '💾 Criar Série'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
