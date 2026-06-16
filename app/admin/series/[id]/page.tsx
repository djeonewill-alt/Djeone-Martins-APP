'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

import { supabase } from '@/lib/supabase'

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
  '3 João', 'Judas', 'Apocalipse',
]

type AccessType = 'free' | 'premium'

type SeriesFormState = {
  title: string
  bible_book: string
  description: string
  icon_emoji: string
  is_current: boolean
  is_open: boolean
  order_index: number
}

export default function EditarSeriePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const seriesId = params.id

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [episodeCount, setEpisodeCount] = useState(0)
  const [accessType, setAccessType] = useState<AccessType>('free')

  const [formData, setFormData] = useState<SeriesFormState>({
    title: '',
    bible_book: '',
    description: '',
    icon_emoji: '📖',
    is_current: false,
    is_open: true,
    order_index: 0,
  })

  useEffect(() => {
    loadSeries()
  }, [seriesId])

  async function loadSeries() {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('series')
        .select('*')
        .eq('id', seriesId)
        .single()

      if (error) throw error

      const { count } = await supabase
        .from('episodes')
        .select('id', { count: 'exact', head: true })
        .eq('series_id', seriesId)

      setEpisodeCount(count || 0)
      setAccessType(data.is_free === false ? 'premium' : 'free')
      setImageUrl(data.cover_image_url || '')

      setFormData({
        title: data.title || '',
        bible_book: data.bible_book || data.book_name || '',
        description: data.description || '',
        icon_emoji: data.icon_emoji || '📖',
        is_current: Boolean(data.is_current),
        is_open: data.is_open !== false,
        order_index: Number(data.order_index) || 0,
      })
    } catch (error) {
      console.error('Erro ao carregar podcast:', error)
      alert('Não foi possível carregar este podcast.')
      router.push('/admin/series')
    } finally {
      setLoading(false)
    }
  }

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)

    try {
      const uploadData = new FormData()
      uploadData.append('file', file)
      uploadData.append('type', 'cover')

      const response = await fetch('/api/upload-audio', {
        method: 'POST',
        body: uploadData,
      })

      const data = await response.json()

      if (!response.ok || !data.url) {
        throw new Error(data.error || 'Erro ao fazer upload da imagem.')
      }

      setImageUrl(data.url)
      alert('Imagem carregada com sucesso.')
    } catch (error) {
      console.error('Erro no upload:', error)
      alert('Não foi possível enviar a imagem agora.')
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!formData.title.trim()) {
      alert('Informe o título do podcast.')
      return
    }

    if (!formData.bible_book) {
      alert('Selecione o livro bíblico ou tema principal.')
      return
    }

    try {
      setSaving(true)

      if (formData.is_current) {
        await supabase
          .from('series')
          .update({ is_current: false })
          .neq('id', seriesId)
      }

      const { error } = await supabase
        .from('series')
        .update({
          title: formData.title.trim(),
          bible_book: formData.bible_book,
          book_name: formData.bible_book,
          description: formData.description.trim() || null,
          cover_image_url: imageUrl || null,
          icon_emoji: formData.icon_emoji.trim() || '📖',
          is_free: accessType === 'free',
          is_current: formData.is_current,
          is_open: formData.is_open,
          order_index: Number(formData.order_index) || 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', seriesId)

      if (error) throw error

      alert('Podcast atualizada com sucesso.')
      router.push('/admin/series')
    } catch (error) {
      console.error('Erro ao atualizar podcast:', error)
      alert('Não foi possível atualizar o podcast agora.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-5 py-8 text-white">
        <section className="mx-auto max-w-4xl">
          <div className="rounded-[32px] border border-white/10 bg-slate-900/70 p-8 text-sm font-bold text-slate-400">
            Carregando podcast...
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-white">
      <section className="mx-auto max-w-4xl">
        <Link
          href="/admin/series"
          className="inline-flex rounded-full border border-white/10 bg-slate-900/80 px-4 py-2 text-sm font-black text-blue-200 active:scale-[0.98]"
        >
          ← Voltar paro podcasts
        </Link>

        <div className="mt-8">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-300">
            Editar podcast
          </p>

          <h1 className="mt-2 text-4xl font-black leading-none tracking-[-0.07em] sm:text-5xl">
            {formData.title || 'Podcast'}
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400">
            Ajuste capa, descrição, acesso premium/gratuito e destaque atual.
          </p>
        </div>

        <div className="mt-6 rounded-[28px] border border-white/10 bg-slate-900/70 p-5">
          <p className="text-3xl font-black">{episodeCount}</p>
          <p className="mt-1 text-sm font-bold text-slate-400">
            episódios vinculados a este podcast
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-[32px] border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/20 sm:p-7"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="text-sm font-black text-slate-100">
                Título do podcast *
              </label>
              <input
                value={formData.title}
                onChange={(event) =>
                  setFormData({ ...formData, title: event.target.value })
                }
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-blue-300/60"
              />
            </div>

            <div>
              <label className="text-sm font-black text-slate-100">
                Livro bíblico ou tema *
              </label>
              <select
                value={formData.bible_book}
                onChange={(event) =>
                  setFormData({ ...formData, bible_book: event.target.value })
                }
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-300/60"
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
              <label className="text-sm font-black text-slate-100">
                Emoji do podcast
              </label>
              <input
                value={formData.icon_emoji}
                onChange={(event) =>
                  setFormData({ ...formData, icon_emoji: event.target.value })
                }
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-blue-300/60"
              />
            </div>

            <div>
              <label className="text-sm font-black text-slate-100">
                Ordem de exibição
              </label>
              <input
                type="number"
                value={formData.order_index}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    order_index: Number(event.target.value),
                  })
                }
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-300/60"
              />
            </div>
          </div>

          <div className="mt-5">
            <label className="text-sm font-black text-slate-100">
              Descrição
            </label>
            <textarea
              value={formData.description}
              onChange={(event) =>
                setFormData({ ...formData, description: event.target.value })
              }
              rows={4}
              className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold leading-6 text-white outline-none placeholder:text-slate-600 focus:border-blue-300/60"
            />
          </div>

          <div className="mt-6 rounded-[28px] border border-amber-300/20 bg-amber-300/10 p-5">
            <p className="text-sm font-black text-amber-100">
              Capa do podcast
            </p>

            <p className="mt-2 text-sm leading-6 text-amber-50/90">
              Use imagem horizontal em 16:9. Ideal: 1920 x 1080 px. Mantenha
              elementos importantes no centro.
            </p>

            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="mt-4 block w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-200"
            />

            {uploading && (
              <p className="mt-3 text-sm font-bold text-amber-100">
                Enviando imagem...
              </p>
            )}

            {imageUrl && (
              <div className="mt-4 overflow-hidden rounded-3xl border border-white/10 bg-slate-950">
                <div className="relative aspect-video">
                  <img
                    src={imageUrl}
                    alt="Prévia da capa"
                    className="absolute inset-0 h-full w-full object-cover object-center"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-5">
              <p className="text-sm font-black text-white">Tipo de acesso</p>

              <div className="mt-4 space-y-3">
                <label className="flex cursor-pointer gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                  <input
                    type="radio"
                    name="accessType"
                    checked={accessType === 'free'}
                    onChange={() => setAccessType('free')}
                    className="mt-1 h-4 w-4 accent-blue-500"
                  />
                  <span>
                    <span className="block text-sm font-black text-white">
                      Gratuita
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-400">
                      Qualquer usuário poderá acessar este podcast.
                    </span>
                  </span>
                </label>

                <label className="flex cursor-pointer gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                  <input
                    type="radio"
                    name="accessType"
                    checked={accessType === 'premium'}
                    onChange={() => setAccessType('premium')}
                    className="mt-1 h-4 w-4 accent-amber-400"
                  />
                  <span>
                    <span className="block text-sm font-black text-white">
                      Premium
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-400">
                      Será reservada para assinantes quando o premium for ativado.
                    </span>
                  </span>
                </label>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-5">
              <p className="text-sm font-black text-white">Destaque</p>

              <label className="mt-4 flex cursor-pointer gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                <input
                  type="checkbox"
                  checked={formData.is_current}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      is_current: event.target.checked,
                    })
                  }
                  className="mt-1 h-4 w-4 accent-emerald-400"
                />
                <span>
                  <span className="block text-sm font-black text-white">
                    Definir como podcast em destaque atual
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-400">
                    Ela aparecerá com destaque principal na aba Podcasts.
                  </span>
                </span>
              </label>

              <label className="mt-4 flex cursor-pointer gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                <input
                  type="checkbox"
                  checked={formData.is_open}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      is_open: event.target.checked,
                    })
                  }
                  className="mt-1 h-4 w-4 accent-blue-400"
                />
                <span>
                  <span className="block text-sm font-black text-white">
                    Série aberta para novos episódios
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-400">
                    Séries fechadas não aparecem na tela de Novo Episódio.
                  </span>
                </span>
              </label>
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/admin/series"
              className="flex-1 rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-center text-sm font-black text-slate-100 active:scale-[0.98]"
            >
              Cancelar
            </Link>

            <Link
              href={`/admin/series/${seriesId}/episodios/novo`}
              className="flex-1 rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-center text-sm font-black text-slate-100 active:scale-[0.98]"
            >
              Novo episódio
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-2xl bg-blue-600 px-5 py-4 text-sm font-black text-white shadow-xl shadow-blue-950/20 active:scale-[0.98] disabled:opacity-60"
            >
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}
