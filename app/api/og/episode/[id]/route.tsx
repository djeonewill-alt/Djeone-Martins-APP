import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Props = {
  params: Promise<{ id: string }>
}

type EpisodeOgData = {
  title: string
  bible_reference?: string | null
  cover_image_url?: string | null
  series?: {
    cover_image_url?: string | null
  } | null
}

export async function GET(request: Request, { params }: Props) {
  try {
    const { id } = await params

    const { data: episode, error } = await supabase
      .from('episodes')
      .select(`
        title,
        bible_reference,
        cover_image_url,
        series:series_id (
          cover_image_url
        )
      `)
      .eq('id', id)
      .single()

    if (error || !episode) {
      return new Response('Episode not found', { status: 404 })
    }

    const typedEpisode = episode as EpisodeOgData
    const title = typedEpisode.title
    const bibleReference =
      typedEpisode.bible_reference || 'Devocional Diário'
    const rawBackground =
      typedEpisode.cover_image_url ||
      typedEpisode.series?.cover_image_url ||
      ''
    const background = rawBackground
      ? new URL(rawBackground, new URL(request.url).origin).toString()
      : ''

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: '#020617',
          }}
        >
          {background ? (
            <img
              src={background}
              alt=""
              style={{
                position: 'absolute',
                inset: 0,
                height: '100%',
                width: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage:
                  'linear-gradient(135deg, #020617, #1d4ed8 50%, #0f172a)',
              }}
            />
          )}

          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(90deg, rgba(2,6,23,0.94), rgba(2,6,23,0.72) 48%, rgba(2,6,23,0.38)), linear-gradient(0deg, rgba(2,6,23,0.92), rgba(2,6,23,0.08) 58%, rgba(2,6,23,0.5))',
            }}
          />

          <div
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              padding: '78px',
            }}
          >
            <div
              style={{
                fontSize: 32,
                fontWeight: 900,
                color: '#bfdbfe',
                letterSpacing: 8,
                marginBottom: 28,
              }}
            >
              ÁUDIO DEVOCIONAL
            </div>

            <div
              style={{
                maxWidth: 960,
                fontSize: 76,
                fontWeight: 900,
                lineHeight: 0.98,
                color: 'white',
                marginBottom: 30,
                textShadow: '0 10px 34px rgba(0,0,0,0.68)',
              }}
            >
              {title}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                color: '#dbeafe',
                fontSize: 34,
                fontWeight: 800,
              }}
            >
              <span>{bibleReference}</span>
              <span style={{ color: '#60a5fa' }}>•</span>
              <span>Pr. Djeone Martins</span>
            </div>
          </div>
        </div>
      ),
      {
        width: 1280,
        height: 720,
      }
    )
  } catch (error) {
    console.error('Failed to generate episode OG image:', error)
    return new Response('Failed to generate image', { status: 500 })
  }
}
