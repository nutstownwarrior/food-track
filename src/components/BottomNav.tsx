import type { Screen } from '../App'
import { useI18n } from '../lib/i18n'

interface Props {
  current: Screen
  navigate: (s: Screen) => void
}

export default function BottomNav({ current, navigate }: Props) {
  const { t } = useI18n()

  const tabs: { id: Screen; label: string; icon: string }[] = [
    { id: 'today',    label: t.nav_today,    icon: '🏠' },
    { id: 'log',      label: t.nav_add_food, icon: '➕' },
    { id: 'camera',   label: t.nav_ai_scan,  icon: '📷' },
    { id: 'history',  label: t.nav_history,  icon: '📅' },
    { id: 'settings', label: t.nav_settings, icon: '⚙️' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-slate-800 border-t border-slate-700 safe-bottom z-40">
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
