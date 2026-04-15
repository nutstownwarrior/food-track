import { useState, useEffect } from 'react'
import { getSetting, setSetting, DEFAULT_GOALS } from '../lib/db'

export default function SettingsScreen() {
  const [goals, setGoals] = useState({ calories: '', protein: '', carbs: '', fat: '' })
  const [geminiKey, setGeminiKey] = useState('')
  const [usdaKey, setUsdaKey] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      const [cal, pro, carb, fat, gemini, usda] = await Promise.all([
        getSetting('goal_calories'),
        getSetting('goal_protein'),
        getSetting('goal_carbs'),
        getSetting('goal_fat'),
        getSetting('gemini_api_key'),
        getSetting('usda_api_key'),
      ])
      setGoals({
        calories: String(cal ?? DEFAULT_GOALS.calories),
        protein:  String(pro  ?? DEFAULT_GOALS.protein),
        carbs:    String(carb ?? DEFAULT_GOALS.carbs),
        fat:      String(fat  ?? DEFAULT_GOALS.fat),
      })
      setGeminiKey(String(gemini ?? ''))
      setUsdaKey(String(usda ?? ''))
    }
    load()
  }, [])

  async function handleSave() {
    await Promise.all([
      setSetting('goal_calories',  Number(goals.calories) || DEFAULT_GOALS.calories),
      setSetting('goal_protein',   Number(goals.protein)  || DEFAULT_GOALS.protein),
      setSetting('goal_carbs',     Number(goals.carbs)    || DEFAULT_GOALS.carbs),
      setSetting('goal_fat',       Number(goals.fat)      || DEFAULT_GOALS.fat),
      setSetting('gemini_api_key', geminiKey.trim()),
      setSetting('usda_api_key',   usdaKey.trim()),
    ])
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="px-4 pt-6 pb-4 space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Daily Goals */}
      <section className="space-y-3">
        <h2 className="font-semibold text-slate-300">Daily Goals</h2>
        {[
          { key: 'calories', label: 'Calories', unit: 'kcal', color: 'text-green-400' },
          { key: 'protein',  label: 'Protein',  unit: 'g',    color: 'text-blue-400' },
          { key: 'carbs',    label: 'Carbs',    unit: 'g',    color: 'text-yellow-400' },
          { key: 'fat',      label: 'Fat',      unit: 'g',    color: 'text-pink-400' },
        ].map(field => (
          <div key={field.key} className="flex items-center gap-3 bg-slate-800 rounded-xl px-4 py-3">
            <span className={`font-medium w-20 ${field.color}`}>{field.label}</span>
            <input
              type="number"
              value={goals[field.key as keyof typeof goals]}
              onChange={e => setGoals(prev => ({ ...prev, [field.key]: e.target.value }))}
              className="flex-1 bg-slate-700 rounded-lg px-3 py-2 text-right outline-none focus:ring-2 focus:ring-green-500"
              min="0"
            />
            <span className="text-slate-400 w-8 text-right">{field.unit}</span>
          </div>
        ))}
      </section>

      {/* Food Databases */}
      <section className="space-y-3">
        <h2 className="font-semibold text-slate-300">Food Databases</h2>

        {/* OpenFoodFacts — no key needed */}
        <div className="bg-slate-800 rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium">OpenFoodFacts</p>
            <p className="text-xs text-slate-400">Packaged products &amp; barcodes — no key required</p>
          </div>
          <span className="text-green-400 text-sm font-semibold">Active</span>
        </div>

        {/* USDA FoodData Central */}
        <div className="bg-slate-800 rounded-xl px-4 py-4 space-y-3">
          <div>
            <p className="text-sm font-medium">USDA FoodData Central</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Generic &amp; raw ingredients (chicken breast, rice, eggs…).
              Free key at <span className="text-blue-400">fdc.nal.usda.gov</span> → API Key.
              1,000 requests/hour, no billing required.
            </p>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">USDA API Key</label>
            <input
              type="password"
              value={usdaKey}
              onChange={e => setUsdaKey(e.target.value)}
              placeholder="Leave blank to skip USDA search"
              className="w-full bg-slate-700 rounded-xl px-4 py-3 font-mono text-sm outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          {!usdaKey && (
            <p className="text-xs text-yellow-500">Without a key, only OpenFoodFacts will be searched.</p>
          )}
        </div>
      </section>

      {/* Gemini API Key */}
      <section className="space-y-3">
        <h2 className="font-semibold text-slate-300">AI Image Analysis</h2>
        <div className="bg-slate-800 rounded-xl px-4 py-4 space-y-3">
          <p className="text-sm text-slate-400">
            Required for the AI camera feature. Free key at{' '}
            <span className="text-green-400">aistudio.google.com</span> → Get API Key.
          </p>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Gemini API Key</label>
            <input
              type="password"
              value={geminiKey}
              onChange={e => setGeminiKey(e.target.value)}
              placeholder="AIza..."
              className="w-full bg-slate-700 rounded-xl px-4 py-3 font-mono text-sm outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <p className="text-xs text-slate-500">
            Stored only on this device. Never sent anywhere except Google's API.
          </p>
        </div>
      </section>

      <button
        onClick={handleSave}
        className={`w-full py-3 rounded-xl font-semibold transition
          ${saved ? 'bg-green-700 text-green-200' : 'bg-green-600 hover:bg-green-500 text-white'}`}
      >
        {saved ? '✓ Saved!' : 'Save Settings'}
      </button>

      {/* About */}
      <section className="space-y-2 pt-2">
        <h2 className="font-semibold text-slate-300">About</h2>
        <div className="bg-slate-800 rounded-xl px-4 py-3 space-y-1 text-sm text-slate-400">
          <p>Food Tracker — all data stored on your device</p>
          <p>Packaged foods: OpenFoodFacts (open data)</p>
          <p>Generic ingredients: USDA FoodData Central</p>
          <p>AI analysis: Google Gemini</p>
        </div>
      </section>
    </div>
  )
}
