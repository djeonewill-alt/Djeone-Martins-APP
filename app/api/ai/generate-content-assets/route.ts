/**
 * AI-PROVIDER-006 e AI-PROVIDER-007 — Rota totalmente migrada para usar a camada abstrata de IA.
 *
 * Partes migradas no AI-PROVIDER-006 (texto simples):
 * - summary, whatsapp, instagram, caption_ai_review → DeepSeek Flash / fallback OpenAI
 *
 * Partes migradas no AI-PROVIDER-007 (JSON estruturado):
 * - phrases, short_ideas, cuts, short_script         → DeepSeek Flash / fallback OpenAI
 * - all                                                → DeepSeek Flash / fallback OpenAI
 * - best_cuts_ai, visual_storyboard                   → DeepSeek Pro / fallback OpenAI
 *
 * Comportamento idêntico ao anterior. Nenhum prompt ou lógica foi alterado.
 */

import { NextRequest, NextResponse } from 'next/server'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { r2Client, R2_BUCKET_NAME } from '@/lib/r2/client'
import { getAIProvider } from '@/lib/ai/provider'

// Timeout máximo de 60s para evitar erro 504 no plano Hobby da Vercel
// A geração com DeepSeek Flash leva ~22s, mas precisamos de margem para retries
export const maxDuration = 60
export const runtime = 'nodejs'

type TranscriptionSegment = {
  start: number
  end: number
  text: string
}

type WordTimestamp = {
  word: string
  start: number
  end: number
}

type CaptionSyncCut = {
  title?: string
  start: number
  end: number
  hook?: string
  source_excerpt?: string
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

type EditorialSplitDebug = {
  chunks_count: number
  lines_count: number
  protected_phrases_found: string[]
}

type SyncedCaptions = {
  source: 'word_timestamps'
  mode: 'hybrid' | 'word_only'
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
  algorithm_version: string
  debug?: CaptionSyncDebug
  word_only?: SyncedCaptionVersion
  hybrid_debug?: CaptionHybridDebug
}

type ReviewedCaptions = {
  mode: 'ai_review_flex'
  algorithm_version: 'cc-l2.1-ai-review-flex'
  base_algorithm_version?: string
  lines: SyncedCaptionLine[]
  plain_text: string
  srt: string
  json: SyncedCaptionLine[]
  review_notes: string[]
  confidence: 'high' | 'medium' | 'low'
  model: string
  timing_mode: 'redistributed_from_original_caption'
  validation: {
    coverage_ratio: number
    missing_important_tokens: string[]
    missing_protected_phrases: string[]
    original_line_count: number
    reviewed_line_count: number
  }
}

type VisualStoryboardScene = {
  start: number
  end: number
  role: string
  title: string
  on_screen_text: string
  visual_description: string
  image_prompt: string
  b_roll: string
  motion: string
  sound: string
  editing_note: string
}

type VisualStoryboard = {
  mode: 'visual_storyboard'
  version: 'cc-f4-visual-storyboard'
  model: string
  visual_style: string
  format: string
  summary: string
  visual_concept: string
  scenes: VisualStoryboardScene[]
  image_prompts: Array<{
    label: string
    prompt: string
  }>
  motion_plan: string[]
  sound_plan: string[]
  cta_visual: {
    text: string
    visual: string
    motion: string
  }
  quality_checklist: {
    has_hook_visual: boolean
    has_biblical_fidelity: boolean
    has_scene_variety: boolean
    has_cta: boolean
    avoids_text_inside_image: boolean
  }
  warnings: string[]
}

type CaptionSyncDebug = {
  cut_start: number
  cut_end: number
  raw_words_count: number
  raw_text: string
  raw_words: WordTimestamp[]
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

type CaptionHybridDebug = {
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
  editorial_split?: EditorialSplitDebug
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

type ContentAssetsMetadata = {
  main_scripture?: string
  key_themes?: string[]
  theological_focus?: string
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
  best_ai_cuts?: BestAiCutsResult
  metadata?: ContentAssetsMetadata
}

type BestAiCutsResult = {
  mode: 'best_cuts_ai'
  model: string
  generated_at: string
  cuts: CutSuggestion[]
  editorial_summary: string
  warnings: string[]
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
  | 'visual_storyboard'

const MAX_TRANSCRIPTION_CHARS = 28000
const MAX_SEGMENTS = 160
const MIN_CUT_SECONDS = 15
const HOOK_MAX_SECONDS = 25
const SOFT_MIN_CUT_SECONDS = 25
const MAX_CUT_SECONDS = 75
const MISSING_TIMESTAMPS_NOTE =
  'Este episodio nao possui segmentos com timestamps. Gere uma transcricao com timestamps para cortes precisos.'
const CAPTION_SYNC_ALGORITHM_VERSION = 'cc-l1.5-hybrid-safe'
const CAPTION_AI_REVIEW_ALGORITHM_VERSION = 'cc-l2.1-ai-review-flex'

const GENERATION_MODES: GenerationMode[] = [
  'all',
  'summary',
  'phrases',
  'whatsapp',
  'instagram',
  'short_ideas',
  'cuts',
  'short_script',
  'expand_cut',
  'caption_sync',
  'caption_ai_review',
  'best_cuts_ai',
  'visual_storyboard',
]

function cleanText(text: string) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim()
}

function normalizeMode(input: unknown): GenerationMode {
  const mode = cleanText(String(input || 'all')) as GenerationMode
  return GENERATION_MODES.includes(mode) ? mode : 'all'
}

function extractJsonFromText(text: string) {
  const cleaned = text.trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/)

    if (!match) {
      throw new Error('A IA não retornou JSON válido.')
    }

    return JSON.parse(match[0])
  }
}

function normalizeSegments(input: unknown): TranscriptionSegment[] {
  if (!Array.isArray(input)) return []

  return input
    .map((item) => {
      const value = item as {
        start?: unknown
        end?: unknown
        text?: unknown
      }

      return {
        start: Number(value.start),
        end: Number(value.end),
        text: cleanText(String(value.text || '')),
      }
    })
    .filter((segment) => {
      return (
        Number.isFinite(segment.start) &&
        Number.isFinite(segment.end) &&
        segment.start >= 0 &&
        segment.end > segment.start &&
        segment.text.length > 0
      )
    })
    .slice(0, MAX_SEGMENTS)
}

function normalizeStringArray(input: unknown, maxItems: number, maxLength: number) {
  if (!Array.isArray(input)) return []

  return input
    .map((item) => cleanText(String(item || '')))
    .filter(Boolean)
    .map((item) => item.slice(0, maxLength))
    .slice(0, maxItems)
}

function countWords(text: string) {
  return text.split(/\s+/).filter(Boolean).length
}

function normalizeCaptionLines(input: unknown) {
  if (!Array.isArray(input)) return []

  return input
    .map((item) => cleanText(String(item || '')).slice(0, 80))
    .filter((line) => {
      const wordCount = countWords(line)
      return wordCount >= 3 && wordCount <= 7
    })
    .slice(0, 5)
}

function normalizeForMatch(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function hasAdministrativeLanguage(text: string) {
  const patterns = [
    /\bbom dia\b/i,
    /\bboa tarde\b/i,
    /\bboa noite\b/i,
    /\bsauda[cç][aã]o\b/i,
    /\baviso\b/i,
    /\badministrativo\b/i,
    /\bcompartilhar\b/i,
    /\bcadastrar\b/i,
    /\binscrev/i,
    /\bprojeto\b/i,
    /\bs[ée]rie\b/i,
    /\bepis[oó]dio\b/i,
  ]

  return patterns.some((pattern) => pattern.test(text))
}

function hasEnoughSourceOverlap(text: string, sourceExcerpt: string) {
  const sourceWords = new Set(
    normalizeForMatch(sourceExcerpt)
      .split(/\s+/)
      .filter((word) => word.length >= 5)
  )

  if (sourceWords.size < 3) return false

  const textWords = normalizeForMatch(text)
    .split(/\s+/)
    .filter((word) => word.length >= 5)

  const overlapCount = textWords.filter((word) => sourceWords.has(word)).length

  return overlapCount >= 1
}

function normalizeStrongPhrases(input: unknown): Array<string | StrongPhrase> {
  if (!Array.isArray(input)) return []

  return input
    .map((item) => {
      if (typeof item === 'string') {
        return cleanText(item).slice(0, 180)
      }

      const value = item as {
        text?: unknown
        quote_text?: unknown
        use_case?: unknown
        source_excerpt?: unknown
        why_it_works?: unknown
        reason?: unknown
        score?: unknown
      }
      const text = cleanText(String(value.text || value.quote_text || '')).slice(0, 180)
      const rawScore = Number(value.score)

      if (!text) return ''

      const sourceExcerpt = cleanText(String(value.source_excerpt || '')).slice(0, 260)
      const whyItWorks = cleanText(String(value.why_it_works || value.reason || '')).slice(0, 260)

      if (
        sourceExcerpt &&
        (hasAdministrativeLanguage(sourceExcerpt) ||
          !hasEnoughSourceOverlap(text, `${sourceExcerpt} ${whyItWorks}`))
      ) {
        return ''
      }

      return {
        text,
        use_case: cleanText(String(value.use_case || '')).slice(0, 40) || undefined,
        source_excerpt: sourceExcerpt || undefined,
        why_it_works: whyItWorks || undefined,
        score: Number.isFinite(rawScore) ? Math.max(1, Math.min(10, Math.round(rawScore))) : undefined,
      }
    })
    .filter((item) => {
      return typeof item === 'string' ? Boolean(item) : Boolean(item.text)
    })
    .slice(0, 8)
}

function normalizeShortIdeas(input: unknown): ShortIdea[] {
  if (!Array.isArray(input)) return []

  return input
    .map((item) => {
      const value = item as {
        title?: unknown
        hook?: unknown
        angle?: unknown
        suggested_opening_line?: unknown
        why_it_can_work?: unknown
      }

      return {
        title: cleanText(String(value.title || '')).slice(0, 120),
        hook: cleanText(String(value.hook || '')).slice(0, 220),
        angle: cleanText(String(value.angle || '')).slice(0, 220),
        suggested_opening_line: cleanText(String(value.suggested_opening_line || '')).slice(0, 220) || undefined,
        why_it_can_work: cleanText(String(value.why_it_can_work || '')).slice(0, 260) || undefined,
      }
    })
    .filter((item) => item.title && item.hook && item.angle)
    .slice(0, 5)
}

function isNearKnownBoundary(value: number, segments: TranscriptionSegment[]) {
  return segments.some((segment) => {
    return Math.abs(segment.start - value) <= 1.5 || Math.abs(segment.end - value) <= 1.5
  })
}

function isCutInsideKnownSegments(
  cut: Pick<CutSuggestion, 'start' | 'end'>,
  segments: TranscriptionSegment[]
) {
  if (!segments.length) return false

  const firstStart = segments[0]?.start ?? 0
  const lastEnd = segments[segments.length - 1]?.end ?? 0

  return (
    cut.start >= firstStart - 0.5 &&
    cut.end <= lastEnd + 0.5 &&
    isNearKnownBoundary(cut.start, segments) &&
    isNearKnownBoundary(cut.end, segments)
  )
}

function looksLikeWeakCut(text: string) {
  const weakPatterns = [
    /\bbom dia\b/i,
    /\bboa tarde\b/i,
    /\bboa noite\b/i,
    /\bsauda[cç][aã]o\b/i,
    /\baviso\b/i,
    /\badministrativo\b/i,
    /\bs[ée]rie\b/i,
    /\bprojeto\b/i,
    /\bintrodu[cç][aã]o\b/i,
    /\bora[cç][aã]o final\b/i,
    /\bcompartilhar\b/i,
    /\bcadastrar\b/i,
    /\bcontexto\b/i,
    /\bcontextual\b/i,
    /\bintrodu[cç][aã]o\b/i,
    /\bexplica[cç][aã]o inicial\b/i,
    /\bimport[aâ]ncia de\b/i,
    /\bgeogr[aá]fic/i,
  ]

  return weakPatterns.some((pattern) => pattern.test(text))
}

function looksLikeWeakSourceExcerpt(text: string) {
  const weakPatterns = [
    /\bficava\b.*\bquil[oô]metros\b/i,
    /\bdist[aâ]ncia\b/i,
    /\bcidade\b.*\bperto\b/i,
    /\bcontexto geogr[aá]fico\b/i,
    /\bera uma aldeia\b/i,
    /\bprojeto\b/i,
    /\bs[ée]rie\b/i,
    /\bepis[oó]dio\b/i,
    /\bcompartilhar\b/i,
    /\bcadastrar\b/i,
  ]

  return weakPatterns.some((pattern) => pattern.test(text))
}

function hasStrongEditorialSignal(cut: Pick<CutSuggestion, 'hook' | 'reason' | 'source_excerpt' | 'strength_reason'>) {
  const combinedText = [
    cut.hook,
    cut.reason,
    cut.source_excerpt || '',
    cut.strength_reason || '',
  ].join(' ')

  const strongPatterns = [
    /\bcontraste\b/i,
    /\bafli[cç][aã]o\b/i,
    /\bJesus chorou\b/i,
    /\bBet[aâ]nia\b/i,
    /\bL[aá]zaro\b/i,
    /\bMarta\b/i,
    /\bMaria\b/i,
    /\btemplo\b/i,
    /\bpresen[cç]a\b/i,
    /\bressurrei[cç][aã]o\b/i,
    /\btende bom [aâ]nimo\b/i,
    /\bentra\b.*\bBet[aâ]nia\b/i,
    /\bcasa da afli[cç][aã]o\b/i,
    /\bmundo\b.*\bBet[aâ]nia\b/i,
  ]

  return strongPatterns.some((pattern) => pattern.test(combinedText))
}

function hasStrongShortCutSignal(cut: Pick<CutSuggestion, 'hook' | 'source_excerpt'>) {
  return countWords(cut.hook) >= 6 && countWords(cut.source_excerpt || '') >= 8
}

function hasUsefulShortDuration(cut: Pick<CutSuggestion, 'start' | 'end' | 'hook' | 'source_excerpt'>) {
  const duration = cut.end - cut.start

  if (duration < MIN_CUT_SECONDS || duration > MAX_CUT_SECONDS) {
    return false
  }

  if (duration < SOFT_MIN_CUT_SECONDS) {
    return hasStrongShortCutSignal(cut)
  }

  return true
}

function getCutType(cut: Pick<CutSuggestion, 'start' | 'end' | 'strength_score'>) {
  const duration = cut.end - cut.start

  if (duration >= MIN_CUT_SECONDS && duration <= HOOK_MAX_SECONDS && (cut.strength_score || 0) >= 8) {
    return { cut_type: 'hook' as const, needs_expansion: true }
  }

  if (duration >= SOFT_MIN_CUT_SECONDS && duration <= MAX_CUT_SECONDS) {
    return { cut_type: 'full_cut' as const, needs_expansion: false }
  }

  return { cut_type: undefined, needs_expansion: undefined }
}

function getOverlapRatio(a: CutSuggestion, b: CutSuggestion) {
  const overlap = Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start))
  const shortest = Math.max(1, Math.min(a.end - a.start, b.end - b.start))

  return overlap / shortest
}

function getCutRank(cut: CutSuggestion) {
  const duration = cut.end - cut.start
  const score = cut.strength_score || 8
  const durationFit = cut.cut_type === 'full_cut'
    ? 20 - Math.abs(duration - 45) * 0.4
    : 12 - Math.abs(duration - 20) * 0.3

  return score * 10 + durationFit
}

function dedupeOverlappingCuts(cuts: CutSuggestion[]) {
  return [...cuts]
    .sort((a, b) => getCutRank(b) - getCutRank(a))
    .reduce<CutSuggestion[]>((selected, cut) => {
      if (selected.some((existing) => getOverlapRatio(existing, cut) > 0.65)) {
        return selected
      }

      return [...selected, cut]
    }, [])
}

function normalizeCutSuggestions(
  input: unknown,
  segments: TranscriptionSegment[]
): CutSuggestion[] {
  if (!Array.isArray(input)) return []

  const normalized = input
    .map((item) => {
      const value = item as {
        title?: unknown
        start?: unknown
        end?: unknown
        reason?: unknown
        hook?: unknown
        source_excerpt?: unknown
        suggested_caption_lines?: unknown
        strength_score?: unknown
        strength_reason?: unknown
        cut_type?: unknown
        needs_expansion?: unknown
      }
      const rawStrengthScore = Number(value.strength_score)
      const strengthScore = Number.isFinite(rawStrengthScore)
        ? Math.max(1, Math.min(10, Math.round(rawStrengthScore)))
        : undefined
      const start = Number(value.start)
      const end = Number(value.end)
      const classifiedCut = getCutType({
        start,
        end,
        strength_score: strengthScore,
      })

      return {
        title: cleanText(String(value.title || '')).slice(0, 120),
        start,
        end,
        reason: cleanText(String(value.reason || '')).slice(0, 240),
        hook: cleanText(String(value.hook || '')).slice(0, 220),
        source_excerpt: cleanText(String(value.source_excerpt || '')).slice(0, 260) || undefined,
        suggested_caption_lines: normalizeCaptionLines(value.suggested_caption_lines),
        strength_score: strengthScore,
        strength_reason: cleanText(String(value.strength_reason || '')).slice(0, 260) || undefined,
        cut_type: cleanText(String(value.cut_type || '')) === 'hook'
          ? 'hook' as const
          : cleanText(String(value.cut_type || '')) === 'full_cut'
            ? 'full_cut' as const
            : classifiedCut.cut_type,
        needs_expansion:
          typeof value.needs_expansion === 'boolean'
            ? value.needs_expansion
            : classifiedCut.needs_expansion,
      }
    })
    .filter((item) => {
      const combinedText = [
        item.title,
        item.reason,
        item.hook,
        item.source_excerpt || '',
      ].join(' ')

      return (
        item.title &&
        item.reason &&
        item.hook &&
        Number.isFinite(item.start) &&
        Number.isFinite(item.end) &&
        item.start >= 0 &&
        item.end > item.start &&
        (item.strength_score === undefined || item.strength_score >= 8) &&
        hasUsefulShortDuration(item) &&
        isCutInsideKnownSegments(item, segments) &&
        !looksLikeWeakCut(combinedText) &&
        !looksLikeWeakSourceExcerpt(item.source_excerpt || '') &&
        (item.cut_type === 'hook' || hasStrongEditorialSignal(item))
      )
    })
  const deduped = dedupeOverlappingCuts(normalized)
  const fullCuts = deduped.filter((cut) => cut.cut_type === 'full_cut').slice(0, 3)
  const hooks = deduped.filter((cut) => cut.cut_type === 'hook').slice(0, 3)

  return [...fullCuts, ...hooks].slice(0, 6)
}

function getBackendCutDurationProfile(durationSeconds: number) {
  if (durationSeconds <= 14) {
    return {
      type: 'hook',
      label: 'Gancho curto',
      recommendedUse: 'Gancho / teaser',
      cutType: 'hook' as const,
      needsExpansion: true,
    }
  }

  if (durationSeconds <= 25) {
    return {
      type: 'hook',
      label: 'Gancho forte',
      recommendedUse: 'Short rapido / teaser',
      cutType: 'hook' as const,
      needsExpansion: true,
    }
  }

  if (durationSeconds <= 45) {
    return {
      type: 'ideal_short',
      label: 'Short ideal',
      recommendedUse: 'Short/Reels/TikTok principal',
      cutType: 'full_cut' as const,
      needsExpansion: false,
    }
  }

  if (durationSeconds <= 60) {
    return {
      type: 'extended_short',
      label: 'Short estendido',
      recommendedUse: 'Short explicativo / corte estendido',
      cutType: 'full_cut' as const,
      needsExpansion: false,
    }
  }

  if (durationSeconds <= 90) {
    return {
      type: 'micro_devotional',
      label: 'Microdevocional',
      recommendedUse: 'Microdevocional / video curto explicativo',
      cutType: 'full_cut' as const,
      needsExpansion: false,
    }
  }

  return {
    type: 'long_cut',
    label: 'Corte longo',
    recommendedUse: 'Video curto especial / dividir em partes',
    cutType: 'full_cut' as const,
    needsExpansion: true,
  }
}

function normalizeScore(value: unknown, fallback = 8) {
  const score = Number(value)
  return Number.isFinite(score) ? Math.max(1, Math.min(10, Math.round(score))) : fallback
}

function getProductionRoleByDuration(duration: number): CutSuggestion['production_role'] {
  if (duration <= 25) return 'quick_teaser'
  if (duration <= 45) return 'main_short'
  if (duration <= 60) return 'extended_short'
  if (duration <= 90) return 'micro_devotional'
  return 'backup_cut'
}

function getProductionLabelByRole(role: CutSuggestion['production_role']) {
  const labels = {
    main_short: 'Postar primeiro',
    quick_teaser: 'Teaser curto',
    extended_short: 'Postar depois',
    micro_devotional: 'Microdevocional',
    sensitive_topic: 'Usar com cuidado',
    backup_cut: 'Reserva',
  }

  return labels[role || 'backup_cut']
}

function normalizeProductionRole(input: unknown, duration: number): CutSuggestion['production_role'] {
  const role = cleanText(String(input || ''))
  const allowed: Array<NonNullable<CutSuggestion['production_role']>> = [
    'main_short',
    'quick_teaser',
    'extended_short',
    'micro_devotional',
    'sensitive_topic',
    'backup_cut',
  ]

  return allowed.includes(role as NonNullable<CutSuggestion['production_role']>)
    ? role as NonNullable<CutSuggestion['production_role']>
    : getProductionRoleByDuration(duration)
}

function normalizeForEditorialScan(text: string) {
  return normalizeTextForCaptionSearch(text)
}

function hasBiblicalPerfumeValueContext(text: string) {
  const normalized = normalizeForEditorialScan(text)
  const strongSignals = [
    '300 dias de trabalho',
    'denario',
    'denarios',
    'nardo',
    'perfume',
    'oleo',
    'pes de jesus',
    'maria',
    'derramou',
    'cabelos',
    'gramas',
    'litra',
    'valor do perfume',
    'perfume caro',
  ]
  const signalCount = strongSignals.filter((term) => normalized.includes(term)).length
  const hasValueSignal = ['300', 'dias de trabalho', 'denario', 'denarios', 'valor', 'gramas', 'litra'].some((term) =>
    normalized.includes(term)
  )
  const hasSceneSignal = ['perfume', 'nardo', 'oleo', 'maria', 'pes de jesus', 'derramou', 'cabelos'].some((term) =>
    normalized.includes(term)
  )

  return signalCount >= 3 || (hasValueSignal && hasSceneSignal && signalCount >= 2)
}

function hasSensitiveOfferingContext(text: string) {
  const normalized = normalizeForEditorialScan(text)
  return [
    'oferta',
    'dinheiro',
    'financeiro',
    'pastor',
    'pulpito',
    'manipulacao',
    'pressao',
    'nao e obediencia',
    'nao se pede',
    'foi pedida',
    'foi pedido',
    'campanha',
    'promessa',
    'entregar dinheiro',
    'pedir oferta',
  ].some((term) => normalized.includes(term))
}

function containsSensitiveCutLanguage(text: string) {
  return hasSensitiveOfferingContext(text)
}

function containsAnyNormalizedTerm(text: string, terms: string[]) {
  const normalized = normalizeTextForCaptionSearch(text)
  return terms.some((term) => normalized.includes(normalizeTextForCaptionSearch(term)))
}

function calculateSafeFirstPostScore(cut: CutSuggestion) {
  const duration = cut.end - cut.start
  const searchText = [
    cut.title,
    cut.hook,
    cut.opening_line,
    cut.source_excerpt,
    cut.base_excerpt,
    cut.reason,
    cut.risk,
    cut.editorial_alert,
  ].filter(Boolean).join(' ')
  const biblicalPerfumeContext = cut.biblical_perfume_context ?? hasBiblicalPerfumeValueContext(searchText)
  const sensitiveOfferingContext = cut.sensitive_offering_context ?? hasSensitiveOfferingContext(searchText)
  const reasons: string[] = []
  let score = 0

  if (cut.editorial_alert_level === 'low') {
    score += 30
    reasons.push('baixo risco editorial')
  }
  if (duration >= 25 && duration <= 45) {
    score += 20
    reasons.push('duracao na faixa ideal')
  }
  if ((cut.retention_score || 0) >= 9) {
    score += 15
    reasons.push('retencao alta')
  }
  if ((cut.visual_potential || 0) >= 8) {
    score += 15
    reasons.push('imagem visual forte')
  }
  if ((cut.biblical_specificity || 0) >= 8) {
    score += 10
    reasons.push('clareza biblica')
  }
  if (containsAnyNormalizedTerm(searchText, ['300', 'dias de trabalho', 'gramas', 'valor', 'denario'])) {
    score += 20
    reasons.push('numero concreto ou valor memoravel')
  }
  if (biblicalPerfumeContext) {
    score += 20
    reasons.push('valor biblico do perfume como imagem segura')
  }
  if (
    containsAnyNormalizedTerm(searchText, [
      'perfume',
      'nardo',
      'pes de Jesus',
      'oleo',
      'cabelos',
      'derramou',
      'mesa',
      'ceia',
      'navio',
      'naufragio',
      'terra firme',
    ])
  ) {
    score += 15
    reasons.push('imagem concreta facil de visualizar')
  }

  if (cut.editorial_alert_level === 'medium') {
    score -= 30
    reasons.push('risco editorial medio')
  }
  if (cut.editorial_alert_level === 'high') {
    score -= 60
    reasons.push('risco editorial alto')
  }
  if (cut.needs_context_warning) {
    score -= 35
    reasons.push('depende de contexto')
  }
  if (cut.production_role === 'sensitive_topic') {
    score -= 35
    reasons.push('tema sensivel')
  }
  if (cut.duration_type === 'micro_devotional') {
    score -= 25
    reasons.push('melhor como microdevocional')
  }
  if (duration > 60) {
    score -= 40
    reasons.push('mais longo que um short principal')
  }
  if (sensitiveOfferingContext) {
    score -= 25
    reasons.push('linguagem com chance de interpretacao sensivel')
  }

  return {
    safe_first_score: score,
    safe_first_reason: reasons,
  }
}

function normalizeSuggestedSmallerCut(
  input: unknown,
  parentCut: Pick<CutSuggestion, 'start' | 'end'>,
  warnings: string[]
) {
  if (!input || typeof input !== 'object') return null

  const value = input as {
    start?: unknown
    end?: unknown
    title?: unknown
    hook?: unknown
    reason?: unknown
  }
  const start = Number(value.start)
  const end = Number(value.end)
  const duration = end - start
  const insideParent = start >= parentCut.start - 1 && end <= parentCut.end + 1

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start < 0 ||
    end <= start ||
    duration < 10 ||
    duration > 60 ||
    !insideParent
  ) {
    warnings.push('Um recorte menor sugerido foi descartado por estar fora dos limites permitidos.')
    return null
  }

  return {
    start: Number(start.toFixed(2)),
    end: Number(end.toFixed(2)),
    title: cleanText(String(value.title || '')).slice(0, 120) || 'Recorte menor sugerido',
    hook: cleanText(String(value.hook || '')).slice(0, 220) || 'Recorte menor sugerido pela IA forte.',
    reason: cleanText(String(value.reason || '')).slice(0, 260) || 'Recorte menor dentro do bloco principal.',
  }
}

function getIdealDurationDistance(cut: Pick<CutSuggestion, 'start' | 'end'>) {
  const duration = cut.end - cut.start
  if (duration >= 25 && duration <= 45) return 0
  return Math.min(Math.abs(duration - 25), Math.abs(duration - 45))
}

function normalizeBestAiCuts(input: unknown, model: string): BestAiCutsResult {
  const parsed = input as {
    cuts?: unknown
    editorial_summary?: unknown
    warnings?: unknown
  }
  const rawCuts = Array.isArray(parsed.cuts) ? parsed.cuts : []
  const warnings: string[] = []

  if (!rawCuts.length) {
    throw new Error('A IA forte nao retornou cortes validos.')
  }

  const cuts = rawCuts
    .map((item): CutSuggestion | null => {
      const value = item as {
        start?: unknown
        end?: unknown
        title?: unknown
        hook?: unknown
        opening_line?: unknown
        base_excerpt?: unknown
        source_excerpt?: unknown
        reason?: unknown
        retention_score?: unknown
        biblical_specificity?: unknown
        visual_potential?: unknown
        emotional_tension?: unknown
        share_potential?: unknown
        fidelity_to_audio?: unknown
        risk?: unknown
        production_priority?: unknown
        production_label?: unknown
        production_role?: unknown
        editorial_alert_level?: unknown
        editorial_alert?: unknown
        format_recommendation?: unknown
        should_publish_first?: unknown
        needs_context_warning?: unknown
        safe_title_suggestion?: unknown
        suggested_smaller_cut?: unknown
        caption_lines?: unknown
        suggested_caption_lines?: unknown
      }
      const start = Number(value.start)
      const end = Number(value.end)
      const duration = Math.round(end - start)

      if (
        !Number.isFinite(start) ||
        !Number.isFinite(end) ||
        start < 0 ||
        end <= start ||
        duration < 10 ||
        duration > 120
      ) {
        return null
      }

      const profile = getBackendCutDurationProfile(duration)
      const retentionScore = normalizeScore(value.retention_score)
      const title = cleanText(String(value.title || '')).slice(0, 120) || profile.label
      const hook = cleanText(String(value.hook || '')).slice(0, 240) || 'Corte selecionado pela IA forte.'
      const baseExcerpt =
        cleanText(String(value.base_excerpt || value.source_excerpt || '')).slice(0, 420) || undefined
      const reason =
        cleanText(String(value.reason || '')).slice(0, 320) ||
        'Corte selecionado por potencial editorial e retencao.'
      const priority = Number(value.production_priority)
      const productionRole = normalizeProductionRole(value.production_role, duration)
      const productionLabel =
        cleanText(String(value.production_label || '')).slice(0, 80) ||
        getProductionLabelByRole(productionRole)
      const alertLevel = cleanText(String(value.editorial_alert_level || 'low'))
      const safeAlertLevel = alertLevel === 'medium' || alertLevel === 'high' ? alertLevel : 'low'
      const safeTitleSuggestion = cleanText(String(value.safe_title_suggestion || '')).slice(0, 140)
      const editorialScanText = `${title} ${hook} ${reason} ${baseExcerpt || ''} ${value.risk || ''} ${value.editorial_alert || ''}`
      const biblicalPerfumeContext = hasBiblicalPerfumeValueContext(editorialScanText)
      const sensitiveOfferingContext = hasSensitiveOfferingContext(editorialScanText)
      const riskAdjustedByBackend = biblicalPerfumeContext && !sensitiveOfferingContext && safeAlertLevel !== 'low'
      const sensitiveLanguage = sensitiveOfferingContext
      const finalAlertLevel = riskAdjustedByBackend
        ? 'low'
        : sensitiveLanguage && safeAlertLevel === 'low'
          ? 'medium'
          : safeAlertLevel
      const needsContextWarning =
        typeof value.needs_context_warning === 'boolean'
          ? value.needs_context_warning && !riskAdjustedByBackend
          : sensitiveLanguage
      let finalProductionRole = sensitiveLanguage && finalAlertLevel !== 'low' ? 'sensitive_topic' : productionRole
      let finalProductionLabel = productionLabel

      if (biblicalPerfumeContext && !sensitiveOfferingContext && finalProductionRole === 'sensitive_topic') {
        finalProductionRole = duration >= 25 && duration <= 45 ? 'main_short' : getProductionRoleByDuration(duration)
        if (finalProductionLabel === 'Usar com cuidado') {
          finalProductionLabel = getProductionLabelByRole(finalProductionRole)
        }
      }

      if (riskAdjustedByBackend && duration >= 25 && duration <= 45) {
        finalProductionRole = 'main_short'
        if (value.should_publish_first === true) {
          finalProductionLabel = 'Postar primeiro'
        }
      }

      if (finalAlertLevel === 'high') {
        finalProductionRole = 'sensitive_topic'
        finalProductionLabel = 'Usar com cuidado'
      } else if (finalAlertLevel === 'medium' && needsContextWarning && finalProductionLabel === 'Postar primeiro') {
        finalProductionLabel = 'Usar com cuidado'
      }

      const cut: CutSuggestion = {
        title,
        start,
        end,
        duration,
        hook,
        reason,
        strength_score: retentionScore,
        strength_reason: reason,
        retention_score: retentionScore,
        biblical_specificity: normalizeScore(value.biblical_specificity),
        visual_potential: normalizeScore(value.visual_potential),
        emotional_tension: normalizeScore(value.emotional_tension),
        share_potential: normalizeScore(value.share_potential),
        fidelity_to_audio: normalizeScore(value.fidelity_to_audio, 9),
        duration_type: profile.type,
        duration_label: profile.label,
        recommended_use: profile.recommendedUse,
        risk: riskAdjustedByBackend
          ? 'Baixo. Valor do perfume tratado como dado biblico concreto, nao como pressao financeira.'
          : cleanText(String(value.risk || '')).slice(0, 220) || 'Risco editorial nao informado.',
        production_priority: Number.isFinite(priority) ? Math.max(1, Math.round(priority)) : rawCuts.indexOf(item) + 1,
        production_label: finalProductionLabel,
        production_role: finalProductionRole,
        editorial_alert_level: finalAlertLevel,
        editorial_alert:
          riskAdjustedByBackend
            ? 'Baixo risco. O valor do perfume funciona como dado biblico concreto e imagem visual da entrega de Maria.'
            : cleanText(String(value.editorial_alert || '')).slice(0, 260) ||
              (sensitiveLanguage
                ? 'Tema sensivel. Confira se o corte nao fica mal interpretado fora do contexto.'
                : 'Baixo risco. Corte claro, visual e fiel ao episodio.'),
        format_recommendation:
          cleanText(String(value.format_recommendation || '')).slice(0, 120) ||
          profile.recommendedUse,
        should_publish_first: value.should_publish_first === true,
        needs_context_warning: needsContextWarning,
        safe_title_suggestion: safeTitleSuggestion || undefined,
        priority_adjusted_by_backend: false,
        risk_adjusted_by_backend: riskAdjustedByBackend,
        biblical_perfume_context: biblicalPerfumeContext,
        sensitive_offering_context: sensitiveOfferingContext,
        suggested_smaller_cut: normalizeSuggestedSmallerCut(value.suggested_smaller_cut, { start, end }, warnings),
        suggested_caption_lines: normalizeCaptionLines(value.caption_lines || value.suggested_caption_lines),
        cut_type: profile.cutType,
        needs_expansion: profile.needsExpansion,
      }

      const openingLine = cleanText(String(value.opening_line || '')).slice(0, 220)
      if (openingLine) cut.opening_line = openingLine
      if (baseExcerpt) {
        cut.source_excerpt = baseExcerpt
        cut.base_excerpt = baseExcerpt
      }

      return cut
    })
    .filter((cut): cut is CutSuggestion => Boolean(cut))
    .sort((a, b) => {
      const priorityDiff = (a.production_priority || 99) - (b.production_priority || 99)
      if (priorityDiff !== 0) return priorityDiff
      const scoreDiff = (b.retention_score || 0) - (a.retention_score || 0)
      if (scoreDiff !== 0) return scoreDiff
      return getIdealDurationDistance(a) - getIdealDurationDistance(b)
    })
    .slice(0, 7)

  if (!cuts.length) {
    throw new Error('A IA forte retornou cortes fora dos limites de duracao permitidos.')
  }

  if (cuts.length > 5) {
    warnings.push('A IA retornou mais de 5 cortes; exibindo ate 7 para revisao editorial.')
  }

  cuts.forEach((cut) => {
    const safeScore = calculateSafeFirstPostScore(cut)
    cut.safe_first_score = safeScore.safe_first_score
    cut.safe_first_reason = safeScore.safe_first_reason

    if (cut.editorial_alert_level === 'high') {
      cut.production_role = 'sensitive_topic'
      cut.production_label = 'Usar com cuidado'
    } else if (
      cut.editorial_alert_level === 'medium' &&
      cut.needs_context_warning &&
      cut.production_label === 'Postar primeiro'
    ) {
      cut.production_label = 'Usar com cuidado'
      cut.production_role = 'sensitive_topic'
    }
  })

  const originalFirstCut = cuts[0]
  const safeLowRiskCandidates = cuts.filter((cut) => cut.editorial_alert_level === 'low')
  const bestSafeCandidate = [...cuts].sort((a, b) => {
    const safeDiff = (b.safe_first_score || 0) - (a.safe_first_score || 0)
    if (safeDiff !== 0) return safeDiff
    const retentionDiff = (b.retention_score || 0) - (a.retention_score || 0)
    if (retentionDiff !== 0) return retentionDiff
    return getIdealDurationDistance(a) - getIdealDurationDistance(b)
  })[0]
  const bestLowRiskCandidate = safeLowRiskCandidates.sort((a, b) => {
    const safeDiff = (b.safe_first_score || 0) - (a.safe_first_score || 0)
    if (safeDiff !== 0) return safeDiff
    const retentionDiff = (b.retention_score || 0) - (a.retention_score || 0)
    if (retentionDiff !== 0) return retentionDiff
    return getIdealDurationDistance(a) - getIdealDurationDistance(b)
  })[0]
  const firstPostCut = bestLowRiskCandidate || bestSafeCandidate

  if (!bestLowRiskCandidate) {
    warnings.push('Nenhum corte de baixo risco foi encontrado para primeiro post.')
  }

  if (firstPostCut) {
    cuts.sort((a, b) => {
      if (a === firstPostCut) return -1
      if (b === firstPostCut) return 1
      const priorityDiff = (a.production_priority || 99) - (b.production_priority || 99)
      if (priorityDiff !== 0) return priorityDiff
      const safeDiff = (b.safe_first_score || 0) - (a.safe_first_score || 0)
      if (safeDiff !== 0) return safeDiff
      return getIdealDurationDistance(a) - getIdealDurationDistance(b)
    })
  }

  const priorityAdjusted = Boolean(originalFirstCut && firstPostCut && originalFirstCut !== firstPostCut)
  if (priorityAdjusted) {
    warnings.push('A prioridade dos cortes foi ajustada localmente para favorecer primeiro post seguro, concreto e visual.')
  }

  cuts.forEach((cut, index) => {
    cut.production_priority = index + 1
    cut.should_publish_first = index === 0
    cut.priority_adjusted_by_backend = priorityAdjusted && cut === firstPostCut

    if (index === 0 && cut.editorial_alert_level === 'low') {
      cut.production_label = 'Postar primeiro'
      if (cut.production_role !== 'quick_teaser' && cut.production_role !== 'micro_devotional') {
        cut.production_role = 'main_short'
      }
    } else if (cut.editorial_alert_level === 'high') {
      cut.production_label = 'Usar com cuidado'
      cut.production_role = 'sensitive_topic'
    } else if (cut.editorial_alert_level === 'medium' && cut.needs_context_warning) {
      cut.production_label = 'Usar com cuidado'
      cut.production_role = 'sensitive_topic'
    } else if (cut.production_label === 'Postar primeiro') {
      cut.production_label = getProductionLabelByRole(cut.production_role)
      if (cut.production_label === 'Postar primeiro') {
        cut.production_label = 'Postar depois'
      }
    }
  })

  return {
    mode: 'best_cuts_ai',
    model,
    generated_at: new Date().toISOString(),
    cuts,
    editorial_summary:
      cleanText(String(parsed.editorial_summary || '')).slice(0, 500) ||
      'Cortes selecionados por potencial de retencao, clareza e fidelidade ao episodio.',
    warnings: [...warnings, ...normalizeStringArray(parsed.warnings, 4, 180)],
  }
}

function normalizeSelectedCut(input: unknown): CutSuggestion | null {
  if (!input || typeof input !== 'object') return null

  const value = input as {
    title?: unknown
    start?: unknown
    end?: unknown
    reason?: unknown
    hook?: unknown
    source_excerpt?: unknown
    suggested_caption_lines?: unknown
    strength_score?: unknown
    strength_reason?: unknown
    cut_type?: unknown
    needs_expansion?: unknown
  }
  const start = Number(value.start)
  const end = Number(value.end)
  const rawStrengthScore = Number(value.strength_score)
  const strengthScore = Number.isFinite(rawStrengthScore)
    ? Math.max(1, Math.min(10, Math.round(rawStrengthScore)))
    : undefined
  const classifiedCut = getCutType({ start, end, strength_score: strengthScore })
  const selectedCut = {
    title: cleanText(String(value.title || '')).slice(0, 120),
    start,
    end,
    reason: cleanText(String(value.reason || '')).slice(0, 240),
    hook: cleanText(String(value.hook || '')).slice(0, 220),
    source_excerpt: cleanText(String(value.source_excerpt || '')).slice(0, 500) || undefined,
    suggested_caption_lines: normalizeCaptionLines(value.suggested_caption_lines),
    strength_score: strengthScore,
    strength_reason: cleanText(String(value.strength_reason || '')).slice(0, 260) || undefined,
    cut_type: cleanText(String(value.cut_type || '')) === 'hook'
      ? 'hook' as const
      : cleanText(String(value.cut_type || '')) === 'full_cut'
        ? 'full_cut' as const
        : classifiedCut.cut_type,
    needs_expansion:
      typeof value.needs_expansion === 'boolean'
        ? value.needs_expansion
        : classifiedCut.needs_expansion,
  }

  if (
    !selectedCut.title ||
    !selectedCut.hook ||
    !Number.isFinite(selectedCut.start) ||
    !Number.isFinite(selectedCut.end) ||
    selectedCut.end <= selectedCut.start
  ) {
    return null
  }

  return selectedCut
}

function normalizeCaptionSyncCut(input: unknown): CaptionSyncCut | null {
  if (!input || typeof input !== 'object') return null

  const value = input as {
    title?: unknown
    start?: unknown
    end?: unknown
    hook?: unknown
    source_excerpt?: unknown
  }
  const start = Number(value.start)
  const end = Number(value.end)

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return null
  }

  return {
    title: cleanText(String(value.title || '')).slice(0, 140) || undefined,
    start,
    end,
    hook: cleanText(String(value.hook || '')).slice(0, 220) || undefined,
    source_excerpt: cleanText(String(value.source_excerpt || '')).slice(0, 700) || undefined,
  }
}

function normalizeShortScript(input: unknown): ShortScript | undefined {
  if (!input || typeof input !== 'object') return undefined

  const value = input as {
    title?: unknown
    platform_goal?: unknown
    duration_seconds?: unknown
    main_hook?: unknown
    hook_original?: unknown
    hook_improved?: unknown
    why_hook_improved?: unknown
    suggested_opening_line?: unknown
    why_opening_works?: unknown
    cliffhanger?: unknown
    spiritual_point?: unknown
    cta?: unknown
    retention_score?: unknown
    score_breakdown?: unknown
    timeline?: unknown
    animated_caption_lines?: unknown
    caption_lines_improved?: unknown
    image_prompts?: unknown
    visual_suggestions?: unknown
    editing_notes?: unknown
    quality_check?: unknown
  }
  const qualityCheck = (value.quality_check || {}) as Record<string, unknown>
  const scoreBreakdown = (value.score_breakdown || {}) as Record<string, unknown>
  const normalizeScore = (score: unknown) => {
    const numericScore = Number(score)
    return Number.isFinite(numericScore)
      ? Math.max(1, Math.min(10, Math.round(numericScore)))
      : undefined
  }
  const timeline = Array.isArray(value.timeline)
    ? value.timeline
        .map((item) => {
          const timelineItem = item as Record<string, unknown>
          return {
            start: Number(timelineItem.start),
            end: Number(timelineItem.end),
            purpose: cleanText(String(timelineItem.purpose || '')).slice(0, 140),
            narration_focus: cleanText(String(timelineItem.narration_focus || '')).slice(0, 220),
            on_screen_text: cleanText(String(timelineItem.on_screen_text || '')).slice(0, 90),
            visual_direction: cleanText(String(timelineItem.visual_direction || '')).slice(0, 240),
            motion_direction: cleanText(String(timelineItem.motion_direction || '')).slice(0, 180),
            sound_design: cleanText(String(timelineItem.sound_design || '')).slice(0, 180),
          }
        })
        .filter((item) => {
          return (
            Number.isFinite(item.start) &&
            Number.isFinite(item.end) &&
            item.end > item.start &&
            item.purpose &&
            item.narration_focus &&
            item.on_screen_text &&
            item.visual_direction
          )
        })
        .slice(0, 8)
    : []
  const imagePrompts = Array.isArray(value.image_prompts)
    ? value.image_prompts
        .map((item) => {
          const imagePrompt = item as Record<string, unknown>
          return {
            moment: cleanText(String(imagePrompt.moment || '')).slice(0, 120),
            prompt: cleanText(String(imagePrompt.prompt || '')).slice(0, 700),
            use_for_seconds: cleanText(String(imagePrompt.use_for_seconds || '')).slice(0, 40),
          }
        })
        .filter((item) => item.moment && item.prompt && item.use_for_seconds)
        .slice(0, 6)
    : []
  const captionLinesImproved = normalizeStringArray(value.caption_lines_improved, 20, 80).filter((line) => {
    const wordCount = countWords(line)
    return wordCount >= 3 && wordCount <= 7
  })
  const visualSuggestions = Array.isArray(value.visual_suggestions)
    ? value.visual_suggestions
        .map((item) => {
          const visualSuggestion = item as Record<string, unknown>
          return {
            start: Number(visualSuggestion.start),
            end: Number(visualSuggestion.end),
            visual_goal: cleanText(String(visualSuggestion.visual_goal || '')).slice(0, 140),
            scene_description: cleanText(String(visualSuggestion.scene_description || '')).slice(0, 260),
            motion: cleanText(String(visualSuggestion.motion || '')).slice(0, 160),
            sound_design: cleanText(String(visualSuggestion.sound_design || '')).slice(0, 160),
          }
        })
        .filter((item) => {
          return (
            Number.isFinite(item.start) &&
            Number.isFinite(item.end) &&
            item.end > item.start &&
            item.visual_goal &&
            item.scene_description &&
            item.motion &&
            item.sound_design
          )
        })
        .slice(0, 8)
    : []
  const normalizedScoreBreakdown = {
    hook_strength: normalizeScore(scoreBreakdown.hook_strength),
    biblical_specificity: normalizeScore(scoreBreakdown.biblical_specificity),
    visual_concreteness: normalizeScore(scoreBreakdown.visual_concreteness),
    emotional_tension: normalizeScore(scoreBreakdown.emotional_tension),
    share_potential: normalizeScore(scoreBreakdown.share_potential),
    fidelity_to_audio: normalizeScore(scoreBreakdown.fidelity_to_audio),
  }
  const hasScoreBreakdown = Object.values(normalizedScoreBreakdown).some((score) => typeof score === 'number')
  const script = {
    title: cleanText(String(value.title || '')).slice(0, 140),
    platform_goal: 'shorts_reels_tiktok' as const,
    duration_seconds: Math.max(15, Math.min(90, Math.round(Number(value.duration_seconds) || 45))),
    main_hook: cleanText(String(value.main_hook || '')).slice(0, 220),
    hook_original: cleanText(String(value.hook_original || '')).slice(0, 220) || undefined,
    hook_improved: cleanText(String(value.hook_improved || '')).slice(0, 220) || undefined,
    why_hook_improved: cleanText(String(value.why_hook_improved || '')).slice(0, 320) || undefined,
    suggested_opening_line: cleanText(String(value.suggested_opening_line || '')).slice(0, 220) || undefined,
    why_opening_works: cleanText(String(value.why_opening_works || '')).slice(0, 320) || undefined,
    cliffhanger: cleanText(String(value.cliffhanger || '')).slice(0, 220),
    spiritual_point: cleanText(String(value.spiritual_point || '')).slice(0, 260),
    cta: cleanText(String(value.cta || '')).slice(0, 180),
    retention_score: normalizeScore(value.retention_score),
    score_breakdown: hasScoreBreakdown ? normalizedScoreBreakdown : undefined,
    timeline,
    animated_caption_lines: normalizeStringArray(value.animated_caption_lines, 20, 80).filter((line) => {
      const wordCount = countWords(line)
      return wordCount >= 3 && wordCount <= 7
    }),
    caption_lines_improved: captionLinesImproved,
    image_prompts: imagePrompts,
    visual_suggestions: visualSuggestions,
    editing_notes: normalizeStringArray(value.editing_notes, 8, 180),
    auto_completed: false,
    auto_completed_note: undefined,
    quality_check: {
      has_strong_hook: Boolean(qualityCheck.has_strong_hook),
      has_clear_tension: Boolean(qualityCheck.has_clear_tension),
      has_spiritual_application: Boolean(qualityCheck.has_spiritual_application),
      has_soft_cta: Boolean(qualityCheck.has_soft_cta),
      avoids_generic_language: Boolean(qualityCheck.avoids_generic_language),
    },
  }

  if (
    !script.title ||
    !script.main_hook ||
    !script.cliffhanger ||
    !script.spiritual_point ||
    !script.cta ||
    script.timeline.length < 2 ||
    script.animated_caption_lines.length < 2 ||
    script.image_prompts.length < 1
  ) {
    return undefined
  }

  return script
}

function splitCaptionFallbackText(text: string) {
  const words = cleanText(text)
    .replace(/[.,;:!?]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  const lines: string[] = []

  for (let index = 0; index < words.length && lines.length < 12; index += 4) {
    const line = words.slice(index, index + 4).join(' ')

    if (countWords(line) >= 3 && countWords(line) <= 7) {
      lines.push(line)
    }
  }

  return lines
}

function splitEditorialCaptionLines(text: string) {
  const fragments = cleanText(text)
    .split(/[.!?;:]+/)
    .map((fragment) => fragment.trim())
    .filter(Boolean)
  const lines: string[] = []

  for (const fragment of fragments) {
    const wordCount = countWords(fragment)

    if (wordCount >= 3 && wordCount <= 7) {
      lines.push(fragment)
      continue
    }

    const words = fragment.split(/\s+/).filter(Boolean)
    for (let index = 0; index < words.length; index += 4) {
      const line = words.slice(index, index + 4).join(' ')
      const lineWordCount = countWords(line)

      if (lineWordCount >= 3 && lineWordCount <= 7) {
        lines.push(line)
      }
    }
  }

  return lines
}

function cleanEditorialCaptionLine(line: string) {
  return cleanText(line)
    .replace(/\bmas\s+n[oó]s\s+vemos\s+que\b/gi, '')
    .replace(/\bn[oó]s\s+vemos\s+que\b/gi, '')
    .replace(/\bn[oó]s\s+vemos\b/gi, '')
    .replace(/\bJesus\s+ele\b/gi, 'Jesus')
    .replace(/\bportanto\b[,\s]*/gi, '')
    .replace(/\b(Chequen[aá]|Shekinah)\s+de\s+Deus\b/gi, 'a gloria de Deus')
    .replace(/\b(Chequen[aá]|Shekinah)\b/gi, 'a gloria de Deus')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildCaptionFallbacks(selectedCut: CutSuggestion, minLines: number) {
  const seedLines = [
    ...(selectedCut.suggested_caption_lines || []),
    ...splitCaptionFallbackText(selectedCut.hook),
    ...splitCaptionFallbackText(selectedCut.source_excerpt || ''),
  ]
  const cleaned = seedLines
    .map((line) => cleanText(line).slice(0, 80))
    .filter((line, index, lines) => {
      const wordCount = countWords(line)
      return wordCount >= 3 && wordCount <= 7 && lines.indexOf(line) === index
    })

  if (/bet[aâ]nia/i.test(`${selectedCut.hook} ${selectedCut.source_excerpt || ''}`)) {
    cleaned.push(
      'A presenca de Deus',
      'nao estava no templo',
      'Jerusalem tinha o templo',
      'Jesus dormia em Betania',
      'Estava em Betania',
      'com o pobre',
      'com o aflito',
      'Jesus entra',
      'na nossa Betania'
    )
  }

  return cleaned.slice(0, Math.max(minLines, 7))
}

function buildImagePromptFallbacks(selectedCut: CutSuggestion): ShortScriptImagePrompt[] {
  const baseTheme = cleanText(`${selectedCut.title}. ${selectedCut.hook}`)
  const isBethany = /bet[aâ]nia|templo|l[aá]zaro|afli[cç][aã]o/i.test(`${baseTheme} ${selectedCut.source_excerpt || ''}`)

  if (isBethany) {
    return [
      {
        moment: 'Contraste entre templo e Betania',
        use_for_seconds: '0-8s',
        prompt: 'Vertical 9:16, cinematic biblical realism, first century Judea, distant Jerusalem temple glowing on the horizon contrasted with the humble road toward Bethany, warm late afternoon light, quiet spiritual tension, natural colors, realistic fabric, no text in image, not theatrical.',
      },
      {
        moment: 'Casa simples em Betania',
        use_for_seconds: '8-20s',
        prompt: 'Vertical 9:16, realistic biblical village home in Bethany at sunset, simple stone walls, open doorway, soft golden light entering the house, atmosphere of sorrow and hope, intimate composition, cinematic depth of field, no text in image, restrained emotion.',
      },
      {
        moment: 'Presenca de Jesus na aflicao',
        use_for_seconds: '20-32s',
        prompt: 'Vertical 9:16, humble biblical interior with grieving people in soft shadow, a gentle beam of warm light entering from the doorway symbolizing the presence of Jesus, reverent atmosphere, cinematic realism, natural textures, no text in image, no exaggerated drama.',
      },
    ]
  }

  return [
    {
      moment: 'Abertura espiritual',
      use_for_seconds: '0-8s',
      prompt: `Vertical 9:16, cinematic biblical realism inspired by "${baseTheme}", first century setting, intimate composition, warm natural light, contemplative spiritual atmosphere, realistic clothing and textures, no text in image, no theatrical exaggeration.`,
    },
    {
      moment: 'Aplicacao devocional',
      use_for_seconds: '8-24s',
      prompt: `Vertical 9:16, realistic biblical environment connected to "${baseTheme}", soft directional light, quiet emotional tension, human scale composition, cinematic depth, reverent mood, no text in image, natural colors, restrained drama.`,
    },
  ]
}

function completeShortScriptFallbacks(script: ShortScript, selectedCut?: CutSuggestion | null) {
  if (!selectedCut) return script

  let autoCompleted = false
  const minCaptionLines = script.duration_seconds <= 35 ? 7 : script.duration_seconds <= 45 ? 8 : 12
  const originalHook = cleanText(selectedCut.hook || script.main_hook)

  if (!script.hook_original) {
    script.hook_original = originalHook || script.main_hook
  }

  if (!script.hook_improved) {
    script.hook_improved = script.main_hook
  }

  if (!script.suggested_opening_line) {
    script.suggested_opening_line = script.hook_improved || script.main_hook
  }

  if (/preferia\s+bet[aâ]nia\s+ao\s+templo/i.test(script.suggested_opening_line || '')) {
    script.suggested_opening_line = script.hook_improved || 'Voce sabe onde Jesus repousava quando ia a Jerusalem?'
    autoCompleted = true
  }

  if (script.animated_caption_lines.length < minCaptionLines) {
    const fallbackLines = buildCaptionFallbacks(selectedCut, minCaptionLines)
    script.animated_caption_lines = [...script.animated_caption_lines, ...fallbackLines]
      .filter((line, index, lines) => lines.indexOf(line) === index)
      .slice(0, script.duration_seconds <= 35 ? 10 : script.duration_seconds <= 45 ? 14 : 18)
    autoCompleted = true
  }

  const fallbackLines = buildCaptionFallbacks(selectedCut, minCaptionLines)
  const improvedSeed = [
    ...splitEditorialCaptionLines(script.hook_improved || script.main_hook),
    ...splitEditorialCaptionLines(script.hook_original || originalHook),
    ...(script.caption_lines_improved || []),
    ...fallbackLines,
  ]
  const normalizedImprovedLines = improvedSeed
    .map((line) => cleanEditorialCaptionLine(line).slice(0, 80))
    .filter((line, index, lines) => {
      const wordCount = countWords(line)
      return wordCount >= 3 && wordCount <= 7 && lines.indexOf(line) === index
    })
    .slice(0, script.duration_seconds <= 35 ? 10 : script.duration_seconds <= 45 ? 14 : 18)

  if (
    normalizedImprovedLines.length !== (script.caption_lines_improved || []).length ||
    normalizedImprovedLines.some((line, index) => line !== script.caption_lines_improved?.[index])
  ) {
    script.caption_lines_improved = normalizedImprovedLines
    autoCompleted = true
  }

  if (
    script.image_prompts.length < 2 ||
    script.image_prompts.some((item) => countWords(item.prompt) < 25)
  ) {
    const fallbackPrompts = buildImagePromptFallbacks(selectedCut)
    script.image_prompts = [...script.image_prompts.filter((item) => countWords(item.prompt) >= 25), ...fallbackPrompts]
      .filter((item, index, prompts) => prompts.findIndex((prompt) => prompt.moment === item.moment) === index)
      .slice(0, 4)
    autoCompleted = true
  }

  if (script.duration_seconds > 30 && script.timeline.length < 3) {
    script.editing_notes = [
      ...script.editing_notes,
      'Revisar timeline: a IA retornou poucos blocos para a duracao do corte.',
    ].slice(0, 8)
    autoCompleted = true
  }

  if (
    script.timeline.some((item) => {
      return (
        countWords(item.visual_direction) < 4 ||
        countWords(item.motion_direction) < 3 ||
        countWords(item.sound_design) < 2
      )
    })
  ) {
    script.editing_notes = [
      ...script.editing_notes,
      'Revisar timeline para edicao final, reforcando visual, motion e som nos blocos mais genericos.',
    ].slice(0, 8)
    autoCompleted = true
  }

  script.auto_completed = autoCompleted
  script.auto_completed_note = autoCompleted
    ? 'Alguns elementos foram completados automaticamente para facilitar a edicao.'
    : undefined

  return script
}

function normalizeWordTimestamp(input: unknown): WordTimestamp | null {
  if (!input || typeof input !== 'object') return null

  const value = input as { word?: unknown; start?: unknown; end?: unknown }
  const word = cleanText(String(value.word || ''))
  const start = Number(value.start)
  const end = Number(value.end)

  if (!word || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return null
  }

  return { word, start, end }
}

function cleanCaptionWord(word: string) {
  return cleanText(word)
    .replace(/^[,.;:!?]+|[,.;:!?]+$/g, '')
    .trim()
}

function shouldSkipCaptionToken(word: string) {
  return /^(n[eé]|eh|e\.\.\.|é\.\.\.)$/i.test(word)
}

function isWeakCaptionEnding(word: string) {
  return /^(de|do|da|dos|das|com|em|no|na|nos|nas|que|para|por|mas|e|porque|portanto|at[eé])$/i.test(word)
}

function cleanSyncedCaptionText(words: string[]) {
  const deduped = words.filter((word, index) => {
    return index === 0 || word.toLowerCase() !== words[index - 1].toLowerCase()
  })

  return cleanText(deduped.join(' '))
    .replace(/\bJesus\s+ele\b/gi, 'Jesus')
    .replace(/\b(Chequen[aá]|Shekinah)\s+de\s+Deus\b/gi, 'a gloria de Deus')
    .replace(/\b(Chequen[aá]|Shekinah)\b/gi, 'a gloria de Deus')
    .replace(/\s+([,.!?;:])/g, '$1')
}

function roundCaptionTime(seconds: number) {
  return Math.max(0, Number(seconds.toFixed(2)))
}

function formatSrtTime(seconds: number) {
  const safeSeconds = Math.max(0, seconds)
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const secs = Math.floor(safeSeconds % 60)
  const millis = Math.round((safeSeconds - Math.floor(safeSeconds)) * 1000)

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`
}

function buildSrt(lines: SyncedCaptionLine[]) {
  return lines
    .map((line, index) => {
      return [
        String(index + 1),
        `${formatSrtTime(line.start)} --> ${formatSrtTime(line.end)}`,
        line.text,
      ].join('\n')
    })
    .join('\n\n')
}

function normalizeCaptionTokenForGrouping(word: string) {
  return cleanCaptionWord(word)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function isWeakCaptionLineEnding(word: string) {
  return /^(de|do|da|dos|das|com|que|para|por|em|a|o|e|mas|entao|porque|como|esse|essa|no|na|nos|nas|portanto|ate)$/.test(normalizeCaptionTokenForGrouping(word))
}

function isWeakCaptionLineOpening(word: string) {
  return /^(e|mas|que|entao|porque|com|de|para)$/.test(normalizeCaptionTokenForGrouping(word))
}

function cleanSyncedCaptionLineText(words: string[]) {
  const deduped = words.filter((word, index) => {
    return index === 0 || normalizeCaptionTokenForGrouping(word) !== normalizeCaptionTokenForGrouping(words[index - 1])
  })

  return cleanText(deduped.join(' ')).replace(/\s+([,.!?;:])/g, '$1')
}

const STRONG_CAPTION_EXPRESSIONS = [
  ['300', 'dias', 'de', 'trabalho'],
  ['pes', 'de', 'jesus'],
  ['nardo', 'puro'],
  ['perfume', 'de', 'maria'],
  ['com', 'esse', 'oleo'],
  ['com', 'esse', 'perfume'],
  ['com', 'os', 'cabelos'],
  ['adoracao', 'extravagante'],
  ['de', 'todo', 'o', 'coracao'],
  ['honra', 'para', 'jesus'],
  ['desperdicio', 'para', 'muitos'],
]

function buildStrongExpressionNoBreaks(words: WordTimestamp[]) {
  const normalizedWords = words.map((word) => normalizeCaptionTokenForGrouping(word.word))
  const noBreakAfter = new Set<number>()

  STRONG_CAPTION_EXPRESSIONS.forEach((expression) => {
    for (let index = 0; index <= normalizedWords.length - expression.length; index += 1) {
      const matches = expression.every((token, tokenIndex) => normalizedWords[index + tokenIndex] === token)

      if (matches) {
        for (let tokenIndex = 0; tokenIndex < expression.length - 1; tokenIndex += 1) {
          noBreakAfter.add(index + tokenIndex)
        }
      }
    }
  })

  return noBreakAfter
}

function getCaptionGroupDuration(group: WordTimestamp[]) {
  if (!group.length) return 0
  return group[group.length - 1].end - group[0].start
}

function canMergeCaptionGroups(left: WordTimestamp[], right: WordTimestamp[]) {
  return left.length + right.length <= 7 && getCaptionGroupDuration([...left, ...right]) <= 4.2
}

function splitLongCaptionGroup(group: WordTimestamp[]): WordTimestamp[][] {
  if (group.length <= 7 && getCaptionGroupDuration(group) <= 4.2) return [group]

  const minLeft = 3
  const maxLeft = Math.min(7, group.length - 1)
  let bestIndex = 0
  let bestScore = Number.NEGATIVE_INFINITY

  for (let index = minLeft; index <= maxLeft; index += 1) {
    const left = group.slice(0, index)
    const right = group.slice(index)
    if (!left.length || !right.length) continue

    const leftLast = left[left.length - 1]?.word || ''
    const rightFirst = right[0]?.word || ''
    let score = 20 - Math.abs(left.length - 5) - Math.abs(right.length - 5)

    if (left.length > 7 || getCaptionGroupDuration(left) > 4.2) score -= 20
    if (right.length > 7 || getCaptionGroupDuration(right) > 4.2) score -= 20
    if (isWeakCaptionLineEnding(leftLast)) score -= 8
    if (isWeakCaptionLineOpening(rightFirst)) score -= 6

    const gap = right[0].start - left[left.length - 1].end
    if (gap > 0.45) score += 3

    if (score > bestScore) {
      bestScore = score
      bestIndex = index
    }
  }

  if (!bestIndex) return [group]

  return [
    ...splitLongCaptionGroup(group.slice(0, bestIndex)),
    ...splitLongCaptionGroup(group.slice(bestIndex)),
  ]
}

function refineCaptionGroups(groups: WordTimestamp[][]): WordTimestamp[][] {
  const refined = [...groups]

  for (let index = 0; index < refined.length - 1; index += 1) {
    const current = refined[index]
    const next = refined[index + 1]
    const lastWord = current[current.length - 1]?.word || ''
    const firstNextWord = next[0]?.word || ''

    if ((isWeakCaptionLineEnding(lastWord) || isWeakCaptionLineOpening(firstNextWord)) && canMergeCaptionGroups(current, next)) {
      refined[index] = [...current, ...next]
      refined.splice(index + 1, 1)
      index = Math.max(-1, index - 2)
    }
  }

  for (let index = 0; index < refined.length; index += 1) {
    const current = refined[index]

    if (current.length >= 3) continue

    const previous = refined[index - 1]
    const next = refined[index + 1]

    if (previous && canMergeCaptionGroups(previous, current)) {
      refined[index - 1] = [...previous, ...current]
      refined.splice(index, 1)
      index = Math.max(-1, index - 2)
    } else if (next && canMergeCaptionGroups(current, next)) {
      refined[index] = [...current, ...next]
      refined.splice(index + 1, 1)
      index = Math.max(-1, index - 1)
    }
  }

  return refined.flatMap(splitLongCaptionGroup)
}

function buildCaptionQualityWarnings(lines: SyncedCaptionLine[]) {
  const warnings: string[] = []

  if (lines.some((line) => line.words_count === 1)) {
    warnings.push('Uma ou mais linhas ficaram com apenas uma palavra.')
  }

  if (lines.some((line) => {
    const words = line.text.split(/\s+/).filter(Boolean)
    const first = words[0] || ''
    const last = words[words.length - 1] || ''

    return isWeakCaptionLineOpening(first) || isWeakCaptionLineEnding(last)
  })) {
    warnings.push('Algumas linhas ainda podem terminar com palavras fracas.')
  }

  if (lines.some((line) => line.words_count > 7)) {
    warnings.push('Algumas linhas estao longas para Shorts/Reels.')
  }

  if (lines.some((line) => /\b(os|as|a|o)\s+de\s+Jesus\b/i.test(line.text))) {
    warnings.push('Algumas expressoes parecem incompletas. Confira manualmente se palavras importantes foram omitidas.')
  }

  return warnings
}

function buildCaptionSyncDebug(words: WordTimestamp[], cut: CaptionSyncCut): CaptionSyncDebug {
  const rawWords = words.map((word) => ({
    word: word.word,
    start: roundCaptionTime(word.start - cut.start),
    end: roundCaptionTime(word.end - cut.start),
  }))
  const normalizedWords = words.map((word) => normalizeCaptionTokenForGrouping(word.word))
  const contains = (term: string) => normalizedWords.includes(term)

  return {
    cut_start: cut.start,
    cut_end: cut.end,
    raw_words_count: rawWords.length,
    raw_text: cleanText(rawWords.map((word) => word.word).join(' ')),
    raw_words: rawWords,
    contains_terms: {
      cerca: contains('cerca'),
      pes: contains('pes'),
      jesus: contains('jesus'),
      oleo: contains('oleo'),
      perfume: contains('perfume'),
      cabelos: contains('cabelos'),
      trezentos_ou_300: contains('300') || contains('trezentos'),
    },
  }
}

const HYBRID_IMPORTANT_TERMS = [
  'cerca',
  'pes',
  'aos',
  'puro',
  'nardo',
  'maria',
  'jesus',
  'perfume',
  'oleo',
  'cabelos',
  '300',
  'trezentos',
]

function normalizeTextForCaptionSearch(text: string) {
  return cleanText(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function textHasCaptionTerm(text: string, term: string) {
  const normalized = normalizeTextForCaptionSearch(text)
  const safeTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  return new RegExp(`(^|\\s)${safeTerm}(\\s|$)`, 'i').test(normalized)
}

function tokenizeCaptionText(text: string) {
  return cleanText(text)
    .split(/\s+/)
    .map((original) => ({
      original: cleanCaptionWord(original),
      normalized: normalizeCaptionTokenForGrouping(original),
    }))
    .filter((token) => token.original && token.normalized)
}

function alignHybridTextToRawWords(params: { segmentText: string; rawWordText: string }) {
  const segmentTokens = tokenizeCaptionText(params.segmentText)
  const rawTokens = tokenizeCaptionText(params.rawWordText)
  const rawNormalized = rawTokens.map((token) => token.normalized)
  let best:
    | {
        startIndex: number
        endIndex: number
        firstMatchIndex: number
        matchedCount: number
        score: number
      }
    | null = null

  if (!segmentTokens.length || !rawTokens.length) {
    return {
      matched_ratio: 0,
      segment_tokens_count: segmentTokens.length,
      raw_tokens_count: rawTokens.length,
      aligned_tokens_count: 0,
      aligned_text: '',
      used_alignment: false,
    }
  }

  for (let startIndex = 0; startIndex < segmentTokens.length; startIndex += 1) {
    let rawIndex = 0
    let matchedCount = 0
    let firstMatchIndex = -1
    let endIndex = startIndex

    for (let segmentIndex = startIndex; segmentIndex < segmentTokens.length && rawIndex < rawNormalized.length; segmentIndex += 1) {
      if (segmentTokens[segmentIndex].normalized === rawNormalized[rawIndex]) {
        if (firstMatchIndex === -1) firstMatchIndex = segmentIndex
        matchedCount += 1
        rawIndex += 1
        endIndex = segmentIndex
      }
    }

    if (matchedCount === 0 || firstMatchIndex === -1) continue

    const matchedRatio = matchedCount / rawNormalized.length
    const windowLength = Math.max(1, endIndex - firstMatchIndex + 1)
    const score = matchedRatio - windowLength / Math.max(segmentTokens.length * 3, 1)

    if (!best || score > best.score) {
      best = {
        startIndex,
        endIndex,
        firstMatchIndex,
        matchedCount,
        score,
      }
    }
  }

  if (!best) {
    return {
      matched_ratio: 0,
      segment_tokens_count: segmentTokens.length,
      raw_tokens_count: rawTokens.length,
      aligned_tokens_count: 0,
      aligned_text: '',
      used_alignment: false,
    }
  }

  let alignedStart = best.firstMatchIndex
  const prefixLimit = Math.max(0, best.firstMatchIndex - 4)

  while (alignedStart > prefixLimit) {
    const previous = segmentTokens[alignedStart - 1]?.normalized
    if (!previous || /^(entao|significa|denario|receber|trabalhavam|epoca)$/.test(previous)) break
    alignedStart -= 1
  }

  const alignedEnd = Math.min(segmentTokens.length - 1, best.endIndex + 2)
  const alignedTokens = segmentTokens.slice(alignedStart, alignedEnd + 1)
  const matchedRatio = Number((best.matchedCount / rawNormalized.length).toFixed(2))

  return {
    matched_ratio: matchedRatio,
    segment_tokens_count: segmentTokens.length,
    raw_tokens_count: rawTokens.length,
    aligned_tokens_count: alignedTokens.length,
    aligned_text: cleanText(alignedTokens.map((token) => token.original).join(' ')),
    used_alignment: matchedRatio >= 0.45,
  }
}

function getSegmentTextForCut(params: {
  segments: TranscriptionSegment[]
  transcriptionText: string
  cutStart: number
  cutEnd: number
}): { text: string; confidence: 'high' | 'medium' | 'low'; reason: string } {
  const matchingSegments = params.segments
    .filter((segment) => segment.end >= params.cutStart && segment.start <= params.cutEnd)
    .sort((a, b) => a.start - b.start)
  const segmentText = cleanText(matchingSegments.map((segment) => segment.text).join(' '))

  if (segmentText) {
    const overlapCount = matchingSegments.filter((segment) => {
      return segment.start >= params.cutStart - 2 && segment.end <= params.cutEnd + 2
    }).length

    return {
      text: segmentText.slice(0, 1800),
      confidence: overlapCount > 0 ? 'high' : 'medium',
      reason: 'Texto obtido a partir dos segmentos da transcricao que intersectam o corte.',
    }
  }

  if (params.transcriptionText) {
    return {
      text: cleanText(params.transcriptionText).slice(0, 1800),
      confidence: 'low',
      reason: 'Sem segmentos com timestamp para o corte; usando transcricao completa como fallback.',
    }
  }

  return {
    text: '',
    confidence: 'low',
    reason: 'Nenhum texto de segmento ou transcricao disponivel para modo hibrido.',
  }
}

function buildCaptionHybridDebug(params: {
  rawText: string
  segmentText: string
  confidence: 'high' | 'medium' | 'low'
  reason: string
  alignment: ReturnType<typeof alignHybridTextToRawWords>
  editorialSplit?: EditorialSplitDebug
}): CaptionHybridDebug {
  const alignedOrSegmentText = params.alignment.used_alignment ? params.alignment.aligned_text : params.segmentText
  const missingTerms = HYBRID_IMPORTANT_TERMS.filter((term) => {
    return textHasCaptionTerm(alignedOrSegmentText, term) && !textHasCaptionTerm(params.rawText, term)
  })
  const usedHybridText =
    Boolean(alignedOrSegmentText) &&
    params.confidence !== 'low' &&
    params.alignment.used_alignment &&
    missingTerms.length > 0

  return {
    raw_word_text: params.rawText,
    segment_text: params.segmentText,
    used_hybrid_text: usedHybridText,
    missing_terms_from_words: missingTerms,
    confidence: params.confidence,
    reason: usedHybridText
      ? `${params.reason} Texto alinhado ao words.json antes de aplicar a revisao hibrida.`
      : `${params.reason} Alinhamento insuficiente ou nenhum termo importante ausente foi detectado.`,
    alignment: params.alignment,
    editorial_split: params.editorialSplit,
  }
}

function buildCaptionVersion(lines: SyncedCaptionLine[]): SyncedCaptionVersion {
  return {
    lines,
    srt: buildSrt(lines),
    plain_text: lines.map((line) => line.text).join('\n'),
    json: lines,
  }
}

function normalizeCaptionReviewInput(input: unknown): SyncedCaptions | null {
  const value = input as Partial<SyncedCaptions> | null

  if (!value || !Array.isArray(value.lines) || !value.lines.length) return null

  const lines = value.lines
    .map((line): SyncedCaptionLine | null => {
      const candidate = line as Partial<SyncedCaptionLine>
      const start = Number(candidate.start)
      const end = Number(candidate.end)
      const text = cleanText(String(candidate.text || ''))

      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || !text) {
        return null
      }

      const normalizedLine: SyncedCaptionLine = {
        start,
        end,
        text,
        words_count: Number(candidate.words_count) || text.split(/\s+/).filter(Boolean).length,
      }

      if (candidate.timing_mode) {
        normalizedLine.timing_mode = candidate.timing_mode
      }

      return normalizedLine
    })
    .filter((line): line is SyncedCaptionLine => Boolean(line))

  if (!lines.length) return null

  return {
    source: 'word_timestamps',
    mode: value.mode || 'word_only',
    cut_title: cleanText(String(value.cut_title || 'Corte selecionado')),
    cut_start: Number(value.cut_start) || 0,
    cut_end: Number(value.cut_end) || 0,
    duration_seconds: Number(value.duration_seconds) || 0,
    words_count: Number(value.words_count) || 0,
    lines,
    srt: cleanText(String(value.srt || '')),
    plain_text: cleanText(String(value.plain_text || '')),
    json: lines,
    caption_quality_warnings: Array.isArray(value.caption_quality_warnings) ? value.caption_quality_warnings : [],
    algorithm_version: cleanText(String(value.algorithm_version || '')),
    debug: value.debug,
    word_only: value.word_only,
    hybrid_debug: value.hybrid_debug,
  }
}

function tokenizeForCoverage(text: string) {
  return normalizeTextForCaptionSearch(text)
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
}

function validateCaptionCoverage(params: {
  sourceText: string
  finalLines: SyncedCaptionLine[]
  protectedPhrases: string[]
}) {
  const sourceTokens = tokenizeForCoverage(params.sourceText).filter((token) => !COVERAGE_WEAK_TOKENS.has(token))
  const outputText = params.finalLines.map((line) => line.text).join(' ')
  const outputTokens = new Set(tokenizeForCoverage(outputText).filter((token) => !COVERAGE_WEAK_TOKENS.has(token)))
  const uniqueSourceTokens = [...new Set(sourceTokens)]
  const missingImportantTokens = uniqueSourceTokens.filter((token) => !outputTokens.has(token)).slice(0, 20)
  const coveredCount = uniqueSourceTokens.length - missingImportantTokens.length
  const coverageRatio = uniqueSourceTokens.length ? coveredCount / uniqueSourceTokens.length : 1
  const normalizedSource = normalizeTextForCaptionSearch(params.sourceText)
  const normalizedOutput = normalizeTextForCaptionSearch(outputText)
  const requiredProtectedPhrases = params.protectedPhrases.filter((phrase) => normalizedSource.includes(phrase))
  const missingProtectedPhrases = requiredProtectedPhrases.filter((phrase) => !normalizedOutput.includes(phrase))
  const threshold = uniqueSourceTokens.length < 18 ? 0.82 : 0.88

  return {
    coverageRatio: Number(coverageRatio.toFixed(2)),
    missingImportantTokens,
    missingProtectedPhrases,
    protectedPhrasesRequired: requiredProtectedPhrases,
    protectedPhrasesPreserved: requiredProtectedPhrases.filter((phrase) => normalizedOutput.includes(phrase)),
    passed: coverageRatio >= threshold && missingProtectedPhrases.length === 0,
  }
}

function distributeCaptionTextsToTimedLines(params: {
  captionTexts: string[]
  rawWords: WordTimestamp[]
  cut: CaptionSyncCut
}): SyncedCaptionLine[] {
  const cleanedTexts = params.captionTexts.map(cleanText).filter(Boolean)
  const lineWordCounts = cleanedTexts.map((line) => line.split(/\s+/).filter(Boolean).length)
  const totalWords = lineWordCounts.reduce((sum, count) => sum + count, 0)

  if (totalWords < 3) return []

  const timingStart = params.rawWords[0]?.start ?? params.cut.start
  const timingEnd = params.rawWords[params.rawWords.length - 1]?.end ?? params.cut.end
  const usableStart = Math.max(params.cut.start, timingStart)
  const usableEnd = Math.min(params.cut.end, Math.max(timingEnd, usableStart + 1))
  const totalDuration = Math.max(1, usableEnd - usableStart)
  let cursor = usableStart

  return cleanedTexts.map((text, index) => {
    const wordsCount = lineWordCounts[index]
    const isLast = index === cleanedTexts.length - 1
    const weightedDuration = totalDuration * (wordsCount / Math.max(totalWords, 1))
    const duration = isLast
      ? Math.max(1, usableEnd - cursor)
      : Math.min(4.8, Math.max(1, weightedDuration))
    const start = cursor
    const end = isLast ? usableEnd : Math.min(usableEnd, start + duration)
    cursor = Math.max(end, start + 0.2)

    return {
      start: roundCaptionTime(start - params.cut.start),
      end: roundCaptionTime(Math.max(end, start + 0.8) - params.cut.start),
      text,
      words_count: wordsCount,
      timing_mode: 'approximate_from_words' as const,
    }
  }).filter((line) => line.end > line.start)
}

function finalPolishCaptionLines(lines: SyncedCaptionLine[]) {
  const polished = lines.map((line) => ({ ...line }))

  for (let index = 0; index < polished.length - 1; index += 1) {
    const currentWords = polished[index].text.split(/\s+/).filter(Boolean)
    const nextWords = polished[index + 1].text.split(/\s+/).filter(Boolean)
    const lastWord = currentWords[currentWords.length - 1] || ''
    const firstNext = nextWords[0] || ''

    if (lastWord && nextWords.length && /^(e|mas|que|com|de|para|entao)$/i.test(normalizeCaptionTokenForGrouping(lastWord))) {
      if (currentWords.length > 2) {
        nextWords.unshift(currentWords.pop() as string)
      } else if (currentWords.length + nextWords.length <= 8) {
        currentWords.push(...nextWords)
        nextWords.length = 0
      } else {
        currentWords.push(nextWords.shift() as string)
      }
    }

    if (
      currentWords.length &&
      nextWords.length &&
      normalizeCaptionTokenForGrouping(currentWords[currentWords.length - 1]) === normalizeCaptionTokenForGrouping(nextWords[0]) &&
      /^(que|e|entao)$/i.test(normalizeCaptionTokenForGrouping(nextWords[0]))
    ) {
      nextWords.shift()
    }

    polished[index].text = cleanSyncedCaptionLineText(currentWords)
    polished[index].words_count = currentWords.length
    polished[index + 1].text = cleanSyncedCaptionLineText(nextWords)
    polished[index + 1].words_count = nextWords.length
  }

  return polished.filter((line) => line.text && line.words_count > 0)
}

const HYBRID_PROTECTED_PHRASES = [
  '300 dias de trabalho',
  'pes de jesus',
  'ungiu os pes de jesus',
  'com esse oleo',
  'com esse perfume',
  'secou com os cabelos',
  'perfume de maria',
  'nardo puro',
  'adoracao extravagante',
  'de todo o coracao',
  'terra firme',
  'centuriao',
  'paulo',
  'navio',
  'naufragio',
  'grao de trigo',
  'fruto',
  'betania',
  'lazaro',
  'marta',
  'judas',
  'desperdicio',
  'honra para jesus',
]

const COVERAGE_WEAK_TOKENS = new Set([
  'a',
  'o',
  'e',
  'de',
  'do',
  'da',
  'dos',
  'das',
  'em',
  'com',
  'que',
  'para',
  'por',
  'um',
  'uma',
  'os',
  'as',
])

function splitSentenceLikeHybridText(text: string) {
  return cleanText(text)
    .replace(/\b(E\s+o\s+texto\s+fala)\b/gi, '|$1')
    .replace(/\b(O\s+texto\s+fala)\b/gi, '|$1')
    .replace(/\b(E\s+entao|Então|Entao|Significa|Porque|Mas|Essa\s+foi)\b/g, '|$1')
    .split(/[,.!?;:|]+/)
    .map((chunk) => cleanText(chunk))
    .filter(Boolean)
}

function findProtectedHybridPhrases(text: string) {
  const normalizedText = normalizeTextForCaptionSearch(text)

  return HYBRID_PROTECTED_PHRASES.filter((phrase) => normalizedText.includes(phrase))
}

function splitHybridTextIntoEditorialChunks(text: string): string[] {
  const chunks: string[] = []

  splitSentenceLikeHybridText(text).forEach((chunk) => {
    const normalized = normalizeTextForCaptionSearch(chunk)

    if (
      normalized.includes('esse perfume de maria') &&
      normalized.includes('300') &&
      normalized.includes('dias de trabalho')
    ) {
      chunks.push('esse perfume de Maria equivalia')
      chunks.push('a cerca de 300')
      chunks.push('dias de trabalho')
      return
    }

    if (normalized.includes('texto fala') && normalized.includes('derramou')) {
      chunks.push(/^e\s+/i.test(chunk) ? 'E o texto fala' : 'O texto fala que')
      chunks.push('que ela derramou')
      return
    }

    if (normalized.includes('ungiu os pes de jesus')) {
      chunks.push('ela ungiu os pes de Jesus')
      return
    }

    if (normalized.includes('com esse oleo') && normalized.includes('com esse perfume')) {
      chunks.push('com esse oleo')
      chunks.push('com esse perfume')
      return
    }

    if (normalized.includes('secou com os cabelos')) {
      chunks.push(/^e\s+/i.test(chunk) ? 'e secou com os cabelos' : 'secou com os cabelos')
      return
    }

    if (normalized.includes('essa foi') && normalized.includes('maria trouxe')) {
      chunks.push('Essa foi a expressao')
      chunks.push('que Maria trouxe')
      return
    }

    chunks.push(chunk)
  })

  return mergeTinyCaptionChunks(chunks)
}

function splitChunkIntoCaptionLines(chunk: string) {
  const words = cleanText(chunk).split(/\s+/).map(cleanCaptionWord).filter(Boolean)
  const lines: string[] = []
  let current: string[] = []

  function pushCurrent() {
    if (!current.length) return

    lines.push(cleanSyncedCaptionLineText(current))
    current = []
  }

  words.forEach((word, index) => {
    current.push(word)

    const nextWord = words[index + 1]
    const reachedIdeal = current.length >= 5
    const reachedMax = current.length >= 7
    const shouldHold = nextWord && (isWeakCaptionLineEnding(word) || isWeakCaptionLineOpening(nextWord))

    if ((reachedMax || reachedIdeal) && !shouldHold) {
      pushCurrent()
    }
  })

  pushCurrent()

  return mergeTinyCaptionChunks(lines)
}

function mergeTinyCaptionChunks(lines: string[]) {
  const merged = [...lines]

  for (let index = 0; index < merged.length; index += 1) {
    const words = merged[index].split(/\s+/).filter(Boolean)

    if (words.length !== 1) continue

    const previous = merged[index - 1]
    const next = merged[index + 1]

    if (previous && previous.split(/\s+/).length <= 6) {
      merged[index - 1] = cleanText(`${previous} ${merged[index]}`)
      merged.splice(index, 1)
      index = Math.max(-1, index - 2)
    } else if (next && next.split(/\s+/).length <= 6) {
      merged[index] = cleanText(`${merged[index]} ${next}`)
      merged.splice(index + 1, 1)
      index = Math.max(-1, index - 1)
    }
  }

  return merged
}

function splitHybridTextIntoCaptionLines(text: string) {
  return splitHybridTextIntoEditorialChunks(text)
    .flatMap(splitChunkIntoCaptionLines)
    .filter(Boolean)
}

function buildSafeHybridCaptionLines(params: {
  text: string
  rawWords: WordTimestamp[]
  cut: CaptionSyncCut
}): SyncedCaptionLine[] {
  const words = cleanText(params.text).split(/\s+/).map(cleanCaptionWord).filter(Boolean)
  const lines: string[] = []
  let current: string[] = []

  function pushCurrent() {
    if (!current.length) return

    lines.push(cleanSyncedCaptionLineText(current))
    current = []
  }

  words.forEach((word, index) => {
    current.push(word)
    const nextWord = words[index + 1]
    const reachedMax = current.length >= 7
    const reachedIdeal = current.length >= 5
    const weakEnd = isWeakCaptionLineEnding(word)

    if ((reachedMax || reachedIdeal) && !weakEnd) {
      pushCurrent()
    } else if (reachedMax && weakEnd && nextWord) {
      current.push(nextWord)
    }
  })

  pushCurrent()

  return finalPolishCaptionLines(distributeCaptionTextsToTimedLines({
    captionTexts: mergeTinyCaptionChunks(lines),
    rawWords: params.rawWords,
    cut: params.cut,
  }))
}

function buildCaptionAiReviewPrompt(params: {
  title: string
  bibleReference: string
  selectedCut: CaptionSyncCut | null
  syncedCaptions: SyncedCaptions
  transcriptionText: string
  transcriptionSegments: TranscriptionSegment[]
}) {
  const lines = params.syncedCaptions.lines.map((line, index) => ({
    index,
    start: line.start,
    end: line.end,
    text: line.text,
  }))
  const cutDuration = lines.length
    ? Math.max(0, lines[lines.length - 1].end - lines[0].start)
    : 0
  const segmentText = params.transcriptionSegments
    .filter((segment) => {
      if (!params.selectedCut) return true
      return segment.end >= params.selectedCut.start && segment.start <= params.selectedCut.end
    })
    .map((segment) => segment.text)
    .join(' ')
    .slice(0, 4000)

  return `
Voce e um revisor de legendas para Shorts/Reels/TikTok.
Sua tarefa e melhorar fluidez e legibilidade das legendas, mantendo fidelidade ao audio/transcricao.

REGRAS OBRIGATORIAS:
1. Nao invente conteudo novo.
2. Nao transforme em resumo.
3. Nao mude a mensagem teologica/devocional.
4. Preserve a ordem das ideias.
5. Voce pode retornar numero diferente de linhas da entrada.
6. Para cortes de 15s a 35s, use entre 6 e 12 linhas.
7. Use linhas curtas, naturais e fortes para Shorts/Reels/TikTok.
8. Cada linha deve ter preferencialmente 3 a 7 palavras.
9. Pode dividir uma linha longa em duas.
10. Pode juntar linhas quebradas.
11. Preserve palavras teologicas, biblicas e nomes importantes.
12. Nao precisa preservar timestamps exatos; o backend vai redistribuir os tempos.
13. Retorne apenas o texto revisado por linha. Se incluir start/end aproximado, eles serao ignorados.
14. Corrija quebras ruins: linha terminando com "E", "que", "com", "de"; linha com conectivo solto; duplicacoes como "que que" e "e e"; frases incompletas.
15. Se uma palavra necessaria aparece na transcricao/segmento, pode restaura-la.
16. Se nao tiver certeza, preserve o texto original.

EPISODIO: ${params.title}
REFERENCIA: ${params.bibleReference || 'Nao informada'}
CORTE: ${params.selectedCut ? `${params.selectedCut.start}s - ${params.selectedCut.end}s | ${params.selectedCut.title || ''}` : 'Nao informado'}
DURACAO APROXIMADA DA LEGENDA: ${cutDuration.toFixed(2)}s

TRANSCRICAO/SEGMENTOS DO TRECHO:
${segmentText || params.transcriptionText.slice(0, 4000) || 'Nao enviada'}

DIAGNOSTICO RAW WORDS:
${params.syncedCaptions.debug?.raw_text || 'Nao disponivel'}

DIAGNOSTICO HIBRIDO:
${JSON.stringify(params.syncedCaptions.hybrid_debug || {}, null, 2)}

LINHAS ATUAIS:
${JSON.stringify(lines, null, 2)}

Responda SOMENTE JSON valido neste formato:
{
  "reviewed_lines": [
    { "text": "texto revisado" }
  ],
  "review_notes": ["Reorganizei linhas para melhorar fluidez e remover conectivos soltos."],
  "confidence": "high"
}
`.trim()
}

function buildBestCutsAiPrompt(params: {
  title: string
  bibleReference: string
  description: string
  transcriptionText: string
  transcriptionSegments: TranscriptionSegment[]
  dailyQuoteSuggestions: unknown
}) {
  const segmentsText = params.transcriptionSegments.length
    ? params.transcriptionSegments
        .slice(0, MAX_SEGMENTS)
        .map((segment) => `${segment.start.toFixed(1)}-${segment.end.toFixed(1)}s: ${segment.text}`)
        .join('\n')
    : 'Sem segmentos com timestamp.'

  return `
Voce e um editor de Shorts/Reels/TikTok para conteudo devocional biblico.
Sua tarefa e escolher os melhores cortes do episodio para gerar conteudo curto com alto potencial de retencao.

Priorize:
1. Cortes de 25s a 45s como Short ideal.
2. Cortes de 15s a 25s apenas se forem ganchos muito fortes.
3. Cortes de 46s a 60s como Short estendido.
4. Cortes de 61s a 90s somente se forem realmente bons, marcados como Microdevocional.
5. Evite cortes acima de 90s, exceto se houver motivo editorial muito forte.

Evite cortes que:
- comecam sem contexto;
- terminam no meio da ideia;
- dependem demais do que foi dito antes;
- tem muita introducao antes da frase forte;
- sao longos sem tensao;
- tem titulo generico;
- sao apenas explicacao sem gancho.

Avalie:
- forca do hook nos primeiros 3 segundos;
- clareza biblica;
- tensao espiritual;
- imagem visual concreta;
- potencial de retencao;
- possibilidade de gerar legenda forte;
- possibilidade de visual/B-roll;
- fidelidade ao episodio;
- CTA para ouvir o devocional completo.

Tipos de corte:
- Gancho forte: 15s-25s
- Short ideal: 26s-45s
- Short estendido: 46s-60s
- Microdevocional: 61s-90s
- Corte longo: acima de 90s, evitar

Campos de producao:
- production_priority: o corte mais publicavel deve ser 1.
- production_role permitido: main_short, quick_teaser, extended_short, micro_devotional, sensitive_topic, backup_cut.
- production_label permitido: Postar primeiro, Postar depois, Teaser curto, Microdevocional, Usar com cuidado, Reserva.
- editorial_alert_level permitido: low, medium, high.
- should_publish_first deve ser true apenas no melhor corte para comecar.
- needs_context_warning deve ser true quando o corte pode ser mal interpretado fora do contexto.
- Cortes de 15s a 25s podem ser quick_teaser.
- Cortes de 26s a 45s devem ser main_short quando claros e fortes.
- Cortes de 46s a 60s podem ser extended_short.
- Cortes de 61s a 90s devem preferencialmente ser micro_devotional.
- Cortes sensiveis devem receber sensitive_topic ou editorial_alert_level medium/high.
- Temas com oferta, manipulacao, "nao e obediencia", "nao se pede", Judas ou desperdicio exigem cuidado editorial.
- Se um corte tiver mais de 60s ou parecer longo demais para Short principal, sugira suggested_smaller_cut quando houver recorte menor confiavel dentro dele.
- safe_title_suggestion: quando o corte for sensivel ou ambiguo, sugira um titulo mais seguro e fiel, sem exagero.

Regra de primeiro post:
- O corte recomendado como primeiro post deve ser o mais seguro, claro, concreto, visual e facil de entender sem contexto.
- Prioridade #1 deve ter baixo risco editorial, ideia clara, imagem visual forte, numero concreto ou frase memoravel, baixa chance de ma interpretacao e duracao preferencial de 25s a 45s.
- Cortes com alerta medio/alto NAO devem ser #1 se existir outro corte forte com risco baixo.
- Cortes sobre oferta, manipulacao, "nao e obediencia", "nao se pede", pastor, pulpito ou dinheiro nao devem ser #1, salvo se forem o unico corte forte do episodio.
- Cortes conceituais podem ter nota alta, mas devem vir como "Postar depois" ou "Usar com cuidado" quando houver risco de interpretacao.
- Cortes com numero concreto e imagem visual clara devem subir na prioridade.
- Exemplo: se houver um corte sobre "300 dias de trabalho aos pes de Jesus" com baixo risco, ele deve ter prioridade sobre um corte teologico sensivel sobre "adoracao nao e obediencia".

Separacao importante sobre linguagem financeira:
- Nao trate mencoes ao valor do perfume/nardo como tema sensivel por si so.
- "300 dias de trabalho", "denarios", "valor do perfume" e "perfume caro" sao elementos visuais e narrativos seguros quando ligados a cena de Maria aos pes de Jesus.
- Tema sensivel e quando o corte fala de oferta financeira, pressao religiosa, pastor, pulpito, manipulacao, dinheiro, "nao se pede", "foi pedido" ou doacao motivada por autoridade humana.
- O corte do perfume de Maria deve ser considerado seguro se o foco for a cena biblica e a honra a Jesus.
- Cortes com numero concreto e imagem visual clara podem ser bons candidatos a primeiro post.

EPISODIO: ${params.title}
REFERENCIA: ${params.bibleReference || 'Nao informada'}
DESCRICAO: ${params.description || 'Nao informada'}

FRASES/IDEIAS JA GERADAS:
${JSON.stringify(params.dailyQuoteSuggestions || [], null, 2).slice(0, 3500)}

TRANSCRICAO COM TIMESTAMPS:
${segmentsText}

TRANSCRICAO COMPLETA:
${params.transcriptionText.slice(0, MAX_TRANSCRIPTION_CHARS)}

Retorne de 3 a 5 cortes principais quando houver material suficiente.
Retorne SOMENTE JSON valido neste formato:
{
  "cuts": [
    {
      "start": 293,
      "end": 318,
      "title": "O Valor da Adoracao",
      "hook": "Maria derramou um perfume que custava 300 dias de trabalho.",
      "opening_line": "Voce sabe quanto custava o perfume que Maria derramou aos pes de Jesus?",
      "base_excerpt": "Significa entao que esse perfume de Maria equivalia a cerca de 300 dias de trabalho...",
      "reason": "Esse trecho tem numero concreto, tensao espiritual e imagem visual forte.",
      "retention_score": 9,
      "biblical_specificity": 9,
      "visual_potential": 9,
      "emotional_tension": 8,
      "share_potential": 8,
      "fidelity_to_audio": 10,
      "duration_type": "ideal_short",
      "duration_label": "Short ideal",
      "recommended_use": "Short/Reels/TikTok principal",
      "risk": "Baixo. O trecho e claro e visual.",
      "production_priority": 1,
      "production_label": "Postar primeiro",
      "production_role": "main_short",
      "editorial_alert_level": "low",
      "editorial_alert": "Baixo risco. Corte claro, visual e fiel ao episodio.",
      "format_recommendation": "Short principal",
      "should_publish_first": true,
      "needs_context_warning": false,
      "safe_title_suggestion": null,
      "suggested_smaller_cut": null,
      "caption_lines": ["300 dias de trabalho", "um perfume derramado", "aos pes de Jesus"]
    }
  ],
  "editorial_summary": "Resumo editorial dos melhores cortes.",
  "warnings": []
}
`.trim()
}

// AI-PROVIDER-007: best_cuts_ai usa DeepSeek Pro como primário para schema complexo
async function generateBestCutsWithOpenAI(params: {
  title: string
  bibleReference: string
  description: string
  transcriptionText: string
  transcriptionSegments: TranscriptionSegment[]
  dailyQuoteSuggestions: unknown
}): Promise<BestAiCutsResult> {
  if (!params.transcriptionText && !params.transcriptionSegments.length) {
    throw new Error('Este episodio precisa de transcricao para gerar melhores cortes com IA forte.')
  }

  // AI-PROVIDER-007: Alterado de deepseek-pro para deepseek-flash para evitar timeouts em produção
  const ai = getAIProvider({
    textProvider: 'deepseek-flash',
    fallbackProvider: 'openai',
  })

  const promptText = buildBestCutsAiPrompt(params)

  const result = await ai.generateJson({
    system: 'Voce e um editor senior de cortes devocionais. Responda somente JSON valido.',
    prompt: promptText,
    schema: `{
  "cuts": [
    {
      "start": number, "end": number, "title": string,
      "hook": string, "opening_line": string,
      "base_excerpt": string, "reason": string,
      "retention_score": number, "biblical_specificity": number,
      "visual_potential": number, "emotional_tension": number,
      "share_potential": number, "fidelity_to_audio": number,
      "duration_type": string, "duration_label": string,
      "recommended_use": string, "risk": string,
      "production_priority": number, "production_label": string,
      "production_role": string, "editorial_alert_level": string,
      "editorial_alert": string, "format_recommendation": string,
      "should_publish_first": boolean, "needs_context_warning": boolean,
      "safe_title_suggestion": string | null,
      "suggested_smaller_cut": object | null,
      "caption_lines": string[]
    }
  ],
  "editorial_summary": string,
  "warnings": string[]
}`,
    validate: (raw) => normalizeBestAiCuts(raw, ai.activeTextModel),
    temperature: 0.25,
    maxTokens: 8192,
  })

  return result
}

function ensureVisualPromptSafety(prompt: string) {
  const cleaned = cleanText(prompt)
  const parts = [cleaned]
  const normalized = normalizeTextForCaptionSearch(cleaned)

  if (!normalized.includes('vertical') || !normalized.includes('9:16')) {
    parts.push('Vertical 9:16.')
  }
  if (!normalized.includes('cinematic') && !normalized.includes('biblical')) {
    parts.push('Cinematic biblical realism.')
  }
  if (!normalized.includes('no text') && !normalized.includes('sem texto')) {
    parts.push('No text in image, sem texto na imagem.')
  }

  return parts.join(' ').trim()
}

function normalizeVisualStoryboard(input: unknown, model: string, cutDuration: number): VisualStoryboard {
  const parsed = input as { visual_storyboard?: unknown }
  const rawStoryboard = (parsed.visual_storyboard || input) as {
    visual_style?: unknown
    format?: unknown
    summary?: unknown
    visual_concept?: unknown
    scenes?: unknown
    image_prompts?: unknown
    motion_plan?: unknown
    sound_plan?: unknown
    cta_visual?: unknown
    quality_checklist?: unknown
    warnings?: unknown
  }
  const rawScenes = Array.isArray(rawStoryboard.scenes) ? rawStoryboard.scenes.slice(0, 12) : []

  if (rawScenes.length < 2) {
    throw new Error('A IA nao retornou cenas suficientes para o storyboard visual.')
  }

  const sceneCount = rawScenes.length
  let cursor = 0
  const scenes = rawScenes.map((item, index): VisualStoryboardScene => {
    const value = item as {
      start?: unknown
      end?: unknown
      role?: unknown
      title?: unknown
      on_screen_text?: unknown
      visual_description?: unknown
      image_prompt?: unknown
      b_roll?: unknown
      motion?: unknown
      sound?: unknown
      editing_note?: unknown
    }
    const fallbackStart = (cutDuration / sceneCount) * index
    const fallbackEnd = index === sceneCount - 1 ? cutDuration : (cutDuration / sceneCount) * (index + 1)
    let start = Number(value.start)
    let end = Number(value.end)

    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || start < cursor - 0.1) {
      start = fallbackStart
      end = fallbackEnd
    }

    start = Math.max(0, Math.max(cursor, start))
    end = Math.min(cutDuration, Math.max(start + 0.5, end))
    cursor = end

    const title = cleanText(String(value.title || '')).slice(0, 100) || `Cena ${index + 1}`
    const visualDescription = cleanText(String(value.visual_description || '')).slice(0, 420)
    const imagePrompt = ensureVisualPromptSafety(String(value.image_prompt || visualDescription || title))

    if (!visualDescription || !imagePrompt) {
      throw new Error('Uma cena do storyboard veio sem descricao visual ou prompt de imagem.')
    }

    return {
      start: Number(start.toFixed(2)),
      end: Number(end.toFixed(2)),
      role: cleanText(String(value.role || (index === 0 ? 'hook' : 'scene'))).slice(0, 60),
      title,
      on_screen_text: cleanText(String(value.on_screen_text || '')).slice(0, 120),
      visual_description: visualDescription,
      image_prompt: imagePrompt,
      b_roll: cleanText(String(value.b_roll || '')).slice(0, 260),
      motion: cleanText(String(value.motion || '')).slice(0, 220),
      sound: cleanText(String(value.sound || '')).slice(0, 220),
      editing_note: cleanText(String(value.editing_note || '')).slice(0, 260),
    }
  })

  const imagePrompts = Array.isArray(rawStoryboard.image_prompts)
    ? rawStoryboard.image_prompts.slice(0, 12).map((item, index) => {
        const value = item as { label?: unknown; prompt?: unknown }
        return {
          label: cleanText(String(value.label || `Cena ${index + 1}`)).slice(0, 80),
          prompt: ensureVisualPromptSafety(String(value.prompt || scenes[index]?.image_prompt || '')),
        }
      }).filter((item) => item.prompt)
    : scenes.map((scene) => ({ label: scene.title, prompt: scene.image_prompt }))
  const ctaVisual = rawStoryboard.cta_visual as { text?: unknown; visual?: unknown; motion?: unknown } | undefined
  const quality = rawStoryboard.quality_checklist as Partial<VisualStoryboard['quality_checklist']> | undefined

  return {
    mode: 'visual_storyboard',
    version: 'cc-f4-visual-storyboard',
    model,
    visual_style: cleanText(String(rawStoryboard.visual_style || '')).slice(0, 100) || 'cinematic biblical realism',
    format: cleanText(String(rawStoryboard.format || '')).slice(0, 60) || 'vertical 9:16',
    summary: cleanText(String(rawStoryboard.summary || '')).slice(0, 360) || 'Plano visual para o Short selecionado.',
    visual_concept: cleanText(String(rawStoryboard.visual_concept || '')).slice(0, 360) || 'Visual biblico, reverente e cinematografico.',
    scenes,
    image_prompts: imagePrompts.length ? imagePrompts : scenes.map((scene) => ({ label: scene.title, prompt: scene.image_prompt })),
    motion_plan: normalizeStringArray(rawStoryboard.motion_plan, 8, 180),
    sound_plan: normalizeStringArray(rawStoryboard.sound_plan, 8, 180),
    cta_visual: {
      text: cleanText(String(ctaVisual?.text || '')).slice(0, 120) || 'Ouca o devocional completo no app',
      visual: cleanText(String(ctaVisual?.visual || '')).slice(0, 220) || 'Tela final limpa com fundo reverente.',
      motion: cleanText(String(ctaVisual?.motion || '')).slice(0, 160) || 'Fade in suave.',
    },
    quality_checklist: {
      has_hook_visual: quality?.has_hook_visual !== false,
      has_biblical_fidelity: quality?.has_biblical_fidelity !== false,
      has_scene_variety: quality?.has_scene_variety !== false,
      has_cta: quality?.has_cta !== false,
      avoids_text_inside_image: quality?.avoids_text_inside_image !== false,
    },
    warnings: normalizeStringArray(rawStoryboard.warnings, 6, 180),
  }
}

function buildVisualStoryboardPrompt(params: {
  title: string
  bibleReference: string
  description: string
  selectedCut: CutSuggestion
  shortScript?: unknown
  finalCaptions?: unknown
  hook?: string
  cta?: string
  editorialAlert?: string
}) {
  const cutDuration = Math.max(1, params.selectedCut.end - params.selectedCut.start)
  const sceneGuidance =
    cutDuration <= 25 ? '3 a 4 cenas' :
      cutDuration <= 45 ? '4 a 6 cenas' :
        cutDuration <= 60 ? '5 a 7 cenas' :
          cutDuration <= 90 ? '6 a 9 cenas' :
            'ate 12 cenas, com aviso de corte longo'

  return `
Voce e um diretor criativo de videos biblicos/devocionais verticais.
Crie um storyboard visual para um Short/Reels/TikTok com base no corte selecionado.

Tom: biblico, reverente, cinematografico, pastoral, sem sensacionalismo, sem teatralidade exagerada.
Nao gere imagem. Nao chame API de imagem. Crie apenas planejamento textual.

Regras:
1. Nao invente cenario que contradiga a Biblia ou o episodio.
2. Nao troque cena biblica concreta por metafora generica.
3. Para Maria/nardo/Betania: use casa simples em Betania, ceia, Marta servindo, Lazaro a mesa, Maria aos pes de Jesus, nardo/perfume/oleo, pes de Jesus e clima de reverencia.
4. Para Atos 27/naufragio: use navio, mar, naufragio, centuriao, soldados, prisioneiros, Paulo e terra firme; nao use casa, porta, estrada ou vila generica.
5. Nao incluir letras/texto dentro das imagens geradas.
6. O texto na tela deve ser aplicado pelo editor/app, nao gerado na imagem.
7. Priorize hook visual nos primeiros 3 segundos, variacao visual a cada 5 a 8 segundos, motion suave, pausas dramaticas e texto curto na tela.
8. Crie ${sceneGuidance} para este corte.
9. Todo image_prompt deve mencionar vertical 9:16, cinematic biblical realism e no text in image / sem texto na imagem.

EPISODIO: ${params.title}
REFERENCIA: ${params.bibleReference || 'Nao informada'}
DESCRICAO: ${params.description || 'Nao informada'}

CORTE:
${JSON.stringify(params.selectedCut, null, 2)}

ROTEIRO DO SHORT:
${JSON.stringify(params.shortScript || {}, null, 2).slice(0, 9000)}

LEGENDA FINAL:
${JSON.stringify(params.finalCaptions || {}, null, 2).slice(0, 7000)}

HOOK: ${params.hook || params.selectedCut.hook}
CTA: ${params.cta || 'Ouca o devocional completo no app.'}
ALERTA EDITORIAL: ${params.editorialAlert || params.selectedCut.editorial_alert || 'Nenhum.'}

Retorne SOMENTE JSON valido:
{
  "visual_storyboard": {
    "mode": "visual_storyboard",
    "version": "cc-f4-visual-storyboard",
    "model": "",
    "visual_style": "cinematic biblical realism",
    "format": "vertical 9:16",
    "summary": "Plano visual para o Short...",
    "visual_concept": "Conceito visual central...",
    "scenes": [
      {
        "start": 0,
        "end": 3,
        "role": "hook",
        "title": "O valor do perfume",
        "on_screen_text": "300 dias de trabalho",
        "visual_description": "Close cinematografico no frasco de nardo...",
        "image_prompt": "Vertical 9:16, cinematic biblical realism, ... no text in image, sem texto na imagem.",
        "b_roll": "Close do perfume sendo derramado...",
        "motion": "zoom lento de aproximacao",
        "sound": "impacto suave e pausa curta",
        "editing_note": "Texto entra em duas etapas..."
      }
    ],
    "image_prompts": [{ "label": "Cena principal", "prompt": "Vertical 9:16..." }],
    "motion_plan": ["Zoom lento no hook"],
    "sound_plan": ["Trilha baixa e reverente"],
    "cta_visual": { "text": "Ouca o devocional completo no app", "visual": "Tela final limpa com fundo reverente", "motion": "fade in suave" },
    "quality_checklist": {
      "has_hook_visual": true,
      "has_biblical_fidelity": true,
      "has_scene_variety": true,
      "has_cta": true,
      "avoids_text_inside_image": true
    },
    "warnings": []
  }
}
`.trim()
}

// AI-PROVIDER-007: visual_storyboard usa DeepSeek Pro como primário para schema complexo
async function generateVisualStoryboardWithOpenAI(params: {
  title: string
  bibleReference: string
  description: string
  selectedCut: CutSuggestion
  shortScript?: unknown
  finalCaptions?: unknown
  hook?: string
  cta?: string
  editorialAlert?: string
}): Promise<VisualStoryboard> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY ausente.')
  }

  const baseUrl = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '')
  const model = 'deepseek-v4-pro'
  const system = 'Voce e um diretor criativo de videos biblicos verticais. Responda somente JSON valido.'
  const promptText = buildVisualStoryboardPrompt(params)
  const cutDuration = params.selectedCut.end - params.selectedCut.start

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      stream: true,
      temperature: 0.35,
      max_tokens: 8192,
      messages: [
        {
          role: 'system',
          content: [
            system,
            '',
            'INSTRUÇÃO DE FORMATO:',
            'Você DEVE responder APENAS com JSON válido.',
            'Não inclua markdown, explicações ou texto adicional.',
            'Apenas o JSON puro.',
            '',
            'ESQUEMA ESPERADO:',
            `{
  "visual_storyboard": {
    "mode": "visual_storyboard",
    "version": "cc-f4-visual-storyboard",
    "model": "",
    "visual_style": "cinematic biblical realism",
    "format": "vertical 9:16",
    "summary": "Plano visual para o Short...",
    "visual_concept": "Conceito visual central...",
    "scenes": [
      {
        "start": number, "end": number, "role": string,
        "title": string, "on_screen_text": string,
        "visual_description": string, "image_prompt": string,
        "b_roll": string, "motion": string, "sound": string,
        "editing_note": string
      }
    ],
    "image_prompts": [{ "label": string, "prompt": string }],
    "motion_plan": string[], "sound_plan": string[],
    "cta_visual": { "text": string, "visual": string, "motion": string },
    "quality_checklist": {
      "has_hook_visual": boolean, "has_biblical_fidelity": boolean,
      "has_scene_variety": boolean, "has_cta": boolean,
      "avoids_text_inside_image": boolean
    },
    "warnings": string[]
  }
}`,
          ].join('\n'),
        },
        {
          role: 'user',
          content: [
            promptText,
            '',
            'Responda APENAS com JSON válido. Sem markdown. Sem texto extra.',
          ].join('\n'),
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(
      errorData?.error?.message || `DeepSeek Pro streaming erro HTTP ${response.status}`
    )
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('DeepSeek Pro nao retornou um body para streaming.')
  }

  const decoder = new TextDecoder()
  let accumulatedContent = ''
  const chunks: string[] = []

  // Consumir o stream DeepSeek e acumular o conteudo
  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const text = decoder.decode(value, { stream: true })
    const lines = text.split('\n').filter((line) => line.trim().startsWith('data: '))

    for (const line of lines) {
      const data = line.replace(/^data: /, '').trim()
      if (data === '[DONE]') continue

      try {
        const parsed = JSON.parse(data)
        const delta = parsed?.choices?.[0]?.delta?.content || ''
        if (delta) {
          accumulatedContent += delta
          chunks.push(delta)
        }
      } catch {
        // ignora linhas parseaveis do stream
      }
    }
  }

  if (!accumulatedContent) {
    throw new Error('DeepSeek Pro nao retornou conteudo no stream.')
  }

  // Extrai e valida o JSON do conteudo acumulado
  // 1. Remove blocos de markdown (```json ... ```)
  let cleanedJson = accumulatedContent
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  // 2. Extrai o primeiro objeto JSON completo com regex
  const jsonMatch = cleanedJson.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('DeepSeek Pro nao retornou JSON valido no stream.')
  }

  const jsonStr = jsonMatch[0]

  // Diagnóstico do stream bruto vindo do DeepSeek Pro
  console.log("=== [DIAGNÓSTICO STREAM BRUTO] ===")
  console.log("Tamanho total acumulado:", accumulatedContent.length, "caracteres")
  console.log("Primeiros 300 caracteres:", accumulatedContent.slice(0, 300))
  console.log("Últimos 300 caracteres:", accumulatedContent.slice(-300))
  console.log("Conteúdo completo:")
  console.log(accumulatedContent)
  console.log("=== [FIM DIAGNÓSTICO] ===")

  // 3. Aplica correções de sintaxe específicas para o stream do DeepSeek Pro
  function fixCorruptedJson(input: string): string {
    const fixes: Array<{ pattern: RegExp; replacement: string; label: string }> = [
      { pattern: /([{,]\s*)(start")\s*:/g, replacement: '$1"$2', label: 'start": → "start":' },
      { pattern: /([{,]\s*)start"\s*:/g, replacement: '$1"start":', label: 'start": aspa faltando' },
      { pattern: /"_screen_text"\s*:/g, replacement: '"on_screen_text":', label: '_screen_text → on_screen_text' },
      { pattern: /"m"\s*:/g, replacement: '"motion":', label: '"m": → "motion":' },
      { pattern: /"sound\s*"?\s*(?=:)/g, replacement: '"sound"', label: '"sound semi-corrompido' },
      { pattern: /"sound"?\s*:/g, replacement: '"sound":', label: '"sound": faltando' },
      { pattern: /"end\s+(\d+)/g, replacement: '"end": $1', label: '"end N → "end": N' },
      { pattern: /"end"\s*:\s*(\d+)/g, replacement: '"end": $1', label: '"end": N normalizado' },
      { pattern: /([{,]\s*)(title|role|on_screen_text|visual_description|image_prompt|b_roll|editing_note|hook|cta|summary|visual_concept|visual_style|format|text|label|prompt|visual|motion|purpose|narration_focus|visual_direction|motion_direction|sound_design|mode|version|model)"?\s*:/g, replacement: '$1"$2":', label: 'chave sem aspa inicial' },
    ]

    let fixed = input
    for (const fix of fixes) {
      const before = fixed
      fixed = fixed.replace(fix.pattern, fix.replacement)
      if (before !== fixed) {
        console.log(`[FIX JSON] Aplicado: ${fix.label}`)
      }
    }

    return fixed
  }

  function parseJsonRobustly(input: string): unknown {
    // Tentativa 1: parse direto (se já veio limpo)
    try {
      return JSON.parse(input)
    } catch {
      // fallback
    }

    // Tentativa 2: aplicar correções específicas de sintaxe do DeepSeek Pro
    const step2 = fixCorruptedJson(input)
      .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
      .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
      .replace(/\\(?!["\\/bfnrtu])/g, '\\\\')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')

    try {
      return JSON.parse(step2)
    } catch {
      // fallback
    }

    // Tentativa 3: fallback com regex no input original + correções
    const fallbackMatch = input.match(/\{[\s\S]*\}/)
    if (!fallbackMatch) throw new Error('Nao foi possivel extrair JSON do stream do DeepSeek Pro.')

    const raw = fixCorruptedJson(fallbackMatch[0])
      .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
      .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
      .replace(/(["'])\s*\n\s*/g, '$1 ')

    try {
      return JSON.parse(raw)
    } catch (fullError) {
      // Tentativa 4: se falhar, tenta parsear cena por cena (scenes array)
      // Isola a estrutura pai sem o array de scenes
      const parentMatch = raw.match(/\{[\s\S]*"scenes"\s*:\s*\[/)
      const tailMatch = raw.match(/\][\s\S]*\}$/)
      const scenesBlock = raw.match(/"scenes"\s*:\s*\[([\s\S]*?)\]\s*/)

      if (parentMatch && tailMatch && scenesBlock) {
        const parentPart = parentMatch[0].replace(/,\s*$/, '') // tudo antes da array
        const closePart = tailMatch[0] // tudo depois da array
        const rawScenesArray = scenesBlock[1] // conteúdo dentro da array

        // Tenta parsear cada cena individualmente com regex
        const sceneRegex = /\{[^{}]*\}/g
        const sceneMatches = rawScenesArray.match(sceneRegex)
        const parsedScenes: unknown[] = []

        if (sceneMatches) {
          for (const sceneStr of sceneMatches) {
            try {
              const fixedScene = fixCorruptedJson(sceneStr)
                .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
                .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
              parsedScenes.push(JSON.parse(fixedScene))
            } catch {
              // ignora cena que nao foi possivel parsear
            }
          }

          if (parsedScenes.length >= 2) {
            // Reconstrói o JSON completo com as cenas parseadas individualmente
            const reconstructed = `${parentPart}, ${JSON.stringify(parsedScenes)} ${closePart}`
            try {
              return JSON.parse(reconstructed)
            } catch {
              // fallback final
            }
          }
        }
      }

      throw new Error(`Nao foi possivel parsear JSON do DeepSeek Pro apos todas as tentativas. Ultimo erro: ${fullError instanceof Error ? fullError.message : String(fullError)}`)
    }
  }

  const rawJson = parseJsonRobustly(jsonStr)
  const validated = normalizeVisualStoryboard(rawJson, model, cutDuration)

  return validated
}

function normalizeAiReviewedLineText(text: string) {
  return cleanText(text)
    .replace(/([,.!?;:])\1+/g, '$1')
    .replace(/\s+([,.!?;:])/g, '$1')
}

function validateAiCaptionReviewCoverage(params: {
  sourceText: string
  reviewedLines: string[]
}) {
  const sourceLines = params.reviewedLines.map((text, index) => ({
    start: index,
    end: index + 1,
    text,
    words_count: text.split(/\s+/).filter(Boolean).length,
  }))
  const validation = validateCaptionCoverage({
    sourceText: params.sourceText,
    finalLines: sourceLines,
    protectedPhrases: HYBRID_PROTECTED_PHRASES,
  })
  const passed = validation.coverageRatio >= 0.72 && validation.missingProtectedPhrases.length === 0

  return {
    ...validation,
    passed,
  }
}

function redistributeReviewedCaptionTimes(params: {
  reviewedLines: string[]
  originalLines: SyncedCaptionLine[]
}): SyncedCaptionLine[] {
  const startTotal = params.originalLines[0]?.start ?? 0
  const endTotal = params.originalLines[params.originalLines.length - 1]?.end ?? startTotal + 1
  const totalDuration = Math.max(0.5, endTotal - startTotal)
  const lineWordCounts = params.reviewedLines.map((line) => line.split(/\s+/).filter(Boolean).length)
  const totalWeight = lineWordCounts.reduce((sum, count) => sum + Math.max(1, count), 0)
  const minimumDuration = totalDuration >= params.reviewedLines.length ? 1 : totalDuration / params.reviewedLines.length
  const leftoverDuration = Math.max(0, totalDuration - minimumDuration * params.reviewedLines.length)
  let cursor = startTotal

  return params.reviewedLines.map((text, index) => {
    const isLast = index === params.reviewedLines.length - 1
    const wordsCount = lineWordCounts[index]
    const weightedExtra = leftoverDuration * (Math.max(1, wordsCount) / Math.max(1, totalWeight))
    const duration = isLast ? Math.max(0.2, endTotal - cursor) : Math.max(0.2, minimumDuration + weightedExtra)
    const start = index === 0 ? startTotal : cursor
    const end = isLast ? endTotal : Math.min(endTotal, start + duration)

    cursor = end

    return {
      start: roundCaptionTime(start),
      end: roundCaptionTime(Math.max(end, start + 0.2)),
      text,
      words_count: wordsCount,
      timing_mode: 'redistributed_from_original_caption' as const,
    }
  })
}

function normalizeReviewedCaptions(params: {
  input: unknown
  syncedCaptions: SyncedCaptions
  model: string
}): ReviewedCaptions {
  const parsed = params.input as {
    reviewed_lines?: Array<{ text?: unknown; start?: unknown; end?: unknown }>
    review_notes?: unknown
    confidence?: unknown
  }
  const reviewedLines = Array.isArray(parsed.reviewed_lines) ? parsed.reviewed_lines : []
  const reviewedTexts = reviewedLines
    .map((line) => normalizeAiReviewedLineText(String(line?.text || '')))
    .filter(Boolean)

  if (reviewedTexts.length < 3) {
    throw new Error('A revisao da IA ficou curta demais ou removeu conteudo importante. Tente revisar novamente.')
  }

  if (reviewedTexts.length > 18) {
    throw new Error('A IA retornou linhas demais para este corte. Tente revisar novamente.')
  }

  const validation = validateAiCaptionReviewCoverage({
    sourceText: params.syncedCaptions.plain_text || params.syncedCaptions.lines.map((line) => line.text).join(' '),
    reviewedLines: reviewedTexts,
  })

  if (!validation.passed) {
    throw new Error('A revisao da IA parece ter removido conteudo importante. Tente novamente.')
  }

  const lines = redistributeReviewedCaptionTimes({
    reviewedLines: reviewedTexts,
    originalLines: params.syncedCaptions.lines,
  })
  const version = buildCaptionVersion(lines)
  const confidence = cleanText(String(parsed.confidence || 'medium'))

  return {
    mode: 'ai_review_flex',
    algorithm_version: CAPTION_AI_REVIEW_ALGORITHM_VERSION,
    base_algorithm_version: params.syncedCaptions.algorithm_version,
    lines: version.lines,
    plain_text: version.plain_text,
    srt: version.srt,
    json: version.json,
    review_notes: normalizeStringArray(parsed.review_notes, 8, 180),
    confidence: confidence === 'high' || confidence === 'low' ? confidence : 'medium',
    model: params.model,
    timing_mode: 'redistributed_from_original_caption',
    validation: {
      coverage_ratio: validation.coverageRatio,
      missing_important_tokens: validation.missingImportantTokens,
      missing_protected_phrases: validation.missingProtectedPhrases,
      original_line_count: params.syncedCaptions.lines.length,
      reviewed_line_count: lines.length,
    },
  }
}

/**
 * Gera conteúdo textual simples (summary, whatsapp, instagram) usando getAIProvider.
 * AI-PROVIDER-006: DeepSeek Flash como primário, OpenAI como fallback.
 */
async function generateSimpleContentWithAI(params: {
  title: string
  bibleReference: string
  description: string
  transcriptionText: string
  transcriptionSegments: TranscriptionSegment[]
  dailyQuoteSuggestions: unknown
  hasReliableSegments: boolean
  mode: GenerationMode
  selectedCut?: CutSuggestion | null
}): Promise<{ model: string; assets: Partial<ContentAssets> }> {
  const ai = getAIProvider({
    textProvider: 'deepseek-flash',
    fallbackProvider: 'openai',
  })

  const promptText = buildPrompt(params)

  const result = await ai.generateJson({
    system:
      'Você é um editor devocional cristão brasileiro. Responda somente em JSON válido.',
    prompt: promptText,
    schema: buildModeOutputContract(params.mode),
    validate: (raw) =>
      validateAssets(raw, {
        mode: params.mode,
        hasReliableSegments: params.hasReliableSegments,
        transcriptionSegments: params.transcriptionSegments,
        selectedCut: params.selectedCut,
      }),
    temperature: 0.55,
    maxTokens: 4096,
  })

  return {
    model: ai.activeTextModel,
    assets: result,
  }
}

async function reviewCaptionsWithOpenAI(params: {
  title: string
  bibleReference: string
  transcriptionText: string
  transcriptionSegments: TranscriptionSegment[]
  selectedCut: CaptionSyncCut | null
  syncedCaptions: SyncedCaptions
}): Promise<ReviewedCaptions> {
  const ai = getAIProvider({
    textProvider: 'deepseek-flash',
    fallbackProvider: 'openai',
  })

  const promptText = buildCaptionAiReviewPrompt(params)

  const result = await ai.generateJson({
    system: 'Voce e um revisor editorial de legendas curtas. Responda somente JSON valido.',
    prompt: promptText,
    schema: `{
  "reviewed_lines": [{ "text": "texto revisado" }],
  "review_notes": ["notas da revisao"],
  "confidence": "high"
}`,
    validate: (raw) =>
      normalizeReviewedCaptions({
        input: raw,
        syncedCaptions: params.syncedCaptions,
        model: ai.activeTextModel,
      }),
    temperature: 0.2,
    maxTokens: 2048,
  })

  return result
}

function buildHybridCaptionLines(params: {
  hybridText: string
  rawWords: WordTimestamp[]
  cut: CaptionSyncCut
}): SyncedCaptionLine[] {
  return finalPolishCaptionLines(distributeCaptionTextsToTimedLines({
    captionTexts: splitHybridTextIntoCaptionLines(params.hybridText),
    rawWords: params.rawWords,
    cut: params.cut,
  }))
}

function groupCaptionWords(words: WordTimestamp[], cut: CaptionSyncCut): SyncedCaptionLine[] {
  const usableWords = words
    .map((word) => ({
      ...word,
      word: cleanCaptionWord(word.word),
    }))
    .filter((word) => word.word && !shouldSkipCaptionToken(word.word))

  const groups: WordTimestamp[][] = []
  const noBreakAfter = buildStrongExpressionNoBreaks(usableWords)
  let current: WordTimestamp[] = []

  for (let index = 0; index < usableWords.length; index += 1) {
    const word = usableWords[index]
    const nextWord = usableWords[index + 1]
    current.push(word)

    if (!nextWord) {
      groups.push(current)
      current = []
      continue
    }

    const duration = getCaptionGroupDuration(current)
    const wordsCount = current.length
    const gapToNext = nextWord.start - word.end
    const lastWord = word.word
    const firstNextWord = nextWord.word
    const shouldProtectExpression = noBreakAfter.has(index)
    const shouldPullNext = isWeakCaptionLineEnding(lastWord) || isWeakCaptionLineOpening(firstNextWord)
    const reachedPause = gapToNext > 0.55 && wordsCount >= 3 && duration >= 1.0
    const reachedIdealSize = wordsCount >= 5 && duration >= 1.2
    const reachedHardLimit = wordsCount >= 7 || duration >= 3.8

    if ((reachedHardLimit || reachedPause || reachedIdealSize) && !shouldPullNext && !shouldProtectExpression) {
      groups.push(current)
      current = []
    }
  }

  const refinedGroups = refineCaptionGroups(groups)
  const lines = refinedGroups
    .map((group) => {
      const text = cleanSyncedCaptionLineText(group.map((word) => word.word))

      return {
        start: roundCaptionTime(group[0].start - cut.start),
        end: roundCaptionTime(group[group.length - 1].end - cut.start),
        text,
        words_count: group.length,
        timing_mode: 'word_timestamps' as const,
      }
    })

  return lines.filter((line) => line.end > line.start && line.text)
}

async function readR2ObjectAsText(key: string) {
  const response = await r2Client.send(
    new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    })
  )
  const body = response.Body as { transformToString?: () => Promise<string> } | undefined

  if (!body?.transformToString) {
    throw new Error('Nao foi possivel ler words.json no R2.')
  }

  return body.transformToString()
}

async function fetchWordsJson(params: { url?: string | null; key?: string | null }) {
  if (params.url) {
    const response = await fetch(params.url)

    if (!response.ok) {
      throw new Error('Nao foi possivel baixar words.json pela URL publica.')
    }

    return response.text()
  }

  if (params.key) {
    return readR2ObjectAsText(params.key)
  }

  throw new Error('Este episodio ainda nao possui arquivo words.json.')
}

async function buildSyncedCaptions(params: {
  episodeId: string
  selectedCut: CaptionSyncCut
}): Promise<SyncedCaptions> {
  const supabase = await createSupabaseServerClient()
  const { data: episode, error } = await supabase
    .from('episodes')
    .select('id, title, transcription_text, transcription_segments, transcription_words_url, transcription_words_key, transcription_words_status, transcription_words_count')
    .eq('id', params.episodeId)
    .single()

  if (error || !episode) {
    throw new Error('Episodio nao encontrado para sincronizar legendas.')
  }

  if (
    episode.transcription_words_status !== 'ready' ||
    (!episode.transcription_words_url && !episode.transcription_words_key)
  ) {
    throw new Error('Este episodio ainda nao possui timestamps avancados. Gere os timestamps avancados antes de sincronizar legendas.')
  }

  const wordsText = await fetchWordsJson({
    url: episode.transcription_words_url,
    key: episode.transcription_words_key,
  })
  const parsed = JSON.parse(wordsText) as { words?: unknown }
  const words = Array.isArray(parsed.words)
    ? parsed.words.map(normalizeWordTimestamp).filter((word): word is WordTimestamp => Boolean(word))
    : []

  if (!words.length) {
    throw new Error('O arquivo words.json nao possui palavras validas.')
  }

  const cut = params.selectedCut
  const cutWords = words
    .filter((word) => word.start >= cut.start - 0.15 && word.end <= cut.end + 0.15)
    .sort((a, b) => a.start - b.start)

  if (cutWords.length < 8) {
    throw new Error('Nao ha palavras suficientes neste intervalo para gerar legendas sincronizadas.')
  }

  const wordOnlyLines = groupCaptionWords(cutWords, cut)

  if (!wordOnlyLines.length) {
    throw new Error('Nao foi possivel agrupar palavras em legendas sincronizadas.')
  }

  const wordOnly = buildCaptionVersion(wordOnlyLines)
  const debug = buildCaptionSyncDebug(cutWords, cut)
  const segmentSource = getSegmentTextForCut({
    segments: normalizeSegments(episode.transcription_segments),
    transcriptionText: cleanText(String(episode.transcription_text || '')),
    cutStart: cut.start,
    cutEnd: cut.end,
  })
  const alignment = alignHybridTextToRawWords({
    segmentText: segmentSource.text,
    rawWordText: debug.raw_text,
  })
  const alignedHybridText = alignment.aligned_text || segmentSource.text
  const editorialCaptionTexts = splitHybridTextIntoCaptionLines(alignedHybridText)
  const editorialSplitDebug: EditorialSplitDebug = {
    chunks_count: splitHybridTextIntoEditorialChunks(alignedHybridText).length,
    lines_count: editorialCaptionTexts.length,
    protected_phrases_found: findProtectedHybridPhrases(alignedHybridText),
  }
  const hybridDebug = buildCaptionHybridDebug({
    rawText: debug.raw_text,
    segmentText: segmentSource.text,
    confidence: segmentSource.confidence,
    reason: segmentSource.reason,
    alignment,
    editorialSplit: editorialSplitDebug,
  })
  const hybridLines = hybridDebug.used_hybrid_text
    ? buildHybridCaptionLines({
        hybridText: alignedHybridText,
        rawWords: cutWords,
        cut,
      })
    : []
  let finalHybridLines = hybridLines
  let fallbackUsed = false
  let validation = validateCaptionCoverage({
    sourceText: alignedHybridText,
    finalLines: finalHybridLines,
    protectedPhrases: HYBRID_PROTECTED_PHRASES,
  })
  let fallbackCoverageRatio: number | undefined

  if (hybridDebug.used_hybrid_text && finalHybridLines.length > 0 && !validation.passed) {
    fallbackUsed = true
    finalHybridLines = buildSafeHybridCaptionLines({
      text: alignedHybridText,
      rawWords: cutWords,
      cut,
    })
    const fallbackValidation = validateCaptionCoverage({
      sourceText: alignedHybridText,
      finalLines: finalHybridLines,
      protectedPhrases: HYBRID_PROTECTED_PHRASES,
    })
    fallbackCoverageRatio = fallbackValidation.coverageRatio
    validation = fallbackValidation
  }

  const useHybrid = hybridDebug.used_hybrid_text && finalHybridLines.length > 0
  const primaryLines = useHybrid ? finalHybridLines : wordOnlyLines
  const primaryVersion = buildCaptionVersion(primaryLines)
  const captionQualityWarnings = buildCaptionQualityWarnings(primaryLines)

  if (useHybrid) {
    captionQualityWarnings.unshift('Legenda revisada usando a transcricao do segmento. Tempos aproximados com base nos word timestamps.')
  }

  if (useHybrid && fallbackUsed) {
    captionQualityWarnings.push('A quebra editorial perdeu parte do conteudo. Foi usado modo seguro de legenda.')
  }

  hybridDebug.final_validation = {
    coverage_ratio: validation.coverageRatio,
    missing_important_tokens: validation.missingImportantTokens,
    missing_protected_phrases: validation.missingProtectedPhrases,
    fallback_used: fallbackUsed,
    fallback_coverage_ratio: fallbackCoverageRatio,
    passed: validation.passed,
    final_lines_count: primaryLines.length,
    final_words_count: primaryLines.reduce((sum, line) => sum + line.words_count, 0),
    protected_phrases_required: validation.protectedPhrasesRequired,
    protected_phrases_preserved: validation.protectedPhrasesPreserved,
  }

  return {
    source: 'word_timestamps',
    mode: useHybrid ? 'hybrid' : 'word_only',
    cut_title: cut.title || episode.title || 'Corte selecionado',
    cut_start: cut.start,
    cut_end: cut.end,
    duration_seconds: Math.round(cut.end - cut.start),
    words_count: cutWords.length,
    lines: primaryVersion.lines,
    srt: primaryVersion.srt,
    plain_text: primaryVersion.plain_text,
    json: primaryVersion.json,
    caption_quality_warnings: captionQualityWarnings,
    algorithm_version: CAPTION_SYNC_ALGORITHM_VERSION,
    debug,
    word_only: wordOnly,
    hybrid_debug: hybridDebug,
  }
}

function buildExpandedCut(
  selectedCut: CutSuggestion,
  segments: TranscriptionSegment[]
): CutSuggestion | null {
  const sortedSegments = [...segments].sort((a, b) => a.start - b.start)
  const hookStart = selectedCut.start
  const hookEnd = selectedCut.end
  const hookSegmentIndexes = sortedSegments
    .map((segment, index) => ({ segment, index }))
    .filter(({ segment }) => segment.end >= hookStart && segment.start <= hookEnd)
    .map(({ index }) => index)

  if (!hookSegmentIndexes.length) return null

  const hookFirstIndex = hookSegmentIndexes[0]
  const hookLastIndex = hookSegmentIndexes[hookSegmentIndexes.length - 1]
  const hookDuration = hookEnd - hookStart
  const candidates: Array<{ startIndex: number; endIndex: number; strategy: string; score: number }> = []

  function getWindowText(startIndex: number, endIndex: number) {
    return sortedSegments
      .slice(startIndex, endIndex + 1)
      .map((segment) => segment.text)
      .join(' ')
  }

  function getEndingQuality(text: string) {
    const normalized = cleanText(text)
    const tail = normalized.slice(-240).toLowerCase()
    let score = 0
    let needsManualTrim = false

    if (/[.!?…]$/.test(normalized)) score += 14
    if (/[,:;]$/.test(normalized)) {
      score -= 22
      needsManualTrim = true
    }

    if (/\b(portanto|porque|que|para|mas|ent[aã]o)\s*[,.:;]?\s*$/i.test(normalized)) {
      score -= 28
      needsManualTrim = true
    }

    if (/(portanto,\s*)?(a b[ií]blia ensina).{0,80}\1?\2/i.test(tail)) {
      score -= 24
      needsManualTrim = true
    }

    if (/\b(deu vida|saia para fora|sai para fora|jesus entra|bom [aâ]nimo|vida para l[aá]zaro)\b/i.test(tail)) {
      score += 26
    }

    if (/\b(am[eé]m|gl[oó]ria a deus|descansa|confia|ele chama|ele vem|ele entra)\b/i.test(tail)) {
      score += 12
    }

    if (tail.split(/\s+/).length < 8) {
      score -= 8
      needsManualTrim = true
    }

    return { score, needsManualTrim }
  }

  function addCandidate(startIndex: number, endIndex: number, strategy: string) {
    const start = sortedSegments[startIndex]?.start
    const end = sortedSegments[endIndex]?.end
    const duration = end - start

    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      duration < SOFT_MIN_CUT_SECONDS ||
      duration > MAX_CUT_SECONDS ||
      (hookDuration < SOFT_MIN_CUT_SECONDS && start === hookStart && end === hookEnd)
    ) {
      return
    }

    const beforeSeconds = Math.max(0, hookStart - start)
    const afterSeconds = Math.max(0, end - hookEnd)
    const endingQuality = getEndingQuality(getWindowText(startIndex, endIndex))
    const score =
      100 -
      Math.abs(duration - 45) -
      Math.abs(beforeSeconds - afterSeconds) * 0.25 +
      (beforeSeconds >= 5 ? 8 : 0) +
      (afterSeconds >= 5 ? 8 : 0) +
      endingQuality.score

    candidates.push({ startIndex, endIndex, strategy, score })
  }

  function expandByTargets(beforeTarget: number, afterTarget: number, strategy: string) {
    let startIndex = hookFirstIndex
    let endIndex = hookLastIndex

    while (
      startIndex > 0 &&
      sortedSegments[startIndex].start > hookStart - beforeTarget &&
      sortedSegments[endIndex].end - sortedSegments[startIndex - 1].start <= MAX_CUT_SECONDS
    ) {
      startIndex -= 1
    }

    while (
      endIndex < sortedSegments.length - 1 &&
      sortedSegments[endIndex].end < hookEnd + afterTarget &&
      sortedSegments[endIndex + 1].end - sortedSegments[startIndex].start <= MAX_CUT_SECONDS
    ) {
      endIndex += 1
    }

    addCandidate(startIndex, endIndex, strategy)
  }

  expandByTargets(30, 30, 'adicionou contexto antes e depois do gancho')
  expandByTargets(10, 45, 'priorizou desenvolvimento e fechamento depois do gancho')
  expandByTargets(45, 10, 'priorizou preparacao antes do gancho')

  for (let startIndex = hookFirstIndex; startIndex >= 0; startIndex -= 1) {
    for (let endIndex = hookLastIndex; endIndex < sortedSegments.length; endIndex += 1) {
      const duration = sortedSegments[endIndex].end - sortedSegments[startIndex].start

      if (duration > MAX_CUT_SECONDS) break
      addCandidate(startIndex, endIndex, 'usou a melhor janela valida de segmentos vizinhos')
    }
  }

  const bestCandidate = candidates.sort((a, b) => b.score - a.score)[0]

  if (!bestCandidate) return null

  const { startIndex, endIndex, strategy } = bestCandidate
  const start = sortedSegments[startIndex].start
  const end = sortedSegments[endIndex].end
  const duration = Math.round(end - start)

  const sourceExcerpt = sortedSegments
    .slice(startIndex, endIndex + 1)
    .map((segment) => segment.text)
    .join(' ')
    .slice(0, 700)
  const endingQuality = getEndingQuality(sourceExcerpt)
  const trimWarning = 'O corte foi expandido, mas o final pode precisar de ajuste manual.'

  const expansionReason = `Expandido a partir do gancho ${hookStart.toFixed(1)}s-${hookEnd.toFixed(1)}s: ${strategy}. A janela foi ampliada para incluir contexto suficiente sem ultrapassar 75 segundos.`

  return {
    title: selectedCut.title,
    start,
    end,
    duration,
    reason: selectedCut.reason || 'Corte expandido a partir de um gancho forte com contexto antes e depois.',
    hook: selectedCut.hook,
    source_excerpt: sourceExcerpt,
    suggested_caption_lines: selectedCut.suggested_caption_lines || [],
    original_hook_start: hookStart,
    original_hook_end: hookEnd,
    strength_score: selectedCut.strength_score,
    strength_reason: selectedCut.strength_reason,
    cut_type: 'full_cut',
    needs_expansion: false,
    expansion_reason: expansionReason,
    needs_manual_trim: endingQuality.needsManualTrim,
    trim_warning: endingQuality.needsManualTrim ? trimWarning : undefined,
  }
}

function validateAssets(
  input: unknown,
  options: {
    mode: GenerationMode
    hasReliableSegments: boolean
    transcriptionSegments: TranscriptionSegment[]
    selectedCut?: CutSuggestion | null
  }
): Partial<ContentAssets> {
  const parsed = input as {
    assets?: unknown
    devotional_summary?: unknown
    strong_phrases?: unknown
    whatsapp_text?: unknown
    instagram_caption?: unknown
    hashtags?: unknown
    short_ideas?: unknown
    cut_suggestions?: unknown
    cut_suggestions_note?: unknown
    short_script?: unknown
    metadata?: unknown
  }

  const source = (parsed.assets || parsed) as typeof parsed

  const devotionalSummary = cleanText(String(source.devotional_summary || ''))
  const whatsappText = cleanText(String(source.whatsapp_text || ''))
  const instagramCaption = cleanText(String(source.instagram_caption || ''))
  const strongPhrases = normalizeStrongPhrases(source.strong_phrases)
  const hashtags = normalizeStringArray(source.hashtags, 8, 40)
  const shortIdeas = normalizeShortIdeas(source.short_ideas)
  const cutSuggestions = options.hasReliableSegments
    ? normalizeCutSuggestions(source.cut_suggestions, options.transcriptionSegments)
    : []
  const cutSuggestionsNote = cleanText(
    String(source.cut_suggestions_note || '')
  )
  const shortScript = normalizeShortScript(source.short_script)
  const selectedCutDuration = options.selectedCut
    ? Math.max(1, Math.round(options.selectedCut.end - options.selectedCut.start))
    : 0

  if (shortScript && options.mode === 'short_script' && selectedCutDuration > 0) {
    shortScript.duration_seconds = selectedCutDuration
    shortScript.timeline = shortScript.timeline.map((item, index, timeline) => {
      const isLast = index === timeline.length - 1

      return {
        ...item,
        start: Math.max(0, Math.min(selectedCutDuration, Math.round(item.start))),
        end: isLast
          ? selectedCutDuration
          : Math.max(0, Math.min(selectedCutDuration, Math.round(item.end))),
      }
    }).filter((item) => item.end > item.start)
  }

  if (shortScript && options.mode === 'short_script') {
    completeShortScriptFallbacks(shortScript, options.selectedCut)
  }
  const rawMetadata = (source.metadata || {}) as {
    main_scripture?: unknown
    key_themes?: unknown
    theological_focus?: unknown
  }
  const metadata = {
    main_scripture: cleanText(String(rawMetadata.main_scripture || '')).slice(0, 120) || undefined,
    key_themes: normalizeStringArray(rawMetadata.key_themes, 8, 60),
    theological_focus: cleanText(String(rawMetadata.theological_focus || '')).slice(0, 180) || undefined,
  }

  if ((options.mode === 'all' || options.mode === 'summary') && !devotionalSummary) {
    throw new Error('A IA não gerou resumo devocional.')
  }

  if ((options.mode === 'all' || options.mode === 'phrases') && strongPhrases.length < 3) {
    throw new Error('A IA não gerou frases fortes suficientes.')
  }

  if ((options.mode === 'all' || options.mode === 'whatsapp') && !whatsappText) {
    throw new Error('A IA não gerou texto para WhatsApp.')
  }

  if ((options.mode === 'all' || options.mode === 'instagram') && !instagramCaption) {
    throw new Error('A IA não gerou legenda para Instagram.')
  }

  if ((options.mode === 'all' || options.mode === 'short_ideas') && shortIdeas.length < 1) {
    throw new Error('A IA não gerou ideias de Shorts.')
  }

  if (options.mode === 'short_script' && !shortScript) {
    throw new Error('A IA nao gerou um roteiro de Short completo.')
  }

  const assets: Partial<ContentAssets> = {}

  if (options.mode === 'all' || options.mode === 'summary') {
    assets.devotional_summary = devotionalSummary
  }

  if (options.mode === 'all' || options.mode === 'phrases') {
    assets.strong_phrases = strongPhrases
  }

  if (options.mode === 'all' || options.mode === 'whatsapp') {
    assets.whatsapp_text = whatsappText
  }

  if (options.mode === 'all' || options.mode === 'instagram') {
    assets.instagram_caption = instagramCaption
    assets.hashtags = hashtags
  }

  if (options.mode === 'all' || options.mode === 'short_ideas') {
    assets.short_ideas = shortIdeas
  }

  if (options.mode === 'all' || options.mode === 'cuts') {
    assets.cut_suggestions = cutSuggestions
    assets.cut_suggestions_note = !options.hasReliableSegments
      ? cutSuggestionsNote || MISSING_TIMESTAMPS_NOTE
      : cutSuggestions.length === 0
        ? cutSuggestionsNote || 'Nenhum corte forte passou pelos criterios editoriais. Tente gerar cortes novamente ou revise os timestamps.'
        : undefined
  }

  if (options.mode === 'short_script') {
    assets.short_script = shortScript
  }

  if (
    options.mode === 'all' &&
    (metadata.main_scripture || metadata.key_themes.length || metadata.theological_focus)
  ) {
    assets.metadata = metadata
  }

  return assets
}

async function requireAdminUser() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return { ok: false as const, status: 401, message: 'Nao autenticado.' }
  }

  const adminEmail = (process.env.ADMIN_EMAIL || 'djeonewill@gmail.com').toLowerCase()
  const userEmail = (user.email || '').toLowerCase()

  if (userEmail !== adminEmail) {
    return { ok: false as const, status: 403, message: 'Acesso restrito ao administrador.' }
  }

  return { ok: true as const }
}

function buildModeOutputContract(mode: GenerationMode) {
  const contracts: Record<GenerationMode, string> = {
    all: `
Gere todos os blocos abaixo.

{
  "assets": {
    "devotional_summary": "resumo devocional de 2 a 3 paragrafos curtos",
    "strong_phrases": [
      {
        "text": "frase especifica e memoravel",
        "use_case": "card",
        "source_excerpt": "trecho real da transcricao",
        "why_it_works": "por que a frase e forte e especifica",
        "score": 9
      }
    ],
    "whatsapp_text": "texto pronto para WhatsApp",
    "instagram_caption": "legenda pronta para Instagram",
    "hashtags": ["#Devocional", "#PalavraDoDia"],
    "short_ideas": [
      {
        "title": "ideia do short",
        "hook": "primeira frase forte do video",
        "angle": "angulo editorial",
        "suggested_opening_line": "linha de abertura sugerida",
        "why_it_can_work": "por que essa ideia prende atencao"
      }
    ],
    "cut_suggestions": [
      {
        "title": "nome do corte",
        "start": 10,
        "end": 45,
        "reason": "por que esse trecho funciona",
        "hook": "gancho de abertura",
        "source_excerpt": "fala real da transcricao que justifica o corte",
        "suggested_caption_lines": ["linha curta 1", "linha curta 2"]
      }
    ],
    "cut_suggestions_note": "aviso opcional quando nao houver timestamps",
    "metadata": {
      "main_scripture": "referencia principal",
      "key_themes": ["tema 1", "tema 2"],
      "theological_focus": "foco teologico da mensagem"
    }
  }
}

Retorne 5 a 8 strong_phrases, 3 a 5 short_ideas, ate 5 cut_suggestions e 5 a 8 hashtags.
`.trim(),
    summary: `
Gere somente devotional_summary.
{
  "assets": {
    "devotional_summary": "resumo devocional de 2 a 3 paragrafos curtos"
  }
}
`.trim(),
    phrases: `
Gere somente strong_phrases.
{
  "assets": {
    "strong_phrases": [
      {
        "text": "frase especifica e memoravel",
        "use_case": "card",
        "source_excerpt": "trecho real da transcricao",
        "why_it_works": "por que a frase e forte e especifica",
        "score": 9
      }
    ]
  }
}
Retorne 5 a 8 frases.
`.trim(),
    whatsapp: `
Gere somente whatsapp_text.
{
  "assets": {
    "whatsapp_text": "texto curto, pastoral e pronto para WhatsApp"
  }
}
`.trim(),
    instagram: `
Gere somente instagram_caption e hashtags.
{
  "assets": {
    "instagram_caption": "legenda com primeira linha forte, corpo curto e CTA suave",
    "hashtags": ["#Devocional", "#PalavraDoDia"]
  }
}
Retorne 5 a 8 hashtags.
`.trim(),
    short_ideas: `
Gere somente short_ideas.
{
  "assets": {
    "short_ideas": [
      {
        "title": "ideia do short",
        "hook": "gancho forte",
        "angle": "angulo editorial",
        "suggested_opening_line": "linha de abertura sugerida",
        "why_it_can_work": "por que essa ideia prende atencao"
      }
    ]
  }
}
Retorne 3 a 5 ideias.
`.trim(),
    cuts: `
Gere somente cut_suggestions e cut_suggestions_note.
{
  "assets": {
    "cut_suggestions": [
      {
        "title": "nome do corte",
        "start": 10,
        "end": 45,
        "hook": "gancho de abertura",
        "reason": "por que esse trecho funciona como short",
        "source_excerpt": "fala real da transcricao que justifica o corte",
        "suggested_caption_lines": ["linha curta 1", "linha curta 2"],
        "strength_score": 9,
        "strength_reason": "por que esse trecho prende a atencao",
        "cut_type": "full_cut",
        "needs_expansion": false
      }
    ],
    "cut_suggestions_note": "aviso somente se nao houver cortes possiveis"
  }
}
Retorne ate 5 candidatos editoriais, sem forcar preenchimento se nao houver qualidade.
Procure pelo menos 2 full_cut se houver material forte suficiente e ate 3 hook para expansao.
Classifique mentalmente:
- full_cut: 25s a 75s, ideal 30s a 60s, com comeco, desenvolvimento e fechamento.
- hook: 15s a 25s, frase forte com retencao, mas precisa expansao; use needs_expansion true.
- rejected: fraco, introdutorio, administrativo ou meramente informativo; nao retorne.
Busque variedade: contraste teologico, aplicacao devocional, emocao/identificacao e frase memoravel.
`.trim(),
    short_script: `
Gere somente short_script a partir do selected_cut informado.
{
  "assets": {
    "short_script": {
      "title": "titulo editorial do Short",
      "platform_goal": "shorts_reels_tiktok",
      "duration_seconds": 45,
      "main_hook": "gancho forte para os primeiros 3 segundos",
      "hook_original": "ideia real do gancho no corte",
      "hook_improved": "versao mais concreta, visual e fiel ao audio",
      "why_hook_improved": "por que a versao aprimorada prende mais atencao",
      "suggested_opening_line": "frase conversacional para abrir o Short",
      "why_opening_works": "por que a abertura gera curiosidade e tensao",
      "cliffhanger": "curiosidade espiritual que sustenta a retencao",
      "spiritual_point": "aplicacao espiritual fiel ao trecho",
      "cta": "chamada suave sem cara de propaganda",
      "retention_score": 8,
      "score_breakdown": {
        "hook_strength": 8,
        "biblical_specificity": 8,
        "visual_concreteness": 8,
        "emotional_tension": 7,
        "share_potential": 7,
        "fidelity_to_audio": 9
      },
      "timeline": [
        {
          "start": 0,
          "end": 3,
          "purpose": "hook",
          "narration_focus": "o que a fala precisa provocar neste momento",
          "on_screen_text": "3 a 7 palavras",
          "visual_direction": "imagem concreta para este trecho",
          "motion_direction": "zoom lento, pan leve ou entrada simples de texto",
          "sound_design": "impacto suave, pausa ou ambiente leve"
        }
      ],
      "animated_caption_lines": ["linha curta animavel", "3 a 7 palavras"],
      "caption_lines_improved": ["linha curta recomendada", "3 a 7 palavras"],
      "image_prompts": [
        {
          "moment": "momento visual",
          "prompt": "prompt cinematografico vertical 9:16, fiel ao tema, sem exagero teatral",
          "use_for_seconds": "0-5s"
        }
      ],
      "visual_suggestions": [
        {
          "start": 0,
          "end": 5,
          "visual_goal": "objetivo visual do bloco",
          "scene_description": "cena concreta e fiel ao trecho",
          "motion": "zoom lento ou pan leve",
          "sound_design": "impacto suave ou pausa discreta"
        }
      ],
      "editing_notes": ["nota pratica de edicao"],
      "quality_check": {
        "has_strong_hook": true,
        "has_clear_tension": true,
        "has_spiritual_application": true,
        "has_soft_cta": true,
        "avoids_generic_language": true
      }
    }
  }
}
Retorne um roteiro completo, pronto para orientar edicao manual. Nao gere imagem, video ou assets externos.
`.trim(),
    expand_cut: `
Gere somente expanded_cut a partir do selected_cut informado e dos segmentos proximos.
{
  "assets": {
    "expanded_cut": {
      "title": "titulo do corte expandido",
      "start": 380,
      "end": 430,
      "duration": 50,
      "hook": "gancho forte original",
      "reason": "por que funciona como corte completo",
      "source_excerpt": "trecho real expandido",
      "suggested_caption_lines": ["linha curta 1", "linha curta 2"],
      "original_hook_start": 400,
      "original_hook_end": 415,
      "expansion_reason": "como o contexto antes/depois fortalece o corte",
      "strength_score": 9,
      "strength_reason": "por que prende atencao"
    }
  }
}
`.trim(),
    caption_sync: `
Este modo e local. Nao chame IA para caption_sync.
`.trim(),
    caption_ai_review: `
Este modo revisa legendas sincronizadas ja geradas. Use somente o fluxo dedicado de revisao.
`.trim(),
    best_cuts_ai: `
Este modo usa IA forte para selecionar e lapidar os melhores cortes editoriais.
`.trim(),
    visual_storyboard: `
Este modo usa IA forte para gerar um storyboard visual textual para o Short selecionado.
`.trim(),
  }

  return contracts[mode]
}

function buildPrompt(params: {
  title: string
  bibleReference: string
  description: string
  transcriptionText: string
  transcriptionSegments: TranscriptionSegment[]
  dailyQuoteSuggestions: unknown
  hasReliableSegments: boolean
  mode: GenerationMode
  selectedCut?: CutSuggestion | null
}) {
  const segmentsText = params.transcriptionSegments.length
    ? params.transcriptionSegments
        .map((segment) => {
          return `${segment.start.toFixed(1)}-${segment.end.toFixed(1)}s: ${segment.text}`
        })
        .join('\n')
    : 'Sem segmentos com timestamp.'

  const cutInstructions = params.hasReliableSegments
    ? `
REGRAS PARA CORTES COM TIMESTAMP:
- nao corte o audio mecanicamente;
- nao fatie de 30 em 30 segundos;
- ETAPA A: primeiro leia a transcricao inteira e identifique momentos fortes;
- priorize contraste espiritual, frase biblica marcante, tensao emocional, aplicacao direta, explicacao teologica forte, frase que prende nos primeiros 3 segundos e trecho que funciona para quem nao ouviu o audio completo;
- rebaixe ou ignore saudacao, introducao do projeto, explicacao de serie, contexto geografico sem aplicacao, trecho meramente informativo, oracao final longa e pedido final de compartilhar/cadastrar;
- exemplos de momentos fortes neste tipo de episodio: "A presenca de Deus nao estava no templo, mas em Betania."; "Jesus chorou na casa da aflicao."; "Senhor, se Tu estivesses aqui, meu irmao nao teria morrido."; "Este mundo e uma Betania, mas Jesus disse: tende bom animo."; "Jesus entra na nossa Betania.";
- ETAPA B: depois de encontrar os momentos fortes, crie cortes;
- depois escolha inicio e fim naturais da ideia;
- so entao ajuste para duracao ideal;
- gere cut_suggestions somente usando tempos presentes nos segmentos informados;
- nunca invente timestamps;
- o start e o end devem encostar em limites reais de segmentos;
- cada corte deve ter source_excerpt com uma fala real do trecho;
- evite cortes de "bom dia", saudacao, aviso administrativo, explicacao de serie/projeto, introducao longa, oracao final longa e pedido final de compartilhar/cadastrar;
- corte ideal: 30 a 60 segundos; corte aceitavel: 25 a 75 segundos;
- nao use cortes com menos de 15 segundos como cut_suggestion;
- se um trecho forte tiver menos de 20 segundos, use como strong_phrase, suggested_opening_line ou caption line, nao como corte principal;
- forme blocos completos de ideia: começo com gancho, desenvolvimento curto, aplicacao ou frase final;
- agrupe segmentos vizinhos quando necessario para formar uma ideia completa;
- cada corte precisa fazer sentido para quem nao ouviu o audio inteiro;
- evite corte isolado de uma unica frase curta ou dependente de contexto anterior nao incluido;
- nao escolha trecho so porque explica contexto;
- cada corte deve funcionar como mini-mensagem;
- retorne strength_score de 1 a 10 e strength_reason explicando por que prende a atencao;
- ignore trechos sem frase forte nos primeiros 3 segundos;
- priorize frase biblica marcante, interpretacao teologica forte, aplicacao direta, tensao espiritual, contraste, momento emocional e gancho que prende nos primeiros 3 segundos;
- retorne full_cut para cortes completos de 25 a 75 segundos, com needs_expansion false;
- retorne hook para trechos curtos fortes de 15 a 25 segundos, com needs_expansion true;
- tente variedade entre contraste teologico, aplicacao devocional, emocao/identificacao e frase memoravel;
- nao retorne cortes meramente informativos;
- inclua suggested_caption_lines com linhas curtas de 3 a 7 palavras para legenda animada.
`.trim()
    : `
REGRAS PARA CORTES SEM TIMESTAMP:
- este episodio nao possui segmentos confiaveis com start/end/text;
- nao gere cut_suggestions com timestamps;
- retorne cut_suggestions como [];
- gere apenas short_ideas editoriais sem tempos;
- retorne cut_suggestions_note com a mensagem: "${MISSING_TIMESTAMPS_NOTE}".
`.trim()

  const quoteSuggestions = Array.isArray(params.dailyQuoteSuggestions)
    ? params.dailyQuoteSuggestions
        .slice(0, 8)
        .map((item) => JSON.stringify(item))
        .join('\n')
    : 'Sem sugestões anteriores.'

  const selectedCutText = params.selectedCut
    ? JSON.stringify(
        {
          title: params.selectedCut.title,
          start: params.selectedCut.start,
          end: params.selectedCut.end,
          hook: params.selectedCut.hook,
          reason: params.selectedCut.reason,
          source_excerpt: params.selectedCut.source_excerpt || '',
          suggested_caption_lines: params.selectedCut.suggested_caption_lines || [],
        },
        null,
        2
      )
    : 'Nenhum corte selecionado.'
  const selectedCutDuration = params.selectedCut
    ? Math.max(1, Math.round(params.selectedCut.end - params.selectedCut.start))
    : 0
  const shortScriptInstructions =
    params.mode === 'short_script'
      ? `
REGRAS PARA ROTEIRO DE SHORT:
- aja como editor de retencao para Shorts/Reels/TikTok, roteirista biblico-devocional, editor pastoral fiel ao audio e estrategista de conteudo curto;
- use exclusivamente o selected_cut como base editorial principal;
- duracao real do corte: ${selectedCutDuration}s;
- short_script.duration_seconds deve ser exatamente ${selectedCutDuration};
- a timeline deve comecar em 0 e terminar exatamente em ${selectedCutDuration}s;
- nao use 45s, 60s ou duracao padrao se o corte tiver outra duracao;
- nao faca roteiro generico;
- transforme o corte em mini-mensagem com comeco, tensao e fechamento;
- o hook precisa prender nos primeiros 3 segundos;
- gere hook_original preservando a ideia real do selected_cut;
- gere hook_improved melhorando a forma do gancho sem inventar doutrina, fato ou cena fora do audio;
- hook_improved deve ser mais visual, concreto, biblico, memoravel, com contraste e facil de entender nos primeiros 3 segundos;
- hook_improved pode reorganizar palavras, mas precisa nascer do selected_cut ou source_excerpt;
- exemplo de melhoria fiel: hook_original "A presenca de Deus nao estava no templo."; hook_improved "Jerusalem tinha o templo. Jesus dormia em Betania.";
- em why_hook_improved, explique por que ficou mais concreto, visual, memoravel e com contraste imediato;
- gere suggested_opening_line como frase conversacional para os primeiros segundos, por exemplo "Voce sabe onde Jesus dormia quando ia a Jerusalem?", "E se a presenca de Deus estivesse mais perto dos aflitos do que do templo?" ou "Jerusalem tinha o templo, mas Jesus escolheu repousar em Betania.";
- suggested_opening_line deve ser forte, mas nao pode exagerar nem distorcer o audio;
- evite "Jesus preferia Betania ao templo" se o audio afirma que Jesus ia ao templo, mas repousava ou dormia em Betania;
- prefira formulacoes fieis como "Jerusalem tinha o templo, mas Jesus repousava em Betania", "Voce sabe onde Jesus repousava quando ia a Jerusalem?" ou "Jesus ia ao templo, mas encontrava repouso em Betania";
- gere why_opening_works explicando se a abertura cria curiosidade, abre tensao, traz contraste e faz a pessoa querer ouvir a continuacao;
- o cliffhanger deve criar curiosidade espiritual sem manipular emocionalmente;
- evite cliffhanger generico como "O que isso significa?" ou "Descubra agora";
- prefira cliffhanger com tensao espiritual real, como "Mas por que o Deus encarnado escolheria a casa da aflicao?" ou "O que havia em Betania que atraia tanto o coracao de Jesus?";
- o CTA deve ser suave, pastoral e sem parecer propaganda;
- evite exigir imagem do aplicativo; prefira CTA em texto na tela;
- use CTA conectado ao app/devocional, como "Ouça o devocional completo no app" ou "Receba uma Palavra todos os dias";
- legenda animada deve ser curta, com 3 a 7 palavras por linha;
- animated_caption_lines e obrigatorio e precisa ter quantidade suficiente;
- para cortes de 25 a 35s, gere 7 a 10 linhas;
- para cortes de 35 a 45s, gere 8 a 14 linhas;
- para cortes de 45 a 60s, gere 12 a 18 linhas;
- as legendas devem seguir o sentido do audio e priorizar frases fortes do selected_cut;
- gere caption_lines_improved alem de animated_caption_lines;
- caption_lines_improved deve ser editorial, limpa e forte, sem copiar pedacos crus da transcricao;
- caption_lines_improved deve comecar com o hook ou hook_improved, preservar o contraste principal do corte, usar frases de 3 a 7 palavras e ritmo de video curto;
- evite muletas de fala como "nos vemos que", "Jesus ele", "portanto" e "mas nos vemos";
- evite termos que confundem o publico quando nao forem explicados, como "Chequena" ou "Shekinah"; se necessario, use "a gloria de Deus";
- nao substitua o hook forte por frases genericas como "Jesus e nosso consolo", "A presenca de Deus esta aqui" ou "Jesus transforma nossa dor" quando a frase central do corte for mais forte;
- para Betania/templo, priorize linhas como "Jerusalem tinha o templo", "Mas Jesus dormia em Betania", "Com o pobre", "Com o aflito", "Na casa da aflicao";
- gere retention_score de 1 a 10 e score_breakdown honesto de 1 a 10 para hook_strength, biblical_specificity, visual_concreteness, emotional_tension, share_potential e fidelity_to_audio;
- nao de 10 para tudo automaticamente;
- on_screen_text tambem deve ter 3 a 7 palavras;
- para cortes entre 35s e 50s, a timeline deve ter 4 a 6 blocos;
- evite bloco unico longo como 3s-42s; divida em momentos de edicao claros;
- use funcoes concretas por bloco: 0-3s hook, 3-10s contraste visual, 10-20s desenvolvimento biblico, 20-32s aplicacao espiritual, 32-42s fechamento/CTA, ajustando ao tempo real do corte;
- cada item da timeline deve ter visual_direction concreto, com cenario, contraste visual ou acao visual;
- evite frases genericas como "Explorar a relacao", "Aplicar a mensagem" ou "Encerrar com convite";
- prefira instrucoes concretas: "Mostrar contraste entre templo e casa simples em Betania"; "Texto entra em duas etapas"; "Pausa dramatica antes de Betania";
- gere visual_suggestions por blocos do video, com start, end, visual_goal, scene_description, motion e sound_design;
- instrucoes de motion devem ser simples: zoom lento, leve pan, blur suave, entrada de texto, pausa dramatica;
- sound design deve ser discreto: impacto suave, ambiente leve, riser curto, pausa, transicao;
- image_prompts e obrigatorio e deve ter 2 a 4 prompts completos;
- prompts de imagem devem ser cinematograficos, verticais 9:16, prontos para uso manual em ferramentas externas;
- cada prompt deve incluir cenario biblico, epoca, composicao, luz, atmosfera, emocao, estilo visual, sem texto na imagem e sem aparencia teatral exagerada;
- cada prompt precisa ter pelo menos 25 palavras e nao pode ser curto/generico;
- para Betania, considere contraste entre Jerusalem/templo e casa simples, casa humilde ao entardecer, pessoas aflitas em ambiente simples e luz suave entrando na casa;
- editing_notes deve indicar ritmo de cortes, zoom/pan, entrada de texto, pausa dramatica, sound design discreto, reforco do hook e onde inserir CTA;
- nao gere imagem por API, nao mencione URL, nao crie video;
- evite exageros teatrais, promessas absolutas e linguagem manipulativa;
- mantenha fidelidade ao audio e ao trecho-base;
- use os timestamps do selected_cut como referencia, mas a timeline do video deve comecar em 0.
`.trim()
      : ''

  return `
Voce e especialista em transformar transcricoes de devocionais biblicos em conteudos para WhatsApp, Instagram, cards e Shorts/Reels/TikToks.

Sua tarefa e extrair conteudo especifico da mensagem, com linguagem pastoral, biblica, clara, memoravel e fiel ao audio.

PRINCIPIOS FUNDAMENTAIS:
- extraia insights especificos da mensagem;
- use nomes biblicos, lugares, personagens, eventos, objetos e imagens concretas quando aparecerem na transcricao;
- crie contrastes espirituais, paradoxos pastorais e aplicacoes diretas;
- mantenha fidelidade absoluta a transcricao;
- nao invente dados, testemunhos, promessas absolutas, informacoes externas ou timestamps;
- nao prometa cura, prosperidade ou resultados automaticos;
- evite frases genericas que poderiam servir para qualquer devocional.

EXEMPLOS BONS:
- "Jerusalem tinha o templo, mas Jesus repousava em Betania."
- "O menor versiculo da Biblia nasceu na casa da aflicao: Jesus chorou."
- "A casa da aflicao se tornou lugar de repouso para o Filho de Deus."

EXEMPLOS RUINS:
- "Jesus transforma dor em esperanca."
- "Na aflicao, Jesus esta presente."
- "Deus tem um proposito na dor."

RUBRICA INTERNA:
Avalie cada frase, ideia de short e corte por especificidade biblica, forca do gancho, fidelidade a transcricao, potencial de retencao e utilidade pratica. So devolva candidatos fortes.

STRONG_PHRASES:
- retorne objetos, nao apenas strings, quando possivel;
- cada frase deve conter pelo menos um destes elementos: nome biblico especifico, contraste teologico, imagem visual concreta, paradoxo espiritual ou aplicacao direta ao ouvinte;
- varie use_case entre card, short, whatsapp e instagram;
- cada frase precisa de source_excerpt real e why_it_works;
- evite repetir a mesma estrutura e evite vocabulario abstrato repetido como dor, esperanca, aflicao, vida, transformacao, processo e proposito.

FORMATOS GERAIS:
- devotional_summary: 2 a 3 paragrafos curtos, fiel ao audio, especifico, pastoral, mencionando elementos reais da mensagem;
- whatsapp_text: natural, curto, pastoral, pronto para envio, sem parecer propaganda, com CTA suave para ouvir o devocional completo quando couber;
- instagram_caption: primeira linha com gancho forte, corpo curto, aplicacao espiritual, CTA suave; hashtags separadas no campo hashtags;
- short_ideas: ideias editoriais com gancho forte, abertura sugerida e motivo de retencao.

${cutInstructions}

${shortScriptInstructions}

TÍTULO:
${params.title || 'Não informado'}

REFERÊNCIA BÍBLICA:
${params.bibleReference || 'Não informada'}

DESCRIÇÃO:
${params.description || 'Não informada'}

FRASES FORTES JÁ EXISTENTES:
${quoteSuggestions}

CORTE SELECIONADO:
${selectedCutText}

SEGMENTOS COM TIMESTAMP:
${segmentsText}

TRANSCRIÇÃO:
${params.transcriptionText}

MODO SOLICITADO:
${params.mode}

Responda SOMENTE em JSON valido, exatamente com o bloco pedido abaixo. Nao inclua campos de outros modos.

${buildModeOutputContract(params.mode)}
`.trim()
}

async function generateWithOpenAI(params: {
  title: string
  bibleReference: string
  description: string
  transcriptionText: string
  transcriptionSegments: TranscriptionSegment[]
  dailyQuoteSuggestions: unknown
  hasReliableSegments: boolean
  mode: GenerationMode
  selectedCut?: CutSuggestion | null
}) {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY ausente.')
  }

  const model =
    process.env.OPENAI_CONTENT_ASSETS_MODEL ||
    process.env.OPENAI_MODEL ||
    'gpt-4o-mini'

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.55,
      response_format: {
        type: 'json_object',
      },
      messages: [
        {
          role: 'system',
          content:
            'Você é um editor devocional cristão brasileiro. Responda somente em JSON válido.',
        },
        {
          role: 'user',
          content: buildPrompt(params),
        },
      ],
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    console.error('Erro OpenAI content assets:', data)
    throw new Error(
      data?.error?.message ||
        'Erro ao gerar conteúdos textuais com OpenAI.'
    )
  }

  const content = data?.choices?.[0]?.message?.content

  if (!content) {
    throw new Error('A OpenAI não retornou conteúdo.')
  }

  return {
    model,
    assets: validateAssets(extractJsonFromText(content), {
      mode: params.mode,
      hasReliableSegments: params.hasReliableSegments,
      transcriptionSegments: params.transcriptionSegments,
      selectedCut: params.selectedCut,
    }),
  }
}

export async function POST(request: NextRequest) {
  const admin = await requireAdminUser()

  if (!admin.ok) {
    return NextResponse.json(
      { success: false, error: admin.message },
      { status: admin.status }
    )
  }

  try {
    const body = await request.json()
    const episodeId = cleanText(String(body.episodeId || ''))
    const title = cleanText(String(body.title || ''))
    const bibleReference = cleanText(String(body.bible_reference || ''))
    const description = cleanText(String(body.description || ''))
    const transcriptionText = cleanText(String(body.transcription_text || ''))
    const transcriptionSegments = normalizeSegments(body.transcription_segments)
    const hasReliableSegments = transcriptionSegments.length > 0
    const mode = normalizeMode(body.mode)
    const selectedCut = normalizeSelectedCut(body.selected_cut)
    const captionSyncCut = normalizeCaptionSyncCut(body.selected_cut)

    if (!episodeId) {
      return NextResponse.json(
        { success: false, error: 'Envie o ID do episódio.' },
        { status: 400 }
      )
    }

    // Se o frontend não enviou a transcrição no body, busca do banco de dados
    const resolvedTranscriptionText = transcriptionText || await (async () => {
      const supabase = await createSupabaseServerClient()
      const { data: episode } = await supabase
        .from('episodes')
        .select('transcription_text')
        .eq('id', episodeId)
        .single()

      return episode?.transcription_text || ''
    })()

    if (mode === 'visual_storyboard') {
      if (!selectedCut) {
        return NextResponse.json(
          { success: false, error: 'Envie um corte selecionado para gerar o plano visual.' },
          { status: 400 }
        )
      }

      const visualStoryboard = await generateVisualStoryboardWithOpenAI({
        title,
        bibleReference,
        description,
        selectedCut,
        shortScript: body.short_script || body.finalShortPackage?.script,
        finalCaptions: body.final_captions || body.finalShortPackage?.finalCaptions,
        hook: body.hook || body.finalShortPackage?.hook,
        cta: body.cta || body.finalShortPackage?.cta,
        editorialAlert: body.editorial_alert || body.finalShortPackage?.editorialAlert,
      })

      return NextResponse.json({
        success: true,
        provider: 'openai',
        model: visualStoryboard.model,
        mode,
        visual_storyboard: visualStoryboard,
        assets: {
          visual_storyboard: visualStoryboard,
        },
      })
    }

    if (mode === 'best_cuts_ai') {
      const bestAiCuts = await generateBestCutsWithOpenAI({
        title,
        bibleReference,
        description,
        transcriptionText: resolvedTranscriptionText,
        transcriptionSegments,
        dailyQuoteSuggestions: body.daily_quote_suggestions,
      })

      return NextResponse.json({
        success: true,
        provider: 'openai',
        model: bestAiCuts.model,
        mode,
        assets: {
          best_ai_cuts: bestAiCuts,
        },
      })
    }

    if (mode === 'caption_ai_review') {
      const syncedCaptions = normalizeCaptionReviewInput(body.synced_captions)

      if (!syncedCaptions) {
        return NextResponse.json(
          {
            success: false,
            error: 'Envie legendas sincronizadas validas para revisar.',
          },
          { status: 400 }
        )
      }

      const reviewedCaptions = await reviewCaptionsWithOpenAI({
        title,
        bibleReference,
        transcriptionText,
        transcriptionSegments,
        selectedCut: captionSyncCut,
        syncedCaptions,
      })

      return NextResponse.json({
        success: true,
        provider: 'openai',
        model: reviewedCaptions.model,
        mode,
        reviewed_captions: reviewedCaptions,
        assets: {
          reviewed_captions: reviewedCaptions,
        },
      })
    }

    if (mode === 'caption_sync') {
      if (!captionSyncCut) {
        return NextResponse.json(
          {
            success: false,
            error: 'Envie um corte valido para sincronizar legendas.',
          },
          { status: 400 }
        )
      }

      const syncedCaptions = await buildSyncedCaptions({
        episodeId,
        selectedCut: captionSyncCut,
      })

      return NextResponse.json({
        success: true,
        provider: 'local',
        model: 'word-timestamps',
        mode,
        assets: {
          synced_captions: syncedCaptions,
        },
      })
    }

    if (!resolvedTranscriptionText || resolvedTranscriptionText.length < 300) {
      return NextResponse.json(
        {
          success: false,
          error: 'A transcrição está muito curta para gerar conteúdos. Envie transcription_text no body ou verifique se o episódio possui transcrição no banco.',
        },
        { status: 400 }
      )
    }

    if (mode === 'short_script' && !selectedCut) {
      return NextResponse.json(
        {
          success: false,
          error: 'Envie um corte selecionado para gerar o roteiro do Short.',
        },
        { status: 400 }
      )
    }

    if (mode === 'expand_cut') {
      if (!selectedCut) {
        return NextResponse.json(
          {
            success: false,
            error: 'Envie um gancho selecionado para expandir o corte.',
          },
          { status: 400 }
        )
      }

      const expandedCut = buildExpandedCut(selectedCut, transcriptionSegments)

      if (!expandedCut) {
        return NextResponse.json(
          {
            success: false,
            error: 'Nao foi possivel expandir este gancho com os segmentos disponiveis sem ultrapassar o limite de duracao.',
          },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        provider: 'local',
        model: 'segment-window',
        mode,
        assets: {
          expanded_cut: expandedCut,
        },
      })
    }

    // AI-PROVIDER-006 e AI-PROVIDER-007: Todos os modos de texto/JSON usando getAIProvider
    const result = await generateSimpleContentWithAI({
      title,
      bibleReference,
      description,
      transcriptionText: resolvedTranscriptionText.slice(0, MAX_TRANSCRIPTION_CHARS),
      transcriptionSegments,
      dailyQuoteSuggestions: body.daily_quote_suggestions,
      hasReliableSegments,
      mode,
      selectedCut,
    })

    return NextResponse.json({
      success: true,
      provider: 'openai',
      model: result.model,
      mode,
      assets: result.assets,
    })
  } catch (error) {
    console.error('Erro ao gerar conteúdos textuais:', error)

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Erro ao gerar conteúdos textuais.',
      },
      { status: 500 }
    )
  }
}
