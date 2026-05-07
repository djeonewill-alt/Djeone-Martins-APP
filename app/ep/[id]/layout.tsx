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

    const title = `📖 ${episode.bible_reference} - ${episode.title}`
    const description = episode.description || `Ouça "${episode.title}" com Pastor Djeone Martins`
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const episodeUrl = `${appUrl}/ep/${id}`
    const fallbackImageUrl = `${appUrl}/api/og?title=${encodeURIComponent(episode.bible_reference)}&subtitle=${encodeURIComponent(episode.title)}`
    const imageUrl =
      episode.cover_image_url ||
      episode.series?.cover_image_url ||
      fallbackImageUrl
    const absoluteImageUrl = new URL(imageUrl, appUrl).toString()

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
            url: absoluteImageUrl,
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
        images: [absoluteImageUrl],
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
