import { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import { ReactNode } from 'react'

type Props = {
  params: Promise<{ id: string }>
  children: ReactNode
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  
  try {
    const { data: episode } = await supabase
      .from('episodes')
      .select(`
        *,
        series:series_id (
          title,
          icon_emoji,
          cover_image_url
        )
      `)
      .eq('id', id)
      .single()

    if (!episode) {
      return {
        title: 'Episódio não encontrado',
      }
    }

    const title = '🎧 Áudio devocional de hoje | Pr. Djeone Martins'
    const description = 'Ouça uma palavra bíblica para fortalecer sua fé hoje.'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const episodeUrl = `${appUrl}/ep/${id}?share=audio-v2`
    const baseImageUrl =
      episode.cover_image_url ||
      episode.series?.cover_image_url
    const backgroundImageUrl = baseImageUrl
      ? new URL(baseImageUrl, appUrl).toString()
      : ''
    const ogImageParams = new URLSearchParams({
      title: episode.title,
      subtitle: episode.bible_reference || 'Devocional Diário',
      v: 'audio-og-v2',
    })

    if (backgroundImageUrl) {
      ogImageParams.set('background', backgroundImageUrl)
    }

    const ogImageUrl = `${appUrl}/api/og?${ogImageParams.toString()}`

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: episodeUrl,
        siteName: 'Djeone Martins - Devocional Diário',
        type: 'music.song',
        audio: episode.audio_url,
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImageUrl],
      },
    }
  } catch (error) {
    return {
      title: 'Djeone Martins - Devocional',
    }
  }
}

export default function EpisodeLayout({ children }: Props) {
  return <>{children}</>
}
