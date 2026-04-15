import { useState, useRef } from 'react'
import { estimateFromImage, fileToBase64, type GeminiEstimate } from '../lib/gemini'
import { getGeminiKey, addLogEntry } from '../lib/db'

interface Props {
  onDone: () => void
}

interface EditableEstimate extends GeminiEstimate {
  selected: boolean
}

export default function CameraScreen({ onDone }: Props) {
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [estimates, setEstimates] = useState<EditableEstimate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setEstimates([])
    setError('')
  }

  async function handleAnalyse() {
    if (!file) return
    setLoading(true)
    setError('')
    try {
      const apiKey = await getGeminiKey()
      const { base64, mimeType } = await fileToBase64(file)
      const results = await estimateFromImage(apiKey, base64, mimeType)
      if (results.length === 0) {
        setError('Gemini could not identify any food in the image. Try a clearer photo.')
      } else {
        setEstimates(results.map(r => ({ ...r, selected: true })))
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  function toggleItem(i: number) {
    setEstimates(prev => prev.map((e, idx) => idx === i ? { ...e, selected: !e.selected } : e))
  }

  function updateQty(i: number, val: string) {
    const g = Number(val)
    setEstimates(prev => prev.map((e, idx) => idx === i ? { ...e, quantity_g: isNaN(g) ? e.quantity_g : g } : e))
  }

  async function handleLog() {
    const selected = estimates.filter(e => e.selected && e.quantity_g > 0)
    for (const item of selected) {
      await addLogEntry({
        food_name: item.name,
        calories_per_100g: item.calories_per_100g,
        protein_per_100g: item.protein_per_100g,
        carbs_per_100g: item.carbs_per_100g,
        fat_per_100g: item.fat_per_100g,
        quantity_g: item.quantity_g,
        source: 'ai',
        ai_note: `AI estimate: ${item.quantity_desc}`,
      })
    }
    onDone()
  }

  const selectedCount = estimates.filter(e => e.selected).length

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onDone} className="text-slate-400 hover:text-white text-2xl">←</button>
        <h1 className="text-xl font-bold">AI Food Scan</h1>
      </div>

      <p className="text-slate-400 text-sm">Take or upload a photo of your meal. AI will estimate the calories and macros.</p>

      {/* Image picker */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {!preview ? (
        <div className="space-y-3">
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full bg-slate-800 border-2 border-dashed border-slate-600 hover:border-green-500 rounded-2xl py-12 flex flex-col items-center gap-2 transition"
          >
            <span className="text-4xl">📷</span>
            <span className="font-semibold">Take Photo or Upload</span>
            <span className="text-slate-400 text-sm">Tap to open camera</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <img src={preview} alt="Food preview" className="w-full rounded-2xl object-cover max-h-64" />
            <button
              onClick={() => { setPreview(null); setFile(null); setEstimates([]); setError('') }}
              className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>
          </div>

          {estimates.length === 0 && !loading && (
            <button
              onClick={handleAnalyse}
              className="w-full bg-green-600 hover:bg-green-500 py-3 rounded-xl font-semibold transition"
            >
              🤖 Analyse with AI
            </button>
          )}

          {loading && (
            <div className="text-center py-6 space-y-2">
              <p className="text-2xl animate-pulse">🤖</p>
              <p className="text-slate-400">Analysing image…</p>
            </div>
          )}

          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3">
              <p className="text-red-300 text-sm">{error}</p>
              <button onClick={() => fileRef.current?.click()} className="text-red-400 underline text-sm mt-1">Try another photo</button>
            </div>
          )}

          {estimates.length > 0 && (
            <div className="space-y-3">
              <p className="font-semibold text-slate-300">Review estimates — tap to toggle, adjust quantities</p>
              {estimates.map((item, i) => {
                const cal = Math.round(item.calories_per_100g * item.quantity_g / 100)
                return (
                  <div
                    key={i}
                    onClick={() => toggleItem(i)}
                    className={`bg-slate-800 rounded-xl px-4 py-3 border-2 cursor-pointer transition
                      ${item.selected ? 'border-green-500' : 'border-transparent opacity-50'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-slate-400 mb-2">{item.quantity_desc}</p>
                        <p className="text-xs text-slate-400">
                          {item.calories_per_100g} kcal/100g · P {item.protein_per_100g}g · C {item.carbs_per_100g}g · F {item.fat_per_100g}g
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-green-400 font-bold">{cal} kcal</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <label className="text-xs text-slate-400">Qty (g):</label>
                      <input
                        type="number"
                        value={item.quantity_g}
                        onChange={e => updateQty(i, e.target.value)}
                        className="w-20 bg-slate-700 rounded-lg px-2 py-1 text-sm text-center"
                        min="1"
                      />
                    </div>
                  </div>
                )
              })}

              <button
                onClick={() => fileRef.current?.click()}
                className="w-full bg-slate-700 hover:bg-slate-600 py-3 rounded-xl text-sm transition"
              >
                📷 Try Different Photo
              </button>

              <button
                onClick={handleLog}
                disabled={selectedCount === 0}
                className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 py-3 rounded-xl font-semibold transition"
              >
                Log {selectedCount} item{selectedCount !== 1 ? 's' : ''}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="bg-slate-800 rounded-xl px-4 py-3">
        <p className="text-xs text-slate-400">
          <span className="text-yellow-400">⚠️ AI estimates</span> — actual calories may vary. Always check the quantity and adjust if needed.
          Powered by Google Gemini. Requires a Google AI Studio API key in Settings.
        </p>
      </div>
    </div>
  )
}
