import { useState, useEffect } from 'react'
import { api } from '../api'

const ACTIVITY_OPTIONS = [
  { value: 'sedentary', label: 'Wenig aktiv (Bürojob, kein Sport)' },
  { value: 'light', label: 'Leicht aktiv (1–3× Sport/Woche)' },
  { value: 'moderate', label: 'Mäßig aktiv (3–5× Sport/Woche)' },
  { value: 'active', label: 'Sehr aktiv (6–7× Sport/Woche)' },
  { value: 'very_active', label: 'Extrem aktiv (2× täglich Training)' },
]

export default function Profile() {
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({
    display_name: '', gender: 'männlich', birth_year: '', height_cm: '',
    weight_kg: '', body_fat_pct: '', activity_level: 'sedentary',
    target_weight_kg: '', weekly_goal_kg: '0.5', bmr_formula: 'mifflin'
  })
  const [weightInput, setWeightInput] = useState('')
  const [weights, setWeights] = useState([])
  const [saving, setSaving] = useState(false)
  const [savingWeight, setSavingWeight] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const data = await api.getUser()
      if (data.profile) {
        setProfile(data.profile)
        setForm({
          display_name: data.profile.display_name || '',
          gender: data.profile.gender || 'männlich',
          birth_year: data.profile.birth_year || '',
          height_cm: data.profile.height_cm || '',
          weight_kg: data.profile.weight_kg || '',
          body_fat_pct: data.profile.body_fat_pct || '',
          activity_level: data.profile.activity_level || 'sedentary',
          target_weight_kg: data.profile.target_weight_kg || '',
          weekly_goal_kg: data.profile.weekly_goal_kg || '0.5',
          bmr_formula: data.profile.bmr_formula || 'mifflin',
        })
      }
      const w = await api.getWeight()
      setWeights(w)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')
    try {
      await api.updateUser({
        ...form,
        birth_year: form.birth_year ? parseInt(form.birth_year) : null,
        height_cm: form.height_cm ? parseFloat(form.height_cm) : null,
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
        body_fat_pct: form.body_fat_pct ? parseFloat(form.body_fat_pct) : null,
        target_weight_kg: form.target_weight_kg ? parseFloat(form.target_weight_kg) : null,
        weekly_goal_kg: parseFloat(form.weekly_goal_kg),
      })
      setMessage('Profil gespeichert ✓')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleAddWeight(e) {
    e.preventDefault()
    if (!weightInput) return
    setSavingWeight(true)
    try {
      await api.addWeight(parseFloat(weightInput))
      setWeightInput('')
      // Update weight in form too
      setForm(f => ({ ...f, weight_kg: weightInput }))
      const w = await api.getWeight()
      setWeights(w)
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingWeight(false)
    }
  }

  async function handleDeleteWeight(id) {
    try {
      await api.deleteWeight(id)
      setWeights(w => w.filter(e => e.id !== id))
    } catch (err) {
      setError(err.message)
    }
  }

  function field(label, key, type = 'text', extra = {}) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <input
          type={type}
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          {...extra}
        />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-xl font-bold text-gray-800">Mein Profil</h2>

      <form onSubmit={handleSave} className="space-y-4">
        {field('Anzeigename', 'display_name', 'text', { placeholder: 'Dein Name' })}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Geschlecht</label>
          <select
            value={form.gender}
            onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="männlich">Männlich</option>
            <option value="weiblich">Weiblich</option>
            <option value="divers">Divers</option>
          </select>
        </div>

        {field('Geburtsjahr', 'birth_year', 'number', { placeholder: '1990', min: 1920, max: new Date().getFullYear() - 10 })}
        {field('Körpergröße (cm)', 'height_cm', 'number', { placeholder: '175', min: 100, max: 250, step: '0.1' })}
        {field('Aktuelles Gewicht (kg)', 'weight_kg', 'number', { placeholder: '70', min: 20, max: 300, step: '0.1' })}
        {field('Körperfettanteil (%) — optional', 'body_fat_pct', 'number', { placeholder: 'z.B. 20', min: 3, max: 60, step: '0.1' })}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Aktivitätslevel</label>
          <select
            value={form.activity_level}
            onChange={e => setForm(f => ({ ...f, activity_level: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {ACTIVITY_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {field('Zielgewicht (kg)', 'target_weight_kg', 'number', { placeholder: '65', min: 20, max: 300, step: '0.1' })}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Wöchentliches Ziel (kg/Woche)</label>
          <select
            value={form.weekly_goal_kg}
            onChange={e => setForm(f => ({ ...f, weekly_goal_kg: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="0">Gewicht halten</option>
            <option value="0.25">0,25 kg/Woche (sanft)</option>
            <option value="0.5">0,5 kg/Woche (empfohlen)</option>
            <option value="0.75">0,75 kg/Woche (moderat)</option>
            <option value="1.0">1,0 kg/Woche (maximal sicher)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">BMR-Formel</label>
          <select
            value={form.bmr_formula}
            onChange={e => setForm(f => ({ ...f, bmr_formula: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="mifflin">Mifflin-St Jeor (empfohlen, allgemeine Bevölkerung)</option>
            <option value="katch">Katch-McArdle (benötigt Körperfettanteil)</option>
          </select>
          <p className="text-xs text-gray-400 mt-1">
            Mifflin-St Jeor (1990) ist die wissenschaftlich am besten validierte Formel.
          </p>
        </div>

        {message && <div className="bg-green-50 text-green-700 text-sm rounded-lg px-3 py-2">{message}</div>}
        {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-3 py-2">{error}</div>}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-2.5 rounded-lg transition-colors"
        >
          {saving ? 'Speichern...' : 'Profil speichern'}
        </button>
      </form>

      {/* Weight log */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Gewichtsverlauf</h3>
        <form onSubmit={handleAddWeight} className="flex gap-2 mb-4">
          <input
            type="number"
            value={weightInput}
            onChange={e => setWeightInput(e.target.value)}
            placeholder="kg eingeben"
            step="0.1"
            min="20"
            max="300"
            required
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            type="submit"
            disabled={savingWeight}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {savingWeight ? '...' : 'Eintragen'}
          </button>
        </form>

        {weights.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Noch keine Gewichtseinträge</p>
        ) : (
          <div className="space-y-2">
            {weights.map(w => (
              <div key={w.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                <div>
                  <span className="font-semibold text-gray-800">{w.weight_kg} kg</span>
                  <span className="text-xs text-gray-400 ml-2">{w.logged_at}</span>
                </div>
                <button
                  onClick={() => handleDeleteWeight(w.id)}
                  className="text-red-400 hover:text-red-600 text-sm ml-2"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
