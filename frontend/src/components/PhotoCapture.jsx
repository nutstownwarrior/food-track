import { useState, useRef, useCallback } from 'react'
import { api } from '../api'

export default function PhotoCapture({ onAdd, onClose }) {
  const [step, setStep] = useState('capture') // 'capture' | 'analyzing' | 'review' | 'error'
  const [imageDataUrl, setImageDataUrl] = useState(null)
  const [result, setResult] = useState(null)
  const [form, setForm] = useState({ name: '', calories: '', protein_g: '', carbs_g: '', fat_g: '' })
  const [error, setError] = useState('')
  const [cameraActive, setCameraActive] = useState(false)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const fileInputRef = useRef(null)

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } }
      })
      streamRef.current = stream
      videoRef.current.srcObject = stream
      setCameraActive(true)
    } catch {
      setError('Kamera nicht verfügbar. Bitte Bild hochladen.')
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }

  function capturePhoto() {
    const canvas = document.createElement('canvas')
    const video = videoRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    stopCamera()
    setImageDataUrl(dataUrl)
    analyzeImage(dataUrl, 'image/jpeg')
  }

  function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target.result
      setImageDataUrl(dataUrl)
      analyzeImage(dataUrl, file.type)
    }
    reader.readAsDataURL(file)
  }

  async function analyzeImage(dataUrl, mimeType) {
    setStep('analyzing')
    setError('')
    try {
      // Extract base64 from data URL
      const base64 = dataUrl.split(',')[1]
      const res = await api.analyzePhoto(base64, mimeType || 'image/jpeg')
      setResult(res)
      setForm({
        name: res.name || '',
        calories: String(res.calories || ''),
        protein_g: String(res.protein_g || ''),
        carbs_g: String(res.carbs_g || ''),
        fat_g: String(res.fat_g || ''),
      })
      setStep('review')
    } catch (err) {
      setError(err.message || 'Analyse fehlgeschlagen')
      setStep('error')
    }
  }

  function handleAdd() {
    onAdd({
      name: form.name,
      calories: parseInt(form.calories) || 0,
      protein_g: parseFloat(form.protein_g) || 0,
      carbs_g: parseFloat(form.carbs_g) || 0,
      fat_g: parseFloat(form.fat_g) || 0,
      ai_detected: true,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-black text-white px-4 py-3 flex items-center justify-between">
        <h2 className="font-semibold">📷 Foto analysieren</h2>
        <button onClick={() => { stopCamera(); onClose() }} className="text-gray-400 hover:text-white text-xl">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-900">
        {step === 'capture' && (
          <div className="flex flex-col items-center justify-center h-full p-6 gap-4">
            {/* Camera preview */}
            <div className="w-full max-w-sm bg-black rounded-xl overflow-hidden aspect-video relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${cameraActive ? '' : 'hidden'}`}
              />
              {!cameraActive && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <div className="text-5xl mb-2">📸</div>
                    <div className="text-sm">Kamera starten oder Bild hochladen</div>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-900/50 text-red-300 text-sm rounded-lg px-4 py-2 w-full max-w-sm text-center">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3 w-full max-w-sm">
              {!cameraActive ? (
                <button
                  onClick={startCamera}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold text-lg"
                >
                  📷 Kamera öffnen
                </button>
              ) : (
                <button
                  onClick={capturePhoto}
                  className="w-full bg-white text-gray-900 py-4 rounded-xl font-bold text-lg border-4 border-green-500"
                >
                  ⭕ Foto aufnehmen
                </button>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl font-medium"
              >
                🖼️ Aus Galerie hochladen
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>
        )}

        {step === 'analyzing' && (
          <div className="flex flex-col items-center justify-center h-full gap-6 p-6">
            {imageDataUrl && (
              <img src={imageDataUrl} alt="Analysiertes Bild" className="max-h-48 rounded-xl object-contain" />
            )}
            <div className="text-center">
              <div className="text-4xl mb-4 animate-spin">⚙️</div>
              <div className="text-white text-lg font-semibold">KI analysiert Bild...</div>
              <div className="text-gray-400 text-sm mt-2">Gemini schätzt Kalorien und Nährwerte</div>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="p-4 space-y-4">
            {imageDataUrl && (
              <img src={imageDataUrl} alt="Mahlzeit" className="w-full max-h-48 rounded-xl object-cover" />
            )}

            <div className="bg-green-900/30 border border-green-600/30 rounded-xl p-3 text-sm text-green-300">
              ✓ KI-Analyse abgeschlossen — bitte Werte prüfen und ggf. anpassen
            </div>

            <div className="bg-white rounded-xl p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name der Mahlzeit</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Kalorien (kcal)</label>
                  <input
                    type="number"
                    value={form.calories}
                    onChange={e => setForm(f => ({ ...f, calories: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Eiweiß (g)</label>
                  <input
                    type="number"
                    value={form.protein_g}
                    onChange={e => setForm(f => ({ ...f, protein_g: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Kohlenhydrate (g)</label>
                  <input
                    type="number"
                    value={form.carbs_g}
                    onChange={e => setForm(f => ({ ...f, carbs_g: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Fett (g)</label>
                  <input
                    type="number"
                    value={form.fat_g}
                    onChange={e => setForm(f => ({ ...f, fat_g: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-xl font-medium"
              >
                Abbrechen
              </button>
              <button
                onClick={handleAdd}
                disabled={!form.name || !form.calories}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white py-3 rounded-xl font-semibold"
              >
                Hinzufügen
              </button>
            </div>
          </div>
        )}

        {step === 'error' && (
          <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
            {imageDataUrl && (
              <img src={imageDataUrl} alt="" className="max-h-48 rounded-xl object-contain opacity-50" />
            )}
            <div className="text-center">
              <div className="text-4xl mb-3">❌</div>
              <div className="text-white font-semibold">Analyse fehlgeschlagen</div>
              <div className="text-red-400 text-sm mt-1">{error}</div>
            </div>
            <div className="flex gap-3 w-full max-w-sm">
              <button
                onClick={() => { setStep('capture'); setImageDataUrl(null); setError('') }}
                className="flex-1 bg-gray-700 text-white py-3 rounded-xl"
              >
                Erneut versuchen
              </button>
              <button onClick={onClose} className="flex-1 bg-gray-600 text-white py-3 rounded-xl">
                Schließen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
