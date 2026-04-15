import { useState, useRef } from 'react'
import { estimateFromImage, fileToBase64, type GeminiEstimate } from '../lib/gemini'
import { getGeminiKey, addLogEntry } from '../lib/db'
import { useI18n } from '../lib/i18n'

interface Props {
  onDone: () => void
}

interface EditableEstimate extends GeminiEstimate {
  selected: boolean
}

export default function CameraScreen({ onDone }: Props) {
  const { t, lang } = useI18n()
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
      const results = await estimateFromImage(apiKey, base64, mimeType, lang)
      if (results.length === 0) {
        setError(t.cam_no_food)
      } else {
        setEstimates(results.map(r => ({ ...r, selected: true })))
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg.includes('No Gemini') ? t.cam_no_key : msg)
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
        <h1 className="text-xl font-bold">{t.cam_title}</h1>
      </div>

      <p className="text-slate-400 text-sm">{t.cam_subtitle}</p>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {!preview ? (
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full bg-slate-800 border-2 border-dashed border-slate-600 hover:border-green-500 rounded-2xl py-12 flex flex-col items-center gap-2 transition"
        >
          <span className="text-4xl">📷</span>
          <span className="font-semibold">{t.cam_pick_button}</span>
          <span className="text-slate-400 text-sm">{t.cam_pick_hint}</span>
        </button>
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
              {t.cam_analyse}
            </button>
          )}

          {loading && (
            <div className="text-center py-6 space-y-2">
              <p className="text-2xl animate-pulse">🤖</p>
              <p className="text-slate-400">{t.cam_analysing}</p>
            </div>
          )}

          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3">
              <p className="text-red-300 text-sm">{error}</p>
              <button onClick={() => fileRef.current?.click()} className="text-red-400 underline text-sm mt-1">
                {t.cam_try_again}
              </button>
            </div>
          )}

          {estimates.length > 0 && (
            <div className="space-y-3">
              <p className="font-semibold text-slate-300">{t.cam_review}</p>
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
                      <label className="text-xs text-slate-400">{t.cam_qty_label}</label>
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
                {t.cam_try_again}
              </button>

              <button
                onClick={handleLog}
                disabled={selectedCount === 0}
                className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 py-3 rounded-xl font-semibold transition"
              >
                {t.cam_log_items(selectedCount)}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="bg-slate-800 rounded-xl px-4 py-3">
        <p className="text-xs text-slate-400">{t.cam_disclaimer}</p>
      </div>
    </div>
  )
}
