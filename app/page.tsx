'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'
import TabHoje from '@/components/tabs/TabHoje'
import TabSeries from '@/components/tabs/TabSeries'
import TabOracao from '@/components/tabs/TabOracao'
import TabOferta from '@/components/tabs/TabOferta'

export type Tab = 'hoje' | 'series' | 'oracao' | 'oferta'

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('hoje')

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto">
      <Header />
      
      <main className="p-5 pb-24">
        {activeTab === 'hoje' && <TabHoje />}
        {activeTab === 'series' && <TabSeries />}
        {activeTab === 'oracao' && <TabOracao />}
        {activeTab === 'oferta' && <TabOferta />}
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}
