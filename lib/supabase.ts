import { createSupabaseBrowserClient } from "./supabase/browser";

export const supabase = createSupabaseBrowserClient();

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

export type TranscriptionSegment = {
  id?: string | number;
  start: number;
  end: number;
  text: string;
  [key: string]: unknown;
};

export type DailyQuoteSuggestion = {
  quote_text: string;
  bible_reference?: string | null;
  reference?: string | null;
  theme?: string | null;
  reason?: string | null;
  notes?: string | null;
  source?: string | null;
  confidence?: number | null;
  [key: string]: unknown;
};

export type Profile = {
  id: string;
  auth_user_id?: string | null;
  email?: string | null;
  name?: string | null;
  phone?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  country?: string | null;
  city?: string | null;
  neighborhood?: string | null;
  created_at?: string | null;
};

export type PrayerRequest = {
  id: string;
  user_id?: string | null;
  content: string;
  request?: string | null;
  author_name?: string | null;
  is_private?: boolean | null;
  is_active?: boolean | null;
  is_answered?: boolean | null;
  answered_at?: string | null;
  testimony_text?: string | null;
  created_at: string;
  profiles?: Profile | null;
};

export type Series = {
  id: string;
  title: string;
  description?: string | null;
  cover_image_url?: string | null;
  book_name?: string | null;
  icon_emoji?: string | null;
  gradient_colors?: string | null;
  is_free?: boolean | null;
  is_current?: boolean | null;
  is_open?: boolean | null;
  total_episodes?: number | null;
  episode_count?: number | null;
  order_index?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  bible_book?: string | null;
};

export type EpisodeSeries = {
  id?: string;
  title?: string;
  icon_emoji?: string;
  cover_image_url?: string;
  description?: string;
};

export type Episode = {
  id: string;
  series_id?: string | null;
  title: string;
  description?: string | null;
  bible_reference?: string | null;
  audio_url: string;
  audio_url_compatible?: string | null;
  audio_compatible_type?: string | null;
  duration_seconds?: number | null;
  episode_number?: number | null;
  published_at?: string | null;
  created_at?: string | null;
  cover_image_url?: string | null;
  og_image_url?: string | null;
  status?: string | null;
  is_preview?: boolean | null;
  scheduled_publish_at?: string | null;
  editorial_status?: string | null;
  calendar_scheduled_at?: string | null;
  internal_notes?: string | null;
  transcription_text?: string | null;
  transcription_status?: string | null;
  transcription_error?: string | null;
  transcription_generated_at?: string | null;
  daily_quote_status?: string | null;
  daily_quote_suggestions?: DailyQuoteSuggestion[] | null;
  daily_quote_generated_at?: string | null;
  transcription_segments?: TranscriptionSegment[] | null;
  series?: EpisodeSeries | null;
};

export type DailyQuoteEpisodeSeries = {
  title?: string | null;
  icon_emoji?: string | null;
  cover_image_url?: string | null;
};

export type DailyQuoteEpisode = {
  id: string;
  title: string;
  bible_reference?: string | null;
  cover_image_url?: string | null;
  series?: DailyQuoteEpisodeSeries | null;
};

export type DailyQuote = {
  id: string;
  episode_id?: string | null;
  quote_background_id?: string | null;
  quote_text: string;
  background_image_url?: string | null;
  share_image_url?: string | null;
  card_image_url?: string | null;
  date?: string | null;
  status?: string | null;
  scheduled_publish_at?: string | null;
  published_at?: string | null;
  source_type?: string | null;
  ai_suggestions?: JsonValue | null;
  selected_suggestion_index?: number | null;
  share_count?: number | null;
  like_count?: number | null;
  created_at?: string | null;
  theme_keywords?: JsonValue | null;
  source_image_provider?: string | null;
  source_image_url?: string | null;
  selected_template?: string | null;
  generated_card_options?: JsonValue | null;
  card_generation_status?: string | null;
  card_generation_error?: string | null;
  card_generated_at?: string | null;
  episode?: DailyQuoteEpisode | null;
};

export type AppSetting = {
  id: string;
  key: string;
  value: string;
  updated_at?: string | null;
};

export type Mantenedor = {
  id: string;
  created_at?: string | null;
  nome: string;
  whatsapp?: string | null;
  email?: string | null;
  valor_mensal?: number | null;
};
