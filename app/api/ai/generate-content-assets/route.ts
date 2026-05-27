import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

type TranscriptionSegment = {
  start: number
  end: number
  text: string
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
  metadata?: ContentAssetsMetadata
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

const MAX_TRANSCRIPTION_CHARS = 28000
const MAX_SEGMENTS = 160
const MIN_CUT_SECONDS = 15
const HOOK_MAX_SECONDS = 25
const SOFT_MIN_CUT_SECONDS = 25
const MAX_CUT_SECONDS = 75
const MISSING_TIMESTAMPS_NOTE =
  'Este episodio nao possui segmentos com timestamps. Gere uma transcricao com timestamps para cortes precisos.'

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

  if (script.animated_caption_lines.length < minCaptionLines) {
    const fallbackLines = buildCaptionFallbacks(selectedCut, minCaptionLines)
    script.animated_caption_lines = [...script.animated_caption_lines, ...fallbackLines]
      .filter((line, index, lines) => lines.indexOf(line) === index)
      .slice(0, script.duration_seconds <= 35 ? 10 : script.duration_seconds <= 45 ? 14 : 18)
    autoCompleted = true
  }

  if (!script.caption_lines_improved || script.caption_lines_improved.length < minCaptionLines) {
    const fallbackLines = buildCaptionFallbacks(selectedCut, minCaptionLines)
    const improvedSeed = [
      ...splitCaptionFallbackText(script.hook_original || originalHook),
      ...splitCaptionFallbackText(script.hook_improved || script.main_hook),
      ...fallbackLines,
    ]

    script.caption_lines_improved = improvedSeed
      .map((line) => cleanText(line).slice(0, 80))
      .filter((line, index, lines) => {
        const wordCount = countWords(line)
        return wordCount >= 3 && wordCount <= 7 && lines.indexOf(line) === index
      })
      .slice(0, script.duration_seconds <= 35 ? 10 : script.duration_seconds <= 45 ? 14 : 18)
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
- caption_lines_improved deve comecar com o hook ou hook_improved, preservar o contraste principal do corte, usar frases de 3 a 7 palavras e ritmo de video curto;
- nao substitua o hook forte por frases genericas como "Jesus e nosso consolo", "A presenca de Deus esta aqui" ou "Jesus transforma nossa dor" quando a frase central do corte for mais forte;
- para Betania/templo, priorize linhas como "Jerusalem tinha o templo", "Mas Jesus dormia em Betania", "Com o pobre", "Com o aflito", "Na casa da aflicao";
- gere retention_score de 1 a 10 e score_breakdown honesto de 1 a 10 para hook_strength, biblical_specificity, visual_concreteness, emotional_tension, share_potential e fidelity_to_audio;
- nao de 10 para tudo automaticamente;
- on_screen_text tambem deve ter 3 a 7 palavras;
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

    if (!episodeId) {
      return NextResponse.json(
        { success: false, error: 'Envie o ID do episódio.' },
        { status: 400 }
      )
    }

    if (!transcriptionText || transcriptionText.length < 300) {
      return NextResponse.json(
        {
          success: false,
          error: 'A transcrição está muito curta para gerar conteúdos.',
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

    const result = await generateWithOpenAI({
      title,
      bibleReference,
      description,
      transcriptionText: transcriptionText.slice(0, MAX_TRANSCRIPTION_CHARS),
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
