'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { trackAppEvent } from '@/lib/analytics/client'

type PublicQuoteActionsProps = {
  quoteId: string
  quotePreview: string
  episodeId?: string | null
  episodeHref?: string | null
  canonicalUrl: string
}

function getShareParam() {
  if (typeof window === 'undefined') return null

  return new URLSearchParams(window.location.search).get('share')
}

function getPath() {
  if (typeof window === 'undefined') return null

  return window.location.pathname
}

function getReferrer() {
  if (typeof document === 'undefined') return null

  return document.referrer || null
}

function buildMetadata(
  quotePreview: string,
  extra: Record<string, unknown> = {}
) {
  return {
    quote_preview: quotePreview,
    share_param: getShareParam(),
    path: getPath(),
    referrer: getReferrer(),
    ...extra,
  }
}

export default function PublicQuoteActions({
  quoteId,
  quotePreview,
  episodeId,
  episodeHref,
  canonicalUrl,
}: PublicQuoteActionsProps) {
  useEffect(() => {
    trackAppEvent('public_quote_opened', {
      entityType: 'daily_quote',
      entityId: quoteId,
      source: 'public_quote_page',
      metadata: buildMetadata(quotePreview),
    })
  }, [quoteId, quotePreview])

  function trackOpenAppClick(target: 'app' | 'episode') {
    trackAppEvent('public_quote_open_app_clicked', {
      entityType: 'daily_quote',
      entityId: quoteId,
      source: 'public_quote_page',
      metadata: buildMetadata(quotePreview, {
        target,
        episode_id: episodeId || null,
      }),
    })
  }

  function trackShareClick(channel: 'native_share' | 'whatsapp' | 'clipboard') {
    trackAppEvent('public_quote_share_clicked', {
      entityType: 'daily_quote',
      entityId: quoteId,
      source: 'public_quote_page',
      metadata: buildMetadata(quotePreview, { channel }),
    })
  }

  async function handleShare() {
    const shareText = 'Palavra do Dia - Pr. Djeone Martins'

    try {
      if (navigator.share) {
        trackShareClick('native_share')
        await navigator.share({
          title: 'Palavra do Dia',
          text: shareText,
          url: canonicalUrl,
        })
        return
      }

      trackShareClick('whatsapp')
      const whatsappUrl =
        'https://wa.me/?text=' + encodeURIComponent(shareText + ' ' + canonicalUrl)
      const opened = window.open(whatsappUrl, '_blank', 'noopener,noreferrer')

      if (opened) return

      trackShareClick('clipboard')
      await navigator.clipboard.writeText(canonicalUrl)
      window.alert('Link copiado para compartilhar.')
    } catch (error) {
      try {
        trackShareClick('clipboard')
        await navigator.clipboard.writeText(canonicalUrl)
        window.alert('Link copiado para compartilhar.')
      } catch (clipboardError) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[analytics] erro ao compartilhar Palavra:', error, clipboardError)
        }
      }
    }
  }

  return (
    <div className="space-y-3">
      {episodeHref && (
        <Link
          href={episodeHref}
          onClick={() => trackOpenAppClick('episode')}
          className="block rounded-full bg-blue-600 px-5 py-3 text-center text-sm font-black text-white transition hover:bg-blue-500"
        >
          Ouvir devocional
        </Link>
      )}

      <button
        type="button"
        onClick={handleShare}
        className="block w-full rounded-full bg-emerald-500 px-5 py-3 text-center text-sm font-black text-emerald-950 shadow-[0_16px_40px_rgba(16,185,129,0.24)] transition hover:bg-emerald-400 active:scale-[0.98]"
      >
        Compartilhar no WhatsApp
      </button>

      <Link
        href="/"
        onClick={() => trackOpenAppClick('app')}
        className="block rounded-full bg-white px-5 py-3 text-center text-sm font-black text-slate-950 transition hover:bg-blue-100"
      >
        Abrir app
      </Link>
    </div>
  )
}
