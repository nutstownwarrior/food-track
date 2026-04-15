interface Props {
  label: string
  value: number
  goal: number
  color: string
  unit?: string
}

export default function MacroRing({ label, value, goal, color, unit = 'g' }: Props) {
  const pct = Math.min(value / goal, 1)
  const r = 28
  const circ = 2 * Math.PI * r
  const dash = circ * pct
  const over = value > goal

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-16">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={r} fill="none" stroke="#1e293b" strokeWidth="6" />
          <circle
            cx="32" cy="32" r={r} fill="none"
            stroke={over ? '#ef4444' : color}
            strokeWidth="6"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs font-bold leading-none">{value}</span>
          <span className="text-[9px] text-slate-400">{unit}</span>
        </div>
      </div>
      <span className="text-[11px] text-slate-400">{label}</span>
      <span className="text-[10px] text-slate-500">/{goal}{unit}</span>
    </div>
  )
}
