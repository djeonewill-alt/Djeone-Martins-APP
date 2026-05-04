import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type TranscriptionStatus =
  | 'not_started'
  | 'processing'
  | 'completed'
  | 'failed'

export type DailyQuoteStatus =
  | 'not_started'
  | 'processing'
  | 'completed'
  | 'failed'

export type DailyQuotePublishStatus =
  | 'draft'
  | 'scheduled'
  | 'published'

export type DailyQuoteSourceType =
  | 'manual'
  | 'ai_suggested'
  | 'ai_auto'

export type CardGenerationStatus =
  | 'not_started'
  | 'processing'
  | 'completed'
  | 'failed'

export type DailyQuoteTemplate =
  | 'devotional'
  | 'modern'
  | 'cinematic'

export type ImageSourceProvider =
  | 'pexels'
  | 'unsplash'
  | 'pixabay'
  | 'manual'
  | 'r2'
  | 'fallback'
  | string

export type DailyQuoteSuggestion = {
  quote_text: string
  reason?: string
  score?: number
}

export type GeneratedCardOption = {
  id: string
  template: DailyQuoteTemplate | string
  preview_url?: string
  source_image_url: string
  source_image_provider: ImageSourceProvider
  theme_keywords: string[]
  quote_background_id?: string | null
  photographer?: string | null
  source_page_url?: string | null
  query_used?: string | null
}

export type Episode = {
  id: string
  series_id: string
  episode_number: number
  title: string
  bible_reference: string | null
  description: string | null
  audio_url: string
  duration_seconds: number | null
  created_at: string
  cover_image_url: string | null
  status: string | null
  scheduled_publish_at: string | null

  transcription_text: string | null
  transcription_status: TranscriptionStatus | string | null
  transcription_error: string | null
  transcription_generated_at: string | null

  daily_quote_status: DailyQuoteStatus | string | null
  daily_quote_suggestions: DailyQuoteSuggestion[] | null
  daily_quote_generated_at: string | null

  series?: {
    title: string
    icon_emoji: string
    cover_image_url: string | null
  }
}

export type Series = {
  id: string
  title: string
  bible_book: string
  icon_emoji: string
  description: string | null
  is_free: boolean
  is_current: boolean
  created_at: string
  cover_image_url: string | null
  total_episodes?: number
}

export type PrayerRequest = {
  id: string
  user_id: string
  author_name: string | null
  request: string
  content: string
  is_answered: boolean
  is_private: boolean
  testimony_text: string | null
  created_at: string
  praying_count?: number
}

export type QuoteBackground = {
  id: string

  image_url: string
  preview_url: string | null

  theme: string
  theme_keywords: string[] | null

  source: string | null
  source_image_provider: ImageSourceProvider | null
  source_page_url: string | null
  pexels_photo_id: string | null
  photographer: string | null
  photographer_url: string | null
  query_used: string | null

  last_used_date: string | null
  use_count: number | null

  is_active: boolean | null
  is_approved: boolean | null

  created_at: string
  updated_at: string | null
}

export type DailyQuoteImageHistory = {
  id: string

  daily_quote_id: string | null
  quote_background_id: string | null

  pexels_photo_id: string | null
  source_image_url: string | null
  source_image_provider: ImageSourceProvider | null
  source_page_url: string | null
  photographer: string | null
  photographer_url: string | null
  query_used: string | null
  theme_keywords: string[] | null

  used_at: string
  created_at: string
}

export type DailyQuote = {
  id: string
  episode_id: string | null
  quote_background_id: string | null

  quote_text: string
  background_image_url: string | null
  card_image_url: string | null
  date: string
  status: DailyQuotePublishStatus | string | null
  scheduled_publish_at: string | null
  published_at: string | null
  source_type: DailyQuoteSourceType | string | null
  ai_suggestions: DailyQuoteSuggestion[] | null
  selected_suggestion_index: number | null
  share_count: number
  like_count: number
  created_at: string

  theme_keywords: string[] | null
  source_image_provider: ImageSourceProvider | null
  source_image_url: string | null
  selected_template: DailyQuoteTemplate | string | null
  generated_card_options: GeneratedCardOption[] | null
  card_generation_status: CardGenerationStatus | string | null
  card_generation_error: string | null
  card_generated_at: string | null

  episode?: {
    id: string
    title: string
    bible_reference: string | null
    cover_image_url?: string | null
    scheduled_publish_at?: string | null
    series?: {
      title: string
      icon_emoji: string
      cover_image_url: string | null
    }
  }

  quote_background?: QuoteBackground | null
}