import { useEffect, useState, useCallback } from 'react'
import { db, getGoals, getLogsForDate, todayString, type LogEntry } from '../lib/db'
import MacroRing from '../components/MacroRing'
import LogEntryRow from '../components/LogEntryRow'
import { useI18n, type Lang } from '../lib/i18n'
import type { Screen } from '../App'

interface Props {
  navigate: (s: Screen, date?: string) => void
}

const DATE_LOCALE: Record<Lang, string> = { en: 'en-GB', de: 'de-DE' }

export default function TodayScreen({ navigate }: Props) {
  const { t, lang } = useI18n()
  const today = todayString()
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [goals, setGoals] = useState({ calories: 2000, protein: 150, carbs: 200, fat: 65 })

  const load = useCallback(async () => {
    const [e, g] = await Promise.all([getLogsForDate(today), getGoals()])
    setEntries(e)
    setGoals(g)
  }, [today])

  useEffect(() => { load() }, [load])

  const totals = entries.reduce(
    (acc, e) => ({ calories: acc.calories + e.calories, protein: acc.protein + e.protein, carbs: acc.carbs + e.carbs, fat: acc.fat + e.fat }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  async function handleDelete(id: number) {
    await db.logs.delete(id)
    load()
  }

  const remaining = goals.calories - totals.calories
  const dateLabel = new Date().toLocaleDateString(DATE_LOCALE[lang], { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="px-4 pt-6 pb-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t.today_title}</h1>
          <p className="text-slate-400 text-sm capitalize">{dateLabel}</p>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-bold ${remaining < 0 ? 'text-red-400' : 'text-green-400'}`}>
            {remaining < 0 ? '+' : ''}{Math.abs(remaining)}
          </p>
          <p className="text-xs text-slate-400">{remaining < 0 ? t.today_over_goal : t.today_kcal_remaining}</p>
        </div>
      </div>

      {/* Calorie progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">{t.today_calories}</span>
          <span className="font-medium">{totals.calories} / {goals.calories} kcal</span>
        </div>
        <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${totals.calories > goals.calories ? 'bg-red-500' : 'bg-green-500'}`}
            style={{ width: `${Math.min(totals.calories / goals.calories * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Macro rings */}
      <div className="flex justify-around bg-slate-800 rounded-2xl p-4">
        <MacroRing label={t.macro_protein} value={Math.round(totals.protein)} goal={goals.protein} color="#3b82f6" />
        <MacroRing label={t.macro_carbs}   value={Math.round(totals.carbs)}   goal={goals.carbs}   color="#f59e0b" />
        <MacroRing label={t.macro_fat}     value={Math.round(totals.fat)}     goal={goals.fat}     color="#ec4899" />
      </div>

      {/* Quick add buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => navigate('log', today)}
          className="flex-1 bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-xl transition"
        >
          {t.today_add_food}
        </button>
        <button
          onClick={() => navigate('camera')}
          className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-xl transition"
        >
          {t.today_ai_scan}
        </button>
      </div>

      {/* Food log */}
      <div className="space-y-2">
        <h2 className="font-semibold text-slate-300">{t.today_food_log}</h2>
        {entries.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">{t.today_empty}</p>
        ) : (
          entries.map(e => (
            <LogEntryRow key={e.id} entry={e} onDelete={handleDelete} />
          ))
        )}
      </div>
    </div>
  )
}
