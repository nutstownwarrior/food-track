import type { LogEntry } from '../lib/db'

interface Props {
  entry: LogEntry
  onDelete: (id: number) => void
}

export default function LogEntryRow({ entry, onDelete }: Props) {
  return (
    <div className="flex items-center gap-3 bg-slate-800 rounded-xl px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{entry.food_name}</p>
        {entry.brand && <p className="text-xs text-slate-400 truncate">{entry.brand}</p>}
        <p className="text-xs text-slate-400 mt-0.5">{entry.quantity_g}g</p>
        {entry.ai_note && <p className="text-xs text-green-400 mt-0.5">🤖 {entry.ai_note}</p>}
      </div>
      <div className="text-right shrink-0">
        <p className="font-semibold text-green-400">{entry.calories} kcal</p>
        <p className="text-[11px] text-slate-400">P {entry.protein}g · C {entry.carbs}g · F {entry.fat}g</p>
      </div>
      <button
        onClick={() => onDelete(entry.id!)}
        className="text-slate-600 hover:text-red-400 text-lg ml-1 shrink-0"
        aria-label="Delete entry"
      >
        ×
      </button>
    </div>
  )
}
