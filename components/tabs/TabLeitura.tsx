'use client'

import { useEffect, useState } from 'react'
import { getChapterKey } from './reading/bibleData'
import BibleLibrary from './reading/BibleLibrary'
import ReadingDashboard from './reading/ReadingDashboard'
import ReadingPlans from './reading/ReadingPlans'
import ReadingTabs from './reading/ReadingTabs'
import {
  DEFAULT_READING_STATE,
  loadReadingState,
  saveReadingState,
} from './reading/storage'
import type {
  BibleChapterRef,
  ReadingState,
  ReadingSubTab,
} from './reading/types'

export default function TabLeitura() {
  const [activeSubTab, setActiveSubTab] = useState<ReadingSubTab>('hoje')
  const [state, setState] = useState<ReadingState>(DEFAULT_READING_STATE)

  useEffect(() => {
    setState(loadReadingState())
  }, [])

  const updateState = (nextState: ReadingState) => {
    setState(nextState)
    saveReadingState(nextState)
  }

  const handleStartPlan = (planId: string) => {
    updateState({
      ...state,
      activePlanId: planId,
      activePlanStartedAt: new Date().toISOString(),
    })

    setActiveSubTab('hoje')
  }

  const handleToggleChapter = (chapter: BibleChapterRef) => {
    const key = getChapterKey(chapter.bookId, chapter.chapter)
    const nextReadChapters = { ...state.readChapters }

    if (nextReadChapters[key]) {
      delete nextReadChapters[key]
    } else {
      nextReadChapters[key] = new Date().toISOString()
    }

    updateState({
      ...state,
      readChapters: nextReadChapters,
    })
  }

  return (
    <div className="min-h-screen bg-slate-950 px-5 pb-32 pt-20 text-white">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-300">
            Leitura bíblica
          </p>

          <h1 className="mt-2 text-3xl font-black leading-tight tracking-[-0.05em]">
            Cresça na Palavra todos os dias
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Acompanhe seu plano, marque capítulos lidos e veja seu progresso na Bíblia.
          </p>
        </div>

        <ReadingTabs
          activeTab={activeSubTab}
          onChange={setActiveSubTab}
        />

        {activeSubTab === 'hoje' && (
          <ReadingDashboard
            state={state}
            onToggleChapter={handleToggleChapter}
            onOpenPlans={() => setActiveSubTab('planos')}
            onOpenBible={() => setActiveSubTab('biblia')}
          />
        )}

        {activeSubTab === 'planos' && (
          <ReadingPlans
            state={state}
            onStartPlan={handleStartPlan}
          />
        )}

        {activeSubTab === 'biblia' && (
          <BibleLibrary
            state={state}
            onToggleChapter={handleToggleChapter}
          />
        )}
      </div>
    </div>
  )
}
