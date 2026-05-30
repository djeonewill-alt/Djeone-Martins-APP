'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

import { supabase } from '@/lib/supabase'

type TranscriptionSegment = {
  start: number
  end: number
  text: string
}

type DailyQuoteSuggestion = {
  quote_text?: string
  reason?: string
  score?: number
}

type SyncedCaptionLine = {
  start: number
  end: number
  text: string
  words_count: number
  timing_mode?: 'word_timestamps' | 'approximate_from_words'
}

type SyncedCaptionVersion = {
  lines: SyncedCaptionLine[]
  srt: string
  plain_text: string
  json: SyncedCaptionLine[]
}

type ReviewedCaptions = {
  mode: 'ai_review'
  algorithm_version: 'cc-l2-ai-review'
  base_algorithm_version?: string
  lines: SyncedCaptionLine[]
  plain_text: string
  srt: string
  json: SyncedCaptionLine[]
  review_notes: string[]
  confidence: 'high' | 'medium' | 'low'
  model: string
}

type SyncedCaptions = {
  source: 'word_timestamps'
  mode?: 'hybrid' | 'word_only'
  cut_title: string
  cut_start: number
  cut_end: number
  duration_seconds: number
  words_count: number
  lines: SyncedCaptionLine[]
  srt: string
  plain_text: string
  json: SyncedCaptionLine[]
  caption_quality_warnings?: string[]
  algorithm_version?: string
  word_only?: SyncedCaptionVersion
  hybrid_debug?: {
    raw_word_text: string
    segment_text: string
    used_hybrid_text: boolean
    missing_terms_from_words: string[]
    confidence: 'high' | 'medium' | 'low'
    reason: string
    alignment?: {
      matched_ratio: number
      segment_tokens_count: number
      raw_tokens_count: number
      aligned_tokens_count: number
      aligned_text: string
      used_alignment: boolean
    }
    editorial_split?: {
      chunks_count: number
      lines_count: number
      protected_phrases_found: string[]
    }
    final_validation?: {
      coverage_ratio: number
      missing_important_tokens: string[]
      missing_protected_phrases: string[]
      fallback_used: boolean
      fallback_coverage_ratio?: number
      passed: boolean
      final_lines_count?: number
      final_words_count?: number
      protected_phrases_required?: string[]
      protected_phrases_preserved?: string[]
    }
  }
  debug?: {
    cut_start: number
    cut_end: number
    raw_words_count: number
    raw_text: string
    raw_words: Array<{
      word: string
      start: number
      end: number
    }>
    contains_terms: {
      cerca: boolean
      pes: boolean
      jesus: boolean
      oleo: boolean
      perfume: boolean
      cabelos: boolean
      trezentos_ou_300: boolean
    }
  }
}

type ShortIdea = {
  title: string
  hook: string
  angle: string
  suggested_opening_line?: string
  why_it_can_work?: string
}

type CutSuggestion = {
  title: string
  start: number
  end: number
  duration?: number
  reason: string
  hook: string
  source_excerpt?: string
  suggested_caption_lines?: string[]
  strength_score?: number
  strength_reason?: string
  cut_type?: 'hook' | 'full_cut'
  needs_expansion?: boolean
  original_hook_start?: number
  original_hook_end?: number
  expansion_reason?: string
  needs_manual_trim?: boolean
  trim_warning?: string
  manual?: boolean
  editorial_score?: number
  editorial_note?: string
}

type ShortScriptTimelineItem = {
  start: number
  end: number
  purpose: string
  narration_focus: string
  on_screen_text: string
  visual_direction: string
  motion_direction: string
  sound_design: string
}

type ShortScriptImagePrompt = {
  moment: string
  prompt: string
  use_for_seconds: string
}

type ShortScript = {
  title: string
  platform_goal: 'shorts_reels_tiktok'
  duration_seconds: number
  main_hook: string
  hook_original?: string
  hook_improved?: string
  why_hook_improved?: string
  suggested_opening_line?: string
  why_opening_works?: string
  cliffhanger: string
  spiritual_point: string
  cta: string
  retention_score?: number
  score_breakdown?: {
    hook_strength?: number
    biblical_specificity?: number
    visual_concreteness?: number
    emotional_tension?: number
    share_potential?: number
    fidelity_to_audio?: number
  }
  timeline: ShortScriptTimelineItem[]
  animated_caption_lines: string[]
  caption_lines_improved?: string[]
  image_prompts: ShortScriptImagePrompt[]
  visual_suggestions?: Array<{
    start: number
    end: number
    visual_goal: string
    scene_description: string
    motion: string
    sound_design: string
  }>
  editing_notes: string[]
  auto_completed?: boolean
  auto_completed_note?: string
  quality_check: {
    has_strong_hook: boolean
    has_clear_tension: boolean
    has_spiritual_application: boolean
    has_soft_cta: boolean
    avoids_generic_language: boolean
  }
}

type StrongPhrase = {
  text: string
  use_case?: string
  source_excerpt?: string
  why_it_works?: string
  score?: number
}

type ContentAssets = {
  devotional_summary: string
  strong_phrases: Array<string | StrongPhrase>
  whatsapp_text: string
  instagram_caption: string
  hashtags: string[]
  short_ideas: ShortIdea[]
  cut_suggestions: CutSuggestion[]
  cut_suggestions_note?: string
  expanded_cut?: CutSuggestion
  short_script?: ShortScript
  synced_captions?: SyncedCaptions
}

type ContentStudioWorkspace = {
  contentAssets: ContentAssets | null
  manualCuts: CutSuggestion[]
  reviewedCaptionsByKey: Record<string, ReviewedCaptions>
  expandedCutSourceKey: string
  syncedCaptionSourceKey: string
  selectedCutKey: string
  expandedCutErrorByKey: Record<string, string>
  syncedCaptionErrorByKey: Record<string, string>
  contentAssetsError: string
  savedAt: string
}

type GenerationMode =
  | 'all'
  | 'summary'
  | 'phrases'
  | 'whatsapp'
  | 'instagram'
  | 'short_ideas'
  | 'cuts'
  | 'short_script'
  | 'expand_cut'
  | 'caption_sync'
  | 'caption_ai_review'

type StudioTab = 'studio' | 'episode' | 'transcription' | 'phrases' | 'publishing'

type ManualCutFormState = {
  start: string
  end: string
  title: string
  hook: string
  sourceExcerpt: string
  reason: string
}

const EMPTY_CONTENT_ASSETS: ContentAssets = {
  devotional_summary: '',
  strong_phrases: [],
  whatsapp_text: '',
  instagram_caption: '',
  hashtags: [],
  short_ideas: [],
  cut_suggestions: [],
}
const CURRENT_CAPTION_SYNC_VERSION = 'cc-l1.5-hybrid-safe'
const ACCEPTED_CAPTION_ALGORITHM_VERSIONS = [CURRENT_CAPTION_SYNC_VERSION, 'cc-l2-ai-review']

type EpisodeStudioRow = {
  id: string
  title: string
  description: string | null
  bible_reference: string | null
  audio_url: string | null
  audio_url_compatible: string | null
  audio_compatible_type: string | null
  duration_seconds: number | null
  status: string | null
  scheduled_publish_at: string | null
  published_at: string | null
  created_at: string | null
  cover_image_url: string | null
  transcription_text: string | null
  transcription_segments: TranscriptionSegment[] | null
  transcription_status: string | null
  transcription_error: string | null
  transcription_generated_at: string | null
  daily_quote_suggestions: DailyQuoteSuggestion[] | null
  daily_quote_status: string | null
  daily_quote_generated_at: string | null
  transcription_words_url: string | null
  transcription_words_key: string | null
  transcription_words_count: number | null
  transcription_words_generated_at: string | null
  transcription_words_status: string | null
  transcription_words_error: string | null
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Sem data'

  return new Date(value).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function formatDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return 'Sem duracao'

  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60

  return `${minutes}:${String(rest).padStart(2, '0')}`
}

function formatSegmentTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'

  const minutes = Math.floor(seconds / 60)
  const rest = Math.floor(seconds % 60)

  return `${minutes}:${String(rest).padStart(2, '0')}`
}

function InfoPill({
  label,
  tone = 'slate',
}: {
  label: string
  tone?: 'slate' | 'blue' | 'green' | 'amber' | 'rose' | 'cyan'
}) {
  const classNameByTone = {
    slate: 'border-white/10 bg-slate-950 text-slate-300',
    blue: 'border-blue-300/20 bg-blue-500/10 text-blue-100',
    green: 'border-emerald-300/20 bg-emerald-500/10 text-emerald-100',
    amber: 'border-amber-300/20 bg-amber-500/10 text-amber-100',
    rose: 'border-rose-300/20 bg-rose-500/10 text-rose-100',
    cyan: 'border-cyan-300/20 bg-cyan-500/10 text-cyan-100',
  }

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-black ${classNameByTone[tone]}`}>
      {label}
    </span>
  )
}

function CopyButton({
  value,
  label = 'Copiar',
}: {
  value: string
  label?: string
}) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch (error) {
      console.error('Erro ao copiar conteudo:', error)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs font-black text-blue-100 active:scale-[0.98]"
    >
      {copied ? 'Copiado' : label}
    </button>
  )
}

function getStrongPhraseText(phrase: string | StrongPhrase) {
  return typeof phrase === 'string' ? phrase : phrase.text
}

function getCutDuration(cut: CutSuggestion) {
  return Math.max(0, Math.round(cut.end - cut.start))
}

function parseTimeToSeconds(value: string): number | null {
  const normalized = value.trim().replace(',', '.')
  if (!normalized) return null

  if (/^\d+(\.\d+)?$/.test(normalized)) {
    const seconds = Number(normalized)
    return Number.isFinite(seconds) ? seconds : null
  }

  const parts = normalized.split(':')

  if (parts.length < 2 || parts.length > 3) return null
  if (!parts.every((part) => /^\d+(\.\d+)?$/.test(part))) return null

  const numbers = parts.map(Number)

  if (numbers.some((number) => !Number.isFinite(number))) return null

  if (numbers.length === 2) {
    const [minutes, seconds] = numbers
    if (seconds >= 60) return null
    return minutes * 60 + seconds
  }

  const [hours, minutes, seconds] = numbers
  if (minutes >= 60 || seconds >= 60) return null

  return hours * 3600 + minutes * 60 + seconds
}

function cleanManualInput(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function getGenerateLabel(mode: GenerationMode, idleLabel: string) {
  return generatingLabels[mode] || idleLabel
}

const generatingLabels: Record<GenerationMode, string> = {
  all: 'Gerando tudo...',
  summary: 'Gerando resumo...',
  phrases: 'Gerando frases...',
  whatsapp: 'Gerando WhatsApp...',
  instagram: 'Gerando Instagram...',
  short_ideas: 'Gerando ideias...',
  cuts: 'Gerando cortes...',
  short_script: 'Gerando roteiro...',
  expand_cut: 'Expandindo corte...',
  caption_sync: 'Sincronizando legendas...',
  caption_ai_review: 'Revisando legenda...',
}

function formatShortScriptForCopy(script: ShortScript) {
  const scoreBreakdown = script.score_breakdown
    ? Object.entries(script.score_breakdown)
        .filter(([, value]) => typeof value === 'number')
        .map(([key, value]) => `${key.replace(/_/g, ' ')}: ${value}/10`)
    : []

  return [
    `Titulo: ${script.title}`,
    `Hook: ${script.main_hook}`,
    script.hook_original ? `Hook original: ${script.hook_original}` : '',
    script.hook_improved ? `Hook aprimorado: ${script.hook_improved}` : '',
    script.why_hook_improved ? `Por que melhorou: ${script.why_hook_improved}` : '',
    script.suggested_opening_line ? `Abertura sugerida: ${script.suggested_opening_line}` : '',
    script.why_opening_works ? `Por que a abertura funciona: ${script.why_opening_works}` : '',
    `Cliffhanger: ${script.cliffhanger}`,
    `Ponto espiritual: ${script.spiritual_point}`,
    `CTA: ${script.cta}`,
    typeof script.retention_score === 'number' ? `Nota de retencao: ${script.retention_score}/10` : '',
    scoreBreakdown.length ? `Breakdown editorial:\n${scoreBreakdown.join('\n')}` : '',
    '',
    'Timeline:',
    ...script.timeline.map((item) => {
      return `${item.start}-${item.end}s | ${item.purpose}\nFoco: ${item.narration_focus}\nTexto na tela: ${item.on_screen_text}\nDirecao visual: ${item.visual_direction}\nMotion: ${item.motion_direction}\nSom: ${item.sound_design}`
    }),
    '',
    'Legendas animadas:',
    ...script.animated_caption_lines,
    '',
    'Legendas aprimoradas:',
    ...(script.caption_lines_improved || []),
    '',
    'Prompts de imagem:',
    ...script.image_prompts.map((item) => `${item.moment} (${item.use_for_seconds})\n${item.prompt}`),
    '',
    'Sugestoes visuais:',
    ...(script.visual_suggestions || []).map((item) => {
      return `${item.start}-${item.end}s | ${item.visual_goal}\nCena: ${item.scene_description}\nMotion: ${item.motion}\nSom: ${item.sound_design}`
    }),
    '',
    'Notas de edicao:',
    ...script.editing_notes,
  ].filter(Boolean).join('\n')
}

function formatCutForCopy(cut: CutSuggestion) {
  return [
    `Titulo: ${cut.title}`,
    `Tempo: ${formatSegmentTime(cut.start)} - ${formatSegmentTime(cut.end)}`,
    `Duracao: ${formatDuration(getCutDuration(cut))}`,
    `Tipo: ${isHookCut(cut) ? 'Gancho para expandir' : 'Corte completo'}`,
    `Gancho: ${cut.hook}`,
    cut.source_excerpt ? `Trecho-base:\n${cut.source_excerpt}` : '',
    `Motivo: ${cut.reason}`,
    cut.strength_score ? `Nota editorial: ${cut.strength_score}/10` : '',
    cut.strength_reason ? `Por que funciona: ${cut.strength_reason}` : '',
    cut.suggested_caption_lines?.length
      ? `Linhas de legenda:\n${cut.suggested_caption_lines.join('\n')}`
      : '',
  ].filter(Boolean).join('\n')
}

function formatCutPackageForCopy(cut: CutSuggestion, assets: ContentAssets | null) {
  const blocks = [`DADOS DO CORTE\n${formatCutForCopy(cut)}`]

  if (assets?.expanded_cut) {
    blocks.push(`CORTE EXPANDIDO\n${formatCutForCopy(assets.expanded_cut)}`)
  }

  if (assets?.short_script) {
    blocks.push(`ROTEIRO DO SHORT\n${formatShortScriptForCopy(assets.short_script)}`)
  }

  if (assets?.synced_captions) {
    blocks.push(
      [
        'LEGENDAS SINCRONIZADAS',
        `Origem: ${assets.synced_captions.cut_title}`,
        `Tempo: ${formatSegmentTime(assets.synced_captions.cut_start)} - ${formatSegmentTime(assets.synced_captions.cut_end)}`,
        '',
        'SRT:',
        assets.synced_captions.srt,
        '',
        'Texto:',
        assets.synced_captions.plain_text,
      ].join('\n')
    )
  }

  return blocks.join('\n\n---\n\n')
}

function formatCaptionDiagnosisForCopy(captions: SyncedCaptions) {
  return [
    `algorithm_version: ${captions.algorithm_version || 'sem versao'}`,
    '',
    'raw_text:',
    captions.debug?.raw_text || 'Sem diagnostico de palavras.',
    '',
    'contains_terms:',
    JSON.stringify(captions.debug?.contains_terms || {}, null, 2),
    '',
    'hybrid_debug:',
    JSON.stringify(captions.hybrid_debug || {}, null, 2),
    '',
    'SRT atual:',
    captions.srt,
  ].join('\n')
}

function isHookCut(cut: CutSuggestion) {
  return cut.cut_type === 'hook' || cut.needs_expansion === true || getCutDuration(cut) < 25
}

function getCutKey(cut: Pick<CutSuggestion, 'start' | 'end'>, index: number) {
  if ('manual' in cut && cut.manual) {
    return `manual:${cut.start}-${cut.end}`
  }

  return `${cut.start}-${cut.end}-${index}`
}

function getWorkspaceStorageKey(episodeId: string) {
  return `central-conteudo:${episodeId}:workspace:v1`
}

function readStoredWorkspace(episodeId: string): ContentStudioWorkspace | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(getWorkspaceStorageKey(episodeId))
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<ContentStudioWorkspace>
    if (!parsed || typeof parsed !== 'object') return null

    return {
      contentAssets: parsed.contentAssets || null,
      manualCuts: Array.isArray(parsed.manualCuts) ? parsed.manualCuts as CutSuggestion[] : [],
      reviewedCaptionsByKey: parsed.reviewedCaptionsByKey || {},
      expandedCutSourceKey: parsed.expandedCutSourceKey || '',
      syncedCaptionSourceKey: parsed.syncedCaptionSourceKey || '',
      selectedCutKey: parsed.selectedCutKey || '',
      expandedCutErrorByKey: parsed.expandedCutErrorByKey || {},
      syncedCaptionErrorByKey: parsed.syncedCaptionErrorByKey || {},
      contentAssetsError: parsed.contentAssetsError || '',
      savedAt: parsed.savedAt || '',
    }
  } catch (error) {
    console.error('Erro ao restaurar workspace da Central:', error)
    return null
  }
}

function writeStoredWorkspace(episodeId: string, workspace: ContentStudioWorkspace) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(getWorkspaceStorageKey(episodeId), JSON.stringify(workspace))
  } catch (error) {
    console.error('Erro ao salvar workspace da Central:', error)
  }
}

function removeStoredWorkspace(episodeId: string) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.removeItem(getWorkspaceStorageKey(episodeId))
  } catch (error) {
    console.error('Erro ao limpar workspace da Central:', error)
  }
}

export default function AdminContentStudioPage() {
  const params = useParams<{ episodeId: string }>()
  const router = useRouter()
  const episodeId = params.episodeId

  const [episode, setEpisode] = useState<EpisodeStudioRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [contentAssets, setContentAssets] = useState<ContentAssets | null>(null)
  const [manualCuts, setManualCuts] = useState<CutSuggestion[]>([])
  const [reviewedCaptionsByKey, setReviewedCaptionsByKey] = useState<Record<string, ReviewedCaptions>>({})
  const [generatingMode, setGeneratingMode] = useState<GenerationMode | null>(null)
  const [generatingShortScriptKey, setGeneratingShortScriptKey] = useState('')
  const [generatingExpandedCutKey, setGeneratingExpandedCutKey] = useState('')
  const [generatingSyncedCaptionKey, setGeneratingSyncedCaptionKey] = useState('')
  const [generatingCaptionReviewKey, setGeneratingCaptionReviewKey] = useState('')
  const [syncedCaptionSourceKey, setSyncedCaptionSourceKey] = useState('')
  const [expandedCutSourceKey, setExpandedCutSourceKey] = useState('')
  const [expandedCutErrorByKey, setExpandedCutErrorByKey] = useState<Record<string, string>>({})
  const [syncedCaptionErrorByKey, setSyncedCaptionErrorByKey] = useState<Record<string, string>>({})
  const [contentAssetsError, setContentAssetsError] = useState('')
  const [captionReviewError, setCaptionReviewError] = useState('')
  const [generatingWordTimestamps, setGeneratingWordTimestamps] = useState(false)
  const [wordTimestampsError, setWordTimestampsError] = useState('')
  const [selectedCutKey, setSelectedCutKey] = useState('')
  const [workspaceRestored, setWorkspaceRestored] = useState(false)
  const [activeStudioTab, setActiveStudioTab] = useState<StudioTab>('studio')
  const [manualCutForm, setManualCutForm] = useState<ManualCutFormState>({
    start: '',
    end: '',
    title: '',
    hook: '',
    sourceExcerpt: '',
    reason: '',
  })
  const [manualCutError, setManualCutError] = useState('')
  const [manualCutWarning, setManualCutWarning] = useState('')

  useEffect(() => {
    loadEpisode()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episodeId])

  useEffect(() => {
    if (loading) return

    const hasWorkspace =
      Boolean(contentAssets) ||
      manualCuts.length > 0 ||
      Object.keys(reviewedCaptionsByKey).length > 0 ||
      Boolean(expandedCutSourceKey) ||
      Boolean(syncedCaptionSourceKey) ||
      Boolean(selectedCutKey) ||
      Boolean(contentAssetsError) ||
      Object.values(expandedCutErrorByKey).some(Boolean) ||
      Object.values(syncedCaptionErrorByKey).some(Boolean)

    if (!hasWorkspace) return

    writeStoredWorkspace(episodeId, {
      contentAssets,
      manualCuts,
      reviewedCaptionsByKey,
      expandedCutSourceKey,
      syncedCaptionSourceKey,
      selectedCutKey,
      expandedCutErrorByKey,
      syncedCaptionErrorByKey,
      contentAssetsError,
      savedAt: new Date().toISOString(),
    })
  }, [
    episodeId,
    loading,
    contentAssets,
    manualCuts,
    reviewedCaptionsByKey,
    expandedCutSourceKey,
    syncedCaptionSourceKey,
    selectedCutKey,
    expandedCutErrorByKey,
    syncedCaptionErrorByKey,
    contentAssetsError,
  ])

  async function loadEpisode() {
    try {
      setLoading(true)
      setErrorMessage('')

      const { data, error } = await supabase
        .from('episodes')
        .select(
          [
            'id',
            'title',
            'description',
            'bible_reference',
            'audio_url',
            'audio_url_compatible',
            'audio_compatible_type',
            'duration_seconds',
            'status',
            'scheduled_publish_at',
            'published_at',
            'created_at',
            'cover_image_url',
            'transcription_text',
            'transcription_segments',
            'transcription_status',
            'transcription_error',
            'transcription_generated_at',
            'daily_quote_suggestions',
            'daily_quote_status',
            'daily_quote_generated_at',
            'transcription_words_url',
            'transcription_words_key',
            'transcription_words_count',
            'transcription_words_generated_at',
            'transcription_words_status',
            'transcription_words_error',
          ].join(', ')
        )
        .eq('id', episodeId)
        .single()

      if (error) throw error

      setEpisode((data as unknown) as EpisodeStudioRow)
      const storedWorkspace = readStoredWorkspace(episodeId)

      if (storedWorkspace) {
        setContentAssets(storedWorkspace.contentAssets)
        setManualCuts(storedWorkspace.manualCuts)
        setReviewedCaptionsByKey(storedWorkspace.reviewedCaptionsByKey)
        setExpandedCutSourceKey(storedWorkspace.expandedCutSourceKey)
        setSyncedCaptionSourceKey(storedWorkspace.syncedCaptionSourceKey)
        setSelectedCutKey(storedWorkspace.selectedCutKey)
        setExpandedCutErrorByKey(storedWorkspace.expandedCutErrorByKey)
        setSyncedCaptionErrorByKey(storedWorkspace.syncedCaptionErrorByKey)
        setContentAssetsError(storedWorkspace.contentAssetsError)
        setWorkspaceRestored(true)
      } else {
        setContentAssets(null)
        setManualCuts([])
        setReviewedCaptionsByKey({})
        setExpandedCutSourceKey('')
        setSyncedCaptionSourceKey('')
        setSelectedCutKey('')
        setExpandedCutErrorByKey({})
        setSyncedCaptionErrorByKey({})
        setContentAssetsError('')
        setWorkspaceRestored(false)
      }

      setWordTimestampsError('')
      setManualCutError('')
      setManualCutWarning('')
      setCaptionReviewError('')
    } catch (error) {
      console.error('Erro ao carregar estudio de conteudo:', error)
      setErrorMessage('Nao foi possivel carregar este episodio.')
    } finally {
      setLoading(false)
    }
  }

  function handleClearWorkspace() {
    removeStoredWorkspace(episodeId)
    setContentAssets(null)
    setManualCuts([])
    setReviewedCaptionsByKey({})
    setExpandedCutSourceKey('')
    setSyncedCaptionSourceKey('')
    setSelectedCutKey('')
    setExpandedCutErrorByKey({})
    setSyncedCaptionErrorByKey({})
    setContentAssetsError('')
    setWorkspaceRestored(false)
    setManualCutError('')
    setManualCutWarning('')
    setCaptionReviewError('')
  }

  function updateManualCutForm(field: keyof ManualCutFormState, value: string) {
    setManualCutForm((current) => ({ ...current, [field]: value }))
    setManualCutError('')
    setManualCutWarning('')
  }

  function handleAddManualCut() {
    const start = parseTimeToSeconds(manualCutForm.start)
    const end = parseTimeToSeconds(manualCutForm.end)

    if (start === null || end === null) {
      setManualCutError('Informe inicio e fim em um formato valido, como 4:53, 1:02:15 ou 293.5.')
      return
    }

    if (start < 0 || end <= start) {
      setManualCutError('O fim precisa ser maior que o inicio.')
      return
    }

    const duration = end - start

    if (duration < 10) {
      setManualCutError('O corte manual precisa ter pelo menos 10 segundos.')
      return
    }

    if (duration > 120) {
      setManualCutError('O corte manual pode ter no maximo 120 segundos.')
      return
    }

    const normalizedStart = Number(start.toFixed(2))
    const normalizedEnd = Number(end.toFixed(2))
    const manualCut: CutSuggestion = {
      start: normalizedStart,
      end: normalizedEnd,
      duration: Math.round(duration),
      title: cleanManualInput(manualCutForm.title) || 'Corte manual',
      hook: cleanManualInput(manualCutForm.hook) || 'Corte criado manualmente',
      source_excerpt: cleanManualInput(manualCutForm.sourceExcerpt),
      reason: cleanManualInput(manualCutForm.reason) || 'Corte criado manualmente para teste/editorial.',
      strength_score: 9,
      strength_reason: 'Corte manual criado pelo usuario.',
      editorial_score: 9,
      editorial_note: 'Corte manual criado pelo usuario.',
      suggested_caption_lines: [],
      cut_type: 'full_cut',
      needs_expansion: false,
      manual: true,
    }
    const manualKey = getCutKey(manualCut, 0)

    setManualCuts((current) => [
      manualCut,
      ...current.filter((cut) => getCutKey(cut, 0) !== manualKey),
    ])
    setContentAssets((current) => current || EMPTY_CONTENT_ASSETS)
    setSelectedCutKey(manualKey)
    setManualCutForm({
      start: '',
      end: '',
      title: '',
      hook: '',
      sourceExcerpt: '',
      reason: '',
    })
    setManualCutError('')
    setManualCutWarning(duration > 90 ? 'Corte adicionado. Ele passa de 90s, entao revise o ritmo antes de publicar.' : '')
  }

  async function handleGenerateContentAssets(mode: GenerationMode = 'all') {
    if (!episode?.transcription_text?.trim()) {
      setContentAssetsError('Este episodio precisa de transcricao para gerar conteudos.')
      return
    }

    try {
      setGeneratingMode(mode)
      setContentAssetsError('')

      const response = await fetch('/api/ai/generate-content-assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          episodeId: episode.id,
          title: episode.title,
          bible_reference: episode.bible_reference,
          description: episode.description,
          transcription_text: episode.transcription_text,
          transcription_segments: episode.transcription_segments,
          daily_quote_suggestions: episode.daily_quote_suggestions,
          mode,
        }),
      })

      const payload = await response.json()

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Nao foi possivel gerar conteudos.')
      }

      setContentAssets((current) => {
        return {
          ...(current || EMPTY_CONTENT_ASSETS),
          ...(payload.assets as Partial<ContentAssets>),
        }
      })
    } catch (error) {
      console.error('Erro ao gerar conteudos:', error)
      setContentAssetsError(
        error instanceof Error
          ? error.message
          : 'Nao foi possivel gerar conteudos.'
      )
    } finally {
      setGeneratingMode(null)
    }
  }

  async function handleGenerateShortScript(cut: CutSuggestion, index: number) {
    if (!episode?.transcription_text?.trim()) {
      setContentAssetsError('Este episodio precisa de transcricao para gerar roteiro de Short.')
      return
    }

    const loadingKey = getCutKey(cut, index)

    try {
      setGeneratingShortScriptKey(loadingKey)
      setSelectedCutKey(loadingKey)
      setContentAssetsError('')

      const response = await fetch('/api/ai/generate-content-assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          episodeId: episode.id,
          title: episode.title,
          bible_reference: episode.bible_reference,
          description: episode.description,
          transcription_text: episode.transcription_text,
          transcription_segments: episode.transcription_segments,
          daily_quote_suggestions: episode.daily_quote_suggestions,
          mode: 'short_script',
          selected_cut: cut,
        }),
      })
      const payload = await response.json()

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Nao foi possivel gerar roteiro do Short.')
      }

      setContentAssets((current) => {
        return {
          ...(current || EMPTY_CONTENT_ASSETS),
          ...(payload.assets as Partial<ContentAssets>),
        }
      })
    } catch (error) {
      console.error('Erro ao gerar roteiro do Short:', error)
      setContentAssetsError(
        error instanceof Error
          ? error.message
          : 'Nao foi possivel gerar roteiro do Short.'
      )
    } finally {
      setGeneratingShortScriptKey('')
    }
  }

  async function handleExpandCut(cut: CutSuggestion, index: number) {
    if (!episode?.transcription_text?.trim()) {
      setContentAssetsError('Este episodio precisa de transcricao para expandir cortes.')
      return
    }

    const loadingKey = getCutKey(cut, index)

    try {
      setGeneratingExpandedCutKey(loadingKey)
      setExpandedCutSourceKey(loadingKey)
      setSelectedCutKey(loadingKey)
      setExpandedCutErrorByKey((current) => ({ ...current, [loadingKey]: '' }))
      setContentAssetsError('')

      const response = await fetch('/api/ai/generate-content-assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          episodeId: episode.id,
          title: episode.title,
          bible_reference: episode.bible_reference,
          description: episode.description,
          transcription_text: episode.transcription_text,
          transcription_segments: episode.transcription_segments,
          daily_quote_suggestions: episode.daily_quote_suggestions,
          mode: 'expand_cut',
          selected_cut: cut,
        }),
      })
      const payload = await response.json()

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Nao foi possivel expandir este gancho.')
      }

      const expandedCut = payload.assets?.expanded_cut as CutSuggestion | undefined

      if (
        !expandedCut ||
        (expandedCut.start === cut.start && expandedCut.end === cut.end) ||
        getCutDuration(expandedCut) <= getCutDuration(cut)
      ) {
        throw new Error('Nao foi possivel ampliar este gancho. O resultado manteve a mesma duracao.')
      }

      setContentAssets((current) => {
        return {
          ...(current || EMPTY_CONTENT_ASSETS),
          ...(payload.assets as Partial<ContentAssets>),
        }
      })
    } catch (error) {
      console.error('Erro ao expandir corte:', error)
      const message =
        error instanceof Error
          ? error.message
          : 'Nao foi possivel expandir este gancho.'

      setExpandedCutErrorByKey((current) => ({ ...current, [loadingKey]: message }))
    } finally {
      setGeneratingExpandedCutKey('')
    }
  }

  async function handleGenerateSyncedCaptions(cut: CutSuggestion, index: number) {
    if (!episode) return

    const loadingKey = getCutKey(cut, index)
    setSelectedCutKey(loadingKey)
    const hasReadyWords =
      episode.transcription_words_status === 'ready' &&
      Boolean(episode.transcription_words_url || episode.transcription_words_key)

    if (!hasReadyWords) {
      setSyncedCaptionSourceKey(loadingKey)
      setSyncedCaptionErrorByKey((current) => ({
        ...current,
        [loadingKey]: 'Gere timestamps avancados antes de sincronizar legendas.',
      }))
      return
    }

    try {
      setGeneratingSyncedCaptionKey(loadingKey)
      setSyncedCaptionSourceKey(loadingKey)
      setSyncedCaptionErrorByKey((current) => ({ ...current, [loadingKey]: '' }))
      setContentAssetsError('')

      const response = await fetch('/api/ai/generate-content-assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          episodeId: episode.id,
          mode: 'caption_sync',
          selected_cut: {
            title: cut.title,
            start: cut.start,
            end: cut.end,
            hook: cut.hook,
            source_excerpt: cut.source_excerpt,
          },
        }),
      })
      const payload = await response.json()

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Nao foi possivel sincronizar legendas.')
      }

      setContentAssets((current) => {
        return {
          ...(current || EMPTY_CONTENT_ASSETS),
          ...(payload.assets as Partial<ContentAssets>),
        }
      })
      setReviewedCaptionsByKey((current) => {
        const next = { ...current }
        delete next[loadingKey]
        return next
      })
    } catch (error) {
      console.error('Erro ao sincronizar legendas:', error)
      const message =
        error instanceof Error
          ? error.message
          : 'Nao foi possivel sincronizar legendas.'

      setSyncedCaptionErrorByKey((current) => ({ ...current, [loadingKey]: message }))
    } finally {
      setGeneratingSyncedCaptionKey('')
    }
  }

  async function handleReviewSyncedCaptions() {
    if (!episode || !selectedCut || !contentAssets?.synced_captions || !selectedCutKey) return
    if (syncedCaptionSourceKey !== selectedCutKey) {
      setCaptionReviewError('Selecione o corte que gerou estas legendas antes de revisar com IA.')
      return
    }

    try {
      setGeneratingCaptionReviewKey(selectedCutKey)
      setCaptionReviewError('')

      const response = await fetch('/api/ai/generate-content-assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          episodeId: episode.id,
          title: episode.title,
          bible_reference: episode.bible_reference,
          description: episode.description,
          transcription_text: episode.transcription_text,
          transcription_segments: episode.transcription_segments,
          mode: 'caption_ai_review',
          selected_cut: {
            title: selectedCut.title,
            start: selectedCut.start,
            end: selectedCut.end,
            hook: selectedCut.hook,
            source_excerpt: selectedCut.source_excerpt,
          },
          synced_captions: contentAssets.synced_captions,
        }),
      })
      const payload = await response.json()

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Nao foi possivel revisar a legenda com IA.')
      }

      const reviewedCaptions = (payload.reviewed_captions || payload.assets?.reviewed_captions) as ReviewedCaptions | undefined

      if (!reviewedCaptions) {
        throw new Error('A revisao nao retornou legendas validas.')
      }

      setReviewedCaptionsByKey((current) => ({
        ...current,
        [selectedCutKey]: reviewedCaptions,
      }))
    } catch (error) {
      console.error('Erro ao revisar legenda com IA:', error)
      setCaptionReviewError(
        error instanceof Error
          ? error.message
          : 'Nao foi possivel revisar a legenda com IA.'
      )
    } finally {
      setGeneratingCaptionReviewKey('')
    }
  }

  async function handleGenerateWordTimestamps() {
    if (!episode) return

    try {
      setGeneratingWordTimestamps(true)
      setWordTimestampsError('')
      setEpisode((current) => {
        return current
          ? {
              ...current,
              transcription_words_status: 'processing',
              transcription_words_error: null,
            }
          : current
      })

      const response = await fetch('/api/ai/generate-word-timestamps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          episodeId: episode.id,
        }),
      })
      const payload = await response.json()

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Nao foi possivel gerar timestamps avancados.')
      }

      setEpisode((current) => {
        return current
          ? {
              ...current,
              transcription_words_url: payload.wordsUrl,
              transcription_words_key: payload.wordsKey,
              transcription_words_count: payload.wordsCount,
              transcription_words_status: payload.status,
              transcription_words_generated_at: new Date().toISOString(),
              transcription_words_error: null,
            }
          : current
      })
    } catch (error) {
      console.error('Erro ao gerar timestamps avancados:', error)
      const message =
        error instanceof Error
          ? error.message
          : 'Nao foi possivel gerar timestamps avancados.'

      setWordTimestampsError(message)
      setEpisode((current) => {
        return current
          ? {
              ...current,
              transcription_words_status: 'error',
              transcription_words_error: message,
            }
          : current
      })
    } finally {
      setGeneratingWordTimestamps(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-6 text-white">
        <section className="mx-auto max-w-6xl rounded-[30px] border border-white/10 bg-slate-900/80 p-8 text-sm font-bold text-slate-400">
          Carregando estudio...
        </section>
      </main>
    )
  }

  if (!episode) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-6 text-white">
        <section className="mx-auto max-w-4xl rounded-[30px] border border-rose-300/20 bg-rose-500/10 p-8 text-center">
          <h1 className="text-2xl font-black">Episodio nao encontrado</h1>
          <p className="mt-3 text-sm text-rose-100/80">{errorMessage}</p>
          <button
            type="button"
            onClick={() => router.push('/admin/central-conteudo')}
            className="mt-6 rounded-2xl bg-rose-600 px-5 py-3 text-sm font-black text-white"
          >
            Voltar para a Central
          </button>
        </section>
      </main>
    )
  }

  const segments = episode.transcription_segments || []
  const suggestions = episode.daily_quote_suggestions || []
  const hasTranscription = Boolean(episode.transcription_text?.trim())
  const fullCutSuggestions = contentAssets?.cut_suggestions.filter((cut) => !isHookCut(cut)) || []
  const hookSuggestions = contentAssets?.cut_suggestions.filter((cut) => isHookCut(cut)) || []
  const orderedCutSuggestions = [...fullCutSuggestions, ...hookSuggestions]
  const manualCutSuggestions = manualCuts
  const selectedCut =
    (selectedCutKey
      ? manualCutSuggestions.find((cut) => getCutKey(cut, 0) === selectedCutKey) ||
        orderedCutSuggestions.find((cut, index) => getCutKey(cut, index) === selectedCutKey)
      : null) ||
    (contentAssets?.expanded_cut && getCutKey(contentAssets.expanded_cut, -1) === selectedCutKey
      ? contentAssets.expanded_cut
      : null)
  const selectedCutLabel = selectedCut
    ? `${formatSegmentTime(selectedCut.start)} - ${formatSegmentTime(selectedCut.end)}`
    : ''
  const reviewedCaptionsForSelectedCut = selectedCutKey ? reviewedCaptionsByKey[selectedCutKey] : null
  const syncedCaptionsMatchSelectedCut = Boolean(selectedCutKey && syncedCaptionSourceKey === selectedCutKey)
  const syncedCaptionVersion = contentAssets?.synced_captions?.algorithm_version || ''
  const shouldWarnOldCaptionVersion =
    Boolean(contentAssets?.synced_captions) &&
    Boolean(syncedCaptionVersion) &&
    !ACCEPTED_CAPTION_ALGORITHM_VERSIONS.includes(syncedCaptionVersion) &&
    !syncedCaptionVersion.startsWith('cc-l1.5') &&
    !syncedCaptionVersion.startsWith('cc-l2')
  const wordTimestampStatus =
    episode.transcription_words_status ||
    (episode.transcription_words_url ? 'ready' : 'missing')
  const studioTabs: Array<{ key: StudioTab; label: string; description: string }> = [
    { key: 'studio', label: 'Estudio', description: 'Cortes, roteiros e legendas' },
    { key: 'episode', label: 'Episodio', description: 'Audio e dados base' },
    { key: 'transcription', label: 'Transcricao', description: 'Texto e timestamps' },
    { key: 'phrases', label: 'Frases', description: 'Frases fortes' },
    { key: 'publishing', label: 'Publicacao', description: 'Pacote para redes' },
  ]
  const manualCutFormCard = (
    <article className="order-2 rounded-2xl border border-amber-300/15 bg-amber-500/10 p-4">
      <details>
        <summary className="cursor-pointer text-sm font-black text-amber-50">
          Adicionar corte manual
        </summary>

        <p className="mt-3 text-xs font-bold leading-5 text-amber-100/75">
          Use esta opcao quando quiser trabalhar um trecho especifico do audio, mesmo que a IA nao tenha sugerido.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.12em] text-amber-100/80">
            Inicio
            <input
              type="text"
              value={manualCutForm.start}
              onChange={(event) => updateManualCutForm('start', event.target.value)}
              placeholder="4:53"
              className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm font-bold normal-case tracking-normal text-white outline-none focus:border-amber-300/40"
            />
          </label>

          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.12em] text-amber-100/80">
            Fim
            <input
              type="text"
              value={manualCutForm.end}
              onChange={(event) => updateManualCutForm('end', event.target.value)}
              placeholder="5:18"
              className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm font-bold normal-case tracking-normal text-white outline-none focus:border-amber-300/40"
            />
          </label>

          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.12em] text-amber-100/80">
            Titulo
            <input
              type="text"
              value={manualCutForm.title}
              onChange={(event) => updateManualCutForm('title', event.target.value)}
              placeholder="O Valor da Adoracao"
              className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm font-bold normal-case tracking-normal text-white outline-none focus:border-amber-300/40"
            />
          </label>

          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.12em] text-amber-100/80">
            Gancho
            <input
              type="text"
              value={manualCutForm.hook}
              onChange={(event) => updateManualCutForm('hook', event.target.value)}
              placeholder="Maria derramou um perfume..."
              className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm font-bold normal-case tracking-normal text-white outline-none focus:border-amber-300/40"
            />
          </label>

          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.12em] text-amber-100/80 md:col-span-2">
            Trecho-base
            <textarea
              value={manualCutForm.sourceExcerpt}
              onChange={(event) => updateManualCutForm('sourceExcerpt', event.target.value)}
              rows={3}
              className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm font-bold normal-case tracking-normal text-white outline-none focus:border-amber-300/40"
            />
          </label>

          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.12em] text-amber-100/80 md:col-span-2">
            Motivo
            <textarea
              value={manualCutForm.reason}
              onChange={(event) => updateManualCutForm('reason', event.target.value)}
              rows={3}
              className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm font-bold normal-case tracking-normal text-white outline-none focus:border-amber-300/40"
            />
          </label>
        </div>

        {manualCutError && (
          <p className="mt-3 rounded-xl border border-rose-300/20 bg-rose-500/10 p-3 text-xs font-bold leading-5 text-rose-100">
            {manualCutError}
          </p>
        )}

        {manualCutWarning && (
          <p className="mt-3 rounded-xl border border-amber-300/20 bg-slate-950/40 p-3 text-xs font-bold leading-5 text-amber-50">
            {manualCutWarning}
          </p>
        )}

        <button
          type="button"
          onClick={handleAddManualCut}
          className="mt-4 rounded-xl border border-amber-300/20 bg-amber-500/15 px-4 py-3 text-xs font-black text-amber-50 active:scale-[0.98]"
        >
          Adicionar corte
        </button>
      </details>
    </article>
  )

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              href="/admin/central-conteudo"
              className="inline-flex rounded-full border border-white/10 bg-slate-900/80 px-4 py-2 text-sm font-black text-blue-200 active:scale-[0.98]"
            >
              Voltar para Central
            </Link>

            <p className="mt-6 text-[11px] font-black uppercase tracking-[0.24em] text-blue-300">
              Estudio de Conteudo
            </p>

            <h1 className="mt-2 max-w-4xl text-3xl font-black leading-none tracking-[-0.06em] sm:text-5xl">
              {episode.title}
            </h1>

            <div className="mt-4 flex flex-wrap gap-2">
              <InfoPill label={episode.status || 'rascunho'} tone={episode.status === 'published' ? 'green' : 'slate'} />
              <InfoPill label={episode.audio_url_compatible ? 'Audio compativel' : 'Audio incompativel'} tone={episode.audio_url_compatible ? 'green' : 'amber'} />
              <InfoPill label={hasTranscription ? 'Transcricao pronta' : 'Sem transcricao'} tone={hasTranscription ? 'green' : 'rose'} />
              {segments.length > 0 && <InfoPill label={`${segments.length} segmentos`} tone="blue" />}
              <InfoPill
                label={wordTimestampStatus === 'ready' ? 'Words prontos' : 'Sem words'}
                tone={wordTimestampStatus === 'ready' ? 'green' : wordTimestampStatus === 'error' ? 'rose' : 'slate'}
              />
              {suggestions.length > 0 && <InfoPill label={`${suggestions.length} frases fortes`} tone="amber" />}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
            <button
              type="button"
              onClick={loadEpisode}
              className="rounded-2xl border border-blue-300/30 bg-blue-500/15 px-5 py-3 text-sm font-black text-blue-100 active:scale-[0.98]"
            >
              Atualizar
            </button>
            <button
              type="button"
              onClick={handleClearWorkspace}
              disabled={!contentAssets && manualCuts.length === 0 && !selectedCutKey && !contentAssetsError}
              className="rounded-2xl border border-rose-300/20 bg-rose-500/10 px-5 py-3 text-sm font-black text-rose-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
            >
              Limpar resultados desta tela
            </button>
          </div>
        </div>

        {workspaceRestored && (
          <div className="mb-5 rounded-2xl border border-emerald-300/20 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-100">
            Resultados restaurados deste episodio.
          </div>
        )}

        <nav className="mb-5 overflow-x-auto rounded-[26px] border border-white/10 bg-slate-900/80 p-2 shadow-2xl shadow-black/20">
          <div className="flex min-w-max gap-2">
            {studioTabs.map((tab) => {
              const isActive = activeStudioTab === tab.key

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveStudioTab(tab.key)}
                  className={`rounded-2xl border px-4 py-3 text-left active:scale-[0.98] ${
                    isActive
                      ? 'border-blue-300/35 bg-blue-500/15 text-white'
                      : 'border-white/10 bg-slate-950/60 text-slate-300 hover:border-white/20'
                  }`}
                >
                  <span className="block text-sm font-black">{tab.label}</span>
                  <span className="mt-1 block text-[11px] font-bold text-slate-400">{tab.description}</span>
                </button>
              )
            })}
          </div>
        </nav>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          {activeStudioTab === 'episode' && (
          <div className="grid gap-5 lg:col-span-2">
            <section className="rounded-[34px] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-black/20">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.20em] text-blue-300">
                    Base do episodio
                  </p>
                  <p className="mt-2 text-sm font-bold text-slate-400">
                    Dados essenciais compactados para consulta durante a edicao.
                  </p>
                </div>
                <InfoPill label="Compacta" tone="slate" />
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Referencia</p>
                  <p className="mt-1 text-sm font-bold text-blue-100">{episode.bible_reference || 'Nao informada'}</p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Duracao</p>
                  <p className="mt-1 text-sm font-bold text-slate-100">{formatDuration(episode.duration_seconds)}</p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Publicado</p>
                  <p className="mt-1 text-sm font-bold text-slate-100">{formatDateTime(episode.published_at)}</p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Agendado</p>
                  <p className="mt-1 text-sm font-bold text-slate-100">{formatDateTime(episode.scheduled_publish_at)}</p>
                </div>
              </div>

              <details className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                <summary className="cursor-pointer text-xs font-black uppercase tracking-[0.14em] text-blue-200">
                  Expandir detalhes
                </summary>

                {episode.description && (
                  <details className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <summary className="cursor-pointer text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                      Ver descricao
                    </summary>
                    <p className="mt-3 text-sm leading-6 text-slate-300">{episode.description}</p>
                  </details>
                )}

                {episode.audio_url && (
                  <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-slate-400">Audio</p>
                    <audio src={episode.audio_url} controls preload="metadata" className="w-full" />
                  </div>
                )}
              </details>

            </section>
          </div>
          )}

          {activeStudioTab === 'transcription' && (
          <div className="grid gap-5 lg:col-start-1">
            <section className="rounded-[34px] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-black/20">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.20em] text-blue-300">
                    Transcricao
                  </p>
                  <p className="mt-2 text-sm text-slate-400">
                    Status: {episode.transcription_status || 'nao iniciado'}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {segments.length} segmentos
                  </p>
                </div>

                {episode.transcription_generated_at && (
                  <span className="text-xs font-bold text-slate-500">
                    Gerada em {formatDateTime(episode.transcription_generated_at)}
                  </span>
                )}
              </div>

              <details className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                <summary className="cursor-pointer text-xs font-black uppercase tracking-[0.14em] text-blue-200">
                  Ver transcricao completa
                </summary>

                {episode.transcription_error && (
                  <div className="mt-4 rounded-2xl border border-rose-300/20 bg-rose-500/10 p-4 text-sm font-bold text-rose-100">
                    {episode.transcription_error}
                  </div>
                )}

                {episode.transcription_text ? (
                  <div className="mt-4 max-h-[520px] overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/80 p-4 text-sm leading-7 text-slate-200">
                    {episode.transcription_text}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-slate-950/70 p-5 text-sm font-bold text-slate-500">
                    Este episodio ainda nao tem transcricao salva.
                  </div>
                )}
              </details>

            </section>
          </div>
          )}

          {activeStudioTab === 'phrases' && (
          <div className="grid gap-5 lg:col-span-2">
            <section className="rounded-[34px] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-black/20">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.20em] text-blue-300">
                    Frases fortes existentes
                  </p>
                  <p className="mt-2 text-sm font-bold text-slate-400">
                    {suggestions.length} frases salvas
                  </p>
                </div>
                {suggestions[0]?.quote_text && (
                  <p className="max-w-xl rounded-2xl border border-amber-300/15 bg-amber-500/10 p-3 text-xs font-bold leading-5 text-amber-50/80">
                    {suggestions[0].quote_text}
                  </p>
                )}
              </div>

              <details className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                <summary className="cursor-pointer text-xs font-black uppercase tracking-[0.14em] text-blue-200">
                  Ver frases fortes
                </summary>

                {suggestions.length > 0 ? (
                  <div className="mt-4 grid gap-3">
                    {suggestions.map((suggestion, index) => (
                      <article
                        key={`${suggestion.quote_text || 'frase'}-${index}`}
                        className="rounded-2xl border border-amber-300/15 bg-amber-500/10 p-4"
                      >
                        <p className="text-sm font-black leading-6 text-amber-50">
                          {suggestion.quote_text || 'Frase sem texto'}
                        </p>

                        {(suggestion.reason || suggestion.score) && (
                          <p className="mt-2 text-xs font-bold leading-5 text-amber-100/70">
                            {suggestion.reason || 'Sugestao gerada por IA'}
                            {suggestion.score ? ` - nota ${suggestion.score}` : ''}
                          </p>
                        )}
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-slate-950/70 p-5 text-sm font-bold text-slate-500">
                    Nenhuma sugestao de Palavra do Dia foi salva neste episodio.
                  </div>
                )}
              </details>

              {contentAssets?.strong_phrases.length ? (
                <article className="mt-5 rounded-2xl border border-amber-300/15 bg-amber-500/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-sm font-black text-amber-50">Frases fortes geradas</h2>
                    <CopyButton value={contentAssets.strong_phrases.map(getStrongPhraseText).join('\n')} />
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {contentAssets.strong_phrases.map((phrase, index) => (
                      <div key={`${getStrongPhraseText(phrase)}-${index}`} className="rounded-xl border border-amber-200/10 bg-slate-950/30 p-3">
                        <p className="text-sm font-bold leading-6 text-amber-50/90">
                          {getStrongPhraseText(phrase)}
                        </p>
                        {typeof phrase !== 'string' && (
                          <div className="mt-3 grid gap-2 text-xs leading-5 text-amber-100/70">
                            {(phrase.use_case || phrase.score) && (
                              <p className="font-black uppercase tracking-[0.12em] text-amber-100">
                                {phrase.use_case || 'uso livre'}
                                {phrase.score ? ` - nota ${phrase.score}` : ''}
                              </p>
                            )}
                            {phrase.source_excerpt && (
                              <p className="border-l-2 border-amber-200/30 pl-3">
                                {phrase.source_excerpt}
                              </p>
                            )}
                            {phrase.why_it_works && <p>{phrase.why_it_works}</p>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </article>
              ) : null}
            </section>
          </div>
          )}

          {activeStudioTab === 'publishing' && (
          <div className="grid gap-5 lg:col-span-2">
            <section className="rounded-[34px] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-black/20">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.20em] text-blue-300">
                    Pacote de publicacao
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-white">Pacote de publicacao</h2>
                  <p className="mt-2 max-w-3xl text-sm font-bold leading-6 text-slate-400">
                    Em breve, esta area vai reunir textos prontos para YouTube Shorts, Instagram, TikTok, Facebook, X e WhatsApp.
                  </p>
                </div>
                {selectedCut && (
                  <CopyButton
                    value={formatCutPackageForCopy(selectedCut, contentAssets)}
                    label="Copiar pacote do corte"
                  />
                )}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {['YouTube Shorts', 'Instagram Reels', 'TikTok', 'WhatsApp', 'Facebook', 'X/Twitter'].map((channel) => (
                  <div key={channel} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                    <p className="text-sm font-black text-white">{channel}</p>
                    <p className="mt-2 text-xs font-bold leading-5 text-slate-500">
                      Planejado para o fluxo de publicacao.
                    </p>
                  </div>
                ))}
              </div>

              {(contentAssets?.whatsapp_text || contentAssets?.instagram_caption) && (
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  {contentAssets.whatsapp_text && (
                    <article className="rounded-2xl border border-emerald-300/15 bg-emerald-500/10 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-black text-emerald-50">Texto para WhatsApp</h3>
                        <CopyButton value={contentAssets.whatsapp_text} />
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-emerald-50/85">
                        {contentAssets.whatsapp_text}
                      </p>
                    </article>
                  )}

                  {contentAssets.instagram_caption && (
                    <article className="rounded-2xl border border-purple-300/15 bg-purple-500/10 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-black text-purple-50">Legenda Instagram</h3>
                        <CopyButton value={contentAssets.instagram_caption} />
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-purple-50/85">
                        {contentAssets.instagram_caption}
                      </p>
                    </article>
                  )}
                </div>
              )}
            </section>
          </div>
          )}

          {(activeStudioTab === 'studio' || activeStudioTab === 'transcription') && (
          <aside className="contents">
            {(activeStudioTab === 'studio' || activeStudioTab === 'transcription') && (
            <section className="order-2 rounded-[34px] border border-cyan-300/15 bg-cyan-500/10 p-5 shadow-2xl shadow-black/20 lg:order-none lg:col-start-2">
              <p className="text-[11px] font-black uppercase tracking-[0.20em] text-cyan-200">
                Timestamps avancados
              </p>

              <p className="mt-3 text-sm leading-6 text-cyan-50/80">
                Usado futuramente para cortes cirurgicos e legendas animadas.
              </p>

              <div className="mt-4 grid gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <InfoPill
                    label={generatingWordTimestamps ? 'processing' : wordTimestampStatus}
                    tone={
                      generatingWordTimestamps || wordTimestampStatus === 'processing'
                        ? 'blue'
                        : wordTimestampStatus === 'ready'
                          ? 'green'
                          : wordTimestampStatus === 'error'
                            ? 'rose'
                            : 'slate'
                    }
                  />
                  {episode.transcription_words_count ? (
                    <InfoPill label={`${episode.transcription_words_count} palavras`} tone="cyan" />
                  ) : null}
                </div>

                {episode.transcription_words_generated_at && (
                  <p className="text-xs font-bold text-slate-500">
                    Gerado em {formatDateTime(episode.transcription_words_generated_at)}
                  </p>
                )}

                {episode.transcription_words_key && (
                  <p className="break-all text-xs leading-5 text-cyan-100/70">
                    {episode.transcription_words_key}
                  </p>
                )}

                {(wordTimestampsError || episode.transcription_words_error) && (
                  <p className="rounded-xl border border-rose-300/20 bg-rose-500/10 p-3 text-xs font-bold leading-5 text-rose-100">
                    {wordTimestampsError || episode.transcription_words_error}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handleGenerateWordTimestamps}
                disabled={generatingWordTimestamps}
                className="mt-4 w-full rounded-2xl bg-cyan-600 px-5 py-4 text-sm font-black text-white shadow-xl shadow-cyan-950/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {generatingWordTimestamps
                  ? 'Gerando timestamps...'
                  : wordTimestampStatus === 'ready'
                    ? 'Regenerar timestamps avancados'
                    : 'Gerar timestamps avancados'}
              </button>
            </section>
            )}

            {activeStudioTab === 'studio' && (
            <section className="order-3 rounded-[34px] border border-blue-300/15 bg-blue-500/10 p-5 shadow-2xl shadow-black/20 lg:order-none lg:col-start-2">
              <p className="text-[11px] font-black uppercase tracking-[0.20em] text-blue-200">
                Conteudos textuais
              </p>

              <p className="mt-3 text-sm leading-6 text-blue-50/80">
                Gere resumo, textos para redes, frases e sugestoes de cortes a partir da transcricao.
              </p>

              {!hasTranscription && (
                <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-500/10 p-4 text-sm font-bold leading-6 text-amber-50">
                  Este episódio precisa de transcrição para gerar conteúdos.
                </div>
              )}

              {contentAssetsError && (
                <div className="mt-4 rounded-2xl border border-rose-300/20 bg-rose-500/10 p-4 text-sm font-bold leading-6 text-rose-100">
                  {contentAssetsError}
                </div>
              )}

              <button
                type="button"
                onClick={() => handleGenerateContentAssets('all')}
                disabled={!hasTranscription || Boolean(generatingMode)}
                className="mt-5 w-full rounded-2xl bg-blue-600 px-5 py-4 text-sm font-black text-white shadow-xl shadow-blue-950/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {generatingMode === 'all' ? generatingLabels.all : 'Gerar tudo'}
              </button>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {([
                  ['summary', 'Gerar resumo'],
                  ['phrases', 'Gerar frases'],
                  ['whatsapp', 'Gerar WhatsApp'],
                  ['instagram', 'Gerar Instagram'],
                  ['short_ideas', 'Gerar ideias'],
                  ['cuts', contentAssets?.cut_suggestions.length ? 'Regenerar cortes' : 'Gerar cortes'],
                ] as Array<[GenerationMode, string]>).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleGenerateContentAssets(mode)}
                    disabled={!hasTranscription || Boolean(generatingMode)}
                    className="rounded-xl border border-blue-200/15 bg-slate-950/60 px-3 py-3 text-xs font-black text-blue-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {generatingMode === mode ? getGenerateLabel(mode, label) : label}
                  </button>
                ))}
              </div>

              <p className="mt-3 rounded-xl border border-amber-300/15 bg-amber-500/10 p-3 text-xs font-bold leading-5 text-amber-50/80">
                Regenerar cortes substitui a lista atual nesta tela.
              </p>
            </section>
            )}

            {activeStudioTab === 'studio' && selectedCut && (
              <section className="order-4 rounded-[34px] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-black/20 lg:order-none lg:col-start-2">
                <p className="text-[11px] font-black uppercase tracking-[0.20em] text-blue-300">
                  Corte selecionado
                </p>
                <div className="mt-4 rounded-2xl border border-blue-300/15 bg-blue-500/10 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <InfoPill label="Em trabalho" tone="blue" />
                    <span className="text-xs font-black text-blue-100">{selectedCutLabel}</span>
                  </div>
                  <p className="mt-3 text-sm font-black leading-5 text-white">{selectedCut.title}</p>
                  <p className="mt-2 line-clamp-4 text-xs font-bold leading-5 text-slate-300">{selectedCut.hook}</p>
                </div>
              </section>
            )}

            {activeStudioTab === 'studio' && !contentAssets && (
              <section className="order-1 rounded-[34px] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-black/20 lg:order-none lg:col-start-1 lg:row-span-3 lg:row-start-1">
                <p className="text-[11px] font-black uppercase tracking-[0.20em] text-blue-300">
                  Modo Estudio
                </p>

                <article className="mt-4 rounded-2xl border border-blue-300/15 bg-blue-500/10 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-black text-blue-50">Area de trabalho do Short</h2>
                      <p className="mt-1 text-xs font-bold text-blue-100/70">
                        Selecione um corte para gerar roteiro, legenda ou expansao.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {['Resumo', 'Roteiro', 'Legendas', 'Visual', 'Publicacao'].map((step) => (
                      <span key={step} className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-1 text-[11px] font-black text-slate-300">
                        {step}
                      </span>
                    ))}
                  </div>

                  <p className="mt-4 rounded-xl border border-dashed border-white/10 bg-slate-950/40 p-3 text-xs font-bold leading-5 text-slate-400">
                    Gere cortes editoriais na lateral para iniciar o pacote de producao do Short.
                  </p>
                </article>

                {manualCutFormCard}

                <article className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                  <h2 className="text-sm font-black text-white">Sugestoes de cortes editoriais</h2>
                  <p className="mt-3 text-sm font-bold leading-6 text-slate-500">
                    Nenhum corte foi gerado nesta tela ainda.
                  </p>
                </article>
              </section>
            )}

            {activeStudioTab === 'studio' && contentAssets && (
              <section className="order-1 rounded-[34px] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-black/20 lg:order-none lg:col-start-1 lg:row-span-4 lg:row-start-1">
                <p className="text-[11px] font-black uppercase tracking-[0.20em] text-blue-300">
                  Modo Estudio
                </p>

                <div className="mt-4 grid gap-4 [&>article]:order-3">
                  <article className="order-1 rounded-2xl border border-blue-300/15 bg-blue-500/10 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-black text-blue-50">Area de trabalho do Short</h2>
                        <p className="mt-1 text-xs font-bold text-blue-100/70">
                          {selectedCut
                            ? `Trabalhando no corte: ${selectedCutLabel}`
                            : 'Selecione um corte para gerar roteiro, legenda ou expansao.'}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {['Resumo', 'Roteiro', 'Legendas', 'Visual', 'Publicacao'].map((step) => (
                          <span key={step} className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-1 text-[11px] font-black text-slate-300">
                            {step}
                          </span>
                        ))}
                      </div>

                      {selectedCut && (
                        <CopyButton
                          value={formatCutPackageForCopy(selectedCut, contentAssets)}
                          label="Copiar pacote do corte"
                        />
                      )}
                    </div>

                    {selectedCut ? (
                      <div className="mt-4 grid gap-3">
                        <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <InfoPill label="Em trabalho" tone="blue" />
                            <span className="text-xs font-black text-blue-200">
                              {selectedCutLabel} | {formatDuration(getCutDuration(selectedCut))}
                            </span>
                          </div>
                          <p className="mt-3 text-sm font-black text-white">{selectedCut.title}</p>
                          <p className="mt-2 text-xs font-bold leading-5 text-slate-300">{selectedCut.hook}</p>
                        </div>

                        <div className="grid gap-3 md:grid-cols-3">
                          <div className="rounded-xl border border-emerald-300/15 bg-emerald-500/10 p-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100">
                              Corte expandido
                            </p>
                            <p className="mt-2 text-xs font-bold leading-5 text-emerald-50/80">
                              {contentAssets.expanded_cut
                                ? `${formatSegmentTime(contentAssets.expanded_cut.start)} - ${formatSegmentTime(contentAssets.expanded_cut.end)}`
                                : 'Ainda nao gerado para este workspace.'}
                            </p>
                          </div>

                          <div className="rounded-xl border border-cyan-300/15 bg-cyan-500/10 p-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100">
                              Roteiro do Short
                            </p>
                            <p className="mt-2 text-xs font-bold leading-5 text-cyan-50/80">
                              {contentAssets.short_script
                                ? contentAssets.short_script.title
                                : 'Ainda nao gerado.'}
                            </p>
                          </div>

                          <div className="rounded-xl border border-fuchsia-300/15 bg-fuchsia-500/10 p-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-fuchsia-100">
                              Legendas sincronizadas
                            </p>
                            <p className="mt-2 text-xs font-bold leading-5 text-fuchsia-50/80">
                              {contentAssets.synced_captions
                                ? `${contentAssets.synced_captions.lines.length} linhas prontas`
                                : 'Ainda nao geradas.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-4 rounded-xl border border-dashed border-white/10 bg-slate-950/40 p-3 text-xs font-bold leading-5 text-slate-400">
                        A lista de cortes continua disponivel abaixo. Ao acionar uma tarefa em um card, ele aparece aqui sem apagar os outros resultados.
                      </p>
                    )}
                  </article>

                  {manualCutFormCard}

                  {contentAssets.devotional_summary && (
                  <article className="hidden rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-sm font-black text-white">Resumo devocional</h2>
                      <CopyButton value={contentAssets.devotional_summary} />
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      {contentAssets.devotional_summary}
                    </p>
                  </article>
                  )}

                  {contentAssets.strong_phrases.length > 0 && (
                  <article className="hidden rounded-2xl border border-amber-300/15 bg-amber-500/10 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-sm font-black text-amber-50">Frases fortes</h2>
                      <CopyButton value={contentAssets.strong_phrases.map(getStrongPhraseText).join('\n')} />
                    </div>
                    <div className="mt-3 grid gap-3">
                      {contentAssets.strong_phrases.map((phrase, index) => (
                        <div key={`${getStrongPhraseText(phrase)}-${index}`} className="rounded-xl border border-amber-200/10 bg-slate-950/30 p-3">
                          <p className="text-sm font-bold leading-6 text-amber-50/90">
                            {getStrongPhraseText(phrase)}
                          </p>
                          {typeof phrase !== 'string' && (
                            <div className="mt-3 grid gap-2 text-xs leading-5 text-amber-100/70">
                              {(phrase.use_case || phrase.score) && (
                                <p className="font-black uppercase tracking-[0.12em] text-amber-100">
                                  {phrase.use_case || 'uso livre'}
                                  {phrase.score ? ` - nota ${phrase.score}` : ''}
                                </p>
                              )}
                              {phrase.source_excerpt && (
                                <p className="border-l-2 border-amber-200/30 pl-3">
                                  {phrase.source_excerpt}
                                </p>
                              )}
                              {phrase.why_it_works && <p>{phrase.why_it_works}</p>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </article>
                  )}

                  {contentAssets.whatsapp_text && (
                  <article className="hidden rounded-2xl border border-emerald-300/15 bg-emerald-500/10 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-sm font-black text-emerald-50">Texto para WhatsApp</h2>
                      <CopyButton value={contentAssets.whatsapp_text} />
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-emerald-50/85">
                      {contentAssets.whatsapp_text}
                    </p>
                  </article>
                  )}

                  {contentAssets.instagram_caption && (
                  <article className="hidden rounded-2xl border border-purple-300/15 bg-purple-500/10 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-sm font-black text-purple-50">Legenda Instagram</h2>
                      <CopyButton value={contentAssets.instagram_caption} />
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-purple-50/85">
                      {contentAssets.instagram_caption}
                    </p>
                  </article>
                  )}

                  {contentAssets.hashtags.length > 0 && (
                  <article className="hidden rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                    <h2 className="text-sm font-black text-white">Hashtags</h2>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {contentAssets.hashtags.map((hashtag) => (
                        <span key={hashtag} className="rounded-full border border-blue-300/20 bg-blue-500/10 px-3 py-1 text-xs font-black text-blue-100">
                          {hashtag}
                        </span>
                      ))}
                    </div>
                  </article>
                  )}

                  {contentAssets.short_ideas.length > 0 && (
                  <article className="hidden rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                    <h2 className="text-sm font-black text-white">Ideias de Shorts</h2>
                    <div className="mt-3 grid gap-3">
                      {contentAssets.short_ideas.map((idea, index) => (
                        <div key={`${idea.title}-${index}`} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Titulo</p>
                          <p className="mt-1 text-sm font-black text-blue-100">{idea.title}</p>
                          <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Gancho</p>
                          <p className="mt-1 text-xs font-bold leading-5 text-slate-300">{idea.hook}</p>
                          {idea.suggested_opening_line && (
                            <>
                              <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Abertura sugerida</p>
                              <p className="mt-1 rounded-lg bg-blue-500/10 p-2 text-xs font-bold leading-5 text-blue-100">
                                {idea.suggested_opening_line}
                              </p>
                            </>
                          )}
                          <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Angulo</p>
                          <p className="mt-1 text-xs leading-5 text-slate-500">{idea.angle}</p>
                          {idea.why_it_can_work && (
                            <>
                              <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Por que pode funcionar</p>
                              <p className="mt-1 text-xs leading-5 text-slate-400">{idea.why_it_can_work}</p>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </article>
                  )}

                  {contentAssets.short_script && (
                  <article className="rounded-2xl border border-cyan-300/15 bg-cyan-500/10 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-black text-cyan-50">Roteiro do Short</h2>
                        <p className="mt-1 text-xs font-bold text-cyan-100/70">
                          {contentAssets.short_script.duration_seconds}s para Shorts/Reels/TikTok
                        </p>
                      </div>
                      <CopyButton value={formatShortScriptForCopy(contentAssets.short_script)} label="Copiar roteiro" />
                    </div>

                    <div className="mt-4 grid gap-3">
                      {contentAssets.short_script.auto_completed && (
                        <p className="rounded-xl border border-amber-300/20 bg-amber-500/10 p-3 text-xs font-bold leading-5 text-amber-50">
                          {contentAssets.short_script.auto_completed_note || 'Alguns elementos foram completados automaticamente para facilitar a edicao.'}
                        </p>
                      )}

                      <div className="rounded-xl border border-cyan-200/10 bg-slate-950/50 p-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/70">Titulo</p>
                        <p className="mt-1 text-sm font-black text-white">{contentAssets.short_script.title}</p>
                      </div>

                      {(contentAssets.short_script.hook_original ||
                        contentAssets.short_script.hook_improved ||
                        contentAssets.short_script.suggested_opening_line ||
                        typeof contentAssets.short_script.retention_score === 'number') && (
                        <div className="rounded-xl border border-cyan-200/10 bg-slate-950/50 p-3">
                          <h3 className="text-xs font-black text-cyan-50">Camada editorial de retencao</h3>
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            {contentAssets.short_script.hook_original && (
                              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/70">Hook original</p>
                                <p className="mt-2 text-xs font-bold leading-5 text-cyan-50">{contentAssets.short_script.hook_original}</p>
                              </div>
                            )}
                            {contentAssets.short_script.hook_improved && (
                              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/70">Hook aprimorado</p>
                                  <CopyButton value={contentAssets.short_script.hook_improved} />
                                </div>
                                <p className="mt-2 text-xs font-bold leading-5 text-cyan-50">{contentAssets.short_script.hook_improved}</p>
                              </div>
                            )}
                            {contentAssets.short_script.suggested_opening_line && (
                              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/70">Abertura sugerida</p>
                                  <CopyButton value={contentAssets.short_script.suggested_opening_line} />
                                </div>
                                <p className="mt-2 text-xs font-bold leading-5 text-cyan-50">{contentAssets.short_script.suggested_opening_line}</p>
                              </div>
                            )}
                            {typeof contentAssets.short_script.retention_score === 'number' && (
                              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/70">Nota de retencao</p>
                                <p className="mt-2 text-xl font-black text-cyan-50">{contentAssets.short_script.retention_score}/10</p>
                              </div>
                            )}
                          </div>
                          {contentAssets.short_script.why_hook_improved && (
                            <p className="mt-3 text-xs leading-5 text-cyan-50/80">
                              <span className="font-black text-cyan-100">Por que o hook melhorou: </span>
                              {contentAssets.short_script.why_hook_improved}
                            </p>
                          )}
                          {contentAssets.short_script.why_opening_works && (
                            <p className="mt-2 text-xs leading-5 text-cyan-50/80">
                              <span className="font-black text-cyan-100">Por que a abertura funciona: </span>
                              {contentAssets.short_script.why_opening_works}
                            </p>
                          )}
                          {contentAssets.short_script.score_breakdown && (
                            <div className="mt-3 grid gap-2 text-xs font-bold text-cyan-50/80 sm:grid-cols-2 lg:grid-cols-3">
                              {Object.entries(contentAssets.short_script.score_breakdown).map(([key, value]) => (
                                typeof value === 'number' ? (
                                  <p key={key} className="rounded-lg bg-cyan-500/10 p-2">
                                    {key.replace(/_/g, ' ')}: {value}/10
                                  </p>
                                ) : null
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-xl border border-cyan-200/10 bg-slate-950/50 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/70">Hook</p>
                            <CopyButton value={contentAssets.short_script.main_hook} />
                          </div>
                          <p className="mt-2 text-xs font-bold leading-5 text-cyan-50">{contentAssets.short_script.main_hook}</p>
                        </div>
                        <div className="rounded-xl border border-cyan-200/10 bg-slate-950/50 p-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/70">Cliffhanger</p>
                          <p className="mt-2 text-xs font-bold leading-5 text-cyan-50">{contentAssets.short_script.cliffhanger}</p>
                        </div>
                        <div className="rounded-xl border border-cyan-200/10 bg-slate-950/50 p-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/70">Ponto espiritual</p>
                          <p className="mt-2 text-xs leading-5 text-cyan-50/85">{contentAssets.short_script.spiritual_point}</p>
                        </div>
                        <div className="rounded-xl border border-cyan-200/10 bg-slate-950/50 p-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/70">CTA</p>
                          <p className="mt-2 text-xs leading-5 text-cyan-50/85">{contentAssets.short_script.cta}</p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-cyan-200/10 bg-slate-950/50 p-3">
                        <h3 className="text-xs font-black text-cyan-50">Timeline</h3>
                        <div className="mt-3 grid gap-2">
                          {contentAssets.short_script.timeline.map((item, index) => (
                            <div key={`${item.start}-${item.end}-${index}`} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                              <p className="text-[11px] font-black text-cyan-200">{item.start}s - {item.end}s | {item.purpose}</p>
                              <p className="mt-2 text-xs leading-5 text-cyan-50/85">{item.narration_focus}</p>
                              <p className="mt-2 rounded-lg bg-cyan-500/10 p-2 text-xs font-black text-cyan-50">{item.on_screen_text}</p>
                              <p className="mt-2 text-xs leading-5 text-slate-400">Direcao visual: {item.visual_direction}</p>
                              <p className="text-xs leading-5 text-slate-400">Motion: {item.motion_direction}</p>
                              <p className="text-xs leading-5 text-slate-400">Som: {item.sound_design}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-xl border border-cyan-200/10 bg-slate-950/50 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-xs font-black text-cyan-50">Legendas animadas</h3>
                          <CopyButton value={contentAssets.short_script.animated_caption_lines.join('\n')} />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {contentAssets.short_script.animated_caption_lines.map((line, index) => (
                            <span key={`${line}-${index}`} className="rounded-full border border-cyan-300/20 bg-cyan-500/10 px-2 py-1 text-[11px] font-bold text-cyan-100">
                              {line}
                            </span>
                          ))}
                        </div>
                      </div>

                      {contentAssets.short_script.caption_lines_improved && contentAssets.short_script.caption_lines_improved.length > 0 && (
                        <div className="rounded-xl border border-cyan-200/10 bg-slate-950/50 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-xs font-black text-cyan-50">Legendas aprimoradas</h3>
                            <CopyButton value={contentAssets.short_script.caption_lines_improved.join('\n')} />
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {contentAssets.short_script.caption_lines_improved.map((line, index) => (
                              <span key={`${line}-${index}`} className="rounded-full border border-emerald-300/20 bg-emerald-500/10 px-2 py-1 text-[11px] font-bold text-emerald-100">
                                {line}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="rounded-xl border border-cyan-200/10 bg-slate-950/50 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-xs font-black text-cyan-50">Prompts de imagem</h3>
                          <CopyButton value={contentAssets.short_script.image_prompts.map((item) => `${item.moment} (${item.use_for_seconds})\n${item.prompt}`).join('\n\n')} />
                        </div>
                        <div className="mt-3 grid gap-2">
                          {contentAssets.short_script.image_prompts.map((item, index) => (
                            <div key={`${item.moment}-${index}`} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                              <p className="text-[11px] font-black text-cyan-200">{item.moment} | {item.use_for_seconds}</p>
                              <p className="mt-2 text-xs leading-5 text-slate-300">{item.prompt}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {contentAssets.short_script.visual_suggestions && contentAssets.short_script.visual_suggestions.length > 0 && (
                        <div className="rounded-xl border border-cyan-200/10 bg-slate-950/50 p-3">
                          <h3 className="text-xs font-black text-cyan-50">Sugestoes visuais</h3>
                          <div className="mt-3 grid gap-2">
                            {contentAssets.short_script.visual_suggestions.map((item, index) => (
                              <div key={`${item.start}-${item.end}-${index}`} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                                <p className="text-[11px] font-black text-cyan-200">{item.start}s - {item.end}s | {item.visual_goal}</p>
                                <p className="mt-2 text-xs leading-5 text-slate-300">{item.scene_description}</p>
                                <p className="mt-2 text-xs leading-5 text-slate-400">Motion: {item.motion}</p>
                                <p className="text-xs leading-5 text-slate-400">Som: {item.sound_design}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-xl border border-cyan-200/10 bg-slate-950/50 p-3">
                          <h3 className="text-xs font-black text-cyan-50">Notas de edicao</h3>
                          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-cyan-50/80">
                            {contentAssets.short_script.editing_notes.map((note, index) => (
                              <li key={`${note}-${index}`}>{note}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="rounded-xl border border-cyan-200/10 bg-slate-950/50 p-3">
                          <h3 className="text-xs font-black text-cyan-50">Checklist de qualidade</h3>
                          <div className="mt-2 grid gap-1 text-xs font-bold text-cyan-50/80">
                            {Object.entries(contentAssets.short_script.quality_check).map(([key, value]) => (
                              <p key={key}>{value ? 'OK' : 'Revisar'} - {key.replace(/_/g, ' ')}</p>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                  )}

                  {contentAssets.synced_captions && (
                  <article className="rounded-2xl border border-fuchsia-300/15 bg-fuchsia-500/10 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-black text-fuchsia-50">Legendas sincronizadas</h2>
                        <p className="mt-1 text-xs font-bold text-fuchsia-100/70">
                          Origem: word timestamps | {formatSegmentTime(contentAssets.synced_captions.cut_start)} - {formatSegmentTime(contentAssets.synced_captions.cut_end)} | {formatDuration(contentAssets.synced_captions.duration_seconds)}
                        </p>
                        <p className="mt-1 text-xs font-bold text-fuchsia-100/60">
                          {contentAssets.synced_captions.cut_title} · {contentAssets.synced_captions.words_count} palavras
                        </p>
                        <p className="mt-1 text-xs font-bold text-fuchsia-100/60">
                          Versao: {contentAssets.synced_captions.algorithm_version || 'sem versao'}
                        </p>
                        <p className="mt-1 text-xs font-bold text-fuchsia-100/60">
                          Modo: {contentAssets.synced_captions.mode === 'hybrid' ? 'hibrido' : 'word timestamps'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <CopyButton value={contentAssets.synced_captions.srt} label="Copiar SRT" />
                        <CopyButton value={contentAssets.synced_captions.plain_text} label="Copiar texto" />
                        <CopyButton value={JSON.stringify(contentAssets.synced_captions.json, null, 2)} label="Copiar JSON" />
                        {contentAssets.synced_captions.word_only && (
                          <CopyButton value={contentAssets.synced_captions.word_only.srt} label="Copiar versao bruta" />
                        )}
                        <CopyButton value={formatCaptionDiagnosisForCopy(contentAssets.synced_captions)} label="Copiar diagnostico" />
                        <button
                          type="button"
                          onClick={handleReviewSyncedCaptions}
                          disabled={!syncedCaptionsMatchSelectedCut || generatingCaptionReviewKey === selectedCutKey}
                          className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-black text-fuchsia-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
                        >
                          {generatingCaptionReviewKey === selectedCutKey
                            ? 'Revisando legenda com IA...'
                            : 'Revisar legenda com IA'}
                        </button>
                      </div>
                    </div>

                    <p className="mt-3 text-xs font-bold text-fuchsia-100/60">
                      Usa IA forte apenas neste corte.
                    </p>

                    {captionReviewError && (
                      <p className="mt-4 rounded-xl border border-rose-300/20 bg-rose-500/10 p-3 text-xs font-bold leading-5 text-rose-100">
                        {captionReviewError}
                      </p>
                    )}

                    {contentAssets.synced_captions.mode === 'hybrid' && (
                      <p className="mt-4 rounded-xl border border-fuchsia-300/20 bg-fuchsia-500/10 p-3 text-xs font-bold leading-5 text-fuchsia-50">
                        Texto revisado com base na transcricao do segmento. Tempos aproximados.
                      </p>
                    )}

                    {!contentAssets.synced_captions.algorithm_version && (
                      <p className="mt-4 rounded-xl border border-amber-300/20 bg-amber-500/10 p-3 text-xs font-bold leading-5 text-amber-50">
                        Legenda restaurada de versao antiga. Regenere para testar o algoritmo atual.
                      </p>
                    )}

                    {shouldWarnOldCaptionVersion && (
                      <p className="mt-4 rounded-xl border border-amber-300/20 bg-amber-500/10 p-3 text-xs font-bold leading-5 text-amber-50">
                        Esta legenda foi gerada com uma versao anterior do algoritmo.
                      </p>
                    )}

                    {reviewedCaptionsForSelectedCut && (
                      <div className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-500/10 p-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="text-xs font-black text-emerald-50">Legenda revisada por IA</h3>
                            <p className="mt-1 text-xs font-bold text-emerald-100/70">
                              Modelo: {reviewedCaptionsForSelectedCut.model} | confianca: {reviewedCaptionsForSelectedCut.confidence}
                            </p>
                            <p className="mt-1 text-xs font-bold text-emerald-100/60">
                              Base: {reviewedCaptionsForSelectedCut.base_algorithm_version || 'sem versao'} | versao: {reviewedCaptionsForSelectedCut.algorithm_version}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <CopyButton value={reviewedCaptionsForSelectedCut.srt} label="Copiar SRT revisado" />
                            <CopyButton value={reviewedCaptionsForSelectedCut.plain_text} label="Copiar texto revisado" />
                            <CopyButton value={JSON.stringify(reviewedCaptionsForSelectedCut.json, null, 2)} label="Copiar JSON revisado" />
                            <button
                              type="button"
                              onClick={() => {
                                if (!selectedCutKey) return
                                setReviewedCaptionsByKey((current) => {
                                  const next = { ...current }
                                  delete next[selectedCutKey]
                                  return next
                                })
                              }}
                              className="rounded-xl border border-emerald-300/20 bg-slate-950/50 px-3 py-2 text-xs font-black text-emerald-100 active:scale-[0.98]"
                            >
                              Restaurar automatico
                            </button>
                          </div>
                        </div>

                        {reviewedCaptionsForSelectedCut.review_notes.length > 0 && (
                          <ul className="mt-3 list-disc space-y-1 pl-4 text-xs font-bold leading-5 text-emerald-50/80">
                            {reviewedCaptionsForSelectedCut.review_notes.map((note, index) => (
                              <li key={`${note}-${index}`}>{note}</li>
                            ))}
                          </ul>
                        )}

                        <div className="mt-3 grid gap-2">
                          {reviewedCaptionsForSelectedCut.lines.map((line, index) => (
                            <div key={`${line.start}-${line.end}-${index}`} className="rounded-xl border border-emerald-200/10 bg-slate-950/45 p-3">
                              <p className="text-[11px] font-black text-emerald-200">
                                {line.start.toFixed(2)}s - {line.end.toFixed(2)}s
                              </p>
                              <p className="mt-2 text-sm font-bold leading-6 text-emerald-50">{line.text}</p>
                            </div>
                          ))}
                        </div>

                        <p className="mt-3 text-xs font-bold text-emerald-100/65">
                          A versao automatica e o diagnostico continuam disponiveis abaixo.
                        </p>
                      </div>
                    )}

                    {contentAssets.synced_captions.caption_quality_warnings?.length ? (
                      <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-500/10 p-3">
                        <p className="text-xs font-black text-amber-50">Avisos de qualidade</p>
                        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs font-bold leading-5 text-amber-50/80">
                          {contentAssets.synced_captions.caption_quality_warnings.map((warning) => (
                            <li key={warning}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {contentAssets.synced_captions.hybrid_debug && (
                      <div className="mt-4 rounded-xl border border-blue-300/15 bg-blue-500/10 p-3">
                        <p className="text-xs font-black text-blue-50">Diagnostico hibrido</p>
                        <p className="mt-2 text-xs font-bold leading-5 text-blue-50/80">
                          {contentAssets.synced_captions.hybrid_debug.reason}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full border border-blue-300/20 bg-slate-950/40 px-3 py-1 text-[11px] font-black text-blue-100">
                            confianca: {contentAssets.synced_captions.hybrid_debug.confidence}
                          </span>
                          <span className="rounded-full border border-blue-300/20 bg-slate-950/40 px-3 py-1 text-[11px] font-black text-blue-100">
                            usado: {contentAssets.synced_captions.hybrid_debug.used_hybrid_text ? 'sim' : 'nao'}
                          </span>
                          {contentAssets.synced_captions.hybrid_debug.alignment && (
                            <span className="rounded-full border border-blue-300/20 bg-slate-950/40 px-3 py-1 text-[11px] font-black text-blue-100">
                              alinhamento: {Math.round(contentAssets.synced_captions.hybrid_debug.alignment.matched_ratio * 100)}%
                            </span>
                          )}
                          {contentAssets.synced_captions.hybrid_debug.final_validation && (
                            <>
                              <span className="rounded-full border border-blue-300/20 bg-slate-950/40 px-3 py-1 text-[11px] font-black text-blue-100">
                                cobertura final: {Math.round(contentAssets.synced_captions.hybrid_debug.final_validation.coverage_ratio * 100)}%
                              </span>
                              <span className="rounded-full border border-blue-300/20 bg-slate-950/40 px-3 py-1 text-[11px] font-black text-blue-100">
                                modo seguro: {contentAssets.synced_captions.hybrid_debug.final_validation.fallback_used ? 'sim' : 'nao'}
                              </span>
                            </>
                          )}
                        </div>
                        {contentAssets.synced_captions.hybrid_debug.final_validation?.missing_protected_phrases.length ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {contentAssets.synced_captions.hybrid_debug.final_validation.missing_protected_phrases.map((phrase) => (
                              <span key={phrase} className="rounded-full border border-rose-300/20 bg-rose-500/10 px-3 py-1 text-[11px] font-black text-rose-100">
                                faltando: {phrase}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {contentAssets.synced_captions.hybrid_debug.missing_terms_from_words.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {contentAssets.synced_captions.hybrid_debug.missing_terms_from_words.map((term) => (
                              <span key={term} className="rounded-full border border-amber-300/20 bg-amber-500/10 px-3 py-1 text-[11px] font-black text-amber-100">
                                ausente no words: {term}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {contentAssets.synced_captions.debug && (
                      <div className="mt-4 rounded-xl border border-fuchsia-300/15 bg-slate-950/50 p-3">
                        <p className="text-xs font-black text-fuchsia-50">Diagnostico das palavras</p>
                        <p className="mt-1 text-xs font-bold text-fuchsia-100/60">
                          Palavras no corte: {contentAssets.synced_captions.debug.raw_words_count}
                        </p>
                        <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-fuchsia-100/70">
                          Texto bruto do words.json
                        </p>
                        <p className="mt-2 max-h-36 overflow-y-auto rounded-lg border border-white/10 bg-white/[0.04] p-3 text-xs font-bold leading-5 text-fuchsia-50/85">
                          {contentAssets.synced_captions.debug.raw_text}
                        </p>
                        <div className="mt-3 grid gap-2 text-xs font-bold text-fuchsia-50/85 sm:grid-cols-2 lg:grid-cols-4">
                          {([
                            ['cerca', contentAssets.synced_captions.debug.contains_terms.cerca],
                            ['pes', contentAssets.synced_captions.debug.contains_terms.pes],
                            ['Jesus', contentAssets.synced_captions.debug.contains_terms.jesus],
                            ['oleo', contentAssets.synced_captions.debug.contains_terms.oleo],
                            ['perfume', contentAssets.synced_captions.debug.contains_terms.perfume],
                            ['cabelos', contentAssets.synced_captions.debug.contains_terms.cabelos],
                            ['300/trezentos', contentAssets.synced_captions.debug.contains_terms.trezentos_ou_300],
                          ] as Array<[string, boolean]>).map(([label, found]) => (
                            <p key={label} className={`rounded-lg border px-3 py-2 ${
                              found
                                ? 'border-emerald-300/20 bg-emerald-500/10 text-emerald-100'
                                : 'border-rose-300/20 bg-rose-500/10 text-rose-100'
                            }`}>
                              {label}: {found ? 'sim' : 'nao'}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 grid gap-2">
                      {contentAssets.synced_captions.lines.map((line, index) => (
                        <div key={`${line.start}-${line.end}-${index}`} className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
                          <p className="text-[11px] font-black text-fuchsia-200">
                            {line.start.toFixed(2)}s - {line.end.toFixed(2)}s · {line.words_count} palavras
                          </p>
                          <p className="mt-2 text-sm font-bold leading-6 text-fuchsia-50">{line.text}</p>
                        </div>
                      ))}
                    </div>
                  </article>
                  )}

                  {contentAssets.expanded_cut && (
                  <article className="rounded-2xl border border-emerald-300/15 bg-emerald-500/10 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-black text-emerald-50">Corte expandido</h2>
                        <p className="mt-1 text-xs font-bold text-emerald-100/70">
                          {formatSegmentTime(contentAssets.expanded_cut.start)} - {formatSegmentTime(contentAssets.expanded_cut.end)} | {formatDuration(getCutDuration(contentAssets.expanded_cut))}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleGenerateShortScript(contentAssets.expanded_cut as CutSuggestion, -1)}
                          disabled={generatingShortScriptKey === getCutKey(contentAssets.expanded_cut, -1)}
                          className="rounded-xl border border-emerald-300/20 bg-slate-950/50 px-3 py-2 text-xs font-black text-emerald-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
                        >
                          {generatingShortScriptKey === `${contentAssets.expanded_cut.start}-${contentAssets.expanded_cut.end}--1`
                            ? 'Gerando roteiro...'
                            : 'Gerar roteiro do Short'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGenerateSyncedCaptions(contentAssets.expanded_cut as CutSuggestion, -1)}
                          disabled={generatingSyncedCaptionKey === getCutKey(contentAssets.expanded_cut, -1)}
                          className="rounded-xl border border-fuchsia-300/20 bg-fuchsia-500/10 px-3 py-2 text-xs font-black text-fuchsia-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
                        >
                          {generatingSyncedCaptionKey === getCutKey(contentAssets.expanded_cut, -1)
                            ? 'Sincronizando...'
                            : 'Gerar legendas sincronizadas'}
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 rounded-xl border border-emerald-200/10 bg-slate-950/40 p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/70">Titulo</p>
                      <p className="mt-1 text-sm font-black text-white">{contentAssets.expanded_cut.title}</p>
                      <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/70">Gancho original</p>
                      <p className="mt-1 text-xs font-bold leading-5 text-emerald-50">{contentAssets.expanded_cut.hook}</p>
                      {contentAssets.expanded_cut.source_excerpt && (
                        <>
                          <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/70">Trecho expandido</p>
                          <p className="mt-1 border-l-2 border-emerald-300/30 pl-3 text-xs leading-5 text-emerald-50/80">
                            {contentAssets.expanded_cut.source_excerpt}
                          </p>
                        </>
                      )}
                      {contentAssets.expanded_cut.expansion_reason && (
                        <p className="mt-3 text-xs leading-5 text-emerald-100/75">
                          {contentAssets.expanded_cut.expansion_reason}
                        </p>
                      )}
                      {contentAssets.expanded_cut.needs_manual_trim && (
                        <p className="mt-3 rounded-xl border border-amber-300/20 bg-amber-500/10 p-3 text-xs font-bold leading-5 text-amber-50">
                          {contentAssets.expanded_cut.trim_warning || 'Este corte pode precisar de ajuste manual no final.'}
                        </p>
                      )}
                      {syncedCaptionErrorByKey[getCutKey(contentAssets.expanded_cut, -1)] && (
                        <p className="mt-3 rounded-xl border border-rose-300/20 bg-rose-500/10 p-3 text-xs font-bold leading-5 text-rose-100">
                          {syncedCaptionErrorByKey[getCutKey(contentAssets.expanded_cut, -1)]}
                        </p>
                      )}
                    </div>
                  </article>
                  )}

                  {(manualCutSuggestions.length > 0 || contentAssets.cut_suggestions.length > 0 || contentAssets.cut_suggestions_note) && (
                  <article className="order-2 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                    <h2 className="text-sm font-black text-white">Sugestões de cortes editoriais</h2>
                    {contentAssets.cut_suggestions.length === 0 && contentAssets.cut_suggestions_note && (
                      <p className="mt-3 rounded-xl border border-amber-300/20 bg-amber-500/10 p-3 text-xs font-bold leading-5 text-amber-50">
                        {contentAssets.cut_suggestions_note}
                      </p>
                    )}
                    {contentAssets.cut_suggestions.length === 1 && (
                      <p className="mt-3 text-xs font-bold leading-5 text-slate-400">
                        Somente 1 corte passou pelos criterios editoriais desta geracao.
                      </p>
                    )}
                    {(manualCutSuggestions.length > 0 || contentAssets.cut_suggestions.length > 0) && (
                      <div className="mt-3 grid gap-2 text-xs font-bold text-slate-400">
                        <p>Cortes manuais: {manualCutSuggestions.length} · Cortes completos: {fullCutSuggestions.length} · Ganchos para expandir: {hookSuggestions.length}</p>
                      </div>
                    )}
                    {manualCutSuggestions.length > 0 && (
                      <div className="mt-4 grid gap-3">
                        <h3 className="pt-2 text-xs font-black uppercase tracking-[0.16em] text-amber-100">
                          Cortes manuais
                        </h3>
                        {manualCutSuggestions.map((cut) => {
                          const manualKey = getCutKey(cut, 0)

                          return (
                            <div key={manualKey} className={`rounded-xl border p-3 ${
                              manualKey === selectedCutKey
                                ? 'border-blue-300/35 bg-blue-500/10'
                                : 'border-amber-300/20 bg-amber-500/10'
                            }`}>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-black text-blue-200">
                                  {formatSegmentTime(cut.start)} - {formatSegmentTime(cut.end)}
                                </span>
                                {manualKey === selectedCutKey && (
                                  <span className="rounded-full border border-blue-300/25 bg-blue-500/15 px-2 py-1 text-[11px] font-black text-blue-100">
                                    Em trabalho
                                  </span>
                                )}
                                <span className="rounded-full border border-amber-300/20 bg-slate-950/40 px-2 py-1 text-[11px] font-black text-amber-100">
                                  Corte manual
                                </span>
                                <span className="rounded-full border border-white/10 bg-slate-950 px-2 py-1 text-[11px] font-black text-slate-300">
                                  {formatDuration(getCutDuration(cut))}
                                </span>
                              </div>
                              <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Titulo</p>
                              <p className="mt-1 text-sm font-black text-white">{cut.title}</p>
                              <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Gancho</p>
                              <p className="mt-1 text-xs font-bold leading-5 text-slate-300">{cut.hook}</p>
                              {cut.source_excerpt && (
                                <>
                                  <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Trecho-base</p>
                                  <p className="mt-1 border-l-2 border-amber-300/30 pl-3 text-xs leading-5 text-slate-400">
                                    {cut.source_excerpt}
                                  </p>
                                </>
                              )}
                              <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Motivo</p>
                              <p className="mt-1 text-xs leading-5 text-slate-500">{cut.reason}</p>
                              {(cut.editorial_note || cut.strength_reason) && (
                                <div className="mt-3 rounded-xl border border-emerald-300/15 bg-emerald-500/10 p-3">
                                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100">
                                    Nota editorial {cut.editorial_score || cut.strength_score || 9}/10
                                  </p>
                                  <p className="mt-2 text-xs leading-5 text-emerald-50/80">
                                    {cut.editorial_note || cut.strength_reason}
                                  </p>
                                </div>
                              )}
                              <div className="mt-4 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleGenerateShortScript(cut, 0)}
                                  disabled={generatingShortScriptKey === manualKey}
                                  className="rounded-xl border border-cyan-300/20 bg-cyan-500/10 px-3 py-2 text-xs font-black text-cyan-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
                                >
                                  {generatingShortScriptKey === manualKey
                                    ? 'Gerando roteiro...'
                                    : 'Gerar roteiro do Short'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleGenerateSyncedCaptions(cut, 0)}
                                  disabled={generatingSyncedCaptionKey === manualKey}
                                  className="rounded-xl border border-fuchsia-300/20 bg-fuchsia-500/10 px-3 py-2 text-xs font-black text-fuchsia-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
                                >
                                  {generatingSyncedCaptionKey === manualKey
                                    ? 'Sincronizando...'
                                    : 'Gerar legendas sincronizadas'}
                                </button>
                              </div>
                              {syncedCaptionErrorByKey[manualKey] && (
                                <p className="mt-3 rounded-xl border border-rose-300/20 bg-rose-500/10 p-3 text-xs font-bold leading-5 text-rose-100">
                                  {syncedCaptionErrorByKey[manualKey]}
                                </p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                    {contentAssets.cut_suggestions.length > 0 ? (
                      <div className="mt-3 grid gap-3">
                        {orderedCutSuggestions.map((cut, index) => (
                          <div key={`${cut.title}-${index}`} className="contents">
                          {(index === 0 || isHookCut(orderedCutSuggestions[index - 1]) !== isHookCut(cut)) && (
                            <h3 className="pt-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                              {isHookCut(cut) ? 'Ganchos para expandir' : 'Cortes completos'}
                            </h3>
                          )}
                          <div className={`rounded-xl border p-3 ${
                            getCutKey(cut, index) === selectedCutKey
                              ? 'border-blue-300/35 bg-blue-500/10'
                              : 'border-white/10 bg-white/[0.04]'
                          }`}>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-black text-blue-200">
                                {formatSegmentTime(cut.start)} - {formatSegmentTime(cut.end)}
                              </span>
                              {getCutKey(cut, index) === selectedCutKey && (
                                <span className="rounded-full border border-blue-300/25 bg-blue-500/15 px-2 py-1 text-[11px] font-black text-blue-100">
                                  Em trabalho
                                </span>
                              )}
                              <span className="rounded-full border border-white/10 bg-slate-950 px-2 py-1 text-[11px] font-black text-slate-300">
                                {formatDuration(getCutDuration(cut))}
                              </span>
                              {getCutDuration(cut) < 20 && (
                                <span className="rounded-full border border-amber-300/20 bg-amber-500/10 px-2 py-1 text-[11px] font-black text-amber-100">
                                  Trecho curto / usar como gancho
                                </span>
                              )}
                              <span className={`rounded-full border px-2 py-1 text-[11px] font-black ${
                                isHookCut(cut)
                                  ? 'border-amber-300/20 bg-amber-500/10 text-amber-100'
                                  : 'border-emerald-300/20 bg-emerald-500/10 text-emerald-100'
                              }`}>
                                {isHookCut(cut) ? 'Gancho forte / precisa expandir' : 'Corte completo'}
                              </span>
                            </div>
                            <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Titulo</p>
                            <p className="mt-1 text-sm font-black text-white">{cut.title}</p>
                            <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Gancho</p>
                            <p className="mt-1 text-xs font-bold leading-5 text-slate-300">{cut.hook}</p>
                            {cut.source_excerpt && (
                              <>
                                <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Trecho-base</p>
                                <p className="mt-1 border-l-2 border-blue-300/30 pl-3 text-xs leading-5 text-slate-400">
                                  {cut.source_excerpt}
                                </p>
                              </>
                            )}
                            <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Motivo</p>
                            <p className="mt-1 text-xs leading-5 text-slate-500">{cut.reason}</p>
                            {(cut.strength_score || cut.strength_reason) && (
                              <div className="mt-3 rounded-xl border border-emerald-300/15 bg-emerald-500/10 p-3">
                                {cut.strength_score && (
                                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100">
                                    Nota editorial {cut.strength_score}/10
                                  </p>
                                )}
                                {cut.strength_reason && (
                                  <p className="mt-2 text-xs leading-5 text-emerald-50/80">
                                    {cut.strength_reason}
                                  </p>
                                )}
                              </div>
                            )}
                            {cut.suggested_caption_lines && cut.suggested_caption_lines.length > 0 && (
                              <>
                                <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Linhas de legenda</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {cut.suggested_caption_lines.map((line, lineIndex) => (
                                    <span key={`${line}-${lineIndex}`} className="rounded-full border border-blue-300/20 bg-blue-500/10 px-2 py-1 text-[11px] font-bold text-blue-100">
                                      {line}
                                    </span>
                                  ))}
                                </div>
                              </>
                            )}
                            {isHookCut(cut) ? (
                              <button
                                type="button"
                                onClick={() => handleExpandCut(cut, index)}
                                disabled={generatingExpandedCutKey === getCutKey(cut, index)}
                                className="mt-4 rounded-xl border border-amber-300/20 bg-amber-500/10 px-3 py-2 text-xs font-black text-amber-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
                              >
                                {generatingExpandedCutKey === getCutKey(cut, index)
                                  ? 'Expandindo corte...'
                                  : 'Expandir para corte completo'}
                              </button>
                            ) : (
                              <div className="mt-4 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleGenerateShortScript(cut, index)}
                                  disabled={generatingShortScriptKey === getCutKey(cut, index)}
                                  className="rounded-xl border border-cyan-300/20 bg-cyan-500/10 px-3 py-2 text-xs font-black text-cyan-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
                                >
                                  {generatingShortScriptKey === getCutKey(cut, index)
                                    ? 'Gerando roteiro...'
                                    : 'Gerar roteiro do Short'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleGenerateSyncedCaptions(cut, index)}
                                  disabled={generatingSyncedCaptionKey === getCutKey(cut, index)}
                                  className="rounded-xl border border-fuchsia-300/20 bg-fuchsia-500/10 px-3 py-2 text-xs font-black text-fuchsia-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
                                >
                                  {generatingSyncedCaptionKey === getCutKey(cut, index)
                                    ? 'Sincronizando...'
                                    : 'Gerar legendas sincronizadas'}
                                </button>
                              </div>
                            )}
                            {expandedCutErrorByKey[getCutKey(cut, index)] && (
                              <p className="mt-3 rounded-xl border border-rose-300/20 bg-rose-500/10 p-3 text-xs font-bold leading-5 text-rose-100">
                                {expandedCutErrorByKey[getCutKey(cut, index)]}
                              </p>
                            )}
                            {syncedCaptionErrorByKey[getCutKey(cut, index)] && (
                              <p className="mt-3 rounded-xl border border-rose-300/20 bg-rose-500/10 p-3 text-xs font-bold leading-5 text-rose-100">
                                {syncedCaptionErrorByKey[getCutKey(cut, index)]}
                              </p>
                            )}
                            {contentAssets.expanded_cut && expandedCutSourceKey === getCutKey(cut, index) && (
                              <div className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-500/10 p-3">
                                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100">
                                  Corte expandido
                                </p>
                                <p className="mt-2 text-xs font-bold text-emerald-50">
                                  Expandido a partir de: {formatSegmentTime(cut.start)} - {formatSegmentTime(cut.end)}
                                </p>
                                <p className="mt-1 text-xs font-bold text-emerald-50">
                                  Novo corte: {formatSegmentTime(contentAssets.expanded_cut.start)} - {formatSegmentTime(contentAssets.expanded_cut.end)} | {formatDuration(getCutDuration(contentAssets.expanded_cut))}
                                </p>
                                <p className="mt-3 text-sm font-black text-white">{contentAssets.expanded_cut.title}</p>
                                <p className="mt-2 text-xs font-bold leading-5 text-emerald-50">{contentAssets.expanded_cut.hook}</p>
                                {contentAssets.expanded_cut.source_excerpt && (
                                  <p className="mt-3 border-l-2 border-emerald-300/30 pl-3 text-xs leading-5 text-emerald-50/80">
                                    {contentAssets.expanded_cut.source_excerpt}
                                  </p>
                                )}
                                <p className="mt-3 text-xs leading-5 text-emerald-100/80">
                                  {contentAssets.expanded_cut.reason}
                                </p>
                                {contentAssets.expanded_cut.expansion_reason && (
                                  <p className="mt-2 text-xs leading-5 text-emerald-100/70">
                                    {contentAssets.expanded_cut.expansion_reason}
                                  </p>
                                )}
                                {contentAssets.expanded_cut.needs_manual_trim && (
                                  <p className="mt-3 rounded-xl border border-amber-300/20 bg-amber-500/10 p-3 text-xs font-bold leading-5 text-amber-50">
                                    {contentAssets.expanded_cut.trim_warning || 'Este corte pode precisar de ajuste manual no final.'}
                                  </p>
                                )}
                                {contentAssets.expanded_cut.suggested_caption_lines && contentAssets.expanded_cut.suggested_caption_lines.length > 0 && (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {contentAssets.expanded_cut.suggested_caption_lines.map((line, lineIndex) => (
                                      <span key={`${line}-${lineIndex}`} className="rounded-full border border-emerald-300/20 bg-slate-950/40 px-2 py-1 text-[11px] font-bold text-emerald-100">
                                        {line}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <div className="mt-4 flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleGenerateShortScript(contentAssets.expanded_cut as CutSuggestion, -1)}
                                    disabled={generatingShortScriptKey === getCutKey(contentAssets.expanded_cut, -1)}
                                    className="rounded-xl border border-emerald-300/20 bg-slate-950/50 px-3 py-2 text-xs font-black text-emerald-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
                                  >
                                    {generatingShortScriptKey === getCutKey(contentAssets.expanded_cut, -1)
                                      ? 'Gerando roteiro...'
                                      : 'Gerar roteiro do Short'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleGenerateSyncedCaptions(contentAssets.expanded_cut as CutSuggestion, -1)}
                                    disabled={generatingSyncedCaptionKey === getCutKey(contentAssets.expanded_cut, -1)}
                                    className="rounded-xl border border-fuchsia-300/20 bg-fuchsia-500/10 px-3 py-2 text-xs font-black text-fuchsia-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
                                  >
                                    {generatingSyncedCaptionKey === getCutKey(contentAssets.expanded_cut, -1)
                                      ? 'Sincronizando...'
                                      : 'Gerar legendas sincronizadas'}
                                  </button>
                                </div>
                                {syncedCaptionErrorByKey[getCutKey(contentAssets.expanded_cut, -1)] && (
                                  <p className="mt-3 rounded-xl border border-rose-300/20 bg-rose-500/10 p-3 text-xs font-bold leading-5 text-rose-100">
                                    {syncedCaptionErrorByKey[getCutKey(contentAssets.expanded_cut, -1)]}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm font-bold leading-6 text-slate-500">
                        Nenhum corte com timestamp foi sugerido.
                      </p>
                    )}
                  </article>
                  )}
                </div>
              </section>
            )}

            {activeStudioTab === 'transcription' && (
            <section className="rounded-[34px] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-black/20 lg:col-start-2">
              <p className="text-[11px] font-black uppercase tracking-[0.20em] text-blue-300">
                Transcricao com timestamps
              </p>

              {segments.length > 0 ? (
                <div className="mt-4 grid max-h-[360px] gap-2 overflow-y-auto">
                  {segments.map((segment, index) => (
                    <div
                      key={`${segment.start}-${segment.end}-${index}`}
                      className="rounded-2xl border border-white/10 bg-slate-950/70 p-3"
                    >
                      <p className="text-xs font-black text-blue-200">
                        {formatSegmentTime(segment.start)} - {formatSegmentTime(segment.end)}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">
                        {segment.text}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 rounded-2xl border border-dashed border-white/10 bg-slate-950/70 p-4 text-sm font-bold text-slate-500">
                  Sem segmentos sincronizados. Esta area mostra dados tecnicos da transcricao quando houver timestamps.
                </p>
              )}
            </section>
            )}
          </aside>
          )}
        </div>
      </section>
    </main>
  )
}
