'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'

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

export default function EditarSerie() {
  const router = useRouter()
  const params = useParams()
  const serieId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  
  const [formData, setFormData] = useState({
    title: '',
    bible_book: '',
    description: '',
    is_free: true,
    is_current: false,
    cover_image_url: '',
  })

  useEffect(() => {
    if (serieId) {
      loadSerie()
    }
  }, [serieId])

  const loadSerie = async () => {
    try {
      console.log('Carregando série com ID:', serieId)
      
      const { data, error } = await supabase
        .from('series')
        .select('*')
        .eq('id', serieId)
        .single()

      if (error) {
        console.error('Erro ao carregar série:', error)
        throw error
      }

      console.log('Série carregada:', data)

      setFormData({
        title: data.title || '',
        bible_book: data.bible_book || '',
        description: data.description || '',
        is_free: data.is_free ?? true,
        is_current: data.is_current ?? false,
        cover_image_url: data.cover_image_url || '',
      })
    } catch (error) {
      console.error('Erro ao carregar série:', error)
      alert('❌ Erro ao carregar série!')
      router.push('/admin/series')
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formDataUpload = new FormData()
      formDataUpload.append('file', file)
      formDataUpload.append('type', 'cover')

      const response = await fetch('/api/upload-audio', {
        method: 'POST',
        body: formDataUpload,
      })

      const data = await response.json()

      if (data.url) {
        setFormData(prev => ({ ...prev, cover_image_url: data.url }))
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim()) {
      alert('❌ Digite o nome da série!')
      return
    }

    setSaving(true)

    try {
      console.log('Atualizando série:', serieId)
      console.log('Dados:', formData)

      const { data, error } = await supabase
        .from('series')
        .update({
          title: formData.title,
          bible_book: formData.bible_book,
          description: formData.description,
          is_free: formData.is_free,
          is_current: formData.is_current,
          cover_image_url: formData.cover_image_url || null,
        })
        .eq('id', serieId)
        .select()

      if (error) {
        console.error('Erro do Supabase:', error)
        console.error('Código:', error.code)
        console.error('Mensagem:', error.message)
        console.error('Detalhes:', error.details)
        throw error
      }

      console.log('Série atualizada:', data)
      alert('✅ Série atualizada com sucesso!')
      router.push('/admin/series')
    } catch (error: any) {
      console.error('Erro completo ao atualizar série:', error)
      alert(`❌ Erro ao atualizar série: ${error.message || 'Tente novamente.'}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-2">⏳</div>
          <p className="text-slate-400">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-4xl mx-auto p-6">
          <Link href="/admin/series" className="text-slate-400 hover:text-white mb-3 inline-block text-sm">
            ← Voltar
          </Link>
          <h1 className="text-2xl font-bold text-white">✏️ Editar Série</h1>
          <p className="text-slate-400 text-sm mt-1">Atualizar informações da série</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-5">
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
          
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Nome da Série *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 focus:border-blue-500 outline-none"
              placeholder="Ex: Evangelho de João"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Livro Bíblico *
            </label>
            <select
              value={formData.bible_book}
              onChange={(e) => setFormData({ ...formData, bible_book: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 focus:border-blue-500 outline-none"
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
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Imagem da Série
            </label>
            
            {formData.cover_image_url && (
              <div className="mb-3">
                <img 
                  src={formData.cover_image_url} 
                  alt="Capa atual" 
                  className="w-32 h-40 object-cover rounded-lg border-2 border-slate-700"
                />
                <p className="text-sm text-slate-400 mt-2">Capa atual</p>
              </div>
            )}
            
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploading}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 focus:border-blue-500 outline-none disabled:opacity-50"
            />
            {uploading && <p className="text-sm text-slate-400 mt-2">⏳ Fazendo upload...</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Descrição (opcional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 focus:border-blue-500 outline-none"
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
                <div className="font-semibold text-white">Série Gratuita</div>
                <div className="text-sm text-slate-400">Disponível para todos os usuários</div>
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
                <div className="font-semibold text-white">Série Atual</div>
                <div className="text-sm text-slate-400">Marcar como série em andamento</div>
              </div>
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <Link
              href="/admin/series"
              className="flex-1 bg-slate-800 text-slate-300 font-bold py-3 rounded-lg text-center hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? '⏳ Salvando...' : '✅ Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}