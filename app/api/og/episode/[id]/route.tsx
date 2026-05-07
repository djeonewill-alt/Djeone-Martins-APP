import { ImageResponse } from 'next/og'

export const runtime = 'edge'

type Props = {
  params?: Promise<{ id: string }> | { id: string }
}

type EpisodeOgData = {
  title: string
  bible_reference?: string | null
  cover_image_url?: string | null
  episode_number?: number | null
  duration_seconds?: number | null
  series?: {
    title?: string | null
    cover_image_url?: string | null
  } | null
}

function limitTitle(title: string) {
  const cleanTitle = title.replace(/\s+/g, ' ').trim()

  if (cleanTitle.length <= 58) {
    return cleanTitle
  }

  return `${cleanTitle.slice(0, 55).trim()}...`
}

function formatDuration(seconds?: number | null) {
  if (!seconds) return ''

  const minutes = Math.max(1, Math.round(seconds / 60))

  return `${minutes}min`
}

async function loadEpisode(id: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL or anon key is not configured.')
  }

  const url = new URL(`${supabaseUrl}/rest/v1/episodes`)
  url.searchParams.set(
    'select',
    'title,bible_reference,cover_image_url,episode_number,duration_seconds,series:series_id(title,cover_image_url)'
  )
  url.searchParams.set('id', `eq.${id}`)
  url.searchParams.set('limit', '1')

  const response = await fetch(url.toString(), {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Supabase episode lookup failed: ${response.status}`)
  }

  const episodes = (await response.json()) as EpisodeOgData[]

  return episodes[0] || null
}

export async function GET(request: Request, { params }: Props) {
  try {
    const resolvedParams = await params
    const uuidMatch = request.url.match(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
    )
    const id =
      uuidMatch?.[0] ||
      resolvedParams?.id ||
      ''

    const episode = await loadEpisode(id)

    if (!episode) {
      return new Response('Episode not found', { status: 404 })
    }

    const title = limitTitle(episode.title)
    const bibleReference =
      episode.bible_reference || 'Devocional Diário'
    const duration = formatDuration(episode.duration_seconds)
    const episodeLabel = episode.episode_number
      ? `Ep. ${episode.episode_number}`
      : ''
    const seriesTitle =
      episode.series?.title || 'Vencendo as Tempestades'
    const rawCover =
      episode.cover_image_url ||
      episode.series?.cover_image_url ||
      ''
    const cover = rawCover
      ? new URL(rawCover, new URL(request.url).origin).toString()
      : ''
    const metaItems = [bibleReference, episodeLabel, duration].filter(Boolean)

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: '#020617',
            backgroundImage:
              'radial-gradient(circle at 18% 18%, rgba(59,130,246,0.34), transparent 28%), radial-gradient(circle at 82% 82%, rgba(234,179,8,0.14), transparent 26%), linear-gradient(135deg, #020617, #0f172a 54%, #08111f)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(0deg, rgba(2,6,23,0.78), rgba(2,6,23,0.18) 48%, rgba(2,6,23,0.58))',
            }}
          />

          <div
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              width: 1040,
              height: 510,
              borderRadius: 30,
              padding: 28,
              background:
                'linear-gradient(135deg, rgba(15,23,42,0.98), rgba(2,6,23,0.98))',
              border: '1px solid rgba(255,255,255,0.14)',
              boxShadow: '0 28px 90px rgba(0,0,0,0.46)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#dbeafe',
                fontSize: 22,
                fontWeight: 900,
                marginBottom: 18,
              }}
            >
              <span style={{ color: '#bfdbfe', letterSpacing: 3 }}>
                ÁUDIO DE HOJE
              </span>
              <span
                style={{
                  color: '#93c5fd',
                  fontSize: 20,
                  letterSpacing: 1.5,
                }}
              >
                {seriesTitle.toUpperCase()} →
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 12,
                color: '#cbd5e1',
                fontSize: 20,
                fontWeight: 800,
                marginBottom: 20,
              }}
            >
              {metaItems.map((item, index) => (
                <span key={item} style={{ display: 'flex', gap: 12 }}>
                  {index > 0 ? (
                    <span style={{ color: '#60a5fa' }}>•</span>
                  ) : null}
                  <span>{item}</span>
                </span>
              ))}
            </div>

            <div
              style={{
                position: 'relative',
                display: 'flex',
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                borderRadius: 24,
                backgroundColor: '#0f172a',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              {cover ? (
                <img
                  src={cover}
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
                      'linear-gradient(135deg, #0f172a, #1d4ed8 58%, #020617)',
                  }}
                />
              )}

              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(0deg, rgba(2,6,23,0.88), rgba(2,6,23,0.42)), linear-gradient(90deg, rgba(2,6,23,0.72), rgba(2,6,23,0.5), rgba(2,6,23,0.72))',
                }}
              />

              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '34px 64px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                      maxWidth: 740,
                      color: '#ffffff',
                      fontSize: 57,
                      fontWeight: 900,
                      lineHeight: 0.84,
                      letterSpacing: '-2.4px',
                      textAlign: 'center',
                      textShadow:
                        '0 4px 0 #020617, 0 8px 12px rgba(2,6,23,0.95), 1.5px 1.5px 0 #020617, -1.5px 1.5px 0 #020617',
                      WebkitTextStrokeWidth: '2.4px',
                      WebkitTextStrokeColor: '#ffffff',
                      marginBottom: 18,
                    }}
                >
                  {title}
                </div>

                <div
                  style={{
                      color: '#f8fafc',
                      fontSize: 25,
                      fontWeight: 900,
                      letterSpacing: '-0.3px',
                      opacity: 0.97,
                      textShadow:
                        '0 3px 0 #07111f, 0 8px 14px rgba(2,6,23,0.96)',
                      WebkitTextStrokeWidth: '0.55px',
                      WebkitTextStrokeColor: '#07111f',
                    }}
                >
                  Pr. Djeone Martins
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (error) {
    console.error('Failed to generate episode OG image:', error)
    return new Response('Failed to generate image', { status: 500 })
  }
}
