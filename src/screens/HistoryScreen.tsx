import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, exportAllData, resetDatabase, getGoals, type LogEntry } from '../lib/db'
import type { Screen } from '../App'

interface Props {
  navigate: (s: Screen, date?: string) => void
}

function groupByDate(logs: LogEntry[]) {
  const map = new Map<string, LogEntry[]>()
  for (const l of logs) {
    const arr = map.get(l.date) ?? []
    arr.push(l)
    map.set(l.date, arr)
  }
  return map
}

function DaySummary({ date, entries, goal, onClick }: { date: string; entries: LogEntry[]; goal: number; onClick: () => void }) {
  const totals = entries.reduce((acc, e) => ({
    calories: acc.calories + e.calories,
    protein: acc.protein + e.protein,
    carbs: acc.carbs + e.carbs,
    fat: acc.fat + e.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 })

  const pct = Math.min(totals.calories / goal, 1)
  const over = totals.calories > goal

  const d = new Date(date + 'T12:00:00')
  const label = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })

  return (
    <button onClick={onClick} className="w-full text-left bg-slate-800 rounded-xl px-4 py-3 space-y-2 hover:bg-slate-750 transition">
      <div className="flex justify-between items-center">
        <span className="font-medium">{label}</span>
        <span className={`font-bold ${over ? 'text-red-400' : 'text-green-400'}`}>{totals.calories} kcal</span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${over ? 'bg-red-500' : 'bg-green-500'}`}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      <p className="text-xs text-slate-400">P {Math.round(totals.protein)}g · C {Math.round(totals.carbs)}g · F {Math.round(totals.fat)}g · {entries.length} items</p>
    </button>
  )
}

export default function HistoryScreen({ navigate }: Props) {
  const [showReset, setShowReset] = useState(false)

  const allLogs = useLiveQuery(() => db.logs.orderBy('date').reverse().toArray(), [])
  const goals = useLiveQuery(() => getGoals(), [])

  async function handleExport() {
    const data = await exportAllData()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `food-track-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleReset() {
    await resetDatabase()
    setShowReset(false)
  }

  if (!allLogs || !goals) return <div className="p-6 text-slate-400">Loading…</div>

  const grouped = groupByDate(allLogs)
  const sortedDates = [...grouped.keys()].sort().reverse()

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <h1 className="text-2xl font-bold">History</h1>

      {/* Summary stats */}
      {allLogs.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-800 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-green-400">{sortedDates.length}</p>
            <p className="text-xs text-slate-400">days logged</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-blue-400">
              {Math.round(allLogs.reduce((a, e) => a + e.calories, 0) / sortedDates.length)}
            </p>
            <p className="text-xs text-slate-400">avg kcal/day</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-pink-400">{allLogs.length}</p>
            <p className="text-xs text-slate-400">total entries</p>
          </div>
        </div>
      )}

      {/* Day list */}
      {sortedDates.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-12">No history yet. Start logging food!</p>
      ) : (
        <div className="space-y-2">
          {sortedDates.map(date => (
            <DaySummary
              key={date}
              date={date}
              entries={grouped.get(date)!}
              goal={goals.calories}
              onClick={() => navigate('log', date)}
            />
          ))}
        </div>
      )}

      {/* Export / Reset */}
      <div className="pt-4 space-y-3">
        <button
          onClick={handleExport}
          className="w-full bg-slate-700 hover:bg-slate-600 py-3 rounded-xl font-semibold transition"
        >
          📥 Export All Data (JSON)
        </button>
        <button
          onClick={() => setShowReset(true)}
          className="w-full bg-red-900/40 hover:bg-red-900/60 border border-red-700 text-red-400 py-3 rounded-xl font-semibold transition"
        >
          🗑️ Reset Database
        </button>
      </div>

      {showReset && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6">
          <div className="bg-slate-800 rounded-2xl p-6 space-y-4 max-w-sm w-full">
            <h3 className="text-xl font-bold text-red-400">Reset Database?</h3>
            <p className="text-slate-300 text-sm">This will permanently delete all food log entries and your custom food database. Settings (goals, API key) will be kept.</p>
            <p className="text-yellow-400 text-sm font-medium">Consider exporting your data first.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowReset(false)} className="flex-1 bg-slate-700 py-3 rounded-xl font-semibold">Cancel</button>
              <button onClick={handleReset} className="flex-1 bg-red-600 hover:bg-red-500 py-3 rounded-xl font-semibold transition">Delete Everything</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
