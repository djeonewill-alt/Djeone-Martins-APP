'use client'

import { useState, FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const BIBLE_BOOKS = [
  'Gênesis', 'Êxodo', 'Levítico', 'Números', 'Deuteronômio',
  'Josué', 'Juízes', 'Rute', '1 Samuel', '2 Samuel',
  '1 Reis', '2 Reis', '1 Crônicas', '2 Crônicas', 'Esdras',
  'Neemias', 'Ester', 'Jó', 'Salmos', 'Provérbios',
  'Eclesiastes', 'Cantares', 'Isaías', 'Jeremias', 'Lamentações',
  'Ezequiel', 'Daniel', 'Oséias', 'Joel', 'Amós',
  'Obadias', 'Jonas', 'Miquéias', 'Naum', 'Habacuque',
  'Sofonias', 'Ageu', 'Zacarias', 'Malaquias',
  'Mateus', 'Marcos', 'Lucas', 'João', 'Atos',
  'Romanos', '1 Coríntios', '2 Coríntios', 'Gálatas', 'Efésios',
  'Filipenses', 'Colossenses', '1 Tessalonicenses', '2 Tessalonicenses',
  '1 Timóteo', '2 Timóteo', 'Tito', 'Filemom', 'Hebreus',
  'Tiago', '1 Pedro', '2 Pedro', '1 João', '2 João',
  '3 João', 'Judas', 'Apocalipse'
]

export default function NovaSerie() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  
  const [formData, setFormData] = useState({
    title: '',
    bible_book: '',
    description: '',
    is_free: true,
    is_current: false,
  })

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'cover')

      const response = await fetch('/api/upload-audio', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.url) {
        setImageUrl(data.url)
        alert('✅ Imagem carregada!')
      } else {
        throw new Error(data.error || 'Erro ao fazer upload')
      }
    } catch (error) {
      console.error('Erro no upload:', error)
      alert('❌ Erro ao fazer upload da imagem. Tente novamente.')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim()) {
      alert('❌ Digite o nome da série!')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase
        .from('series')
        .insert([{
          ...formData,
          cover_image_url: imageUrl || null,
        }])

      if (error) throw error

      alert('✅ Série criada com sucesso!')
      router.push('/admin')
    } catch (error) {
      console.error('Erro ao criar série:', error)
      alert('❌ Erro ao criar série. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
        <div className="max-w-4xl mx-auto">
          <Link href="/admin" className="text-blue-100 hover:text-white mb-2 inline-block">
            ← Voltar
          </Link>
          <h1 className="text-2xl font-bold">📚 Nova Série</h1>
          <p className="text-blue-100 text-sm mt-1">Criar série de devocionais</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-5">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 space-y-5">
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nome da Série *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full border-2 border-gray-300 rounded-lg p-3 focus:border-blue-500 outline-none"
              placeholder="Ex: Evangelho de João"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Livro Bíblico *
            </label>
            <select
              value={formData.bible_book}
              onChange={(e) => setFormData({ ...formData, bible_book: e.target.value })}
              className="w-full border-2 border-gray-300 rounded-lg p-3 focus:border-blue-500 outline-none"
              required
            >
              <option value="">Selecione...</option>
              {BIBLE_BOOKS.map((book) => (
                <option key={book} value={book}>
                  {book}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Imagem da Série
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploading}
              className="w-full border-2 border-gray-300 rounded-lg p-3 focus:border-blue-500 outline-none disabled:opacity-50"
            />
            {uploading && <p className="text-sm text-gray-600 mt-2">⏳ Fazendo upload...</p>}
            {imageUrl && (
              <div className="mt-3">
                <img src={imageUrl} alt="Preview" className="w-32 h-40 object-cover rounded-lg" />
                <p className="text-sm text-green-600 mt-1">✅ Imagem carregada!</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Descrição (opcional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border-2 border-gray-300 rounded-lg p-3 focus:border-blue-500 outline-none"
              rows={3}
              placeholder="Breve descrição da série..."
            />
          </div>

          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_free}
                onChange={(e) => setFormData({ ...formData, is_free: e.target.checked })}
                className="mt-1"
              />
              <div>
                <div className="font-semibold text-gray-900">Série Gratuita</div>
                <div className="text-sm text-gray-600">Disponível para todos os usuários</div>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_current}
                onChange={(e) => setFormData({ ...formData, is_current: e.target.checked })}
                className="mt-1"
              />
              <div>
                <div className="font-semibold text-gray-900">Série Atual</div>
                <div className="text-sm text-gray-600">Marcar como série em andamento</div>
              </div>
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <Link
              href="/admin"
              className="flex-1 bg-gray-200 text-gray-700 font-bold py-3 rounded-lg text-center hover:bg-gray-300 transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? '⏳ Criando...' : '📚 Criar Série'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}