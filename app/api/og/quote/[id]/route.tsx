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

function getQuoteFontSize(text: string) {
  if (text.length > 125) return 31
  if (text.length > 95) return 34
  if (text.length > 70) return 38
  return 44
}

export async function GET(_request: Request, { params }: RouteProps) {
  const { id } = await params

  let quoteText = 'Receba uma Palavra do Dia para fortalecer sua fé.'
  let backgroundImageUrl = ''

  if (isUuid(id)) {
    try {
      const supabase = createSupabaseAdminClient()

      const { data, error } = await supabase
        .from('daily_quotes')
        .select(`
          id,
          quote_text,
          status,
          background_image_url,
          source_image_url,
          card_image_url
        `)
        .eq('id', id)
        .eq('status', 'published')
        .maybeSingle()

      if (error) {
        console.error('Erro ao carregar OG da Palavra do Dia:', error)
      }

      if (data?.quote_text) {
        quoteText = cleanText(data.quote_text)
        backgroundImageUrl =
          cleanText(data.background_image_url) ||
          cleanText(data.source_image_url) ||
          cleanText(data.card_image_url)
      }
    } catch (error) {
      console.error('Erro inesperado na rota OG da Palavra do Dia:', error)
    }
  }

  const fittedQuote = fitText(quoteText)
  const quoteFontSize = getQuoteFontSize(fittedQuote)

  return new ImageResponse(
    (
      <div
        style={{
          width: '800px',
          height: '420px',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          background: '#020617',
          color: '#ffffff',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        {backgroundImageUrl ? (
          <img
            src={backgroundImageUrl}
            width="800"
            height="420"
            alt=""
            style={{
              position: 'absolute',
              inset: 0,
              width: 800,
              height: 420,
              objectFit: 'cover',
              objectPosition: 'center center',
              display: 'flex',
            }}
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              background:
                'linear-gradient(135deg, #020617 0%, #0f172a 48%, #1e3a8a 100%)',
            }}
          />
        )}

        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            background: 'rgba(2,6,23,0.70)',
          }}
        />

        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            background:
              'linear-gradient(180deg, rgba(2,6,23,0.48) 0%, rgba(2,6,23,0.12) 30%, rgba(2,6,23,0.12) 68%, rgba(2,6,23,0.58) 100%)',
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: 58,
            top: 32,
            right: 58,
            bottom: 30,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div
              style={{
                display: 'flex',
                width: 96,
                height: 1,
                background:
                  'linear-gradient(90deg, rgba(217,188,107,0), rgba(217,188,107,0.95), rgba(217,188,107,0))',
              }}
            />

            <div
              style={{
                display: 'flex',
                fontSize: 13,
                fontWeight: 900,
                letterSpacing: 8,
                color: '#fff4d6',
                textShadow:
                  '0 2px 2px rgba(0,0,0,0.95), 0 5px 16px rgba(0,0,0,0.98), 0 0 22px rgba(0,0,0,0.9)',
                textTransform: 'uppercase',
              }}
            >
              PALAVRA DO DIA
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              maxWidth: 650,
              fontSize: quoteFontSize,
              lineHeight: 1.18,
              fontWeight: 700,
              letterSpacing: -0.2,
              color: '#fffdf5',
              fontFamily: 'Georgia, serif',
              textShadow:
                '0 2px 2px rgba(0,0,0,0.92), 0 6px 20px rgba(0,0,0,0.98), 0 0 32px rgba(0,0,0,0.85)',
            }}
          >
            {`“${fittedQuote}”`}
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 9,
            }}
          >
            <div
              style={{
                display: 'flex',
                width: 96,
                height: 1,
                background:
                  'linear-gradient(90deg, rgba(217,188,107,0), rgba(217,188,107,0.95), rgba(217,188,107,0))',
              }}
            />

            <div
              style={{
                display: 'flex',
                fontSize: 25,
                fontWeight: 700,
                color: '#fffdf5',
                fontFamily: 'Georgia, serif',
                textShadow:
                  '0 2px 2px rgba(0,0,0,0.92), 0 6px 18px rgba(0,0,0,0.98), 0 0 28px rgba(0,0,0,0.82)',
              }}
            >
              Pr. Djeone Martins
            </div>

            <div
              style={{
                display: 'flex',
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: 5,
                color: '#fff4d6',
                textShadow:
                  '0 2px 2px rgba(0,0,0,0.90), 0 5px 14px rgba(0,0,0,0.96)',
                textTransform: 'uppercase',
              }}
            >
              DEVOCIONAL DIÁRIO
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 800,
      height: 420,
      headers: {
        'Cache-Control':
          'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800',
      },
    }
  )
}
