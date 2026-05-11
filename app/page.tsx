'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'
import TabHoje from '@/components/tabs/TabHoje'
import TabLeitura from '@/components/tabs/TabLeitura'
import TabOracao from '@/components/tabs/TabOracao'
import TabVoce from '@/components/tabs/TabVoce'
import TabMais from '@/components/tabs/TabMais'
import TabSettings from '@/components/tabs/TabSettings'
import TabSeries from '@/components/tabs/TabSeries'
import TabOferta from '@/components/tabs/TabOferta'
import TabFavoritos from '@/components/tabs/favorites/TabFavoritos'
import BetaOnboarding from '@/components/tester/BetaOnboarding'
import { useBetaTester } from '@/lib/beta/betaTester'

export default function Home() {
  const [activeTab, setActiveTab] = useState('hoje')
  const [openTesterCenterToken, setOpenTesterCenterToken] = useState(0)
  const [betaWelcomeRequested, setBetaWelcomeRequested] = useState(false)
  const [showBetaWelcome, setShowBetaWelcome] = useState(false)
  const {
    isBetaTester,
    betaTester,
    betaProfile,
    loading: betaLoading,
    refresh: refreshBetaTester,
  } = useBetaTester()

  const tabs = [
    { id: 'hoje', label: 'Hoje', icon: 'home' },
    { id: 'leitura', label: 'Leitura', icon: 'book' },
    { id: 'oracao', label: 'Oração', icon: 'prayer' },
    { id: 'voce', label: 'Você', icon: 'user' },
    { id: 'mais', label: 'Mais', icon: 'more' },
  ]

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab')
    const view = params.get('view')
    const open = params.get('open')

    if (tab === 'mais') {
      setActiveTab('mais')
    }

    if (tab === 'mais' && view === 'tester') {
      setOpenTesterCenterToken((current) => current + 1)
    }

    if (open === 'beta-welcome') {
      setBetaWelcomeRequested(true)
    }

    if (open === 'beta') {
      setActiveTab('mais')
      setOpenTesterCenterToken((current) => current + 1)
    }
  }, [])

  useEffect(() => {
    if (!betaWelcomeRequested || betaLoading) return

    if (isBetaTester) {
      setShowBetaWelcome(true)
    }
  }, [betaLoading, betaWelcomeRequested, isBetaTester])

  function openTesterCenter() {
    setShowBetaWelcome(false)
    setActiveTab('mais')
    setOpenTesterCenterToken((current) => current + 1)
    window.history.replaceState(null, '', '/?tab=mais&view=tester')
  }

  const betaOnboardingRequired =
    !betaLoading &&
    isBetaTester &&
    betaTester &&
    (!betaProfile || betaProfile.accepted_beta_terms !== true)

  if (betaOnboardingRequired && betaTester) {
    return (
      <div className="min-h-screen bg-slate-950">
        <BetaOnboarding
          betaTester={betaTester}
          betaProfile={betaProfile}
          required
          onOpenTesterCenter={openTesterCenter}
          onDismiss={() => undefined}
          onProfileSaved={refreshBetaTester}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Header
        onOpenSettings={() => setActiveTab('settings')}
      />

      <main className="pt-16">
        {activeTab === 'hoje' && (
          <TabHoje
            onOpenSeries={() => setActiveTab('series')}
            onOpenReading={() => setActiveTab('leitura')}
            onOpenPrayer={() => setActiveTab('oracao')}
            onOpenOferta={() => setActiveTab('oferta')}
          />
        )}

        {activeTab === 'leitura' && <TabLeitura />}

        {activeTab === 'oracao' && <TabOracao />}

        {activeTab === 'voce' && (
          <TabVoce onOpenFavoritos={() => setActiveTab('favoritos')} />
        )}

        {activeTab === 'settings' && <TabSettings />}

        {activeTab === 'mais' && (
          <TabMais
            onOpenSeries={() => setActiveTab('series')}
            onOpenOferta={() => setActiveTab('oferta')}
            openTesterCenterToken={openTesterCenterToken}
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

      {showBetaWelcome && betaTester && (
        <BetaOnboarding
          betaTester={betaTester}
          betaProfile={betaProfile}
          onOpenTesterCenter={openTesterCenter}
          onDismiss={() => setShowBetaWelcome(false)}
          onProfileSaved={refreshBetaTester}
        />
      )}
    </div>
  )
}




