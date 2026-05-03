import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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