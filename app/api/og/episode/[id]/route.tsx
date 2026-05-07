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

function limitTitle(title: string) {
  const cleanTitle = title.replace(/\s+/g, ' ').trim()

  if (cleanTitle.length <= 74) {
    return cleanTitle
  }

  return `${cleanTitle.slice(0, 71).trim()}...`
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
    const title = limitTitle(typedEpisode.title)
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
                  'linear-gradient(135deg, #020617, #1d4ed8 46%, #0f172a)',
              }}
            />
          )}

          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(2, 6, 23, 0.5)',
            }}
          />

          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(0deg, rgba(2,6,23,0.96), rgba(2,6,23,0.62) 46%, rgba(2,6,23,0.34)), linear-gradient(90deg, rgba(2,6,23,0.96), rgba(15,23,42,0.82) 45%, rgba(15,23,42,0.42) 100%)',
            }}
          />

          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(circle at 82% 18%, rgba(96,165,250,0.24), transparent 30%), radial-gradient(circle at 18% 82%, rgba(234,179,8,0.16), transparent 24%)',
            }}
          />

          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              height: '100%',
              width: '100%',
              padding: '76px',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: 850,
                padding: '46px 52px 50px',
                borderRadius: 28,
                background: 'rgba(2, 6, 23, 0.72)',
                border: '1px solid rgba(255,255,255,0.16)',
                boxShadow: '0 26px 80px rgba(0,0,0,0.5)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  alignSelf: 'flex-start',
                  padding: '12px 18px',
                  borderRadius: 999,
                  background: 'rgba(37, 99, 235, 0.92)',
                  color: '#eff6ff',
                  fontSize: 24,
                  fontWeight: 900,
                  letterSpacing: 4,
                  marginBottom: 28,
                  border: '1px solid rgba(191,219,254,0.36)',
                }}
              >
                ÁUDIO DEVOCIONAL
              </div>

              <div
                style={{
                  fontSize: 68,
                  fontWeight: 900,
                  lineHeight: 0.96,
                  color: '#ffffff',
                  marginBottom: 30,
                  textShadow: '0 6px 22px rgba(0,0,0,0.7)',
                }}
              >
                {title}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  color: '#dbeafe',
                  fontSize: 30,
                  fontWeight: 800,
                }}
              >
                <span
                  style={{
                    color: '#facc15',
                  }}
                >
                  {bibleReference}
                </span>
                <span style={{ color: '#60a5fa' }}>•</span>
                <span>Pr. Djeone Martins</span>
              </div>
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
