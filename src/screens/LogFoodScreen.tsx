import { useState, useRef, useEffect } from 'react'
import { db, addLogEntry, getSetting } from '../lib/db'
import { searchAll, lookupBarcodeAll, type FoodResult } from '../lib/search'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Food } from '../lib/db'

interface Props {
  date: string
  onDone: () => void
}

type Tab = 'search' | 'custom'

// Colours per source label shown as a small badge
const SOURCE_COLORS: Record<string, string> = {
  'OpenFoodFacts': 'bg-orange-900/60 text-orange-300',
  'USDA':          'bg-blue-900/60 text-blue-300',
  'BLS':           'bg-green-900/60 text-green-300',
  'My Foods':      'bg-purple-900/60 text-purple-300',
}

function SourceBadge({ label }: { label: string }) {
  const cls = SOURCE_COLORS[label] ?? 'bg-slate-700 text-slate-300'
  return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${cls}`}>{label}</span>
}

type FoodItem = FoodResult | (Food & { sourceLabel: string })

function toFoodItem(f: Food): FoodItem {
  return { ...f, key: `local:${f.id}`, source: 'local', sourceLabel: 'My Foods' }
}

function ProductCard({ p, onAdd }: { p: FoodItem; onAdd: (p: FoodItem) => void }) {
  return (
    <div className="flex items-center gap-3 bg-slate-800 rounded-xl px-4 py-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium truncate">{p.name}</p>
          <SourceBadge label={p.sourceLabel} />
        </div>
        {p.brand && <p className="text-xs text-slate-400 truncate">{p.brand}</p>}
        <p className="text-xs text-slate-400 mt-0.5">
          {p.calories_per_100g} kcal · P {p.protein_per_100g}g · C {p.carbs_per_100g}g · F {p.fat_per_100g}g
          <span className="text-slate-500"> /100g</span>
        </p>
      </div>
      <button
        onClick={() => onAdd(p)}
        className="bg-green-600 hover:bg-green-500 text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition shrink-0"
      >
        Add
      </button>
    </div>
  )
}

interface QuantityModalProps {
  item: FoodItem
  onConfirm: (qty: number) => void
  onCancel: () => void
}

function QuantityModal({ item, onConfirm, onCancel }: QuantityModalProps) {
  const [qty, setQty] = useState('100')
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select() }, [])

  const g = Number(qty)
  const cal = g > 0 ? Math.round(item.calories_per_100g * g / 100) : 0

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end z-50" onClick={onCancel}>
      <div className="w-full max-w-lg mx-auto bg-slate-800 rounded-t-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div>
          <h3 className="font-bold text-lg truncate">{item.name}</h3>
          {item.brand && <p className="text-sm text-slate-400">{item.brand}</p>}
        </div>
        <div>
          <label className="text-sm text-slate-400 block mb-1">Quantity (grams)</label>
          <input
            ref={inputRef}
            type="number"
            value={qty}
            onChange={e => setQty(e.target.value)}
            className="w-full bg-slate-700 rounded-xl px-4 py-3 text-lg font-semibold text-center"
            min="1"
          />
        </div>
        {g > 0 && (
          <p className="text-center text-slate-300">
            <span className="text-2xl font-bold text-green-400">{cal}</span> kcal ·
            P {Math.round(item.protein_per_100g * g / 100)}g ·
            C {Math.round(item.carbs_per_100g * g / 100)}g ·
            F {Math.round(item.fat_per_100g * g / 100)}g
          </p>
        )}
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 bg-slate-700 py-3 rounded-xl font-semibold">Cancel</button>
          <button
            onClick={() => g > 0 && onConfirm(g)}
            disabled={!(g > 0)}
            className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 py-3 rounded-xl font-semibold transition"
          >
            Log It
          </button>
        </div>
      </div>
    </div>
  )
}

async function getApiKeys(): Promise<Record<string, string>> {
  const [usda] = await Promise.all([
    getSetting('usda_api_key'),
  ])
  return {
    usda: String(usda ?? ''),
  }
}

export default function LogFoodScreen({ onDone }: Props) {
  const [tab, setTab] = useState<Tab>('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FoodResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState<FoodItem | null>(null)

  const [cf, setCf] = useState({ name: '', brand: '', calories: '', protein: '', carbs: '', fat: '' })
  const [cfSaved, setCfSaved] = useState(false)

  const customFoods = useLiveQuery(() => db.foods.orderBy('name').toArray(), [])

  async function handleSearch() {
    if (!query.trim()) return
    setLoading(true)
    setError('')
    try {
      const apiKeys = await getApiKeys()
      const res = await searchAll(query, { apiKeys })
      setResults(res)
      if (res.length === 0) setError('No results found. Try different keywords.')
    } catch {
      setError('Search failed. Check your connection.')
    } finally {
      setLoading(false)
    }
  }

  async function handleBarcodeScan() {
    const code = prompt('Enter barcode number:')
    if (!code) return
    setLoading(true)
    setError('')
    try {
      const apiKeys = await getApiKeys()
      const product = await lookupBarcodeAll(code.trim(), { apiKeys })
      if (product) {
        setResults([product])
      } else {
        setError('Barcode not found')
      }
    } catch {
      setError('Barcode lookup failed.')
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirmAdd(qty: number) {
    if (!pending) return
    await addLogEntry({
      food_name: pending.name,
      brand: pending.brand,
      calories_per_100g: pending.calories_per_100g,
      protein_per_100g: pending.protein_per_100g,
      carbs_per_100g: pending.carbs_per_100g,
      fat_per_100g: pending.fat_per_100g,
      quantity_g: qty,
      source: 'search',
    })

    // Cache result locally so it appears in "My Foods" and works offline
    const barcode = (pending as FoodResult).barcode
    if (barcode) {
      const exists = await db.foods.where('barcode').equals(barcode).first()
      if (!exists) {
        db.foods.add({
          name: pending.name,
          brand: pending.brand,
          calories_per_100g: pending.calories_per_100g,
          protein_per_100g: pending.protein_per_100g,
          carbs_per_100g: pending.carbs_per_100g,
          fat_per_100g: pending.fat_per_100g,
          barcode,
          source: (pending as FoodResult).source === 'usda' ? 'custom' : 'openfoodfacts',
          created_at: Date.now(),
        })
      }
    }

    setPending(null)
    onDone()
  }

  async function handleSaveCustomFood() {
    if (!cf.name.trim() || !cf.calories) return
    await db.foods.add({
      name: cf.name.trim(),
      brand: cf.brand.trim() || undefined,
      calories_per_100g: Number(cf.calories),
      protein_per_100g: Number(cf.protein) || 0,
      carbs_per_100g: Number(cf.carbs) || 0,
      fat_per_100g: Number(cf.fat) || 0,
      source: 'custom',
      created_at: Date.now(),
    })
    setCf({ name: '', brand: '', calories: '', protein: '', carbs: '', fat: '' })
    setCfSaved(true)
    setTimeout(() => setCfSaved(false), 2000)
  }

  // Local foods filtered by current query
  const localMatches = query.trim()
    ? (customFoods ?? []).filter(f => f.name.toLowerCase().includes(query.toLowerCase()))
    : []

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onDone} className="text-slate-400 hover:text-white text-2xl">←</button>
        <h1 className="text-xl font-bold">Add Food</h1>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-800 rounded-xl p-1 gap-1">
        {(['search', 'custom'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition
              ${tab === t ? 'bg-green-600 text-white' : 'text-slate-400'}`}
          >
            {t === 'search' ? '🔍 Search' : '✏️ Custom'}
          </button>
        ))}
      </div>

      {tab === 'search' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="search"
              placeholder="e.g. chicken breast, apple, yogurt..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="flex-1 bg-slate-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="bg-green-600 hover:bg-green-500 disabled:opacity-50 px-4 rounded-xl font-semibold transition"
            >
              {loading ? '…' : 'Go'}
            </button>
            <button
              onClick={handleBarcodeScan}
              className="bg-slate-700 hover:bg-slate-600 px-3 rounded-xl transition text-xl"
              title="Enter barcode"
            >
              📦
            </button>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          {/* Local matches shown above remote results */}
          {localMatches.map(f => (
            <ProductCard key={`local-${f.id}`} p={toFoodItem(f)} onAdd={p => setPending(p)} />
          ))}

          {results.map(p => (
            <ProductCard key={p.key} p={p} onAdd={p => setPending(p)} />
          ))}

          {!query && (
            <div className="space-y-2">
              <p className="text-slate-500 text-xs uppercase tracking-wide font-semibold">Recent / saved foods</p>
              {(customFoods ?? []).slice(-10).reverse().map(f => (
                <ProductCard key={`recent-${f.id}`} p={toFoodItem(f)} onAdd={p => setPending(p)} />
              ))}
              {(customFoods ?? []).length === 0 && (
                <p className="text-slate-500 text-sm text-center py-4">
                  Search above — results from USDA (generic foods) and OpenFoodFacts (packaged products) will appear here.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'custom' && (
        <div className="space-y-3">
          <p className="text-slate-400 text-sm">Add a custom food to your local database</p>
          {[
            { key: 'name',     label: 'Name *',                  type: 'text',   placeholder: 'e.g. Chicken breast' },
            { key: 'brand',    label: 'Brand',                   type: 'text',   placeholder: 'Optional' },
            { key: 'calories', label: 'Calories (kcal/100g) *',  type: 'number', placeholder: '0' },
            { key: 'protein',  label: 'Protein (g/100g)',        type: 'number', placeholder: '0' },
            { key: 'carbs',    label: 'Carbs (g/100g)',          type: 'number', placeholder: '0' },
            { key: 'fat',      label: 'Fat (g/100g)',            type: 'number', placeholder: '0' },
          ].map(field => (
            <div key={field.key}>
              <label className="text-sm text-slate-400 block mb-1">{field.label}</label>
              <input
                type={field.type}
                placeholder={field.placeholder}
                value={cf[field.key as keyof typeof cf]}
                onChange={e => setCf(prev => ({ ...prev, [field.key]: e.target.value }))}
                className="w-full bg-slate-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          ))}
          <button
            onClick={handleSaveCustomFood}
            disabled={!cf.name.trim() || !cf.calories}
            className={`w-full py-3 rounded-xl font-semibold transition
              ${cfSaved ? 'bg-green-700 text-green-200' : 'bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white'}`}
          >
            {cfSaved ? '✓ Saved!' : 'Save to My Foods'}
          </button>

          {customFoods && customFoods.filter(f => f.source === 'custom').length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-slate-500 text-xs uppercase tracking-wide font-semibold">My Foods</p>
              {customFoods.filter(f => f.source === 'custom').map(f => (
                <ProductCard key={f.id} p={toFoodItem(f)} onAdd={p => setPending(p)} />
              ))}
            </div>
          )}
        </div>
      )}

      {pending && (
        <QuantityModal
          item={pending}
          onConfirm={handleConfirmAdd}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  )
}
