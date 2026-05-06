'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'
import TabHoje from '@/components/tabs/TabHoje'
import TabLeitura from '@/components/tabs/TabLeitura'
import TabOracao from '@/components/tabs/TabOracao'
import TabVoce from '@/components/tabs/TabVoce'
import TabMais from '@/components/tabs/TabMais'
import TabSeries from '@/components/tabs/TabSeries'
import TabOferta from '@/components/tabs/TabOferta'
import TabFavoritos from '@/components/tabs/favorites/TabFavoritos'

export default function Home() {
  const [activeTab, setActiveTab] = useState('hoje')

  const tabs = [
    { id: 'hoje', label: 'Hoje', icon: 'home' },
    { id: 'leitura', label: 'Leitura', icon: 'book' },
    { id: 'oracao', label: 'Oração', icon: 'prayer' },
    { id: 'voce', label: 'Você', icon: 'user' },
    { id: 'mais', label: 'Mais', icon: 'more' },
  ]

  return (
    <div className="min-h-screen bg-slate-950">
      <Header />

      <main className="pt-16">
        {activeTab === 'hoje' && (
          <TabHoje
            onOpenSeries={() => setActiveTab('series')}
            onOpenReading={() => setActiveTab('leitura')}
            onOpenPrayer={() => setActiveTab('oracao')}
          />
        )}

        {activeTab === 'leitura' && <TabLeitura />}

        {activeTab === 'oracao' && <TabOracao />}

        {activeTab === 'voce' && (
          <TabVoce onOpenFavoritos={() => setActiveTab('favoritos')} />
        )}

        {activeTab === 'mais' && (
          <TabMais
            onOpenSeries={() => setActiveTab('series')}
            onOpenOferta={() => setActiveTab('oferta')}
          />
        )}

        {activeTab === 'series' && <TabSeries />}

        {activeTab === 'favoritos' && <TabFavoritos />}

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
