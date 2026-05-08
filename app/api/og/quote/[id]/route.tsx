import { ImageResponse } from 'next/og'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

type RouteParams = {
  id: string
}

type RouteProps = {
  params: Promise<RouteParams>
}

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

function cleanText(value?: string | null) {
  return (value || '').replace(/\s+/g, ' ').trim()
}

function fitText(value: string, maxLength = 145) {
  const text = cleanText(value)

  if (text.length <= maxLength) return text

  return `${text.slice(0, maxLength - 3)}...`
}

function getFontSize(text: string) {
  if (text.length > 120) return 48
  if (text.length > 90) return 54
  if (text.length > 65) return 60
  return 68
}

export async function GET(_request: Request, { params }: RouteProps) {
  const { id } = await params

  let quoteText = 'Receba uma Palavra do Dia para fortalecer sua fé.'
  let bibleReference = ''
  let episodeTitle = ''

  if (isUuid(id)) {
    try {
      const supabase = createSupabaseAdminClient()

      const { data, error } = await supabase
        .from('daily_quotes')
        .select(`
          id,
          quote_text,
          status,
          episode:episodes (
            title,
            bible_reference
          )
        `)
        .eq('id', id)
        .eq('status', 'published')
        .maybeSingle()

      if (error) {
        console.error('Erro ao carregar OG da Palavra do Dia:', error)
      }

      if (data?.quote_text) {
        const episode = Array.isArray(data.episode)
          ? data.episode[0]
          : data.episode

        quoteText = data.quote_text
        bibleReference = cleanText(episode?.bible_reference)
        episodeTitle = cleanText(episode?.title)
      }
    } catch (error) {
      console.error('Erro inesperado na rota OG da Palavra do Dia:', error)
    }
  }

  const fittedQuote = fitText(quoteText)
  const fontSize = getFontSize(fittedQuote)
  const quoteDisplayText = `“${fittedQuote}”`
  const themeDisplayText = episodeTitle ? `Tema: ${episodeTitle}` : ''

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          background:
            'linear-gradient(135deg, #020617 0%, #0f172a 48%, #1e3a8a 100%)',
          color: '#ffffff',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            background:
              'radial-gradient(circle at 18% 8%, rgba(96,165,250,0.42), transparent 34%), radial-gradient(circle at 88% 86%, rgba(250,204,21,0.20), transparent 35%)',
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: 56,
            top: 52,
            right: 56,
            bottom: 52,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            border: '2px solid rgba(255,255,255,0.16)',
            borderRadius: 44,
            background: 'rgba(15,23,42,0.72)',
            padding: '48px 60px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 28,
              width: '100%',
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: 24,
                fontWeight: 900,
                letterSpacing: 8,
                color: '#bfdbfe',
              }}
            >
              PALAVRA DO DIA
            </div>

            {bibleReference ? (
              <div
                style={{
                  display: 'flex',
                  fontSize: 24,
                  fontWeight: 900,
                  color: '#dbeafe',
                }}
              >
                {bibleReference}
              </div>
            ) : null}
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 22,
              width: '100%',
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize,
                lineHeight: 1.08,
                fontWeight: 900,
                letterSpacing: -1.8,
                maxWidth: 950,
                textShadow: '0 5px 18px rgba(0,0,0,0.48)',
              }}
            >
              {quoteDisplayText}
            </div>

            {themeDisplayText ? (
              <div
                style={{
                  display: 'flex',
                  fontSize: 26,
                  fontWeight: 700,
                  color: '#cbd5e1',
                  maxWidth: 900,
                }}
              >
                {themeDisplayText}
              </div>
            ) : null}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              borderTop: '1px solid rgba(255,255,255,0.14)',
              paddingTop: 24,
              width: '100%',
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: 32,
                fontWeight: 900,
              }}
            >
              Pr. Djeone Martins
            </div>

            <div
              style={{
                display: 'flex',
                fontSize: 23,
                color: '#cbd5e1',
                fontWeight: 700,
              }}
            >
              Devocional Diário
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control':
          'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800',
      },
    }
  )
}
