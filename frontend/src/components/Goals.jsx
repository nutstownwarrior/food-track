import { useState, useEffect } from 'react'
import { api } from '../api'

export default function Goals({ onGoalsUpdate }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadGoals()
  }, [])

  async function loadGoals() {
    setLoading(true)
    try {
      const d = await api.getUser()
      setData(d)
      if (onGoalsUpdate && d.goals) onGoalsUpdate(d.goals)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-4 text-center text-gray-400 pt-12">Lade Ziele...</div>
  if (error) return <div className="p-4 text-red-500">{error}</div>

  const profile = data?.profile
  const goals = data?.goals

  const isComplete = profile?.weight_kg && profile?.height_cm && profile?.birth_year

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold text-gray-800">Meine Ziele</h2>

      {!isComplete && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
          ⚠️ Bitte fülle zuerst dein Profil aus (Gewicht, Größe, Geburtsjahr), um deine Kalorienziele zu berechnen.
        </div>
      )}

      {goals && (
        <div className="space-y-3">
          {/* Main calorie goal */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="text-sm text-green-600 font-medium mb-1">Tägliches Kalorienziel</div>
            <div className="text-3xl font-bold text-green-700">{goals.calorie_goal} kcal</div>
            {goals.warning_high_deficit && (
              <div className="mt-2 text-xs text-amber-600 bg-amber-50 rounded-lg p-2">
                ⚠️ Dein Defizit ({goals.deficit} kcal/Tag) ist sehr groß. Mehr als 1.000 kcal Defizit täglich kann zu Muskelabbau führen.
              </div>
            )}
          </div>

          {/* BMR and TDEE */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <div className="text-xs text-blue-500 font-medium">Grundumsatz (BMR)</div>
              <div className="text-xl font-bold text-blue-700 mt-1">{goals.bmr} kcal</div>
            </div>
            <div className="bg-purple-50 rounded-xl p-3 text-center">
              <div className="text-xs text-purple-500 font-medium">Gesamtbedarf (TDEE)</div>
              <div className="text-xl font-bold text-purple-700 mt-1">{goals.tdee} kcal</div>
            </div>
          </div>

          {/* Protein goal */}
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
            <div className="text-sm text-orange-600 font-medium mb-1">Tägliches Eiweißziel</div>
            <div className="text-2xl font-bold text-orange-700">{goals.protein_goal_g} g</div>
            <div className="text-xs text-orange-400 mt-1">
              {profile?.weight_kg ? `${(goals.protein_goal_g / profile.weight_kg).toFixed(1)} g/kg Körpergewicht` : ''}
              {' '}— für optimalen Muskelerhalt
            </div>
          </div>

          {/* Scientific info */}
          <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500 space-y-1">
            <div className="font-medium text-gray-600 mb-2">📊 Wissenschaftliche Grundlage</div>
            <div>• BMR-Formel: {profile?.bmr_formula === 'katch' ? 'Katch-McArdle' : 'Mifflin-St Jeor (1990)'}</div>
            <div>• Fettkalorien: 7.700 kcal/kg (Hall et al., 2012)</div>
            <div>• Aktivitätsmultiplikator: ×{
              { sedentary: '1,2', light: '1,375', moderate: '1,55', active: '1,725', very_active: '1,9' }[profile?.activity_level]
            }</div>
            {goals.deficit > 0 && (
              <div>• Tägliches Defizit: {goals.deficit} kcal → ~{(goals.deficit * 7 / 7700).toFixed(2)} kg/Woche</div>
            )}
          </div>

          {/* DGE Recommendation */}
          <div className="bg-emerald-50 rounded-xl p-4 text-sm text-emerald-700">
            <div className="font-medium mb-1">🥗 DGE-Empfehlung 2024</div>
            <div className="text-xs">Mindestens 75% pflanzliche Lebensmittel (Gemüse, Obst, Vollkornprodukte, Hülsenfrüchte), maximal 25% tierische Produkte. Fleisch und Wurst: max. 300 g/Woche.</div>
          </div>

          {/* Macro breakdown */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-sm font-medium text-gray-700 mb-3">Empfohlene Makros (täglich)</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">🥩 Eiweiß</span>
                <span className="font-semibold">{goals.protein_goal_g} g · {goals.protein_goal_g * 4} kcal</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">🌾 Kohlenhydrate</span>
                <span className="font-semibold text-gray-400">Rest der Kalorien</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">🫒 Fett</span>
                <span className="font-semibold text-gray-400">ca. 25–35% der kcal</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {!goals && isComplete && (
        <div className="text-center text-gray-400 py-8">Keine Zieldaten verfügbar</div>
      )}
    </div>
  )
}
