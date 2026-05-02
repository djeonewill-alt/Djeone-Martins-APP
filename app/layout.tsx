import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AudioProvider } from '@/components/audio/AudioProvider'
import MiniPlayer from '@/components/audio/MiniPlayer'
import ExpandedPlayer from '@/components/audio/ExpandedPlayer'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Djeone Martins - Devocional Diário',
  description: 'Devocional diário com Pastor Djeone Martins',
  manifest: '/manifest.json',
  themeColor: '#2563EB',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
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