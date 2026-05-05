import type { ReadingSubTab } from './types'

type ReadingTabsProps = {
  activeTab: ReadingSubTab
  onChange: (tab: ReadingSubTab) => void
}

const tabs: Array<{ id: ReadingSubTab; label: string }> = [
  { id: 'hoje', label: 'Hoje' },
  { id: 'planos', label: 'Planos' },
  { id: 'biblia', label: 'Bíblia' },
]

export default function ReadingTabs({
  activeTab,
  onChange,
}: ReadingTabsProps) {
  return (
    <div className="mb-5 grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-1">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={
              isActive
                ? 'rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white'
                : 'rounded-xl px-3 py-2 text-xs font-bold text-slate-400'
            }
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
