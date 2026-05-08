import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AudioProvider } from '@/components/audio/AudioProvider'
import MiniPlayer from '@/components/audio/MiniPlayer'
import ExpandedPlayer from '@/components/audio/ExpandedPlayer'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Djeone Martins - Devocional Diário',
  description: 'Devocional diário com Pr. Djeone Martins',
  manifest: '/manifest.json',
  icons: {
    icon: [
      {
        url: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        url: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    apple: [
      {
        url: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#020617',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <AudioProvider>
          {children}
          <MiniPlayer />
          <ExpandedPlayer />
        </AudioProvider>
      </body>
    </html>
  )
}
