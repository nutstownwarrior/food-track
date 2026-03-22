import { useState, useEffect } from 'react'
import { api } from '../api'
import PhotoCapture from './PhotoCapture'
import AddFoodManual from './AddFoodManual'

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
}

function getToday() {
  return new Date().toISOString().slice(0, 10)
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

export default function FoodLog({ goals }) {
  const [date, setDate] = useState(getToday)
  const [entries, setEntries] = useState([])
  const [totals, setTotals] = useState({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 })
  const [loading, setLoading] = useState(true)
  const [showPhoto, setShowPhoto] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const [showFAB, setShowFAB] = useState(false)

  useEffect(() => {
    loadFood()
  }, [date])

  async function loadFood() {
    setLoading(true)
    try {
      const data = await api.getFood(date)
      setEntries(data.entries || [])
      setTotals(data.totals || { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd(entry) {
    try {
      await api.addFood({ ...entry, date })
      await loadFood()
    } catch (err) {
      console.error(err)
    }
  }

  async function handleDelete(id) {
    try {
      await api.deleteFood(id)
      setEntries(e => e.filter(x => x.id !== id))
      setTotals(prev => {
        const entry = entries.find(x => x.id === id)
        if (!entry) return prev
        return {
          calories: prev.calories - entry.calories,
          protein_g: prev.protein_g - (entry.protein_g || 0),
          carbs_g: prev.carbs_g - (entry.carbs_g || 0),
          fat_g: prev.fat_g - (entry.fat_g || 0),
        }
      })
    } catch (err) {
      console.error(err)
    }
  }

  const calorieGoal = goals?.calorie_goal || 0
  const remaining = calorieGoal > 0 ? calorieGoal - totals.calories : null

  return (
    <div className="p-4 space-y-4">
      {/* Date Navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setDate(d => addDays(d, -1))}
          className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full text-lg transition-colors"
        >
          ‹
        </button>
        <div className="flex-1 text-center">
          <div className="font-semibold text-gray-800 text-sm">{formatDate(date)}</div>
          {date === getToday() && <div className="text-xs text-green-600">Heute</div>}
        </div>
        <button
          onClick={() => setDate(d => addDays(d, 1))}
          disabled={date >= getToday()}
          className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 disabled:opacity-30 rounded-full text-lg transition-colors"
        >
          ›
        </button>
      </div>

      {/* Daily summary bar */}
      {calorieGoal > 0 && (
        <div className={`rounded-xl p-3 ${remaining < 0 ? 'bg-red-50' : 'bg-green-50'}`}>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Gesamt: <strong>{totals.calories} kcal</strong></span>
            <span className={remaining < 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
              {remaining < 0 ? `${Math.abs(remaining)} kcal überzogen` : `${remaining} kcal übrig`}
            </span>
          </div>
          <div className="mt-2 h-2 bg-white/60 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${remaining < 0 ? 'bg-red-400' : 'bg-green-500'}`}
              style={{ width: `${Math.min((totals.calories / calorieGoal) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Macro totals */}
      {(totals.protein_g > 0 || totals.carbs_g > 0 || totals.fat_g > 0) && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-orange-50 rounded-xl p-2">
            <div className="text-xs text-orange-500">Eiweiß</div>
            <div className="text-sm font-bold text-orange-700">{Math.round(totals.protein_g)}g</div>
          </div>
          <div className="bg-blue-50 rounded-xl p-2">
            <div className="text-xs text-blue-500">Kohlenhydrate</div>
            <div className="text-sm font-bold text-blue-700">{Math.round(totals.carbs_g)}g</div>
          </div>
          <div className="bg-purple-50 rounded-xl p-2">
            <div className="text-xs text-purple-500">Fett</div>
            <div className="text-sm font-bold text-purple-700">{Math.round(totals.fat_g)}g</div>
          </div>
        </div>
      )}

      {/* Food entries */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 mb-2">Mahlzeiten</h3>
        {loading ? (
          <div className="text-center text-gray-400 py-8">Laden...</div>
        ) : entries.length === 0 ? (
          <div className="text-center text-gray-400 py-10">
            <div className="text-3xl mb-2">🍽️</div>
            <div className="text-sm">Noch keine Mahlzeiten eingetragen</div>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map(e => (
              <div key={e.id} className="flex items-center bg-white border border-gray-100 rounded-xl px-3 py-3 shadow-sm gap-3">
                <div className="text-lg">{e.ai_detected ? '📷' : '✏️'}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{e.name}</div>
                  {(e.protein_g > 0 || e.carbs_g > 0 || e.fat_g > 0) && (
                    <div className="text-xs text-gray-400">
                      E: {Math.round(e.protein_g)}g · KH: {Math.round(e.carbs_g)}g · F: {Math.round(e.fat_g)}g
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-gray-700">{e.calories} kcal</div>
                </div>
                <button
                  onClick={() => handleDelete(e.id)}
                  className="text-red-300 hover:text-red-500 transition-colors ml-1 text-lg leading-none"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <div className="fixed bottom-20 right-4 flex flex-col items-end gap-2">
        {showFAB && (
          <>
            <button
              onClick={() => { setShowFAB(false); setShowPhoto(true) }}
              className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2.5 rounded-full shadow-lg text-sm font-medium"
            >
              📷 Foto aufnehmen
            </button>
            <button
              onClick={() => { setShowFAB(false); setShowManual(true) }}
              className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2.5 rounded-full shadow-lg text-sm font-medium"
            >
              ✏️ Manuell eingeben
            </button>
          </>
        )}
        <button
          onClick={() => setShowFAB(f => !f)}
          className={`w-14 h-14 rounded-full shadow-xl text-2xl font-bold transition-all ${
            showFAB ? 'bg-gray-600 rotate-45' : 'bg-green-600'
          } text-white flex items-center justify-center`}
        >
          +
        </button>
      </div>

      {/* Modals */}
      {showPhoto && (
        <PhotoCapture
          onAdd={handleAdd}
          onClose={() => setShowPhoto(false)}
        />
      )}
      {showManual && (
        <AddFoodManual
          onAdd={handleAdd}
          onClose={() => setShowManual(false)}
        />
      )}
    </div>
  )
}
