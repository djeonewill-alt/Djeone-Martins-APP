'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'
import TabHoje from '@/components/tabs/TabHoje'
import TabSeries from '@/components/tabs/TabSeries'
import TabOracao from '@/components/tabs/TabOracao'
import TabOferta from '@/components/tabs/TabOferta'
import TabFavoritos from '@/components/tabs/favorites/TabFavoritos'

export default function Home() {
  const [activeTab, setActiveTab] = useState('hoje')

  const tabs = [
    { id: 'hoje', label: 'Hoje', icon: '🎙️' },
    { id: 'series', label: 'Séries', icon: '📚' },
    { id: 'favoritos', label: 'Favoritos', icon: '❤️' },
    { id: 'oracao', label: 'Oração', icon: '🙏' },
    { id: 'oferta', label: 'Oferta', icon: '💚' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="pt-16">
        {activeTab === 'hoje' && <TabHoje onOpenSeries={() => setActiveTab('series')} />}
        {activeTab === 'series' && <TabSeries />}
        {activeTab === 'favoritos' && <TabFavoritos />}
        {activeTab === 'oracao' && <TabOracao />}
        {activeTab === 'oferta' && <TabOferta />}
      </main>

      <BottomNav 
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </div>
  )
}