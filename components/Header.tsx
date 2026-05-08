'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

const ADMIN_EMAIL = 'djeonewill@gmail.com'

type HeaderProps = {
  onOpenSettings?: () => void
}

function getShortName(name?: string | null, email?: string | null) {
  const cleanName = (name || '').trim()

  if (cleanName) {
    const parts = cleanName.split(/\s+/)
    return parts[0]
  }

  if (email) {
    return email.split('@')[0]
  }

  return ''
}

function SettingsIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.36a1.7 1.7 0 0 0-1 .54l-.1.1a2 2 0 0 1-3.8 0l-.1-.1a1.7 1.7 0 0 0-1-.54 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.64 15a1.7 1.7 0 0 0-.54-1l-.1-.1a2 2 0 0 1 0-3.8l.1-.1a1.7 1.7 0 0 0 .54-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.64a1.7 1.7 0 0 0 1-.54l.1-.1a2 2 0 0 1 3.8 0l.1.1a1.7 1.7 0 0 0 1 .54 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.36 9c.2.37.38.74.54 1.1l.1.1a2 2 0 0 1 0 3.8l-.1.1c-.16.36-.34.73-.5.9Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function Header({ onOpenSettings }: HeaderProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)

  const isAdmin = userEmail?.toLowerCase() === ADMIN_EMAIL
  const shortName = getShortName(userName, userEmail)


  async function handleLogout() {
    const confirmed = window.confirm('Deseja sair da sua conta neste dispositivo?')

    if (!confirmed) return

    await supabase.auth.signOut()

    window.localStorage.removeItem('user_id')
    window.localStorage.removeItem('admin_logged_in')
    window.localStorage.removeItem('djeone_admin_logged')

    window.location.href = '/cadastro'
  }

  useEffect(() => {
    let mounted = true

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!mounted) return

      setUserEmail(user?.email ?? null)

      const metadataName =
        typeof user?.user_metadata?.name === 'string'
          ? user.user_metadata.name
          : typeof user?.user_metadata?.display_name === 'string'
            ? user.user_metadata.display_name
            : null

      setUserName(metadataName)

      if (user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('auth_user_id', user.id)
          .maybeSingle()

        if (mounted && profile?.name) {
          setUserName(profile.name)
        }
      }
    }

    loadUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user

      setUserEmail(user?.email ?? null)

      const metadataName =
        typeof user?.user_metadata?.name === 'string'
          ? user.user_metadata.name
          : typeof user?.user_metadata?.display_name === 'string'
            ? user.user_metadata.display_name
            : null

      setUserName(metadataName)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative h-10 w-10 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            <Image
              src="/pastor.png"
              alt="Djeone Martins"
              fill
              sizes="40px"
              className="object-cover"
            />
          </div>

          <div className="leading-none">
            <p className="text-sm font-black tracking-[-0.04em] text-white">
              Djeone Martins
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-300">
              Devocional
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {shortName ? (
            <span className="hidden max-w-[92px] truncate text-xs font-black text-slate-200 sm:inline">
              {isAdmin ? 'Pr. Djeone' : shortName}
            </span>
          ) : (
            <Link
              href="/cadastro"
              className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-white"
            >
              Entrar
            </Link>
          )}

          {isAdmin && (
            <Link
              href="/admin"
              className="inline-flex h-9 items-center justify-center rounded-full border border-blue-300/20 bg-blue-500/15 px-3 text-[11px] font-black uppercase tracking-[0.12em] text-blue-100 transition-colors hover:bg-blue-500/25 hover:text-white"
              title="Painel Admin"
              aria-label="Abrir painel administrativo"
            >
              Painel
            </Link>
          )}

          {userEmail && (
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-9 items-center justify-center rounded-full border border-red-300/15 bg-red-500/10 px-3 text-[11px] font-black uppercase tracking-[0.12em] text-red-100 transition-colors hover:bg-red-500/20 hover:text-white"
              title="Sair da conta"
              aria-label="Sair da conta"
            >
              Sair
            </button>
          )}
          <button
            type="button"
            onClick={onOpenSettings}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.055] text-slate-200 transition-colors hover:bg-white/10 hover:text-white"
            title="Configurações"
            aria-label="Abrir configurações"
          >
            <SettingsIcon />
          </button>
        </div>
      </div>
    </header>
  )
}


