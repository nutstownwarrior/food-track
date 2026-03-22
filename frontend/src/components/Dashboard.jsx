import { useState, useEffect } from 'react'
import { api } from '../api'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'

function CalorieRing({ consumed, goal }) {
  const pct = goal > 0 ? Math.min(consumed / goal, 1.2) : 0
  const r = 54
  const circ = 2 * Math.PI * r
  const dash = pct * circ
  const over = consumed > goal
  const color = over ? '#ef4444' : pct > 0.9 ? '#f59e0b' : '#16a34a'

  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={r} fill="none" stroke="#e5e7eb" strokeWidth="12" />
      <circle
        cx="70" cy="70" r={r}
        fill="none"
        stroke={color}
        strokeWidth="12"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 70 70)"
        style={{ transition: 'stroke-dasharray 0.5s ease' }}
      />
      <text x="70" y="65" textAnchor="middle" className="text-gray-800" fontSize="20" fontWeight="bold" fill={color}>
        {consumed}
      </text>
      <text x="70" y="82" textAnchor="middle" fontSize="11" fill="#6b7280">
        von {goal} kcal
      </text>
    </svg>
  )
}

function MacroBar({ label, value, goal, color }) {
  const pct = goal > 0 ? Math.min(value / goal, 1) : 0
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>{label}</span>
        <span>{Math.round(value)}g / {goal}g</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct * 100}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

export default function Dashboard({ onGoalsLoad }) {
  const [userData, setUserData] = useState(null)
  const [foodData, setFoodData] = useState(null)
  const [weights, setWeights] = useState([])
  const [activityData, setActivityData] = useState(null)
  const [loading, setLoading] = useState(true)
  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    try {
      const [user, food, w, activity] = await Promise.all([
        api.getUser(),
        api.getFood(today),
        api.getWeight(),
        api.getActivity(today),
      ])
      setUserData(user)
      setFoodData(food)
      setWeights(w.slice(0, 7).reverse())
      setActivityData(activity)
      if (onGoalsLoad && user.goals) onGoalsLoad(user.goals)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-4 text-center text-gray-400 pt-12">Lade Übersicht...</div>
  }

  const goals = userData?.goals
  const profile = userData?.profile
  const displayName = profile?.display_name || localStorage.getItem('username') || 'Benutzer'
  const consumed = foodData?.totals?.calories || 0
  const baseCalorieGoal = goals?.calorie_goal || 0
  const activeCaloriesToday = activityData?.totals?.active_calories || 0
  const calorieGoal = baseCalorieGoal + activeCaloriesToday
  const remaining = calorieGoal - consumed
  const proteinGoal = goals?.protein_goal_g || 0

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend'

  const weightChartData = weights.map(w => ({
    date: w.logged_at?.slice(5), // MM-DD
    kg: w.weight_kg,
  }))

  const setupIncomplete = !profile?.weight_kg || !profile?.height_cm || !profile?.birth_year

  return (
    <div className="p-4 space-y-4">
      {/* Greeting */}
      <div>
        <h2 className="text-xl font-bold text-gray-800">{greeting}, {displayName}! 👋</h2>
        <p className="text-sm text-gray-500">{new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      {setupIncomplete && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
          ⚠️ Bitte fülle dein Profil aus, um personalisierte Kalorienziele zu erhalten.
        </div>
      )}

      {/* Calorie Ring */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center gap-6">
          <CalorieRing consumed={consumed} goal={calorieGoal || 2000} />
          <div className="flex-1">
            <div className={`text-2xl font-bold ${remaining < 0 ? 'text-red-500' : 'text-green-600'}`}>
              {remaining < 0 ? `${Math.abs(remaining)} kcal` : `${remaining} kcal`}
            </div>
            <div className="text-sm text-gray-500">
              {remaining < 0 ? 'überzogen' : 'noch verfügbar'}
            </div>
            {activeCaloriesToday > 0 && (
              <div className="mt-2 text-xs text-orange-600 bg-orange-50 rounded px-2 py-1">
                🏃 +{activeCaloriesToday} kcal Aktivität
              </div>
            )}
            {goals?.warning_high_deficit && (
              <div className="mt-2 text-xs text-amber-600 bg-amber-50 rounded px-2 py-1">
                ⚠️ Großes Kaloriendefizit
              </div>
            )}
          </div>
        </div>

        {/* Macros */}
        {proteinGoal > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <MacroBar
              label="🥩 Eiweiß"
              value={foodData?.totals?.protein_g || 0}
              goal={proteinGoal}
              color="#f97316"
            />
            <MacroBar
              label="🌾 Kohlenhydrate"
              value={foodData?.totals?.carbs_g || 0}
              goal={Math.round((calorieGoal * 0.45) / 4)}
              color="#3b82f6"
            />
            <MacroBar
              label="🫒 Fett"
              value={foodData?.totals?.fat_g || 0}
              goal={Math.round((calorieGoal * 0.3) / 9)}
              color="#a855f7"
            />
          </div>
        )}
      </div>

      {/* Today's meals summary */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-gray-800">Heutige Mahlzeiten</h3>
          <span className="text-sm text-gray-400">{foodData?.entries?.length || 0} Einträge</span>
        </div>
        {foodData?.entries?.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-3">Noch nichts eingetragen</p>
        ) : (
          <div className="space-y-1.5">
            {foodData.entries.slice(-5).map(e => (
              <div key={e.id} className="flex justify-between text-sm">
                <span className="text-gray-700 truncate flex-1 mr-2">
                  {e.ai_detected ? '📷 ' : ''}{e.name}
                </span>
                <span className="font-medium text-gray-600 shrink-0">{e.calories} kcal</span>
              </div>
            ))}
            {foodData.entries.length > 5 && (
              <div className="text-xs text-gray-400 text-right">+{foodData.entries.length - 5} weitere</div>
            )}
          </div>
        )}
      </div>

      {/* Weight chart */}
      {weightChartData.length >= 2 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-3">Gewichtsverlauf</h3>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={weightChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fontSize: 10 }}
                tickFormatter={v => `${v}kg`}
                width={40}
              />
              <Tooltip
                formatter={(v) => [`${v} kg`, 'Gewicht']}
                labelFormatter={l => l}
                contentStyle={{ fontSize: 12 }}
              />
              <Line
                type="monotone"
                dataKey="kg"
                stroke="#16a34a"
                strokeWidth={2}
                dot={{ r: 3, fill: '#16a34a' }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
          {profile?.target_weight_kg && (
            <p className="text-xs text-gray-400 mt-2 text-center">
              Ziel: {profile.target_weight_kg} kg · Aktuell: {weights[weights.length - 1]?.weight_kg} kg
            </p>
          )}
        </div>
      )}

      {/* Scientific note */}
      <div className="text-xs text-gray-400 text-center pb-2">
        Berechnung basiert auf der Mifflin-St Jeor-Gleichung (1990)
      </div>
    </div>
  )
}
