'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

const ADMIN_EMAIL = 'djeonewill@gmail.com'

export default function Header() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const [userEmail, setUserEmail] = useState<string | null>(null)

  const isAdmin = userEmail?.toLowerCase() === ADMIN_EMAIL

  useEffect(() => {
    let mounted = true

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!mounted) return

      setUserEmail(user?.email ?? null)
    }

    loadUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

  async function handleLogout() {
    const confirmed = window.confirm('Deseja sair da sua conta neste dispositivo?')

    if (!confirmed) return

    await supabase.auth.signOut()

    window.localStorage.removeItem('user_id')
    window.localStorage.removeItem('admin_logged_in')
    window.localStorage.removeItem('djeone_admin_logged')

    window.location.href = '/cadastro'
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 overflow-hidden rounded-full ring-2 ring-slate-700">
            <Image
              src="/pastor.png"
              alt="Djeone Martins"
              fill
              className="object-cover"
            />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-white">Djeone Martins</h2>
            <p className="text-xs text-slate-400">Devocional Diário</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link
              href="/admin"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-blue-300/15 bg-blue-500/10 text-blue-100 transition-colors hover:bg-blue-500/20 hover:text-white"
              title="Painel Admin"
              aria-label="Abrir painel administrativo"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </Link>
          )}

          {userEmail && (
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-10 items-center justify-center rounded-full border border-red-300/15 bg-red-500/10 px-3 text-xs font-black text-red-100 transition-colors hover:bg-red-500/20 hover:text-white"
              title="Sair da conta"
              aria-label="Sair da conta"
            >
              Sair
            </button>
          )}
        </div>
      </div>
    </header>
  )
}