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
  timing_mode?: 'word_timestamps' | 'approximate_from_words' | 'redistributed_from_original_caption'
}

type SyncedCaptionVersion = {
  lines: SyncedCaptionLine[]
  srt: string
  plain_text: string
  json: SyncedCaptionLine[]
}

type ReviewedCaptions = {
  mode: 'ai_review' | 'ai_review_flex'
  algorithm_version: 'cc-l2-ai-review' | 'cc-l2.1-ai-review-flex'
  base_algorithm_version?: string
  lines: SyncedCaptionLine[]
  plain_text: string
  srt: string
  json: SyncedCaptionLine[]
  review_notes: string[]
  confidence: 'high' | 'medium' | 'low'
  model: string
  timing_mode?: 'redistributed_from_original_caption'
  validation?: {
    coverage_ratio: number
    missing_important_tokens: string[]
    missing_protected_phrases: string[]
    original_line_count: number
    reviewed_line_count: number
  }
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
  opening_line?: string
  source_excerpt?: string
  base_excerpt?: string
  suggested_caption_lines?: string[]
  strength_score?: number
  strength_reason?: string
  retention_score?: number
  biblical_specificity?: number
  visual_potential?: number
  emotional_tension?: number
  share_potential?: number
  fidelity_to_audio?: number
  duration_type?: string
  duration_label?: string
  recommended_use?: string
  risk?: string
  production_priority?: number
  production_label?: string
  production_role?: 'main_short' | 'quick_teaser' | 'extended_short' | 'micro_devotional' | 'sensitive_topic' | 'backup_cut'
  editorial_alert_level?: 'low' | 'medium' | 'high'
  editorial_alert?: string
  format_recommendation?: string
  should_publish_first?: boolean
  needs_context_warning?: boolean
  safe_first_score?: number
  safe_first_reason?: string[]
  safe_title_suggestion?: string
  priority_adjusted_by_backend?: boolean
  risk_adjusted_by_backend?: boolean
  biblical_perfume_context?: boolean
  sensitive_offering_context?: boolean
  suggested_smaller_cut?: {
    start: number
    end: number
    title: string
    hook: string
    reason: string
  } | null
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
  best_ai_cuts?: {
    mode: 'best_cuts_ai'
    model: string
    generated_at: string
    cuts: CutSuggestion[]
    editorial_summary: string
    warnings: string[]
  }
}

type ContentStudioWorkspace = {
  contentAssets: ContentAssets | null
  manualCuts: CutSuggestion[]
  reviewedCaptionsByKey: Record<string, ReviewedCaptions>
  shortScriptSourceKey: string
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
  | 'best_cuts_ai'

type StudioTab = 'studio' | 'episode' | 'transcription' | 'phrases' | 'publishing' | 'workshop'

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
const ACCEPTED_CAPTION_ALGORITHM_VERSIONS = [CURRENT_CAPTION_SYNC_VERSION, 'cc-l2-ai-review', 'cc-l2.1-ai-review-flex']
const SHOW_CONTENT_FACTORY_WORKSHOP = true

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

function formatClockTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00'

  const totalSeconds = Math.floor(seconds)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
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

function getCutDurationProfile(durationSeconds: number) {
  if (durationSeconds <= 14) {
    return {
      type: 'hook' as const,
      label: 'Gancho curto',
      description: 'Trecho curto, bom para abrir atencao ou servir como gancho.',
      retentionAdvice: 'Pode funcionar bem como abertura, mas talvez precise ser expandido para entregar valor.',
      severity: 'warning' as const,
      recommendedUse: 'Gancho / teaser',
      targetRange: '15s-25s',
    }
  }

  if (durationSeconds <= 25) {
    return {
      type: 'hook' as const,
      label: 'Gancho forte',
      description: 'Trecho curto e direto, bom para chamar atencao.',
      retentionAdvice: 'Ideal para cortes rapidos, desde que tenha uma ideia completa.',
      severity: 'good' as const,
      recommendedUse: 'Short rapido / teaser',
      targetRange: '15s-25s',
    }
  }

  if (durationSeconds <= 45) {
    return {
      type: 'ideal_short' as const,
      label: 'Short ideal',
      description: 'Duracao ideal para Shorts/Reels/TikTok com boa chance de retencao.',
      retentionAdvice: 'Boa faixa para testar alcance e retencao.',
      severity: 'good' as const,
      recommendedUse: 'Short/Reels/TikTok principal',
      targetRange: '25s-45s',
    }
  }

  if (durationSeconds <= 60) {
    return {
      type: 'extended_short' as const,
      label: 'Short estendido',
      description: 'Ainda pode funcionar como Short, mas precisa de hook forte e ritmo bom.',
      retentionAdvice: 'Atencao a retencao. O inicio precisa ser muito forte.',
      severity: 'warning' as const,
      recommendedUse: 'Short explicativo / corte estendido',
      targetRange: '45s-60s',
    }
  }

  if (durationSeconds <= 90) {
    return {
      type: 'micro_devotional' as const,
      label: 'Microdevocional',
      description: 'Corte mais longo, melhor tratado como microdevocional do que como Short de retencao rapida.',
      retentionAdvice: 'Pode funcionar, mas a retencao tende a cair se nao houver tensao clara nos primeiros segundos.',
      severity: 'caution' as const,
      recommendedUse: 'Microdevocional / video curto explicativo',
      targetRange: '60s-90s',
    }
  }

  return {
    type: 'long_cut' as const,
    label: 'Corte longo',
    description: 'Trecho longo para Shorts. Melhor considerar como video especial ou dividir em cortes menores.',
    retentionAdvice: 'Considere dividir em 2 ou 3 cortes menores para melhorar retencao.',
    severity: 'caution' as const,
    recommendedUse: 'Video curto especial / dividir em partes',
    targetRange: '90s+',
  }
}

function getCutProductionDefaults(durationProfile: ReturnType<typeof getCutDurationProfile>) {
  if (durationProfile.type === 'hook' || durationProfile.type === 'ideal_short') {
    return {
      recommendedCaptionMode: 'short' as const,
      recommendedVisualBlocks: 4,
      recommendedHookPriority: 'very_high' as const,
      recommendedPublishingLabel: 'Short/Reels/TikTok',
    }
  }

  if (durationProfile.type === 'extended_short') {
    return {
      recommendedCaptionMode: 'short' as const,
      recommendedVisualBlocks: 6,
      recommendedHookPriority: 'very_high' as const,
      recommendedPublishingLabel: 'Short explicativo',
    }
  }

  if (durationProfile.type === 'micro_devotional') {
    return {
      recommendedCaptionMode: 'micro_devotional' as const,
      recommendedVisualBlocks: 7,
      recommendedHookPriority: 'high' as const,
      recommendedPublishingLabel: 'Microdevocional',
    }
  }

  return {
    recommendedCaptionMode: 'micro_devotional' as const,
    recommendedVisualBlocks: 8,
    recommendedHookPriority: 'high' as const,
    recommendedPublishingLabel: 'Dividir em partes',
  }
}

function CutDurationBadge({ duration }: { duration: number }) {
  const profile = getCutDurationProfile(duration)
  const classNameBySeverity = {
    good: 'border-emerald-300/20 bg-emerald-500/10 text-emerald-100',
    warning: 'border-amber-300/25 bg-amber-500/10 text-amber-100',
    caution: 'border-rose-300/25 bg-rose-500/10 text-rose-100',
  }

  return (
    <span className={`rounded-full border px-2 py-1 text-[11px] font-black ${classNameBySeverity[profile.severity]}`}>
      {profile.label}
    </span>
  )
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
  best_cuts_ai: 'Analisando melhores cortes com IA forte...',
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
      shortScriptSourceKey: parsed.shortScriptSourceKey || '',
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
  const [shortScriptSourceKey, setShortScriptSourceKey] = useState('')
  const [generatingReadyShortKey, setGeneratingReadyShortKey] = useState('')
  const [readyShortStep, setReadyShortStep] = useState('')
  const [readyShortError, setReadyShortError] = useState('')
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
  const [workshopCopyMessage, setWorkshopCopyMessage] = useState('')

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
      Boolean(shortScriptSourceKey) ||
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
      shortScriptSourceKey,
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
    shortScriptSourceKey,
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
        setShortScriptSourceKey(storedWorkspace.shortScriptSourceKey)
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
        setShortScriptSourceKey('')
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
      setReadyShortError('')
      setReadyShortStep('')
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
    setShortScriptSourceKey('')
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
    setReadyShortError('')
    setReadyShortStep('')
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

  function handleUseSuggestedSmallerCut(cut: NonNullable<CutSuggestion['suggested_smaller_cut']>) {
    const derivedCut: CutSuggestion = {
      start: cut.start,
      end: cut.end,
      duration: Math.round(cut.end - cut.start),
      title: cut.title || 'Recorte menor sugerido',
      hook: cut.hook || 'Recorte menor sugerido pela IA forte.',
      source_excerpt: '',
      reason: cut.reason || 'Recorte menor sugerido dentro de um corte longo.',
      strength_score: 9,
      strength_reason: 'Recorte menor sugerido pela IA forte.',
      editorial_score: 9,
      editorial_note: 'Recorte sugerido pela IA forte para melhorar retencao.',
      suggested_caption_lines: [],
      cut_type: 'full_cut',
      needs_expansion: false,
      manual: true,
    }
    const derivedKey = getCutKey(derivedCut, 0)

    setManualCuts((current) => [
      derivedCut,
      ...current.filter((existing) => getCutKey(existing, 0) !== derivedKey),
    ])
    setContentAssets((current) => current || EMPTY_CONTENT_ASSETS)
    setSelectedCutKey(derivedKey)
    setManualCutWarning('Recorte menor adicionado aos cortes manuais e selecionado para producao.')
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
      setShortScriptSourceKey(loadingKey)
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

  async function requestShortScriptForCut(cut: CutSuggestion, cutKey: string) {
    if (!episode?.transcription_text?.trim()) {
      throw new Error('Este episodio precisa de transcricao para gerar roteiro de Short.')
    }

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

    const assets = payload.assets as Partial<ContentAssets>
    setContentAssets((current) => ({ ...(current || EMPTY_CONTENT_ASSETS), ...assets }))
    setShortScriptSourceKey(cutKey)
    return assets
  }

  async function requestSyncedCaptionsForCut(cut: CutSuggestion, cutKey: string) {
    if (!episode) {
      throw new Error('Episodio nao carregado.')
    }

    const hasReadyWords =
      episode.transcription_words_status === 'ready' &&
      Boolean(episode.transcription_words_url || episode.transcription_words_key)

    if (!hasReadyWords) {
      throw new Error('Gere timestamps avancados antes de sincronizar legendas.')
    }

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

    const assets = payload.assets as Partial<ContentAssets>
    setContentAssets((current) => ({ ...(current || EMPTY_CONTENT_ASSETS), ...assets }))
    setSyncedCaptionSourceKey(cutKey)
    setReviewedCaptionsByKey((current) => {
      const next = { ...current }
      delete next[cutKey]
      return next
    })
    return assets.synced_captions
  }

  async function requestCaptionReviewForCut(
    cut: CutSuggestion,
    cutKey: string,
    syncedCaptions: SyncedCaptions
  ) {
    if (!episode) {
      throw new Error('Episodio nao carregado.')
    }

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
          title: cut.title,
          start: cut.start,
          end: cut.end,
          hook: cut.hook,
          source_excerpt: cut.source_excerpt,
        },
        synced_captions: syncedCaptions,
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
      [cutKey]: reviewedCaptions,
    }))
    return reviewedCaptions
  }

  async function handleGenerateReadyShort(cut: CutSuggestion, index: number) {
    const cutKey = getCutKey(cut, index)
    let workingAssets = contentAssets || EMPTY_CONTENT_ASSETS

    try {
      setSelectedCutKey(cutKey)
      setGeneratingReadyShortKey(cutKey)
      setReadyShortError('')
      setCaptionReviewError('')
      setContentAssetsError('')

      if (!workingAssets.short_script || shortScriptSourceKey !== cutKey) {
        setReadyShortStep('Gerando roteiro...')
        setGeneratingShortScriptKey(cutKey)
        const scriptAssets = await requestShortScriptForCut(cut, cutKey)
        workingAssets = { ...workingAssets, ...scriptAssets }
        setGeneratingShortScriptKey('')
      }

      let syncedCaptions = workingAssets.synced_captions

      if (!syncedCaptions || syncedCaptionSourceKey !== cutKey) {
        setReadyShortStep('Gerando legenda...')
        setGeneratingSyncedCaptionKey(cutKey)
        syncedCaptions = await requestSyncedCaptionsForCut(cut, cutKey)
        workingAssets = { ...workingAssets, synced_captions: syncedCaptions }
        setGeneratingSyncedCaptionKey('')
      }

      if (!syncedCaptions) {
        throw new Error('Nao foi possivel preparar a legenda automatica para revisao.')
      }

      if (!reviewedCaptionsByKey[cutKey]) {
        setReadyShortStep('Revisando legenda com IA...')
        setGeneratingCaptionReviewKey(cutKey)
        await requestCaptionReviewForCut(cut, cutKey, syncedCaptions)
        setGeneratingCaptionReviewKey('')
      }

      setReadyShortStep('Finalizando pacote...')
    } catch (error) {
      console.error('Erro ao gerar Short pronto:', error)
      const message =
        error instanceof Error
          ? error.message
          : 'Nao foi possivel gerar o Short pronto.'

      setReadyShortError(message)
    } finally {
      setGeneratingReadyShortKey('')
      setGeneratingShortScriptKey('')
      setGeneratingSyncedCaptionKey('')
      setGeneratingCaptionReviewKey('')
      setReadyShortStep('')
    }
  }

  async function handleReviewCutAgain(cut: CutSuggestion, index: number) {
    const cutKey = getCutKey(cut, index)

    if (!contentAssets?.synced_captions || syncedCaptionSourceKey !== cutKey) {
      setCaptionReviewError('Gere a legenda automatica deste corte antes de revisar com IA.')
      setSelectedCutKey(cutKey)
      return
    }

    try {
      setSelectedCutKey(cutKey)
      setGeneratingCaptionReviewKey(cutKey)
      setCaptionReviewError('')
      await requestCaptionReviewForCut(cut, cutKey, contentAssets.synced_captions)
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

  const currentEpisode = episode
  const segments = currentEpisode.transcription_segments || []
  const suggestions = currentEpisode.daily_quote_suggestions || []
  const hasTranscription = Boolean(currentEpisode.transcription_text?.trim())
  const fullCutSuggestions = contentAssets?.cut_suggestions.filter((cut) => !isHookCut(cut)) || []
  const hookSuggestions = contentAssets?.cut_suggestions.filter((cut) => isHookCut(cut)) || []
  const orderedCutSuggestions = [...fullCutSuggestions, ...hookSuggestions]
  const bestAiCutSuggestions = contentAssets?.best_ai_cuts?.cuts || []
  const manualCutSuggestions = manualCuts
  const selectedCut =
    (selectedCutKey
      ? manualCutSuggestions.find((cut) => getCutKey(cut, 0) === selectedCutKey) ||
        bestAiCutSuggestions.find((cut, index) => getCutKey(cut, index) === selectedCutKey) ||
        orderedCutSuggestions.find((cut, index) => getCutKey(cut, index) === selectedCutKey)
      : null) ||
    (contentAssets?.expanded_cut && getCutKey(contentAssets.expanded_cut, -1) === selectedCutKey
      ? contentAssets.expanded_cut
      : null)
  const selectedCutLabel = selectedCut
    ? `${formatSegmentTime(selectedCut.start)} - ${formatSegmentTime(selectedCut.end)}`
    : ''
  const selectedCutActionIndex = selectedCutKey.startsWith('manual:')
    ? 0
    : bestAiCutSuggestions.findIndex((cut, index) => getCutKey(cut, index) === selectedCutKey) >= 0
      ? bestAiCutSuggestions.findIndex((cut, index) => getCutKey(cut, index) === selectedCutKey)
      : orderedCutSuggestions.findIndex((cut, index) => getCutKey(cut, index) === selectedCutKey)
  const selectedCutDuration = selectedCut ? getCutDuration(selectedCut) : 0
  const selectedCutDurationProfile = getCutDurationProfile(selectedCutDuration)
  const selectedCutProductionDefaults = getCutProductionDefaults(selectedCutDurationProfile)
  const reviewedCaptionsForSelectedCut = selectedCutKey ? reviewedCaptionsByKey[selectedCutKey] : null
  const syncedCaptionsMatchSelectedCut = Boolean(selectedCutKey && syncedCaptionSourceKey === selectedCutKey)
  const selectedCutPackageStatus = {
    hasScript: Boolean(selectedCutKey && contentAssets?.short_script && shortScriptSourceKey === selectedCutKey),
    hasSyncedCaptions: Boolean(selectedCutKey && contentAssets?.synced_captions && syncedCaptionSourceKey === selectedCutKey),
    hasReviewedCaptions: Boolean(selectedCutKey && reviewedCaptionsByKey[selectedCutKey]),
    hasVisualPlan: false,
    hasPublishingPackage: false,
  }
  const selectedFinalCaptions = reviewedCaptionsForSelectedCut || (
    selectedCutPackageStatus.hasSyncedCaptions ? contentAssets?.synced_captions : null
  )
  const selectedFinalCaptionsAreReviewed = Boolean(reviewedCaptionsForSelectedCut)
  const getCutPackageStatus = (cutKey: string) => ({
    hasScript: Boolean(contentAssets?.short_script && shortScriptSourceKey === cutKey),
    hasSyncedCaptions: Boolean(contentAssets?.synced_captions && syncedCaptionSourceKey === cutKey),
    hasReviewedCaptions: Boolean(reviewedCaptionsByKey[cutKey]),
    hasVisualPlan: false,
    hasPublishingPackage: false,
  })

  function buildFinalShortPackage(cutKey: string) {
    const cut = selectedCutKey === cutKey ? selectedCut : null

    if (!cut) return null

    const duration = getCutDuration(cut)
    const durationProfile = getCutDurationProfile(duration)
    const script = contentAssets?.short_script && shortScriptSourceKey === cutKey
      ? contentAssets.short_script
      : null
    const reviewedCaptions = reviewedCaptionsByKey[cutKey] || null
    const automaticCaptions = contentAssets?.synced_captions && syncedCaptionSourceKey === cutKey
      ? contentAssets.synced_captions
      : null
    const finalCaptions = reviewedCaptions || automaticCaptions
    const isReviewedCaption = Boolean(reviewedCaptions)
    const title = cut.title || script?.title || 'Short sem titulo'
    const hook = script?.hook_improved || script?.main_hook || cut.hook || cut.opening_line || 'Hook pendente.'
    const openingLine = cut.opening_line || script?.suggested_opening_line || hook
    const cta = script?.cta || 'Ouca o devocional completo no app.'
    const captionsText = finalCaptions
      ? finalCaptions.srt || finalCaptions.plain_text
      : 'Legenda pendente.'
    const copyText = [
      'SHORT PRONTO',
      '',
      `Titulo: ${title}`,
      `Tempo: ${formatSegmentTime(cut.start)} - ${formatSegmentTime(cut.end)}`,
      `Tipo: ${durationProfile.label}`,
      `Prioridade: ${cut.production_label || 'Nao definida'}`,
      `Gancho: ${hook}`,
      `Abertura: ${openingLine}`,
      `CTA: ${cta}`,
      '',
      'ROTEIRO',
      `Hook: ${hook}`,
      script?.cliffhanger ? `Cliffhanger: ${script.cliffhanger}` : 'Cliffhanger: pendente',
      script?.spiritual_point ? `Ponto espiritual: ${script.spiritual_point}` : 'Ponto espiritual: pendente',
      `CTA: ${cta}`,
      '',
      'LEGENDAS',
      isReviewedCaption ? 'Fonte: revisao IA' : finalCaptions ? 'Fonte: legenda automatica - revise antes de publicar.' : 'Fonte: pendente',
      captionsText,
      '',
      'VISUAL',
      'Status: pendente',
      'Observacao: plano visual sera gerado em etapa futura.',
      '',
      'PUBLICACAO',
      'Status: pendente',
    ].join('\n')

    return {
      cutKey,
      title,
      timeRange: `${formatSegmentTime(cut.start)} - ${formatSegmentTime(cut.end)}`,
      duration,
      durationLabel: durationProfile.label,
      productionLabel: cut.production_label || 'Nao definida',
      productionRole: cut.production_role || '',
      editorialAlert: cut.editorial_alert || '',
      hook,
      openingLine,
      script,
      finalCaptions,
      finalCaptionsAreReviewed: isReviewedCaption,
      cta,
      visualStatus: 'pendente',
      publishingStatus: 'pendente',
      visualPlan: null,
      publishingPackage: null,
      hasVisualPlan: false,
      hasPublishingPackage: false,
      copyText,
      isReady: Boolean(script && finalCaptions),
    }
  }

  const finalShortPackage = selectedCutKey ? buildFinalShortPackage(selectedCutKey) : null
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
    ...(SHOW_CONTENT_FACTORY_WORKSHOP
      ? [{ key: 'workshop' as const, label: 'Oficina', description: 'Ferramentas tecnicas e diagnosticos para ajustar a fabrica.' }]
      : []),
  ]

  function formatSegmentedTranscriptForCopy() {
    const header = [
      `Titulo: ${currentEpisode.title}`,
      `Referencia: ${currentEpisode.bible_reference || 'Nao informada'}`,
      `Duracao: ${currentEpisode.duration_seconds ? formatDuration(currentEpisode.duration_seconds) : 'Nao informada'}`,
      '',
      'TRANSCRICAO COM TEMPOS',
      '',
    ]

    if (!segments.length) {
      return [
        ...header,
        'Sem segmentos temporizados disponiveis. Abaixo esta a transcricao completa sem tempos.',
        '',
        currentEpisode.transcription_text || 'Sem transcricao disponivel.',
      ].join('\n')
    }

    return [
      ...header,
      ...segments.flatMap((segment) => [
        `[${formatClockTime(segment.start)} - ${formatClockTime(segment.end)}]`,
        segment.text,
        '',
      ]),
    ].join('\n').trim()
  }

  function formatCutListForCopy(title: string, cuts: CutSuggestion[]) {
    if (!cuts.length) return `${title}\n\nNenhum.`

    return [
      title,
      '',
      ...cuts.flatMap((cut, index) => {
        const profile = getCutDurationProfile(getCutDuration(cut))

        return [
          `${index + 1}. [${formatClockTime(cut.start)} - ${formatClockTime(cut.end)}] ${cut.title}`,
          typeof cut.production_priority === 'number' ? `   Prioridade: #${cut.production_priority}` : '',
          cut.production_label ? `   Producao: ${cut.production_label}` : '',
          cut.production_role ? `   Papel: ${cut.production_role}` : '',
          `   Primeiro post: ${cut.should_publish_first ? 'sim' : 'nao'}`,
          `   Tipo: ${profile.label}`,
          `   Uso recomendado: ${cut.recommended_use || profile.recommendedUse}`,
          cut.format_recommendation ? `   Formato recomendado: ${cut.format_recommendation}` : '',
          cut.editorial_alert_level ? `   Alerta: ${cut.editorial_alert_level}` : '',
          cut.editorial_alert ? `   Atencao editorial: ${cut.editorial_alert}` : '',
          typeof cut.needs_context_warning === 'boolean' ? `   Alerta de contexto: ${cut.needs_context_warning ? 'sim' : 'nao'}` : '',
          typeof cut.biblical_perfume_context === 'boolean'
            ? `   Contexto biblico seguro do perfume: ${cut.biblical_perfume_context ? 'sim' : 'nao'}`
            : '',
          typeof cut.sensitive_offering_context === 'boolean'
            ? `   Contexto sensivel de oferta: ${cut.sensitive_offering_context ? 'sim' : 'nao'}`
            : '',
          typeof cut.risk_adjusted_by_backend === 'boolean'
            ? `   Risco ajustado pelo backend: ${cut.risk_adjusted_by_backend ? 'sim' : 'nao'}`
            : '',
          typeof cut.safe_first_score === 'number' ? `   Score primeiro post: ${cut.safe_first_score}` : '',
          cut.safe_first_reason?.length ? `   Razoes do score: ${cut.safe_first_reason.join('; ')}` : '',
          cut.safe_title_suggestion ? `   Titulo seguro sugerido: ${cut.safe_title_suggestion}` : '',
          typeof cut.priority_adjusted_by_backend === 'boolean'
            ? `   Prioridade ajustada pelo backend: ${cut.priority_adjusted_by_backend ? 'sim' : 'nao'}`
            : '',
          `   Gancho: ${cut.hook}`,
          cut.opening_line ? `   Abertura sugerida: ${cut.opening_line}` : '',
          `   Motivo: ${cut.reason}`,
          `   Nota de retencao: ${cut.retention_score || cut.strength_score || 'Nao informada'}`,
          cut.risk ? `   Risco: ${cut.risk}` : '',
          cut.suggested_smaller_cut
            ? [
                `   Recorte menor sugerido: [${formatClockTime(cut.suggested_smaller_cut.start)} - ${formatClockTime(cut.suggested_smaller_cut.end)}] ${cut.suggested_smaller_cut.title}`,
                `   Gancho do recorte: ${cut.suggested_smaller_cut.hook}`,
                `   Motivo do recorte: ${cut.suggested_smaller_cut.reason}`,
              ].join('\n')
            : '',
          cut.source_excerpt ? `   Trecho-base: ${cut.source_excerpt}` : '',
          '',
        ].filter(Boolean)
      }),
    ].join('\n').trim()
  }

  function formatCutsForCopy() {
    return [
      'CORTES SUGERIDOS',
      '',
      formatCutListForCopy('MELHORES CORTES COM IA FORTE', bestAiCutSuggestions),
      '',
      formatCutListForCopy('CORTES TRADICIONAIS', fullCutSuggestions),
      '',
      formatCutListForCopy('GANCHOS PARA EXPANDIR', hookSuggestions),
      '',
      formatCutListForCopy('CORTES MANUAIS', manualCutSuggestions),
    ].join('\n\n')
  }

  function formatCutAnalysisPackageForCopy() {
    const strongPhrasesText = contentAssets?.strong_phrases.length
      ? contentAssets.strong_phrases.map((phrase, index) => `${index + 1}. ${getStrongPhraseText(phrase)}`).join('\n')
      : 'Nenhuma frase forte gerada nesta tela.'

    return [
      'PACOTE PARA ANALISE DE CORTES',
      '',
      'EPISODIO',
      `Titulo: ${currentEpisode.title}`,
      `Referencia: ${currentEpisode.bible_reference || 'Nao informada'}`,
      `Descricao: ${currentEpisode.description || 'Nao informada'}`,
      `Duracao: ${currentEpisode.duration_seconds ? formatDuration(currentEpisode.duration_seconds) : 'Nao informada'}`,
      '',
      'STATUS',
      `Transcricao: ${hasTranscription ? 'sim' : 'nao'}`,
      `Segments: ${segments.length}`,
      `Words: ${currentEpisode.transcription_words_count || 0}`,
      `Frases fortes: ${contentAssets?.strong_phrases.length || suggestions.length || 0}`,
      `Melhores cortes IA: ${bestAiCutSuggestions.length}`,
      `Cortes tradicionais: ${contentAssets?.cut_suggestions.length || 0}`,
      '',
      formatSegmentedTranscriptForCopy(),
      '',
      formatCutListForCopy('CORTES SUGERIDOS PELA IA FORTE', bestAiCutSuggestions),
      '',
      formatCutListForCopy('CORTES TRADICIONAIS', fullCutSuggestions),
      '',
      formatCutListForCopy('GANCHOS PARA EXPANDIR', hookSuggestions),
      '',
      'FRASES FORTES / PALAVRA DO DIA',
      strongPhrasesText,
      '',
      'PEDIDO DE ANALISE',
      'Analise a transcricao e compare com os cortes sugeridos. Diga:',
      '',
      '1. quais cortes sao realmente bons;',
      '2. quais estao longos demais;',
      '3. quais deveriam ser divididos;',
      '4. quais tem melhor potencial de retencao;',
      '5. quais seriam bons para Short, Microdevocional ou Teaser;',
      '6. quais tempos voce recomenda.',
    ].join('\n')
  }

  async function copyTextToClipboard(text: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(text)
      setWorkshopCopyMessage(successMessage)
      window.setTimeout(() => setWorkshopCopyMessage(''), 2500)
    } catch (error) {
      console.error('Erro ao copiar conteudo da oficina:', error)
      setWorkshopCopyMessage('Nao foi possivel copiar o conteudo.')
    }
  }

  const manualCutFormCard = (
    <article className="order-2 rounded-2xl border border-amber-300/15 bg-amber-500/10 p-4">
      <details>
        <summary className="cursor-pointer text-sm font-black text-amber-50">
          Ferramentas avancadas
        </summary>

        <h3 className="mt-4 text-xs font-black uppercase tracking-[0.14em] text-amber-100">
          Adicionar corte manual
        </h3>
        <p className="mt-3 text-xs font-bold leading-5 text-amber-100/75">
          Use quando quiser trabalhar um trecho exato que a IA nao sugeriu.
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

          {SHOW_CONTENT_FACTORY_WORKSHOP && activeStudioTab === 'workshop' && (
          <div className="grid gap-5 lg:col-span-2">
            <section className="rounded-[34px] border border-amber-300/15 bg-slate-900/80 p-5 shadow-2xl shadow-black/20">
              <p className="text-[11px] font-black uppercase tracking-[0.20em] text-amber-200">
                Oficina
              </p>
              <h2 className="mt-3 text-xl font-black text-white">Oficina tecnica</h2>
              <p className="mt-2 max-w-3xl text-sm font-bold leading-6 text-slate-300">
                Use estes botoes para copiar dados do episodio e analisar cortes manualmente. Esta area pode ser ocultada no futuro.
              </p>

              {workshopCopyMessage && (
                <p className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-500/10 p-3 text-xs font-black text-emerald-100">
                  {workshopCopyMessage}
                </p>
              )}

              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                <article className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                  <h3 className="text-sm font-black text-white">Transcricao para analise</h3>
                  <p className="mt-2 text-xs font-bold leading-5 text-slate-400">
                    Copia segmentos com inicio e fim para revisar cortes fora da Central.
                  </p>
                  <button
                    type="button"
                    onClick={() => copyTextToClipboard(
                      formatSegmentedTranscriptForCopy(),
                      'Transcricao com tempos copiada.'
                    )}
                    className="mt-4 w-full rounded-xl border border-amber-300/20 bg-amber-500/10 px-3 py-3 text-xs font-black text-amber-100 active:scale-[0.98]"
                  >
                    Copiar transcricao com tempos
                  </button>
                </article>

                <article className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                  <h3 className="text-sm font-black text-white">Cortes e sugestoes</h3>
                  <p className="mt-2 text-xs font-bold leading-5 text-slate-400">
                    Inclui melhores cortes IA, cortes tradicionais, ganchos e manuais quando existirem.
                  </p>
                  <button
                    type="button"
                    onClick={() => copyTextToClipboard(
                      formatCutsForCopy(),
                      'Cortes sugeridos copiados.'
                    )}
                    className="mt-4 w-full rounded-xl border border-blue-300/20 bg-blue-500/10 px-3 py-3 text-xs font-black text-blue-100 active:scale-[0.98]"
                  >
                    Copiar cortes sugeridos
                  </button>
                </article>

                <article className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                  <h3 className="text-sm font-black text-white">Pacote completo para analise</h3>
                  <p className="mt-2 text-xs font-bold leading-5 text-slate-400">
                    Gera um pacote pronto para colar no ChatGPT e comparar a IA com curadoria humana.
                  </p>
                  <button
                    type="button"
                    onClick={() => copyTextToClipboard(
                      formatCutAnalysisPackageForCopy(),
                      'Pacote para analise de cortes copiado.'
                    )}
                    className="mt-4 w-full rounded-xl border border-emerald-300/20 bg-emerald-500/10 px-3 py-3 text-xs font-black text-emerald-100 active:scale-[0.98]"
                  >
                    Copiar pacote para analise de cortes
                  </button>
                </article>
              </div>
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
                  ['best_cuts_ai', 'Gerar melhores cortes com IA forte'],
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
              <p className="mt-3 rounded-xl border border-blue-300/15 bg-blue-500/10 p-3 text-xs font-bold leading-5 text-blue-50/80">
                Esta analise usa IA forte e deve ser usada apenas quando voce quiser escolher cortes finais para producao.
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
                    <CutDurationBadge duration={getCutDuration(selectedCut)} />
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
                            <CutDurationBadge duration={selectedCutDuration} />
                            <span className="text-xs font-black text-blue-200">
                              {selectedCutLabel} | {formatDuration(selectedCutDuration)}
                            </span>
                          </div>
                          <p className="mt-3 text-sm font-black text-white">{selectedCut.title}</p>
                          <p className="mt-2 text-xs font-bold leading-5 text-slate-300">{selectedCut.hook}</p>
                        </div>

                        <div className={`rounded-xl border p-3 ${
                          selectedCutDurationProfile.severity === 'good'
                            ? 'border-emerald-300/15 bg-emerald-500/10'
                            : selectedCutDurationProfile.severity === 'warning'
                              ? 'border-amber-300/20 bg-amber-500/10'
                              : 'border-rose-300/20 bg-rose-500/10'
                        }`}>
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-200">
                            Classificacao do corte
                          </p>
                          <p className="mt-2 text-sm font-black text-white">
                            {selectedCutDurationProfile.label} · {formatDuration(selectedCutDuration)}
                          </p>
                          <p className="mt-1 text-xs font-bold leading-5 text-slate-200">
                            {selectedCutDurationProfile.recommendedUse} · alvo {selectedCutDurationProfile.targetRange}
                          </p>
                          <p className="mt-2 text-xs font-bold leading-5 text-slate-300">
                            {selectedCutDurationProfile.retentionAdvice}
                          </p>
                          <p className="mt-2 text-xs font-bold leading-5 text-slate-400">
                            {selectedCutProductionDefaults.recommendedPublishingLabel} · {selectedCutProductionDefaults.recommendedVisualBlocks} blocos visuais sugeridos.
                          </p>
                        </div>

                        <div className="grid gap-3 md:grid-cols-3">
                          <div className="rounded-xl border border-cyan-300/15 bg-cyan-500/10 p-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100">
                              Roteiro
                            </p>
                            <p className="mt-2 text-xs font-bold leading-5 text-emerald-50/80">
                              {selectedCutPackageStatus.hasScript ? 'pronto' : 'pendente'}
                            </p>
                          </div>

                          <div className="rounded-xl border border-fuchsia-300/15 bg-fuchsia-500/10 p-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100">
                              Legenda revisada
                            </p>
                            <p className="mt-2 text-xs font-bold leading-5 text-cyan-50/80">
                              {selectedCutPackageStatus.hasReviewedCaptions
                                ? 'pronta'
                                : selectedCutPackageStatus.hasSyncedCaptions
                                  ? 'automatica pronta'
                                  : 'pendente'}
                            </p>
                          </div>

                          <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-fuchsia-100">
                              Visual / Publicacao
                            </p>
                            <p className="mt-2 text-xs font-bold leading-5 text-fuchsia-50/80">
                              pendente
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleGenerateReadyShort(
                              selectedCut,
                              selectedCutActionIndex
                            )}
                            disabled={generatingReadyShortKey === selectedCutKey}
                            className="rounded-xl bg-blue-600 px-4 py-3 text-xs font-black text-white shadow-lg shadow-blue-950/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
                          >
                            {generatingReadyShortKey === selectedCutKey ? 'Gerando Short pronto...' : 'Gerar Short pronto'}
                          </button>
                          <span className="text-xs font-bold text-blue-100/65">
                            {selectedCutDuration > 90
                              ? 'Corte longo: considere dividir antes de publicar como Short.'
                              : selectedCutDuration > 60
                                ? 'Corte longo: sera tratado como microdevocional.'
                                : 'O grosso e gerado por algoritmo; a IA forte entra so no acabamento.'}
                          </span>
                        </div>

                        {readyShortStep && generatingReadyShortKey === selectedCutKey && (
                          <p className="rounded-xl border border-blue-300/20 bg-blue-500/10 p-3 text-xs font-black text-blue-100">
                            {readyShortStep}
                          </p>
                        )}

                        {readyShortError && (
                          <p className="rounded-xl border border-rose-300/20 bg-rose-500/10 p-3 text-xs font-bold leading-5 text-rose-100">
                            {readyShortError}
                          </p>
                        )}

                        {finalShortPackage && (
                          <div className="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <h3 className="text-sm font-black text-emerald-50">Short pronto final</h3>
                                <p className="mt-1 text-xs font-bold text-emerald-100/70">
                                  Pacote consolidado para producao deste corte.
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <CopyButton value={finalShortPackage.copyText} label="Copiar Short pronto" />
                                <CopyButton
                                  value={formatCutPackageForCopy(selectedCut, contentAssets)}
                                  label="Copiar pacote do corte"
                                />
                              </div>
                            </div>

                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                              <div className="rounded-xl border border-white/10 bg-slate-950/45 p-3">
                                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/70">Titulo final</p>
                                <p className="mt-1 text-sm font-black text-white">{finalShortPackage.title}</p>
                                <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/70">Tempo / tipo</p>
                                <p className="mt-1 text-xs font-bold leading-5 text-emerald-50">
                                  {finalShortPackage.timeRange} | {formatDuration(finalShortPackage.duration)} | {finalShortPackage.durationLabel}
                                </p>
                                <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/70">Prioridade</p>
                                <p className="mt-1 text-xs font-bold leading-5 text-emerald-50">
                                  {finalShortPackage.productionLabel}
                                </p>
                                {finalShortPackage.editorialAlert && (
                                  <p className="mt-3 rounded-lg border border-amber-300/20 bg-amber-500/10 p-2 text-xs font-bold leading-5 text-amber-50">
                                    {finalShortPackage.editorialAlert}
                                  </p>
                                )}
                              </div>

                              <div className="rounded-xl border border-white/10 bg-slate-950/45 p-3">
                                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/70">Hook final</p>
                                <p className="mt-1 text-sm font-bold leading-6 text-white">{finalShortPackage.hook}</p>
                                <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/70">Abertura sugerida</p>
                                <p className="mt-1 text-xs font-bold leading-5 text-emerald-50">{finalShortPackage.openingLine}</p>
                                <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/70">CTA</p>
                                <p className="mt-1 text-xs font-bold leading-5 text-emerald-50">{finalShortPackage.cta}</p>
                              </div>
                            </div>

                            <div className="mt-3 grid gap-2 md:grid-cols-4">
                              <InfoPill label={`Roteiro: ${finalShortPackage.script ? 'pronto' : 'pendente'}`} tone={finalShortPackage.script ? 'green' : 'slate'} />
                              <InfoPill
                                label={`Legenda: ${
                                  finalShortPackage.finalCaptionsAreReviewed
                                    ? 'revisada'
                                    : finalShortPackage.finalCaptions
                                      ? 'automatica'
                                      : 'pendente'
                                }`}
                                tone={finalShortPackage.finalCaptionsAreReviewed ? 'green' : finalShortPackage.finalCaptions ? 'amber' : 'slate'}
                              />
                              <InfoPill label="Visual: pendente" tone="slate" />
                              <InfoPill label="Publicacao: pendente" tone="slate" />
                            </div>

                            {finalShortPackage.script ? (
                              <div className="mt-4 rounded-xl border border-cyan-200/10 bg-slate-950/50 p-3">
                                <h4 className="text-xs font-black text-cyan-50">Roteiro final compacto</h4>
                                <p className="mt-2 text-xs font-bold leading-5 text-cyan-50">Hook: {finalShortPackage.hook}</p>
                                {finalShortPackage.script.cliffhanger && (
                                  <p className="mt-2 text-xs font-bold leading-5 text-cyan-50">Cliffhanger: {finalShortPackage.script.cliffhanger}</p>
                                )}
                                {finalShortPackage.script.spiritual_point && (
                                  <p className="mt-2 text-xs leading-5 text-cyan-50/85">Ponto espiritual: {finalShortPackage.script.spiritual_point}</p>
                                )}
                                <p className="mt-2 text-xs leading-5 text-cyan-50/85">CTA: {finalShortPackage.cta}</p>
                                {finalShortPackage.script.timeline.length > 0 && (
                                  <div className="mt-3 grid gap-2">
                                    {finalShortPackage.script.timeline.map((item, index) => (
                                      <p key={`${item.start}-${item.end}-${index}`} className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-xs leading-5 text-slate-300">
                                        {item.start}s-{item.end}s | {item.purpose}: {item.narration_focus}
                                      </p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="mt-4 rounded-xl border border-cyan-300/15 bg-cyan-500/10 p-3 text-xs font-bold text-cyan-50">
                                Roteiro pendente. Clique em Gerar Short pronto para montar o pacote final.
                              </p>
                            )}

                            {finalShortPackage.finalCaptions ? (
                              <div className={`mt-4 rounded-xl border p-3 ${
                                finalShortPackage.finalCaptionsAreReviewed
                                  ? 'border-emerald-300/20 bg-emerald-500/10'
                                  : 'border-amber-300/20 bg-amber-500/10'
                              }`}>
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <h4 className="text-xs font-black text-white">
                                      {finalShortPackage.finalCaptionsAreReviewed ? 'Legenda final revisada' : 'Legenda automatica'}
                                    </h4>
                                    {finalShortPackage.finalCaptionsAreReviewed && reviewedCaptionsForSelectedCut?.validation && (
                                      <p className="mt-1 text-xs font-bold text-emerald-100/70">
                                        {reviewedCaptionsForSelectedCut.model} | confianca {reviewedCaptionsForSelectedCut.confidence} | cobertura {Math.round(reviewedCaptionsForSelectedCut.validation.coverage_ratio * 100)}%
                                      </p>
                                    )}
                                    {!finalShortPackage.finalCaptionsAreReviewed && (
                                      <p className="mt-1 text-xs font-bold text-amber-100/80">
                                        Legenda automatica - revise antes de publicar.
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <CopyButton value={finalShortPackage.finalCaptions.srt} label="Copiar SRT final" />
                                    <CopyButton value={finalShortPackage.finalCaptions.plain_text} label="Copiar texto final" />
                                    <CopyButton value={JSON.stringify(finalShortPackage.finalCaptions.json, null, 2)} label="Copiar JSON final" />
                                  </div>
                                </div>
                                <div className="mt-3 grid gap-2">
                                  {finalShortPackage.finalCaptions.lines.map((line, index) => (
                                    <div key={`${line.start}-${line.end}-${index}`} className="rounded-lg border border-white/10 bg-slate-950/45 p-3">
                                      <p className="text-[11px] font-black text-slate-300">
                                        {line.start.toFixed(2)}s - {line.end.toFixed(2)}s
                                      </p>
                                      <p className="mt-1 text-sm font-bold leading-6 text-white">{line.text}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <p className="mt-4 rounded-xl border border-fuchsia-300/15 bg-fuchsia-500/10 p-3 text-xs font-bold text-fuchsia-50">
                                Legenda final pendente. O pacote final usara a revisao IA assim que ela existir.
                              </p>
                            )}

                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                              <div className="rounded-xl border border-white/10 bg-slate-950/45 p-3">
                                <h4 className="text-xs font-black text-white">Visual</h4>
                                <p className="mt-2 text-xs font-bold leading-5 text-slate-400">
                                  Plano visual sera gerado em etapa futura.
                                </p>
                              </div>
                              <div className="rounded-xl border border-white/10 bg-slate-950/45 p-3">
                                <h4 className="text-xs font-black text-white">Publicacao</h4>
                                <p className="mt-2 text-xs font-bold leading-5 text-slate-400">
                                  Pacote de publicacao sera gerado em etapa futura.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
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
                  <details className="rounded-2xl border border-cyan-300/15 bg-cyan-500/10 p-4">
                    <summary className="cursor-pointer text-sm font-black text-cyan-50">
                      Roteiro completo / avancado
                    </summary>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
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
                  </details>
                  )}

                  {contentAssets.synced_captions && (
                  <details className="rounded-2xl border border-fuchsia-300/15 bg-fuchsia-500/10 p-4">
                    <summary className="cursor-pointer text-sm font-black text-fuchsia-50">
                      Avancado / diagnostico
                    </summary>
                    <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
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
                            <p className="mt-1 text-xs font-bold text-emerald-100/60">
                              Modo: {reviewedCaptionsForSelectedCut.mode === 'ai_review_flex' ? 'revisao flexivel' : 'revisao por IA'} | tempos: {reviewedCaptionsForSelectedCut.timing_mode || 'originais'}
                            </p>
                            {reviewedCaptionsForSelectedCut.validation && (
                              <p className="mt-1 text-xs font-bold text-emerald-100/60">
                                Linhas: {reviewedCaptionsForSelectedCut.validation.original_line_count} originais - {reviewedCaptionsForSelectedCut.validation.reviewed_line_count} revisadas | cobertura: {Math.round(reviewedCaptionsForSelectedCut.validation.coverage_ratio * 100)}%
                              </p>
                            )}
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

                        {reviewedCaptionsForSelectedCut.validation?.missing_protected_phrases.length ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {reviewedCaptionsForSelectedCut.validation.missing_protected_phrases.map((phrase) => (
                              <span key={phrase} className="rounded-full border border-rose-300/20 bg-rose-500/10 px-3 py-1 text-[11px] font-black text-rose-100">
                                revisar: {phrase}
                              </span>
                            ))}
                          </div>
                        ) : null}

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
                  </details>
                  )}

                  {contentAssets.expanded_cut && (
                  <article className="rounded-2xl border border-emerald-300/15 bg-emerald-500/10 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-black text-emerald-50">Corte expandido</h2>
                        <p className="mt-1 text-xs font-bold text-emerald-100/70">
                          {formatSegmentTime(contentAssets.expanded_cut.start)} - {formatSegmentTime(contentAssets.expanded_cut.end)} | {formatDuration(getCutDuration(contentAssets.expanded_cut))}
                        </p>
                        <div className="mt-2">
                          <CutDurationBadge duration={getCutDuration(contentAssets.expanded_cut)} />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleGenerateReadyShort(contentAssets.expanded_cut as CutSuggestion, -1)}
                          disabled={generatingReadyShortKey === getCutKey(contentAssets.expanded_cut, -1)}
                          className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white shadow-lg shadow-blue-950/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
                        >
                          {generatingReadyShortKey === getCutKey(contentAssets.expanded_cut, -1)
                            ? 'Gerando Short pronto...'
                            : 'Gerar Short pronto'}
                        </button>
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

                  {contentAssets.best_ai_cuts && bestAiCutSuggestions.length > 0 && (
                  <article className="order-2 rounded-2xl border border-emerald-300/15 bg-emerald-500/10 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-black text-emerald-50">Melhores cortes com IA forte</h2>
                        <p className="mt-1 text-xs font-bold leading-5 text-emerald-100/70">
                          Recomendacao: comece pelo corte #1. Use os alertas para decidir teaser, microdevocional ou cuidado editorial.
                        </p>
                        <p className="mt-1 text-xs font-bold text-emerald-100/55">
                          Modelo: {contentAssets.best_ai_cuts.model}
                        </p>
                      </div>
                      <InfoPill label="IA forte" tone="green" />
                    </div>

                    <details className="mt-3 rounded-xl border border-emerald-300/15 bg-slate-950/35 p-3">
                      <summary className="cursor-pointer text-xs font-black text-emerald-100">
                        Resumo editorial
                      </summary>
                      <p className="mt-2 text-xs font-bold leading-5 text-emerald-50/80">
                        {contentAssets.best_ai_cuts.editorial_summary}
                      </p>
                    </details>

                    {contentAssets.best_ai_cuts.warnings.length > 0 && (
                      <div className="mt-3 rounded-xl border border-amber-300/20 bg-amber-500/10 p-3">
                        <p className="text-xs font-black text-amber-50">Avisos editoriais</p>
                        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs font-bold leading-5 text-amber-50/80">
                          {contentAssets.best_ai_cuts.warnings.map((warning) => (
                            <li key={warning}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="mt-4 grid gap-3">
                      {bestAiCutSuggestions.map((cut, index) => {
                        const cutKey = getCutKey(cut, index)

                        return (
                          <div key={`best-${cutKey}`} className={`rounded-xl border p-3 ${
                            cutKey === selectedCutKey
                              ? 'border-blue-300/35 bg-blue-500/10'
                              : 'border-emerald-300/20 bg-slate-950/35'
                          }`}>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-blue-300/20 bg-blue-500/10 px-2 py-1 text-[11px] font-black text-blue-100">
                                #{cut.production_priority || index + 1}
                              </span>
                              <InfoPill label="IA forte" tone="green" />
                              {cut.priority_adjusted_by_backend && <InfoPill label="Prioridade ajustada" tone="amber" />}
                              {cut.risk_adjusted_by_backend && <InfoPill label="Risco ajustado" tone="green" />}
                              <span className={`rounded-full border px-2 py-1 text-[11px] font-black ${
                                cut.editorial_alert_level === 'high'
                                  ? 'border-rose-300/25 bg-rose-500/10 text-rose-100'
                                  : cut.editorial_alert_level === 'medium'
                                    ? 'border-amber-300/25 bg-amber-500/10 text-amber-100'
                                    : 'border-emerald-300/20 bg-emerald-500/10 text-emerald-100'
                              }`}>
                                {cut.production_label || 'Postar depois'}
                              </span>
                              {cutKey === selectedCutKey && <InfoPill label="Em trabalho" tone="blue" />}
                              <span className="text-xs font-black text-blue-200">
                                {formatSegmentTime(cut.start)} - {formatSegmentTime(cut.end)}
                              </span>
                              <span className="rounded-full border border-white/10 bg-slate-950 px-2 py-1 text-[11px] font-black text-slate-300">
                                {formatDuration(getCutDuration(cut))}
                              </span>
                              <CutDurationBadge duration={getCutDuration(cut)} />
                            </div>

                            {cut.should_publish_first && (
                              <p className="mt-3 rounded-xl border border-blue-300/20 bg-blue-500/10 p-3 text-xs font-black text-blue-100">
                                Recomendado para primeiro post.
                              </p>
                            )}

                            <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/70">Titulo</p>
                            <p className="mt-1 text-sm font-black text-white">{cut.title}</p>
                            {cut.safe_title_suggestion && (
                              <p className="mt-2 rounded-lg border border-amber-300/15 bg-amber-500/10 p-2 text-xs font-bold leading-5 text-amber-50">
                                Titulo mais seguro sugerido: {cut.safe_title_suggestion}
                              </p>
                            )}
                            <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/70">Gancho</p>
                            <p className="mt-1 text-xs font-bold leading-5 text-emerald-50">{cut.hook}</p>

                            {cut.opening_line && (
                              <>
                                <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/70">Abertura sugerida</p>
                                <p className="mt-1 rounded-lg border border-emerald-300/15 bg-emerald-500/10 p-2 text-xs font-bold leading-5 text-emerald-50">
                                  {cut.opening_line}
                                </p>
                              </>
                            )}

                            {(cut.source_excerpt || cut.base_excerpt) && (
                              <>
                                <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/70">Trecho-base</p>
                                <p className="mt-1 border-l-2 border-emerald-300/30 pl-3 text-xs leading-5 text-slate-300">
                                  {cut.source_excerpt || cut.base_excerpt}
                                </p>
                              </>
                            )}

                            <div className="mt-3 grid gap-2 md:grid-cols-4">
                              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2">
                                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Retencao</p>
                                <p className="mt-1 text-sm font-black text-emerald-50">{cut.retention_score || cut.strength_score || 8}/10</p>
                              </div>
                              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2">
                                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Biblico</p>
                                <p className="mt-1 text-sm font-black text-emerald-50">{cut.biblical_specificity || 8}/10</p>
                              </div>
                              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2">
                                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Visual</p>
                                <p className="mt-1 text-sm font-black text-emerald-50">{cut.visual_potential || 8}/10</p>
                              </div>
                              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2">
                                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Uso</p>
                                <p className="mt-1 text-xs font-black text-emerald-50">{cut.recommended_use || getCutDurationProfile(getCutDuration(cut)).recommendedUse}</p>
                              </div>
                            </div>

                            {typeof cut.safe_first_score === 'number' && (
                              <p className="mt-2 text-[11px] font-bold text-slate-500">
                                Score primeiro post: {cut.safe_first_score}
                                {cut.safe_first_reason?.length ? ` - ${cut.safe_first_reason.join(', ')}` : ''}
                              </p>
                            )}

                            <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/70">Motivo</p>
                            <p className="mt-1 text-xs leading-5 text-slate-300">{cut.reason}</p>
                            {cut.risk && (
                              <p className="mt-3 rounded-xl border border-amber-300/15 bg-amber-500/10 p-3 text-xs font-bold leading-5 text-amber-50/80">
                                Risco editorial: {cut.risk}
                              </p>
                            )}

                            {(cut.editorial_alert_level === 'medium' || cut.editorial_alert_level === 'high' || cut.needs_context_warning) && (
                              <p className={`mt-3 rounded-xl border p-3 text-xs font-bold leading-5 ${
                                cut.editorial_alert_level === 'high'
                                  ? 'border-rose-300/20 bg-rose-500/10 text-rose-100'
                                  : 'border-amber-300/20 bg-amber-500/10 text-amber-50'
                              }`}>
                                Atencao editorial: {cut.editorial_alert || 'Confira o contexto antes de publicar.'}
                              </p>
                            )}

                            {cut.suggested_smaller_cut && (
                              <div className="mt-3 rounded-xl border border-cyan-300/15 bg-cyan-500/10 p-3">
                                <p className="text-xs font-black text-cyan-50">Recorte menor sugerido</p>
                                <p className="mt-2 text-xs font-black text-cyan-100">
                                  {formatSegmentTime(cut.suggested_smaller_cut.start)} - {formatSegmentTime(cut.suggested_smaller_cut.end)}
                                </p>
                                <p className="mt-2 text-sm font-black text-white">{cut.suggested_smaller_cut.title}</p>
                                <p className="mt-2 text-xs font-bold leading-5 text-cyan-50">{cut.suggested_smaller_cut.hook}</p>
                                <p className="mt-2 text-xs leading-5 text-cyan-100/75">{cut.suggested_smaller_cut.reason}</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleUseSuggestedSmallerCut(cut.suggested_smaller_cut as NonNullable<CutSuggestion['suggested_smaller_cut']>)}
                                    className="rounded-xl border border-cyan-300/20 bg-slate-950/40 px-3 py-2 text-xs font-black text-cyan-100 active:scale-[0.98]"
                                  >
                                    Usar recorte menor
                                  </button>
                                  <CopyButton
                                    value={[
                                      `Recorte menor sugerido: ${cut.suggested_smaller_cut.title}`,
                                      `Tempo: ${formatSegmentTime(cut.suggested_smaller_cut.start)} - ${formatSegmentTime(cut.suggested_smaller_cut.end)}`,
                                      `Gancho: ${cut.suggested_smaller_cut.hook}`,
                                      `Motivo: ${cut.suggested_smaller_cut.reason}`,
                                    ].join('\n')}
                                    label="Copiar recorte menor"
                                  />
                                </div>
                              </div>
                            )}

                            {cut.suggested_caption_lines && cut.suggested_caption_lines.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {cut.suggested_caption_lines.map((line, lineIndex) => (
                                  <span key={`${line}-${lineIndex}`} className="rounded-full border border-blue-300/20 bg-blue-500/10 px-2 py-1 text-[11px] font-bold text-blue-100">
                                    {line}
                                  </span>
                                ))}
                              </div>
                            )}

                            <div className="mt-4 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => handleGenerateReadyShort(cut, index)}
                                disabled={generatingReadyShortKey === cutKey}
                                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white shadow-lg shadow-blue-950/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
                              >
                                {generatingReadyShortKey === cutKey ? 'Gerando Short pronto...' : 'Gerar Short pronto'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleGenerateShortScript(cut, index)}
                                disabled={generatingShortScriptKey === cutKey}
                                className="rounded-xl border border-cyan-300/20 bg-slate-950/40 px-3 py-2 text-xs font-black text-cyan-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
                              >
                                {generatingShortScriptKey === cutKey ? 'Gerando roteiro...' : 'Gerar roteiro'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleGenerateSyncedCaptions(cut, index)}
                                disabled={generatingSyncedCaptionKey === cutKey}
                                className="rounded-xl border border-fuchsia-300/20 bg-slate-950/40 px-3 py-2 text-xs font-black text-fuchsia-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
                              >
                                {generatingSyncedCaptionKey === cutKey ? 'Sincronizando...' : 'Gerar legenda'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReviewCutAgain(cut, index)}
                                disabled={generatingCaptionReviewKey === cutKey || syncedCaptionSourceKey !== cutKey}
                                className="rounded-xl border border-emerald-300/20 bg-slate-950/40 px-3 py-2 text-xs font-black text-emerald-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
                              >
                                {generatingCaptionReviewKey === cutKey ? 'Revisando...' : 'Revisar legenda'}
                              </button>
                              <CopyButton value={formatCutPackageForCopy(cut, contentAssets)} label="Copiar pacote" />
                            </div>
                          </div>
                        )
                      })}
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
                                <CutDurationBadge duration={getCutDuration(cut)} />
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
                                  onClick={() => handleGenerateReadyShort(cut, 0)}
                                  disabled={generatingReadyShortKey === manualKey}
                                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white shadow-lg shadow-blue-950/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
                                >
                                  {generatingReadyShortKey === manualKey
                                    ? 'Gerando Short pronto...'
                                    : 'Gerar Short pronto'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleGenerateShortScript(cut, 0)}
                                  disabled={generatingShortScriptKey === manualKey}
                                  className="rounded-xl border border-cyan-300/20 bg-slate-950/40 px-3 py-2 text-xs font-black text-cyan-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
                                >
                                  {generatingShortScriptKey === manualKey
                                    ? 'Gerando roteiro...'
                                    : 'Gerar roteiro'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleGenerateSyncedCaptions(cut, 0)}
                                  disabled={generatingSyncedCaptionKey === manualKey}
                                  className="rounded-xl border border-fuchsia-300/20 bg-slate-950/40 px-3 py-2 text-xs font-black text-fuchsia-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
                                >
                                  {generatingSyncedCaptionKey === manualKey
                                    ? 'Sincronizando...'
                                    : 'Gerar legenda'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleReviewCutAgain(cut, 0)}
                                  disabled={generatingCaptionReviewKey === manualKey || syncedCaptionSourceKey !== manualKey}
                                  className="rounded-xl border border-emerald-300/20 bg-slate-950/40 px-3 py-2 text-xs font-black text-emerald-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
                                >
                                  {generatingCaptionReviewKey === manualKey
                                    ? 'Revisando...'
                                    : 'Revisar legenda'}
                                </button>
                                <CopyButton value={formatCutPackageForCopy(cut, contentAssets)} label="Copiar pacote" />
                              </div>
                              <p className="mt-2 text-xs font-bold text-blue-100/55">
                                {getCutDuration(cut) > 90
                                  ? 'Corte longo: considere dividir antes de publicar como Short.'
                                  : getCutDuration(cut) > 60
                                    ? 'Corte longo: sera tratado como microdevocional.'
                                    : 'Usa IA forte apenas na revisao final da legenda.'}
                              </p>
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
                              <CutDurationBadge duration={getCutDuration(cut)} />
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
                                  onClick={() => handleGenerateReadyShort(cut, index)}
                                  disabled={generatingReadyShortKey === getCutKey(cut, index)}
                                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white shadow-lg shadow-blue-950/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
                                >
                                  {generatingReadyShortKey === getCutKey(cut, index)
                                    ? 'Gerando Short pronto...'
                                    : 'Gerar Short pronto'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleGenerateShortScript(cut, index)}
                                  disabled={generatingShortScriptKey === getCutKey(cut, index)}
                                  className="rounded-xl border border-cyan-300/20 bg-slate-950/40 px-3 py-2 text-xs font-black text-cyan-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
                                >
                                  {generatingShortScriptKey === getCutKey(cut, index)
                                    ? 'Gerando roteiro...'
                                    : 'Gerar roteiro'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleGenerateSyncedCaptions(cut, index)}
                                  disabled={generatingSyncedCaptionKey === getCutKey(cut, index)}
                                  className="rounded-xl border border-fuchsia-300/20 bg-slate-950/40 px-3 py-2 text-xs font-black text-fuchsia-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
                                >
                                  {generatingSyncedCaptionKey === getCutKey(cut, index)
                                    ? 'Sincronizando...'
                                    : 'Gerar legenda'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleReviewCutAgain(cut, index)}
                                  disabled={generatingCaptionReviewKey === getCutKey(cut, index) || syncedCaptionSourceKey !== getCutKey(cut, index)}
                                  className="rounded-xl border border-emerald-300/20 bg-slate-950/40 px-3 py-2 text-xs font-black text-emerald-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
                                >
                                  {generatingCaptionReviewKey === getCutKey(cut, index)
                                    ? 'Revisando...'
                                    : 'Revisar legenda'}
                                </button>
                                <CopyButton value={formatCutPackageForCopy(cut, contentAssets)} label="Copiar pacote" />
                              </div>
                            )}
                            {!isHookCut(cut) && (
                              <p className="mt-2 text-xs font-bold text-blue-100/55">
                                {getCutDuration(cut) > 90
                                  ? 'Corte longo: considere dividir antes de publicar como Short.'
                                  : getCutDuration(cut) > 60
                                    ? 'Corte longo: sera tratado como microdevocional.'
                                    : 'Usa IA forte apenas na revisao final da legenda.'}
                              </p>
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
                        <div className="mt-2">
                          <CutDurationBadge duration={getCutDuration(contentAssets.expanded_cut)} />
                        </div>
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
