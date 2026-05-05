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
    <div className="mb-6 rounded-[28px] border border-white/10 bg-white/[0.035] p-1.5 shadow-[0_16px_45px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <div className="grid grid-cols-3 gap-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={
                isActive
                  ? 'relative rounded-[20px] bg-slate-950 px-3 py-3 text-xs font-black uppercase tracking-[0.12em] text-white shadow-[inset_0_0_0_1px_rgba(96,165,250,0.22),0_10px_28px_rgba(37,99,235,0.18)]'
                  : 'rounded-[20px] px-3 py-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-500 transition-all hover:text-slate-300'
              }
            >
              <span>{tab.label}</span>

              {isActive && (
                <span className="absolute bottom-1.5 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-blue-400 shadow-[0_0_18px_rgba(96,165,250,0.75)]" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
