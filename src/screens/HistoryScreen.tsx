import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, exportAllData, resetDatabase, getGoals, type LogEntry } from '../lib/db'
import { useI18n, type Lang } from '../lib/i18n'
import type { Screen } from '../App'

interface Props {
  navigate: (s: Screen, date?: string) => void
}

const DATE_LOCALE: Record<Lang, string> = { en: 'en-GB', de: 'de-DE' }

function groupByDate(logs: LogEntry[]) {
  const map = new Map<string, LogEntry[]>()
  for (const l of logs) {
    const arr = map.get(l.date) ?? []
    arr.push(l)
    map.set(l.date, arr)
  }
  return map
}

function DaySummary({
  date, entries, goal, onClick, lang, itemsLabel,
}: {
  date: string; entries: LogEntry[]; goal: number; onClick: () => void
  lang: Lang; itemsLabel: (n: number) => string
}) {
  const totals = entries.reduce((acc, e) => ({
    calories: acc.calories + e.calories,
    protein:  acc.protein  + e.protein,
    carbs:    acc.carbs    + e.carbs,
    fat:      acc.fat      + e.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 })

  const pct  = Math.min(totals.calories / goal, 1)
  const over = totals.calories > goal
  const d    = new Date(date + 'T12:00:00')
  const label = d.toLocaleDateString(DATE_LOCALE[lang], { weekday: 'long', day: 'numeric', month: 'short' })

  return (
    <button onClick={onClick} className="w-full text-left bg-slate-800 rounded-xl px-4 py-3 space-y-2 transition hover:bg-slate-750">
      <div className="flex justify-between items-center">
        <span className="font-medium capitalize">{label}</span>
        <span className={`font-bold ${over ? 'text-red-400' : 'text-green-400'}`}>{totals.calories} kcal</span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${over ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${pct * 100}%` }} />
      </div>
      <p className="text-xs text-slate-400">
        P {Math.round(totals.protein)}g · C {Math.round(totals.carbs)}g · F {Math.round(totals.fat)}g · {itemsLabel(entries.length)}
      </p>
    </button>
  )
}

export default function HistoryScreen({ navigate }: Props) {
  const { t, lang } = useI18n()
  const [showReset, setShowReset] = useState(false)

  const allLogs = useLiveQuery(() => db.logs.orderBy('date').reverse().toArray(), [])
  const goals   = useLiveQuery(() => getGoals(), [])

  async function handleExport() {
    const data = await exportAllData()
    const blob = new Blob([data], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `food-track-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleReset() {
    await resetDatabase()
    setShowReset(false)
  }

  if (!allLogs || !goals) return <div className="p-6 text-slate-400">…</div>

  const grouped     = groupByDate(allLogs)
  const sortedDates = [...grouped.keys()].sort().reverse()

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <h1 className="text-2xl font-bold">{t.history_title}</h1>

      {allLogs.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-800 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-green-400">{sortedDates.length}</p>
            <p className="text-xs text-slate-400">{t.history_days}</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-blue-400">
              {Math.round(allLogs.reduce((a, e) => a + e.calories, 0) / sortedDates.length)}
            </p>
            <p className="text-xs text-slate-400">{t.history_avg}</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-pink-400">{allLogs.length}</p>
            <p className="text-xs text-slate-400">{t.history_entries}</p>
          </div>
        </div>
      )}

      {sortedDates.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-12">{t.history_empty}</p>
      ) : (
        <div className="space-y-2">
          {sortedDates.map(date => (
            <DaySummary
              key={date}
              date={date}
              entries={grouped.get(date)!}
              goal={goals.calories}
              onClick={() => navigate('log', date)}
              lang={lang}
              itemsLabel={t.history_items}
            />
          ))}
        </div>
      )}

      <div className="pt-4 space-y-3">
        <button onClick={handleExport} className="w-full bg-slate-700 hover:bg-slate-600 py-3 rounded-xl font-semibold transition">
          {t.history_export}
        </button>
        <button
          onClick={() => setShowReset(true)}
          className="w-full bg-red-900/40 hover:bg-red-900/60 border border-red-700 text-red-400 py-3 rounded-xl font-semibold transition"
        >
          {t.history_reset}
        </button>
      </div>

      {showReset && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6">
          <div className="bg-slate-800 rounded-2xl p-6 space-y-4 max-w-sm w-full">
            <h3 className="text-xl font-bold text-red-400">{t.reset_title}</h3>
            <p className="text-slate-300 text-sm">{t.reset_body}</p>
            <p className="text-yellow-400 text-sm font-medium">{t.reset_warning}</p>
            <div className="flex gap-3">
              <button onClick={() => setShowReset(false)} className="flex-1 bg-slate-700 py-3 rounded-xl font-semibold">{t.reset_cancel}</button>
              <button onClick={handleReset} className="flex-1 bg-red-600 hover:bg-red-500 py-3 rounded-xl font-semibold transition">{t.reset_confirm}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
