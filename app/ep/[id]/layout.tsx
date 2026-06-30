import type { Metadata } from 'next'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getPublicAppUrl } from '@/lib/appUrl'
import {
  PUBLIC_EPISODE_EDITORIAL_FILTER,
  isPublicEpisodeVisible,
} from '@/lib/episodes/publicVisibility'

type RouteParams = {
  id: string
}

type LayoutProps = {
  children: React.ReactNode
  params: Promise<RouteParams>
}

type EpisodeOgData = {
  title: string
  description?: string | null
  bible_reference?: string | null
  cover_image_url?: string | null
  editorial_status?: string | null
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function normalizeText(text?: string | null) {
  return (text || '').replace(/\s+/g, ' ').trim()
}

function buildDescription(episode: EpisodeOgData | null) {
  const desc = normalizeText(episode?.description)
  if (desc) return desc.length > 170 ? `${desc.slice(0, 167)}...` : desc

  const ref = normalizeText(episode?.bible_reference)
  if (ref) return `Devocional baseado em ${ref}. Ouça agora.`

  return 'Ouça o devocional diário do Pr. Djeone Martins.'
}

async function getEpisode(id: string): Promise<EpisodeOgData | null> {
  if (!isUuid(id)) return null

  const supabase = createSupabaseAdminClient()

  const { data, error } = await supabase
    .from('episodes')
    .select('title, description, bible_reference, cover_image_url, editorial_status')
    .eq('id', id)
    .or(PUBLIC_EPISODE_EDITORIAL_FILTER)
    .maybeSingle()

  if (error) {
    console.error('Erro ao carregar metadados do episódio:', error)
    return null
  }

  const episode = data as EpisodeOgData | null

  if (!episode || !isPublicEpisodeVisible(episode)) {
    return null
  }

  return episode
}

export async function generateMetadata({
  params,
}: Omit<LayoutProps, 'children'>): Promise<Metadata> {
  const { id } = await params
  const episode = await getEpisode(id)
  const baseUrl = getPublicAppUrl()

  const pageUrl = `${baseUrl}/ep/${id}`
  const ogImageUrl = `${baseUrl}/api/og/episode/${id}`
  const title = episode
    ? `${episode.title} | Pr. Djeone Martins`
    : 'Devocional Diário | Pr. Djeone Martins'
  const description = buildDescription(episode)

  if (!episode) {
    return {
      title,
      description: 'Episódio não encontrado.',
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  return {
    title,
    description,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title,
      description,
      type: 'website',
      url: pageUrl,
      siteName: 'Pr. Djeone Martins',
      images: [
        {
          url: ogImageUrl,
          width: 800,
          height: 420,
          alt: episode.title,
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
}

export default function EpisodeLayout({ children }: { children: React.ReactNode }) {
  return children
}