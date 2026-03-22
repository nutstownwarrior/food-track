import { useState, useEffect, useRef } from 'react'
import { api } from '../api'

const WORKOUT_TYPE_MAP = {
  HKWorkoutActivityTypeRunning: 'Laufen',
  HKWorkoutActivityTypeCycling: 'Radfahren',
  HKWorkoutActivityTypeWalking: 'Gehen',
  HKWorkoutActivityTypeSwimming: 'Schwimmen',
  HKWorkoutActivityTypeHiking: 'Wandern',
  HKWorkoutActivityTypeYoga: 'Yoga',
  HKWorkoutActivityTypeTraditionalStrengthTraining: 'Krafttraining',
  HKWorkoutActivityTypeFunctionalStrengthTraining: 'Funktionelles Training',
  HKWorkoutActivityTypeHighIntensityIntervalTraining: 'HIIT',
  HKWorkoutActivityTypeDancing: 'Tanzen',
  HKWorkoutActivityTypeElliptical: 'Ellipsentrainer',
  HKWorkoutActivityTypeStairClimbing: 'Treppensteigen',
  HKWorkoutActivityTypeRowing: 'Rudern',
  HKWorkoutActivityTypePilates: 'Pilates',
  HKWorkoutActivityTypeCrossTraining: 'Cross-Training',
  HKWorkoutActivityTypeSoccer: 'Fußball',
  HKWorkoutActivityTypeBasketball: 'Basketball',
  HKWorkoutActivityTypeTennis: 'Tennis',
}

function parseAppleHealthXML(xmlText) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlText, 'application/xml')

  if (doc.querySelector('parsererror')) {
    throw new Error('Ungültige XML-Datei')
  }

  const byDate = {}

  // Aggregate active energy records by date
  const activeEnergyRecords = doc.querySelectorAll(
    'Record[type="HKQuantityTypeIdentifierActiveEnergyBurned"]'
  )
  activeEnergyRecords.forEach(record => {
    const value = parseFloat(record.getAttribute('value') || '0')
    const unit = record.getAttribute('unit') || 'kcal'
    const startDate = record.getAttribute('startDate') || ''
    const date = startDate.slice(0, 10) // YYYY-MM-DD

    if (!date || isNaN(value)) return

    // Convert kJ to kcal if needed
    const kcal = unit === 'kJ' ? Math.round(value / 4.184) : Math.round(value)

    if (!byDate[date]) byDate[date] = { activeCalories: 0, steps: 0, workouts: [] }
    byDate[date].activeCalories += kcal
  })

  // Step count by date
  const stepRecords = doc.querySelectorAll('Record[type="HKQuantityTypeIdentifierStepCount"]')
  stepRecords.forEach(record => {
    const value = parseInt(record.getAttribute('value') || '0', 10)
    const startDate = record.getAttribute('startDate') || ''
    const date = startDate.slice(0, 10)
    if (!date || isNaN(value)) return
    if (!byDate[date]) byDate[date] = { activeCalories: 0, steps: 0, workouts: [] }
    byDate[date].steps += value
  })

  // Workout entries
  const workouts = doc.querySelectorAll('Workout')
  workouts.forEach(workout => {
    const activityType = workout.getAttribute('activityType') || ''
    const name = WORKOUT_TYPE_MAP[activityType] || activityType.replace('HKWorkoutActivityType', '')
    const energy = parseFloat(workout.getAttribute('totalEnergyBurned') || '0')
    const energyUnit = workout.getAttribute('totalEnergyBurnedUnit') || 'kcal'
    const durationMin = Math.round(parseFloat(workout.getAttribute('duration') || '0'))
    const startDate = workout.getAttribute('startDate') || ''
    const date = startDate.slice(0, 10)

    if (!date) return

    const kcal = energyUnit === 'kJ' ? Math.round(energy / 4.184) : Math.round(energy)
    if (!byDate[date]) byDate[date] = { activeCalories: 0, steps: 0, workouts: [] }
    byDate[date].workouts.push({ name, kcal, durationMin })
  })

  // Convert to flat array of entries
  const entries = []
  for (const [date, data] of Object.entries(byDate)) {
    // One entry for aggregated active energy (excluding workout calories to avoid double-counting)
    if (data.activeCalories > 0) {
      entries.push({
        date,
        source: 'apple_health',
        type: 'active_energy',
        name: 'Aktive Energie',
        active_calories: data.activeCalories,
        steps: data.steps,
        duration_min: 0,
      })
    }
    // Individual workout entries
    for (const w of data.workouts) {
      entries.push({
        date,
        source: 'apple_health',
        type: 'workout',
        name: w.name,
        active_calories: w.kcal,
        steps: 0,
        duration_min: w.durationMin,
      })
    }
  }

  return entries
}

export default function ActivityTracker() {
  const [today] = useState(() => new Date().toISOString().slice(0, 10))
  const [date, setDate] = useState(today)
  const [activityData, setActivityData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [importError, setImportError] = useState(null)
  const [showManual, setShowManual] = useState(false)
  const [manualForm, setManualForm] = useState({ name: '', active_calories: '', duration_min: '', steps: '' })
  const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    loadActivity()
  }, [date])

  async function loadActivity() {
    setLoading(true)
    try {
      const data = await api.getActivity(date)
      setActivityData(data)
    } catch {
      setActivityData({ entries: [], totals: { active_calories: 0, steps: 0 } })
    } finally {
      setLoading(false)
    }
  }

  async function handleFileImport(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setImportResult(null)
    setImportError(null)

    try {
      const text = await file.text()
      const entries = parseAppleHealthXML(text)

      if (entries.length === 0) {
        setImportError('Keine Aktivitätsdaten gefunden. Stelle sicher, dass du die export.xml aus dem Apple Health Export verwendest.')
        return
      }

      const result = await api.importActivity(entries)
      setImportResult(`${result.count} Einträge für ${[...new Set(entries.map(e => e.date))].length} Tage importiert.`)
      loadActivity()
    } catch (err) {
      setImportError(err.message || 'Import fehlgeschlagen')
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleManualSave() {
    if (!manualForm.active_calories && !manualForm.steps) return
    setSaving(true)
    try {
      await api.addActivity({
        date,
        name: manualForm.name || 'Aktivität',
        active_calories: parseInt(manualForm.active_calories) || 0,
        steps: parseInt(manualForm.steps) || 0,
        duration_min: parseInt(manualForm.duration_min) || 0,
        type: 'workout',
      })
      setManualForm({ name: '', active_calories: '', duration_min: '', steps: '' })
      setShowManual(false)
      loadActivity()
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    await api.deleteActivity(id)
    loadActivity()
  }

  const entries = activityData?.entries || []
  const totalActive = activityData?.totals?.active_calories || 0
  const totalSteps = activityData?.totals?.steps || 0

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Aktivität</h2>
        <p className="text-sm text-gray-500">Apple Health Import & Aktivitätsprotokoll</p>
      </div>

      {/* Apple Health Import */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <span>🍎</span> Apple Health Import
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          Exportiere deine Daten in der Gesundheits-App: Profil → Daten exportieren. Wähle dann die <strong>export.xml</strong> aus der ZIP-Datei.
        </p>

        <label className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${importing ? 'border-gray-200 bg-gray-50 text-gray-400' : 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100'}`}>
          <span className="text-lg">📂</span>
          <span className="text-sm font-medium">
            {importing ? 'Importiere...' : 'export.xml auswählen'}
          </span>
          <input
            ref={fileRef}
            type="file"
            accept=".xml,application/xml,text/xml"
            className="hidden"
            disabled={importing}
            onChange={handleFileImport}
          />
        </label>

        {importing && (
          <div className="mt-2 text-xs text-center text-gray-400 animate-pulse">Analysiere Apple Health Daten...</div>
        )}
        {importResult && (
          <div className="mt-2 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
            ✅ {importResult}
          </div>
        )}
        {importError && (
          <div className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
            ❌ {importError}
          </div>
        )}
      </div>

      {/* Date Picker & Summary */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">Tagesübersicht</h3>
          <input
            type="date"
            value={date}
            max={today}
            onChange={e => setDate(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-orange-50 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-orange-500">{totalActive}</div>
            <div className="text-xs text-gray-500">kcal verbrannt</div>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-blue-500">{totalSteps.toLocaleString('de-DE')}</div>
            <div className="text-xs text-gray-500">Schritte</div>
          </div>
        </div>

        {/* Activity list */}
        {loading ? (
          <div className="text-center text-gray-400 text-sm py-2">Lade...</div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-2">Noch keine Aktivitäten für diesen Tag</p>
        ) : (
          <div className="space-y-2">
            {entries.map(entry => (
              <div key={entry.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <span>{entry.source === 'apple_health' ? '🍎' : '✍️'}</span>
                  <div>
                    <div className="font-medium text-gray-700">{entry.name}</div>
                    <div className="text-xs text-gray-400">
                      {entry.active_calories > 0 && `${entry.active_calories} kcal`}
                      {entry.steps > 0 && ` · ${entry.steps.toLocaleString('de-DE')} Schritte`}
                      {entry.duration_min > 0 && ` · ${entry.duration_min} Min`}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(entry.id)}
                  className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add manual */}
        {!showManual ? (
          <button
            onClick={() => setShowManual(true)}
            className="mt-3 w-full py-2 rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 hover:border-green-400 hover:text-green-600 transition-colors"
          >
            + Manuell eintragen
          </button>
        ) : (
          <div className="mt-3 space-y-2 bg-gray-50 rounded-xl p-3">
            <div className="text-sm font-medium text-gray-700">Manuelle Aktivität</div>
            <input
              type="text"
              placeholder="Aktivität (z.B. Radfahren)"
              value={manualForm.name}
              onChange={e => setManualForm(f => ({ ...f, name: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                placeholder="kcal"
                value={manualForm.active_calories}
                onChange={e => setManualForm(f => ({ ...f, active_calories: e.target.value }))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
              <input
                type="number"
                placeholder="Min"
                value={manualForm.duration_min}
                onChange={e => setManualForm(f => ({ ...f, duration_min: e.target.value }))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
              <input
                type="number"
                placeholder="Schritte"
                value={manualForm.steps}
                onChange={e => setManualForm(f => ({ ...f, steps: e.target.value }))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleManualSave}
                disabled={saving || (!manualForm.active_calories && !manualForm.steps)}
                className="flex-1 bg-green-600 text-white text-sm py-2 rounded-lg disabled:opacity-40"
              >
                {saving ? 'Speichern...' : 'Speichern'}
              </button>
              <button
                onClick={() => setShowManual(false)}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="text-xs text-gray-400 text-center pb-2">
        Aktive Kalorien werden zum täglichen Kalorienziel addiert
      </div>
    </div>
  )
}
