import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const title = searchParams.get('title') || 'Devocional Diário'
    const subtitle = searchParams.get('subtitle') || 'Pastor Djeone Martins'

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#1e40af',
            backgroundImage: 'linear-gradient(to bottom, #2563eb, #1e3a8a)',
          }}
        >
          {/* Icon */}
          <div
            style={{
              fontSize: 120,
              marginBottom: 40,
            }}
          >
            🎙️
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: 60,
              fontWeight: 'bold',
              color: 'white',
              textAlign: 'center',
              marginBottom: 20,
              padding: '0 40px',
            }}
          >
            📖 {title}
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: 36,
              color: '#93c5fd',
              textAlign: 'center',
              padding: '0 40px',
              marginBottom: 40,
            }}
          >
            "{subtitle}"
          </div>

          {/* Footer */}
          <div
            style={{
              fontSize: 28,
              color: '#dbeafe',
              textAlign: 'center',
            }}
          >
            Pastor Djeone Martins
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