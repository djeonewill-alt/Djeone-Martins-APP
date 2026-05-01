import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Tipos do banco
export type Profile = {
  id: string
  display_name: string | null
  phone: string | null
  avatar_url: string | null
  city: string | null
  country: string
  is_premium: boolean
  xp: number
  level: number
  created_at: string
}

export type Series = {
  id: string
  title: string
  description: string | null
  book_name: string | null
  icon_emoji: string | null
  gradient_colors: string | null
  is_free: boolean
  is_current: boolean
  total_episodes: number
}

export type Episode = {
  id: string
  series_id: string
  title: string
  description: string | null
  bible_reference: string | null
  audio_url: string
  duration_seconds: number | null
  episode_number: number | null
  published_at: string
}

export type PrayerRequest = {
  id: string
  user_id: string
  content: string
  author_name: string | null
  is_private: boolean
  is_answered: boolean
  answered_at: string | null
  testimony_text: string | null
  created_at: string
}
