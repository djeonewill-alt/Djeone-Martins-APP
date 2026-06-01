import { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import { getPublicAppUrl } from '@/lib/appUrl'
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

    const title = `${episode.title} | Djeone Martins`
    const description =
      episode.description ||
      'Ouça uma palavra bíblica para fortalecer sua fé hoje.'
    const appUrl = getPublicAppUrl()
    const episodeUrl = `${appUrl}/ep/${id}?share=audio-v5`
    const dynamicOgImageUrl = `${appUrl}/api/og/episode/${id}?v=audio-og-v7`
    const ogImageUrl = episode.og_image_url || dynamicOgImageUrl

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: episodeUrl,
        siteName: 'Djeone Martins - Devocional Diário',
        type: 'website',
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            type: 'image/png',
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
