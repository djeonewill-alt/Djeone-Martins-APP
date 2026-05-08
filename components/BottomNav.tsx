'use client'

type Tab = {
  id: string
  label: string
  icon: string
}

type BottomNavProps = {
  tabs: Tab[]
  activeTab: string
  onTabChange: (tabId: string) => void
}

function HomeIcon({ className }: { className: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )
}

function BookIcon({ className }: { className: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  )
}

function PrayerIcon({ className }: { className: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 11.5V8a2 2 0 114 0v3.5m0 0V7a2 2 0 114 0v6m0-2V9a2 2 0 114 0v6a7 7 0 01-14 0v-3a2 2 0 114 0v2" />
    </svg>
  )
}

function UserIcon({ className }: { className: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 7.5a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a8.25 8.25 0 0115 0" />
    </svg>
  )
}

function MoreIcon({ className }: { className: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
    </svg>
  )
}

export default function BottomNav({
  tabs,
  activeTab,
  onTabChange,
}: BottomNavProps) {
  const effectiveActiveTab = ['series', 'oferta'].includes(activeTab)
    ? 'mais'
    : ['favoritos'].includes(activeTab)
      ? 'voce'
      : activeTab

  const getIcon = (tabId: string, isActive: boolean) => {
    const baseClass = `h-5 w-5 transition-all ${
      isActive ? 'text-white' : 'text-slate-500'
    }`

    switch (tabId) {
      case 'hoje':
        return <HomeIcon className={baseClass} />
      case 'leitura':
        return <BookIcon className={baseClass} />
      case 'oracao':
        return <PrayerIcon className={baseClass} />
      case 'voce':
        return <UserIcon className={baseClass} />
      case 'mais':
        return <MoreIcon className={baseClass} />
      default:
        return null
    }
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800 bg-slate-950/95 backdrop-blur-md">
      <div className="mx-auto max-w-2xl">
        <div className="grid grid-cols-5">
          {tabs.map((tab) => {
            const isActive = effectiveActiveTab === tab.id

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex flex-col items-center justify-center py-2.5 transition-all ${
                  isActive
                    ? 'text-white'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <div className="mb-1">
                  {getIcon(tab.id, isActive)}
                </div>

                <span className="text-[11px] font-semibold">
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

