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
    <div className="admin-new-series-page min-h-screen bg-gray-50">
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
    
      <style jsx global>{`
        .admin-new-series-page {
          min-height: 100vh !important;
          background:
            radial-gradient(circle at top left, rgba(37, 99, 235, 0.18), transparent 34rem),
            radial-gradient(circle at top right, rgba(245, 158, 11, 0.14), transparent 30rem),
            #030712 !important;
          color: #f8fafc !important;
        }

        .admin-new-series-page > div:first-child {
          background:
            linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 64, 175, 0.24)) !important;
          border-bottom: 1px solid rgba(148, 163, 184, 0.16) !important;
          box-shadow: 0 20px 80px rgba(0, 0, 0, 0.22) !important;
          position: relative !important;
          overflow: hidden !important;
        }

        .admin-new-series-page > div:first-child::before {
          content: "" !important;
          position: absolute !important;
          inset: 0 !important;
          background:
            radial-gradient(circle at 12% 20%, rgba(96, 165, 250, 0.18), transparent 28rem),
            radial-gradient(circle at 88% 20%, rgba(245, 158, 11, 0.12), transparent 26rem) !important;
          pointer-events: none !important;
        }

        .admin-new-series-page > div:first-child > div,
        .admin-new-series-page > div:nth-child(2) {
          max-width: 1180px !important;
          position: relative !important;
          z-index: 1 !important;
        }

        .admin-new-series-page > div:first-child > div {
          padding-top: 34px !important;
          padding-bottom: 28px !important;
        }

        .admin-new-series-page > div:nth-child(2) {
          padding-top: 28px !important;
          padding-bottom: 64px !important;
        }

        .admin-new-series-page h1 {
          font-size: clamp(2.1rem, 4vw, 3.2rem) !important;
          line-height: 0.98 !important;
          letter-spacing: -0.07em !important;
          color: #f8fafc !important;
        }

        .admin-new-series-page h2,
        .admin-new-series-page h3 {
          color: #f8fafc !important;
          letter-spacing: -0.04em !important;
        }

        .admin-new-series-page p,
        .admin-new-series-page span {
          color: inherit;
        }

        .admin-new-series-page label {
          color: #dbeafe !important;
          font-weight: 800 !important;
        }

        .admin-new-series-page form,
        .admin-new-series-page div.bg-slate-900,
        .admin-new-series-page div.bg-gray-900,
        .admin-new-series-page div.bg-slate-800,
        .admin-new-series-page div.bg-gray-800 {
          background:
            linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(15, 23, 42, 0.72)) !important;
          border: 1px solid rgba(148, 163, 184, 0.16) !important;
          box-shadow: 0 22px 70px rgba(0, 0, 0, 0.22) !important;
          border-radius: 28px !important;
        }

        .admin-new-series-page form {
          padding: 28px !important;
        }

        .admin-new-series-page input,
        .admin-new-series-page textarea,
        .admin-new-series-page select {
          background: rgba(2, 6, 23, 0.72) !important;
          border: 1px solid rgba(148, 163, 184, 0.24) !important;
          color: #f8fafc !important;
          border-radius: 16px !important;
          padding: 13px 15px !important;
          min-height: 48px !important;
          outline: none !important;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03) !important;
        }

        .admin-new-series-page textarea {
          min-height: 130px !important;
          resize: vertical !important;
          line-height: 1.6 !important;
        }

        .admin-new-series-page input:focus,
        .admin-new-series-page textarea:focus,
        .admin-new-series-page select:focus {
          border-color: rgba(147, 197, 253, 0.62) !important;
          box-shadow:
            0 0 0 3px rgba(59, 130, 246, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.03) !important;
        }

        .admin-new-series-page button,
        .admin-new-series-page a {
          border-radius: 16px !important;
          font-weight: 900 !important;
          transition:
            transform 0.2s ease,
            border-color 0.2s ease,
            background 0.2s ease,
            opacity 0.2s ease !important;
        }

        .admin-new-series-page button:hover,
        .admin-new-series-page a:hover {
          transform: translateY(-1px);
        }

        .admin-new-series-page button:disabled {
          opacity: 0.55 !important;
          cursor: not-allowed !important;
          transform: none !important;
        }

        .admin-new-series-page .bg-blue-600,
        .admin-new-series-page .bg-indigo-600 {
          background: linear-gradient(135deg, #2563eb, #1d4ed8) !important;
          border-color: rgba(147, 197, 253, 0.34) !important;
          color: #ffffff !important;
          box-shadow: 0 18px 44px rgba(37, 99, 235, 0.2) !important;
        }

        .admin-new-series-page .bg-green-600,
        .admin-new-series-page .bg-emerald-600 {
          background: linear-gradient(135deg, #059669, #047857) !important;
          border-color: rgba(110, 231, 183, 0.28) !important;
          color: #ffffff !important;
        }

        .admin-new-series-page .bg-slate-800,
        .admin-new-series-page .bg-gray-800 {
          background: rgba(15, 23, 42, 0.72) !important;
          border: 1px solid rgba(148, 163, 184, 0.18) !important;
        }

        .admin-new-series-page .text-slate-400,
        .admin-new-series-page .text-slate-500,
        .admin-new-series-page .text-slate-300,
        .admin-new-series-page .text-gray-400,
        .admin-new-series-page .text-gray-500,
        .admin-new-series-page .text-gray-300 {
          color: #bfdbfe !important;
        }

        .admin-new-series-page .border-slate-800,
        .admin-new-series-page .border-slate-700,
        .admin-new-series-page .border-gray-800,
        .admin-new-series-page .border-gray-700 {
          border-color: rgba(148, 163, 184, 0.18) !important;
        }

        .admin-new-series-page img {
          border-radius: 20px !important;
        }

        .admin-new-series-page ::placeholder {
          color: rgba(191, 219, 254, 0.46) !important;
        }

        @media (max-width: 768px) {
          .admin-new-series-page > div:first-child > div,
          .admin-new-series-page > div:nth-child(2) {
            padding-left: 14px !important;
            padding-right: 14px !important;
          }

          .admin-new-series-page h1 {
            font-size: 2.1rem !important;
          }

          .admin-new-series-page form,
          .admin-new-series-page div.bg-slate-900,
          .admin-new-series-page div.bg-gray-900 {
            border-radius: 24px !important;
            padding: 20px !important;
          }
        }
      `}</style>


      <style jsx global>{`
        .admin-new-series-page {
          min-height: 100vh !important;
          background:
            radial-gradient(circle at top left, rgba(37, 99, 235, 0.18), transparent 34rem),
            radial-gradient(circle at top right, rgba(245, 158, 11, 0.14), transparent 30rem),
            #030712 !important;
          color: #f8fafc !important;
        }

        .admin-new-series-page > div:first-child {
          background:
            linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 64, 175, 0.28)) !important;
          border-bottom: 1px solid rgba(148, 163, 184, 0.16) !important;
          box-shadow: 0 20px 80px rgba(0, 0, 0, 0.22) !important;
          position: relative !important;
          overflow: hidden !important;
        }

        .admin-new-series-page > div:first-child::before {
          content: "" !important;
          position: absolute !important;
          inset: 0 !important;
          background:
            radial-gradient(circle at 12% 20%, rgba(96, 165, 250, 0.18), transparent 28rem),
            radial-gradient(circle at 88% 20%, rgba(245, 158, 11, 0.12), transparent 26rem) !important;
          pointer-events: none !important;
        }

        .admin-new-series-page > div:first-child > div {
          max-width: 920px !important;
          margin-left: auto !important;
          margin-right: auto !important;
          padding-top: 34px !important;
          padding-bottom: 28px !important;
          position: relative !important;
          z-index: 1 !important;
        }

        .admin-new-series-page > div:nth-child(2) {
          max-width: 920px !important;
          margin-left: auto !important;
          margin-right: auto !important;
          padding-top: 32px !important;
          padding-bottom: 64px !important;
        }

        .admin-new-series-page h1 {
          font-size: clamp(2.1rem, 4vw, 3.2rem) !important;
          line-height: 0.98 !important;
          letter-spacing: -0.07em !important;
          color: #f8fafc !important;
          margin-top: 12px !important;
        }

        .admin-new-series-page h1::after {
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

        .admin-new-series-page h2,
        .admin-new-series-page h3 {
          color: #f8fafc !important;
          letter-spacing: -0.04em !important;
        }

        .admin-new-series-page p,
        .admin-new-series-page span {
          color: inherit;
        }

        .admin-new-series-page label {
          color: #dbeafe !important;
          font-weight: 800 !important;
        }

        .admin-new-series-page > div:first-child a {
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

        .admin-new-series-page form,
        .admin-new-series-page .bg-white,
        .admin-new-series-page .bg-gray-50,
        .admin-new-series-page .bg-gray-100,
        .admin-new-series-page .bg-slate-900,
        .admin-new-series-page .bg-gray-900 {
          background:
            linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(15, 23, 42, 0.72)) !important;
          border: 1px solid rgba(148, 163, 184, 0.16) !important;
          box-shadow: 0 22px 70px rgba(0, 0, 0, 0.22) !important;
          border-radius: 28px !important;
        }

        .admin-new-series-page form {
          padding: 28px !important;
        }

        .admin-new-series-page input,
        .admin-new-series-page textarea,
        .admin-new-series-page select {
          background: rgba(2, 6, 23, 0.72) !important;
          border: 1px solid rgba(148, 163, 184, 0.24) !important;
          color: #f8fafc !important;
          border-radius: 16px !important;
          padding: 13px 15px !important;
          min-height: 48px !important;
          outline: none !important;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03) !important;
        }

        .admin-new-series-page textarea {
          min-height: 130px !important;
          resize: vertical !important;
          line-height: 1.6 !important;
        }

        .admin-new-series-page input:focus,
        .admin-new-series-page textarea:focus,
        .admin-new-series-page select:focus {
          border-color: rgba(147, 197, 253, 0.62) !important;
          box-shadow:
            0 0 0 3px rgba(59, 130, 246, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.03) !important;
        }

        .admin-new-series-page input[type="checkbox"] {
          width: 16px !important;
          height: 16px !important;
          min-height: 16px !important;
          padding: 0 !important;
          accent-color: #2563eb !important;
        }

        .admin-new-series-page button,
        .admin-new-series-page a {
          border-radius: 16px !important;
          font-weight: 900 !important;
          transition:
            transform 0.2s ease,
            border-color 0.2s ease,
            background 0.2s ease,
            opacity 0.2s ease !important;
        }

        .admin-new-series-page button:hover,
        .admin-new-series-page a:hover {
          transform: translateY(-1px);
        }

        .admin-new-series-page button:disabled {
          opacity: 0.55 !important;
          cursor: not-allowed !important;
          transform: none !important;
        }

        .admin-new-series-page .bg-blue-600,
        .admin-new-series-page .bg-indigo-600 {
          background: linear-gradient(135deg, #2563eb, #1d4ed8) !important;
          border-color: rgba(147, 197, 253, 0.34) !important;
          color: #ffffff !important;
          box-shadow: 0 18px 44px rgba(37, 99, 235, 0.2) !important;
        }

        .admin-new-series-page .bg-gray-200,
        .admin-new-series-page .bg-slate-800 {
          background: rgba(15, 23, 42, 0.72) !important;
          border: 1px solid rgba(148, 163, 184, 0.18) !important;
          color: #dbeafe !important;
        }

        .admin-new-series-page .text-gray-900,
        .admin-new-series-page .text-slate-900,
        .admin-new-series-page .text-black {
          color: #f8fafc !important;
        }

        .admin-new-series-page .text-gray-700,
        .admin-new-series-page .text-gray-600,
        .admin-new-series-page .text-gray-500,
        .admin-new-series-page .text-gray-400,
        .admin-new-series-page .text-slate-400,
        .admin-new-series-page .text-slate-500,
        .admin-new-series-page .text-slate-300 {
          color: #bfdbfe !important;
        }

        .admin-new-series-page .border-gray-200,
        .admin-new-series-page .border-gray-300,
        .admin-new-series-page .border-slate-800,
        .admin-new-series-page .border-slate-700 {
          border-color: rgba(148, 163, 184, 0.18) !important;
        }

        .admin-new-series-page ::placeholder {
          color: rgba(191, 219, 254, 0.46) !important;
        }

        @media (max-width: 768px) {
          .admin-new-series-page > div:first-child > div,
          .admin-new-series-page > div:nth-child(2) {
            padding-left: 14px !important;
            padding-right: 14px !important;
          }

          .admin-new-series-page h1 {
            font-size: 2.1rem !important;
          }

          .admin-new-series-page h1::after {
            display: none !important;
          }

          .admin-new-series-page form,
          .admin-new-series-page .bg-white {
            border-radius: 24px !important;
            padding: 20px !important;
          }
        }
      `}</style>
      <div className="admin-new-series-style-marker" />

</div>
  )
}