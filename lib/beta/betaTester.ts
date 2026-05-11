import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type BetaTester = {
  id: string
  email: string
  name?: string | null
  is_active?: boolean | null
  founder_number?: number | null
  first_access_at?: string | null
}

export type BetaTesterProfile = {
  id: string
  tester_id: string
  auth_user_id: string
  accepted_beta_terms?: boolean | null
  accepted_beta_terms_at?: string | null
  device_label?: string | null
  operating_system?: string | null
  browser?: string | null
  access_mode?: string | null
}

type BetaTesterState = {
  isBetaTester: boolean
  betaTester: BetaTester | null
  betaProfile: BetaTesterProfile | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

type SupabaseLike = typeof supabase

export async function findActiveBetaTesterByEmail(
  client: SupabaseLike,
  email?: string | null
) {
  const normalizedEmail = email?.trim().toLowerCase()

  if (!normalizedEmail) return null

  const { data, error } = await client
    .from('beta_testers')
    .select('id, email, name, is_active, founder_number, first_access_at')
    .eq('email', normalizedEmail)
    .eq('is_active', true)
    .maybeSingle()

  if (error) throw error

  return (data as BetaTester | null) || null
}

export function useBetaTester(): BetaTesterState {
  const [state, setState] = useState<BetaTesterState>({
    isBetaTester: false,
    betaTester: null,
    betaProfile: null,
    loading: true,
    error: null,
    refresh: async () => undefined,
  })

  useEffect(() => {
    let mounted = true

    async function loadBetaTester() {
      try {
        if (mounted) {
          setState((current) => ({ ...current, loading: true, error: null }))
        }

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError) throw userError

        if (!user?.email) {
          if (mounted) {
            setState({
              isBetaTester: false,
              betaTester: null,
              betaProfile: null,
              loading: false,
              error: null,
              refresh: loadBetaTester,
            })
          }
          return
        }

        const betaTester = await findActiveBetaTesterByEmail(supabase, user.email)
        let betaProfile: BetaTesterProfile | null = null

        if (betaTester?.id) {
          const { data: profile, error: profileError } = await supabase
            .from('beta_tester_profiles')
            .select('id, tester_id, auth_user_id, accepted_beta_terms, accepted_beta_terms_at, device_label, operating_system, browser, access_mode')
            .eq('tester_id', betaTester.id)
            .eq('auth_user_id', user.id)
            .maybeSingle()

          if (profileError) throw profileError

          betaProfile = (profile as BetaTesterProfile | null) || null
        }

        if (!mounted) return

        setState({
          isBetaTester: Boolean(betaTester),
          betaTester,
          betaProfile,
          loading: false,
          error: null,
          refresh: loadBetaTester,
        })
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Nao foi possivel verificar acesso beta.'

        if (!mounted) return

        setState({
          isBetaTester: false,
          betaTester: null,
          betaProfile: null,
          loading: false,
          error: message,
          refresh: loadBetaTester,
        })
      }
    }

    loadBetaTester()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadBetaTester()
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return state
}
