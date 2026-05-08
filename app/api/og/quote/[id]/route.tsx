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

export async function GET(_request: Request, { params }: RouteProps) {
  const { id } = await params

  let quoteText = 'Palavra do Dia'
  let cardImageUrl = ''

  if (isUuid(id)) {
    try {
      const supabase = createSupabaseAdminClient()

      const { data, error } = await supabase
        .from('daily_quotes')
        .select('id, quote_text, status, card_image_url')
        .eq('id', id)
        .eq('status', 'published')
        .maybeSingle()

      if (error) {
        console.error('Erro ao carregar OG da Palavra do Dia:', error)
      }

      if (data?.quote_text) {
        quoteText = cleanText(data.quote_text)
        cardImageUrl = cleanText(data.card_image_url)
      }
    } catch (error) {
      console.error('Erro inesperado na rota OG da Palavra do Dia:', error)
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          background:
            'linear-gradient(135deg, #020617 0%, #0f172a 52%, #1d4ed8 100%)',
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
              'radial-gradient(circle at 24% 10%, rgba(250,204,21,0.18), transparent 34%), radial-gradient(circle at 88% 86%, rgba(96,165,250,0.34), transparent 38%)',
          }}
        />

        {cardImageUrl ? (
          <div
            style={{
              width: 540,
              height: 540,
              display: 'flex',
              overflow: 'hidden',
              borderRadius: 42,
              border: '2px solid rgba(255,255,255,0.18)',
              background: '#020617',
              boxShadow: '0 34px 90px rgba(0,0,0,0.55)',
            }}
          >
            <img
              src={cardImageUrl}
              width="540"
              height="540"
              alt="Palavra do Dia"
              style={{
                width: 540,
                height: 540,
                objectFit: 'cover',
                display: 'flex',
              }}
            />
          </div>
        ) : (
          <div
            style={{
              width: 900,
              height: 470,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 42,
              border: '2px solid rgba(255,255,255,0.18)',
              background: 'rgba(15,23,42,0.72)',
              padding: 54,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: 26,
                fontWeight: 900,
                letterSpacing: 8,
                color: '#bfdbfe',
                marginBottom: 42,
              }}
            >
              PALAVRA DO DIA
            </div>

            <div
              style={{
                display: 'flex',
                fontSize: 58,
                lineHeight: 1.1,
                fontWeight: 900,
              }}
            >
              {quoteText}
            </div>

            <div
              style={{
                display: 'flex',
                marginTop: 48,
                fontSize: 30,
                fontWeight: 900,
              }}
            >
              Pr. Djeone Martins
            </div>
          </div>
        )}
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
