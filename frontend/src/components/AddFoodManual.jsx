import { useState } from 'react'

// Common German foods with calorie data for quick entry
const QUICK_FOODS = [
  { name: 'Apfel (mittel)', calories: 72, protein_g: 0.4, carbs_g: 19, fat_g: 0.2 },
  { name: 'Banane (mittel)', calories: 89, protein_g: 1.1, carbs_g: 23, fat_g: 0.3 },
  { name: 'Vollkornbrot (1 Scheibe)', calories: 70, protein_g: 3, carbs_g: 13, fat_g: 1 },
  { name: 'Gekochtes Ei', calories: 78, protein_g: 6, carbs_g: 0.6, fat_g: 5 },
  { name: 'Naturjoghurt (150g)', calories: 87, protein_g: 10, carbs_g: 7, fat_g: 1.5 },
  { name: 'Hähnchenbrust (100g)', calories: 165, protein_g: 31, carbs_g: 0, fat_g: 3.6 },
  { name: 'Lachs (100g)', calories: 208, protein_g: 20, carbs_g: 0, fat_g: 13 },
  { name: 'Haferflocken (50g)', calories: 175, protein_g: 6, carbs_g: 31, fat_g: 3 },
]

export default function AddFoodManual({ onAdd, onClose }) {
  const [form, setForm] = useState({ name: '', calories: '', protein_g: '', carbs_g: '', fat_g: '' })

  function applyQuick(food) {
    setForm({
      name: food.name,
      calories: String(food.calories),
      protein_g: String(food.protein_g),
      carbs_g: String(food.carbs_g),
      fat_g: String(food.fat_g),
    })
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name || !form.calories) return
    onAdd({
      name: form.name,
      calories: parseInt(form.calories),
      protein_g: parseFloat(form.protein_g) || 0,
      carbs_g: parseFloat(form.carbs_g) || 0,
      fat_g: parseFloat(form.fat_g) || 0,
      ai_detected: false,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex flex-col justify-end">
      <div className="bg-white rounded-t-2xl p-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">Mahlzeit hinzufügen</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        {/* Quick foods */}
        <div className="mb-4">
          <div className="text-xs font-medium text-gray-500 mb-2">Schnellauswahl</div>
          <div className="flex flex-wrap gap-2">
            {QUICK_FOODS.map(f => (
              <button
                key={f.name}
                onClick={() => applyQuick(f)}
                className="text-xs bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-full px-3 py-1 transition-colors"
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name der Mahlzeit *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
              placeholder="z.B. Hähnchen mit Reis"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kalorien (kcal) *</label>
              <input
                type="number"
                value={form.calories}
                onChange={e => setForm(f => ({ ...f, calories: e.target.value }))}
                required
                min="0"
                max="5000"
                placeholder="z.B. 350"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Eiweiß (g)</label>
              <input
                type="number"
                value={form.protein_g}
                onChange={e => setForm(f => ({ ...f, protein_g: e.target.value }))}
                min="0"
                step="0.1"
                placeholder="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kohlenhydrate (g)</label>
              <input
                type="number"
                value={form.carbs_g}
                onChange={e => setForm(f => ({ ...f, carbs_g: e.target.value }))}
                min="0"
                step="0.1"
                placeholder="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fett (g)</label>
              <input
                type="number"
                value={form.fat_g}
                onChange={e => setForm(f => ({ ...f, fat_g: e.target.value }))}
                min="0"
                step="0.1"
                placeholder="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {form.calories && form.protein_g && form.carbs_g && form.fat_g && (
            <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-2">
              Makros: {Math.round(form.protein_g * 4 + form.carbs_g * 4 + form.fat_g * 9)} kcal aus Makros
              (Eiweiß 4 kcal/g · Kohlenhydrate 4 kcal/g · Fett 9 kcal/g)
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-medium"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold"
            >
              Hinzufügen
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
