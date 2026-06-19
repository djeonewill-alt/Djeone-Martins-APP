'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

import AdminAudioPlayer from '@/components/admin/AdminAudioPlayer'
import { supabase } from '@/lib/supabase'

type TranscriptionSegment = {
  start: number
  end: number
  text: string
}

type PodcastRow = {
  id: string
  title: string
  description: string | null
  cover_image_url: string | null
}

function parseEpisodeNumber(value: string) {
  const trimmed = value.trim()

  if (!trimmed) return null

  const parsed = Number(trimmed)

  if (!Number.isFinite(parsed) || parsed < 1) {
    return null
  }

  return Math.floor(parsed)
}

export default function NovoEpisodioCatalogoPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const podcastId = params.id

  const [podcast, setPodcast] = useState<PodcastRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAudio, setUploadingAudio] = useState(false)

  const [title, setTitle] = useState('')
  const [bibleReference, setBibleReference] = useState('')
  const [episodeNumber, setEpisodeNumber] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('draft')

  const [transcribing, setTranscribing] = useState(false)
  const [transcriptionText, setTranscriptionText] = useState('')
  const [transcriptionSegments, setTranscriptionSegments] = useState<TranscriptionSegment[]>([])
  const [transcriptionError, setTranscriptionError] = useState('')

  const [generatingMetadata, setGeneratingMetadata] = useState(false)
  const [metadataError, setMetadataError] = useState('')

  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [audioUrl, setAudioUrl] = useState('')
  const [uploadError, setUploadError] = useState('')

  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [uploadingCover, setUploadingCover] = useState(false)
  const [coverUploadError, setCoverUploadError] = useState('')

  const [isGeneratingCompatibleAudio, setIsGeneratingCompatibleAudio] = useState(false)
  const [audioUrlCompatible, setAudioUrlCompatible] = useState('')
  const [audioCompatibleType, setAudioCompatibleType] = useState('')
  const [audioCompatibilityWarning, setAudioCompatibilityWarning] = useState('')
  const [uploadedAudioContentType, setUploadedAudioContentType] = useState('')

  useEffect(() => {
    loadPodcast()
  }, [podcastId])

  async function loadPodcast() {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('series')
        .select('id, title, description, cover_image_url')
        .eq('id', podcastId)
        .single()

      if (error) throw error

      setPodcast(data as PodcastRow)

      const { data: lastEpisodeRows, error: lastEpisodeError } = await supabase
        .from('episodes')
        .select('episode_number')
        .eq('series_id', podcastId)
        .not('episode_number', 'is', null)
        .order('episode_number', { ascending: false })
        .limit(1)

      if (!lastEpisodeError) {
        const lastNumber = Number(lastEpisodeRows?.[0]?.episode_number || 0)
        setEpisodeNumber(String(lastNumber + 1))
      }
    } catch (error) {
      console.error('Erro ao carregar podcast:', error)
      alert('Não foi possível carregar este podcast.')
      router.push('/admin/series')
    } finally {
      setLoading(false)
    }
  }

   async function handleUploadAudio() {
    if (!audioFile) {
      alert('Selecione um arquivo de áudio primeiro.')
      return
    }

    try {
      setUploadingAudio(true)
      setUploadError('')

      const adminSecret = process.env.NEXT_PUBLIC_ADMIN_API_SECRET || ''

      // Para áudio, usa presigned upload que ignora limite de 4.5 MB da Vercel
      const presignResponse = await fetch('/api/r2/presigned-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminSecret,
        },
        body: JSON.stringify({
          fileName: audioFile.name,
          contentType: audioFile.type || 'audio/mpeg',
          sizeBytes: audioFile.size,
          folder: 'audio',
        }),
      })

      if (!presignResponse.ok) {
        let presignError = 'Erro ao preparar upload do áudio.'
        try {
          const presignData = await presignResponse.json()
          if (presignData.error) presignError = presignData.error
        } catch { /* resposta não-JSON */ }
        throw new Error(presignError)
      }

      const presignData = await presignResponse.json()

      const uploadResponse = await fetch(presignData.signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': presignData.contentType || audioFile.type || 'audio/mpeg',
        },
        body: audioFile,
      })

      if (!uploadResponse.ok) {
        throw new Error('Erro ao enviar áudio para o storage.')
      }

      setAudioUrl(presignData.publicUrl)
    } catch (error) {
      console.error('Erro ao enviar áudio:', error)

      const message =
        error instanceof Error
          ? error.message
          : 'Não foi possível enviar o áudio.'

      setUploadError(message)
      alert(message)
    } finally {
      setUploadingAudio(false)
    }
  }


   async function handleUploadCover() {
    if (!coverFile) {
      alert('Selecione uma imagem de capa primeiro.')
      return
    }

    try {
      setUploadingCover(true)
      setCoverUploadError('')

      const adminSecret = process.env.NEXT_PUBLIC_ADMIN_API_SECRET || ''

      // Presigned upload para ignorar limite de 4.5 MB da Vercel Hobby
      const presignResponse = await fetch('/api/r2/presigned-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminSecret,
        },
        body: JSON.stringify({
          fileName: coverFile.name,
          contentType: coverFile.type,
          sizeBytes: coverFile.size,
          folder: 'images',
        }),
      })

      if (!presignResponse.ok) {
        let presignError = 'Erro ao preparar upload da capa.'
        try {
          const presignData = await presignResponse.json()
          if (presignData.error) presignError = presignData.error
        } catch { /* resposta não-JSON */ }
        throw new Error(presignError)
      }

      const presignData = await presignResponse.json()

      const uploadResponse = await fetch(presignData.signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': presignData.contentType || coverFile.type || 'image/png',
        },
        body: coverFile,
      })

      if (!uploadResponse.ok) {
        throw new Error('Erro ao enviar capa para o storage.')
      }

      setCoverImageUrl(presignData.publicUrl)
    } catch (error) {
      console.error('Erro ao enviar capa:', error)

      const message =
        error instanceof Error
          ? error.message
          : 'Não foi possível enviar a capa.'

      setCoverUploadError(message)
      alert(message)
    } finally {
      setUploadingCover(false)
    }
  }

  async function handleGenerateCompatibleAudio() {
    if (!audioUrl) {
      alert('Envie o áudio primeiro.')
      return
    }

    if (isGeneratingCompatibleAudio) return

    setIsGeneratingCompatibleAudio(true)
    setUploadError('')

    try {
      const response = await fetch('/api/admin/audio/convert-to-mp3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceUrl: audioUrl }),
      })
      const data = await response.json()

      if (!response.ok || !data.success || !data.compatibleUrl) {
        throw new Error(data.error || 'Não foi possível converter o áudio.')
      }

      setAudioUrl(data.compatibleUrl)
      setAudioUrlCompatible(data.compatibleUrl)
      setAudioCompatibleType('audio/mpeg')
      setUploadedAudioContentType('audio/mpeg')
      setAudioCompatibilityWarning('')

      const sizeMb = typeof data.sizeMb === 'number'
        ? data.sizeMb.toFixed(2)
        : ((data.sizeBytes || 0) / 1024 / 1024).toFixed(2)

      alert(`MP3 compatível gerado. Tamanho: ${sizeMb} MB.`)
    } catch (error) {
      console.error('Erro ao gerar MP3:', error)
      const message = error instanceof Error ? error.message : 'Erro ao converter áudio.'
      setUploadError(message)
      alert(message)
    } finally {
      setIsGeneratingCompatibleAudio(false)
    }
  }

  async function handleTranscribeAudio() {
    if (!audioUrl) {
      alert('Envie o áudio antes de transcrever.')
      return
    }

    try {
      setTranscribing(true)
      setTranscriptionError('')

      const response = await fetch('/api/ai/transcribe-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioUrl,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Não foi possível transcrever o áudio.')
      }

      const nextTranscriptionText = result.transcriptionText || ''

      setTranscriptionText(nextTranscriptionText)
      setTranscriptionSegments(Array.isArray(result.transcriptionSegments) ? result.transcriptionSegments : [])

      if (nextTranscriptionText.trim()) {
        await generateMetadataFromTranscription(nextTranscriptionText)
      }
    } catch (error) {
      console.error('Erro ao transcrever áudio:', error)

      const message =
        error instanceof Error
          ? error.message
          : 'Não foi possível transcrever o áudio.'

      setTranscriptionError(message)
      alert(message)
    } finally {
      setTranscribing(false)
    }
  }

  async function generateMetadataFromTranscription(nextTranscriptionText: string) {
    const cleanTranscription = nextTranscriptionText.trim()

    if (!cleanTranscription) {
      return
    }

    try {
      setGeneratingMetadata(true)
      setMetadataError('')

      const response = await fetch('/api/ai/generate-episode-metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcriptionText: cleanTranscription,
          bibleReference,
          currentTitle: title,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Não foi possível gerar título e descrição.')
      }

      if (result.title) {
        setTitle(result.title)
      }

      if (result.description) {
        setDescription(result.description)
      }
    } catch (error) {
      console.error('Erro ao gerar título e descrição:', error)

      const message =
        error instanceof Error
          ? error.message
          : 'Não foi possível gerar título e descrição.'

      setMetadataError(message)
    } finally {
      setGeneratingMetadata(false)
    }
  }
  async function handleGenerateMetadata() {
    if (!transcriptionText.trim()) {
      alert('Transcreva o áudio antes de gerar título e descrição.')
      return
    }

    try {
      setGeneratingMetadata(true)
      setMetadataError('')

      const response = await fetch('/api/ai/generate-episode-metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcriptionText,
          bibleReference,
          currentTitle: title,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Não foi possível gerar título e descrição.')
      }

      if (result.title) {
        setTitle(result.title)
      }

      if (result.description) {
        setDescription(result.description)
      }
    } catch (error) {
      console.error('Erro ao gerar título e descrição:', error)

      const message =
        error instanceof Error
          ? error.message
          : 'Não foi possível gerar título e descrição.'

      setMetadataError(message)
      alert(message)
    } finally {
      setGeneratingMetadata(false)
    }
  }
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!title.trim()) {
      alert('Informe o título do episódio.')
      return
    }

    if (!audioUrl) {
      alert('Envie o áudio antes de salvar o episódio.')
      return
    }

    const parsedEpisodeNumber = parseEpisodeNumber(episodeNumber)
    const nextStatus = status === 'published' ? 'published' : 'draft'

    try {
      setSaving(true)

      const { error } = await supabase.from('episodes').insert({
        series_id: podcastId,
        title: title.trim(),
        description: description.trim() || null,
        bible_reference: bibleReference.trim() || null,
        audio_url: audioUrl,
        cover_image_url: coverImageUrl || null,
        episode_number: parsedEpisodeNumber,
        status: nextStatus,
        show_on_today: false,
        is_preview: false,
        published_at: nextStatus === 'published' ? new Date().toISOString() : null,
        transcription_text: transcriptionText.trim() || null,
        transcription_segments: transcriptionSegments.length > 0 ? transcriptionSegments : null,
        transcription_status: transcriptionText.trim() ? 'completed' : null,
        transcription_generated_at: transcriptionText.trim() ? new Date().toISOString() : null,
      })

      if (error) throw error

      alert('Episódio criado com sucesso.')
      router.push(`/admin/series/${podcastId}/episodios`)
    } catch (error) {
      console.error('Erro ao criar episódio:', error)
      alert('Não foi possível criar o episódio agora.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-6 text-white">
        <section className="mx-auto max-w-5xl rounded-[30px] border border-white/10 bg-slate-900/80 p-8 text-sm font-bold text-slate-400">
          Carregando podcast...
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-5xl">
        <header className="mb-6">
          <Link
            href={`/admin/series/${podcastId}/episodios`}
            className="inline-flex rounded-full border border-white/10 bg-slate-900/80 px-4 py-2 text-sm font-black text-blue-200 active:scale-[0.98]"
          >
            ← Voltar para episódios
          </Link>

          <p className="mt-6 text-[11px] font-black uppercase tracking-[0.24em] text-blue-300">
            Novo episódio de catálogo
          </p>

          <h1 className="mt-2 text-3xl font-black leading-none tracking-[-0.06em] sm:text-5xl">
            {podcast?.title || 'Podcast'}
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400">
            Use esta tela para subir episódios diretamente dentro deste podcast.
            Este fluxo é separado da Palavra do Dia e não altera o episódio diário.
          </p>

          <div className="mt-5 grid gap-3 rounded-[28px] border border-white/10 bg-slate-900/70 p-4 sm:grid-cols-5">
            <div className="rounded-2xl border border-blue-300/20 bg-blue-500/10 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-200">1. Áudio</p>
              <p className="mt-1 text-xs font-bold leading-5 text-slate-400">Envie o arquivo do episódio.</p>
            </div>

            <div className="rounded-2xl border border-purple-300/20 bg-purple-500/10 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-purple-200">2. Transcrição</p>
              <p className="mt-1 text-xs font-bold leading-5 text-slate-400">Gere legenda sincronizada.</p>
            </div>

            <div className="rounded-2xl border border-blue-300/20 bg-blue-500/10 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-200">3. Título</p>
              <p className="mt-1 text-xs font-bold leading-5 text-slate-400">Use a IA ou edite manualmente.</p>
            </div>

            <div className="rounded-2xl border border-amber-300/20 bg-amber-500/10 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-200">4. Capa</p>
              <p className="mt-1 text-xs font-bold leading-5 text-slate-400">Imagem 16:9 do episódio.</p>
            </div>

            <div className="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200">5. Salvar</p>
              <p className="mt-1 text-xs font-bold leading-5 text-slate-400">Publicar ou deixar rascunho.</p>
            </div>
          </div>
        </header>

        <form
          onSubmit={handleSubmit}
          className="rounded-[34px] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-black/20"
        >
          <div className="grid gap-5">
            <section className="rounded-[28px] border border-blue-300/10 bg-blue-500/5 p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-200">
                Dados do episódio
              </p>

              <div className="mt-5 grid gap-4">
                <div>
                  <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-200">
                    Título do episódio *
                  </label>

                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Ex.: O Senhor é o meu pastor"
                    className="mt-2 min-h-12 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-blue-300/70"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-200">
                      Referência bíblica
                    </label>

                    <input
                      value={bibleReference}
                      onChange={(event) => setBibleReference(event.target.value)}
                      placeholder="Ex.: Salmo 23:1"
                      className="mt-2 min-h-12 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-blue-300/70"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-200">
                      Número do episódio
                    </label>

                    <input
                      type="number"
                      min="1"
                      value={episodeNumber}
                      onChange={(event) => setEpisodeNumber(event.target.value)}
                      placeholder="Preenchido automaticamente"
                      className="mt-2 min-h-12 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-blue-300/70"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-200">
                    Status
                  </label>

                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    className="mt-2 min-h-12 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 text-sm font-bold text-white outline-none focus:border-blue-300/70"
                  >
                    <option value="draft">Rascunho</option>
                    <option value="published">Publicado</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-200">
                    Descrição / resumo
                  </label>

                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={4}
                    placeholder="Resumo curto do episódio..."
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold leading-6 text-white outline-none placeholder:text-slate-600 focus:border-blue-300/70"
                  />
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-300">
                Áudio do episódio
              </p>

              <div className="mt-5 grid gap-4">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(event) => {
                    setAudioFile(event.target.files?.[0] || null)
                    setAudioUrl('')
                    setUploadError('')
                  }}
                  className="block w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm font-bold text-slate-200 file:mr-4 file:rounded-xl file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-black file:text-white"
                />

                <button
                  type="button"
                  onClick={handleUploadAudio}
                  disabled={!audioFile || uploadingAudio}
                  className="rounded-2xl border border-blue-300/30 bg-blue-500/15 px-5 py-4 text-sm font-black text-blue-100 active:scale-[0.98] disabled:opacity-50"
                >
                  {uploadingAudio ? 'Enviando áudio...' : '1. Enviar áudio'}
                </button>

                {uploadError && (
                  <p className="rounded-2xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">
                    {uploadError}
                  </p>
                )}

                {audioUrl && (
                  <div className="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-4">
                    <p className="text-sm font-black text-emerald-100">
                      Áudio enviado com sucesso.
                    </p>

                    <div className="mt-3">
                      <AdminAudioPlayer
                        src={audioUrl}
                        title={title || audioFile?.name || 'Prévia do episódio'}
                      />
                    </div>

                    <p className="mt-3 break-all text-xs font-bold leading-5 text-emerald-100/70">
                      {audioUrl}
                    </p>

                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={handleGenerateCompatibleAudio}
                        disabled={uploadingAudio || isGeneratingCompatibleAudio}
                        className="rounded-2xl border border-green-300/30 bg-green-500/15 px-5 py-3 text-sm font-black text-green-100 active:scale-[0.98] disabled:opacity-50"
                      >
                        {isGeneratingCompatibleAudio
                          ? 'Convertendo para MP3...'
                          : 'Gerar MP3 compatível (iPhone/Safari)'}
                      </button>
                      {audioCompatibilityWarning && (
                        <p className="mt-2 text-xs font-bold text-yellow-200">
                          {audioCompatibilityWarning}
                        </p>
                      )}
                      {audioUrlCompatible && (
                        <p className="mt-2 text-xs font-bold text-green-200">
                          MP3 compatível pronto.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-[28px] border border-purple-300/15 bg-purple-500/5 p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-purple-200">
                    Transcrição automática
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Depois de enviar o áudio, transcreva o episódio para gerar legenda sincronizada no player do catálogo.
                  </p>
                </div>

                {transcriptionText && (
                  <span className="rounded-full border border-emerald-300/20 bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-100">
                    Transcrito
                  </span>
                )}
              </div>

              <div className="mt-5 grid gap-4">
                <button
                  type="button"
                  onClick={handleTranscribeAudio}
                  disabled={!audioUrl || transcribing}
                  className="rounded-2xl border border-purple-300/30 bg-purple-500/15 px-5 py-4 text-sm font-black text-purple-100 active:scale-[0.98] disabled:opacity-50"
                >
                  {transcribing ? 'Transcrevendo áudio...' : '2. Transcrever episódio'}
                </button>

                {transcriptionError && (
                  <p className="rounded-2xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">
                    {transcriptionError}
                  </p>
                )}

                <textarea
                  value={transcriptionText}
                  onChange={(event) => setTranscriptionText(event.target.value)}
                  rows={10}
                  placeholder="A transcrição aparecerá aqui depois que o áudio for processado..."
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold leading-6 text-white outline-none placeholder:text-slate-600 focus:border-purple-300/70"
                />

                {transcriptionSegments.length > 0 && (
                  <p className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-xs font-bold leading-5 text-slate-400">
                    {transcriptionSegments.length} segmentos sincronizados foram gerados para a legenda do player.
                  </p>
                )}
              </div>
            </section>
            <section className="rounded-[28px] border border-amber-300/15 bg-amber-500/5 p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-200">
                    Capa do episódio
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Use uma imagem horizontal em 16:9. Recomendado: 1920x1080 ou 1280x720 em JPG, PNG ou WEBP.
                  </p>
                </div>

                {coverImageUrl && (
                  <span className="rounded-full border border-emerald-300/20 bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-100">
                    Capa enviada
                  </span>
                )}
              </div>

              <div className="mt-5 grid gap-4">
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={(event) => {
                    setCoverFile(event.target.files?.[0] || null)
                    setCoverImageUrl('')
                    setCoverUploadError('')
                  }}
                  className="block w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm font-bold text-slate-200 file:mr-4 file:rounded-xl file:border-0 file:bg-amber-600 file:px-4 file:py-2 file:text-sm file:font-black file:text-white"
                />

                <button
                  type="button"
                  onClick={handleUploadCover}
                  disabled={!coverFile || uploadingCover}
                  className="rounded-2xl border border-amber-300/30 bg-amber-500/15 px-5 py-4 text-sm font-black text-amber-100 active:scale-[0.98] disabled:opacity-50"
                >
                  {uploadingCover ? 'Enviando capa...' : '4. Enviar capa'}
                </button>

                {coverUploadError && (
                  <p className="rounded-2xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">
                    {coverUploadError}
                  </p>
                )}

                {coverImageUrl && (
                  <div className="overflow-hidden rounded-[26px] border border-white/10 bg-slate-950">
                    <img
                      src={coverImageUrl}
                      alt="Capa do episódio"
                      className="aspect-video w-full object-cover"
                    />

                    <p className="break-all px-4 py-3 text-xs font-bold leading-5 text-slate-500">
                      {coverImageUrl}
                    </p>
                  </div>
                )}
              </div>
            </section>
            <div className="rounded-[26px] border border-white/10 bg-slate-950/70 p-4">
              <p className="text-sm font-black text-slate-200">
                Antes de salvar, confira:
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                áudio enviado, título preenchido, número correto, status escolhido,
                transcrição gerada e capa enviada. A transcrição e a capa são recomendadas
                para deixar o episódio completo no catálogo.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Link
                href={`/admin/series/${podcastId}/episodios`}
                className="rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-center text-sm font-black text-slate-200 active:scale-[0.98]"
              >
                Cancelar
              </Link>

              <button
                type="submit"
                disabled={saving || uploadingAudio || uploadingCover || transcribing || generatingMetadata}
                className="rounded-2xl bg-blue-600 px-6 py-4 text-sm font-black text-white shadow-xl shadow-blue-950/30 active:scale-[0.98] disabled:opacity-50"
              >
                {saving ? 'Salvando...' : '5. Salvar episódio'}
              </button>
            </div>
          </div>
        </form>
      </section>
    </main>
  )
}