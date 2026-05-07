import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const title = searchParams.get('title') || 'Devocional Diário'
    const subtitle = searchParams.get('subtitle') || 'Pastor Djeone Martins'
    const background = searchParams.get('background')

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
                  'linear-gradient(135deg, #0f172a, #1d4ed8 52%, #020617)',
              }}
            />
          )}

          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(90deg, rgba(2,6,23,0.92), rgba(2,6,23,0.68) 50%, rgba(2,6,23,0.36)), linear-gradient(0deg, rgba(2,6,23,0.9), rgba(2,6,23,0.08) 58%, rgba(2,6,23,0.42))',
            }}
          />

          <div
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              padding: '72px',
            }}
          >
            <div
              style={{
                fontSize: 30,
                fontWeight: 800,
                color: '#bfdbfe',
                letterSpacing: 8,
                marginBottom: 28,
                textTransform: 'uppercase',
              }}
            >
              Áudio devocional
            </div>

            <div
              style={{
                maxWidth: 900,
                fontSize: 72,
                fontWeight: 900,
                lineHeight: 0.98,
                color: 'white',
                marginBottom: 28,
                textShadow: '0 8px 30px rgba(0,0,0,0.62)',
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
              <span>{subtitle}</span>
              <span style={{ color: '#60a5fa' }}>•</span>
              <span>Pr. Djeone Martins</span>
            </div>
          </div>

          <div
            style={{
              position: 'absolute',
              right: 60,
              top: 52,
              display: 'flex',
              height: 84,
              width: 84,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 42,
              background: 'rgba(15,23,42,0.72)',
              color: 'white',
              fontSize: 40,
              border: '1px solid rgba(255,255,255,0.18)',
            }}
          >
            🎙️
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (e) {
    console.error(e)
    return new Response('Failed to generate image', { status: 500 })
  }
}
