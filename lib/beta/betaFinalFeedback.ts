import { supabase } from '@/lib/supabase'
import type { BetaTester } from '@/lib/beta/betaTester'
import { getBetaTechnicalSnapshot } from '@/lib/beta/betaMissionResults'

export type BetaFinalFeedback = {
  id: string
  tester_id: string
  auth_user_id: string
  overall_experience?: string | null
  favorite_area?: string | null
  most_confusing_area?: string | null
  biggest_problem?: string | null
  pastoral_feedback?: string | null
  would_recommend?: boolean | null
  submitted_at?: string | null
}

export type BetaFinalFeedbackPayload = {
  overall_experience?: string | null
  favorite_area?: string | null
  most_confusing_area?: string | null
  biggest_problem?: string | null
  pastoral_feedback?: string | null
  would_recommend?: boolean | null
}

export async function loadBetaFinalFeedback(betaTester: BetaTester) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) throw userError
  if (!user) return null

  const { data, error } = await supabase
    .from('beta_final_feedback')
    .select(
      'id, tester_id, auth_user_id, overall_experience, favorite_area, most_confusing_area, biggest_problem, pastoral_feedback, would_recommend, submitted_at'
    )
    .eq('tester_id', betaTester.id)
    .eq('auth_user_id', user.id)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error

  return (data as BetaFinalFeedback | null) || null
}

export async function saveBetaFinalFeedback(
  betaTester: BetaTester,
  payload: BetaFinalFeedbackPayload
) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) throw userError
  if (!user) throw new Error('Faca login para enviar o feedback final.')

  const { data, error } = await supabase
    .from('beta_final_feedback')
    .insert({
      tester_id: betaTester.id,
      auth_user_id: user.id,
      overall_experience: payload.overall_experience?.trim() || null,
      favorite_area: payload.favorite_area?.trim() || null,
      most_confusing_area: payload.most_confusing_area?.trim() || null,
      biggest_problem: payload.biggest_problem?.trim() || null,
      pastoral_feedback: payload.pastoral_feedback?.trim() || null,
      would_recommend: payload.would_recommend,
      technical_snapshot: getBetaTechnicalSnapshot(),
    })
    .select(
      'id, tester_id, auth_user_id, overall_experience, favorite_area, most_confusing_area, biggest_problem, pastoral_feedback, would_recommend, submitted_at'
    )
    .single()

  if (error) throw error

  return data as BetaFinalFeedback
}
