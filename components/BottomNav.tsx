'use client'

import type { Tab } from '@/app/page'

type BottomNavProps = {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const tabs = [
    { id: 'hoje' as Tab, icon: '🏠', label: 'Hoje' },
    { id: 'series' as Tab, icon: '📚', label: 'Séries' },
    { id: 'oracao' as Tab, icon: '🙏', label: 'Oração' },
    { id: 'oferta' as Tab, icon: '💚', label: 'Oferta' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 max-w-md mx-auto">
      <div className="flex">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 py-3 px-2 flex flex-col items-center gap-1 transition-colors ${
              activeTab === tab.id
                ? 'text-blue-600'
                : 'text-gray-600 hover:text-blue-500'
            }`}
          >
            <span className="text-2xl">{tab.icon}</span>
            <span className="text-xs font-semibold">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
