import type { Screen } from '../App'

interface Props {
  current: Screen
  navigate: (s: Screen) => void
}

const tabs: { id: Screen; label: string; icon: string }[] = [
  { id: 'today',    label: 'Today',    icon: '🏠' },
  { id: 'log',      label: 'Add Food', icon: '➕' },
  { id: 'camera',   label: 'AI Scan',  icon: '📷' },
  { id: 'history',  label: 'History',  icon: '📅' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
]

export default function BottomNav({ current, navigate }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-slate-800 border-t border-slate-700 safe-bottom z-50">
      <div className="flex">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => navigate(tab.id)}
            className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-colors
              ${current === tab.id ? 'text-green-400' : 'text-slate-400'}`}
          >
            <span className="text-lg leading-none">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
