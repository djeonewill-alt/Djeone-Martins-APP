'use client'

import { useRouter } from 'next/navigation'

export default function LegalBackButton() {
  const router = useRouter()

  function handleBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }

    router.push('/')
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className="mb-8 inline-flex items-center rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-bold text-slate-100 transition hover:bg-white/[0.1] active:scale-[0.98]"
    >
      ← Voltar ao app
    </button>
  )
}
