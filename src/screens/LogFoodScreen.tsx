import { useState, useRef, useEffect } from 'react'
import { db, addLogEntry, getSetting } from '../lib/db'
import { searchAll, lookupBarcodeAll, type FoodResult } from '../lib/search'
import { useLiveQuery } from 'dexie-react-hooks'
import { useI18n } from '../lib/i18n'
import type { Food } from '../lib/db'

interface Props {
  date: string
  onDone: () => void
}

type Tab = 'search' | 'custom'

const SOURCE_COLORS: Record<string, string> = {
  'OpenFoodFacts': 'bg-orange-900/60 text-orange-300',
  'USDA':          'bg-blue-900/60 text-blue-300',
  'BLS':           'bg-green-900/60 text-green-300',
  'My Foods':      'bg-purple-900/60 text-purple-300',
  'Meine Lebensmittel': 'bg-purple-900/60 text-purple-300',
}

function SourceBadge({ label }: { label: string }) {
  const cls = SOURCE_COLORS[label] ?? 'bg-slate-700 text-slate-300'
  return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${cls}`}>{label}</span>
}

type FoodItem = FoodResult | (Food & { key: string; sourceLabel: string })

function toFoodItem(f: Food, myFoodsLabel: string): FoodItem {
  return { ...f, key: `local:${f.id}`, source: 'local', sourceLabel: myFoodsLabel }
}

function ProductCard({ p, onAdd }: { p: FoodItem; onAdd: (p: FoodItem) => void }) {
  const { t } = useI18n()
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
          <span className="text-slate-500"> {t.log_per_100g}</span>
        </p>
      </div>
      <button
        onClick={() => onAdd(p)}
        className="bg-green-600 hover:bg-green-500 text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition shrink-0"
      >
        {/* "Add" is the same in both languages contextually, but use t key anyway */}
        +
      </button>
    </div>
  )
}

interface QuantityModalProps {
  item: FoodItem
  onConfirm: (qty: number) => void
  onCancel: () => void
}

function useKeyboardOffset() {
  const [offset, setOffset] = useState(0)
  useEffect(() => {
    const update = () => {
      const vv = window.visualViewport
      if (vv) {
        setOffset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop))
      }
    }
    window.visualViewport?.addEventListener('resize', update)
    window.visualViewport?.addEventListener('scroll', update)
    // Fallback for browsers without visualViewport support
    window.addEventListener('resize', update)
    return () => {
      window.visualViewport?.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])
  return offset
}

function QuantityModal({ item, onConfirm, onCancel }: QuantityModalProps) {
  const { t } = useI18n()
  const [qty, setQty] = useState('100')
  const inputRef = useRef<HTMLInputElement>(null)
  const kbOffset = useKeyboardOffset()
  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select() }, [])

  const g   = Number(qty)
  const cal = g > 0 ? Math.round(item.calories_per_100g * g / 100) : 0

  return (
    // Backdrop — full screen, tap outside to close
    <div className="fixed inset-0 bg-black/70 z-50" onClick={onCancel}>
      {/* Sheet — positioned directly with bottom so it sits above the keyboard */}
      <div
        className="fixed left-0 right-0 max-w-lg mx-auto bg-slate-800 rounded-t-2xl p-6 space-y-4"
        style={{ bottom: kbOffset, transition: 'bottom 120ms ease-out' }}
        onClick={e => e.stopPropagation()}
      >
        <div>
          <h3 className="font-bold text-lg truncate">{item.name}</h3>
          {item.brand && <p className="text-sm text-slate-400">{item.brand}</p>}
        </div>
        <div>
          <label className="text-sm text-slate-400 block mb-1">{t.log_qty_label}</label>
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
          <button onClick={onCancel} className="flex-1 bg-slate-700 py-3 rounded-xl font-semibold">{t.log_cancel}</button>
          <button
            onClick={() => g > 0 && onConfirm(g)}
            disabled={!(g > 0)}
            className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 py-3 rounded-xl font-semibold transition"
          >
            {t.log_log_it}
          </button>
        </div>
      </div>
    </div>
  )
}

async function getApiKeys(): Promise<Record<string, string>> {
  const [usda, bls] = await Promise.all([
    getSetting('usda_api_key'),
    getSetting('bls_api_key'),
  ])
  return {
    usda: String(usda ?? ''),
    bls:  String(bls  ?? ''),
  }
}

export default function LogFoodScreen({ onDone }: Props) {
  const { t, lang } = useI18n()
  const [tab, setTab]         = useState<Tab>('search')
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState<FoodResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [pending, setPending] = useState<FoodItem | null>(null)
  const [cfSaved, setCfSaved] = useState(false)

  const [cf, setCf] = useState({ name: '', brand: '', calories: '', protein: '', carbs: '', fat: '' })

  const customFoods = useLiveQuery(() => db.foods.orderBy('name').toArray(), [])

  const myFoodsLabel = t.log_my_foods_label

  async function handleSearch() {
    if (!query.trim()) return
    setLoading(true)
    setError('')
    try {
      const apiKeys = await getApiKeys()
      const res = await searchAll(query, { apiKeys, language: lang })
      setResults(res)
      if (res.length === 0) setError(t.log_no_results)
    } catch {
      setError(t.log_search_failed)
    } finally {
      setLoading(false)
    }
  }

  async function handleBarcodeScan() {
    const code = prompt(t.log_barcode_prompt)
    if (!code) return
    setLoading(true)
    setError('')
    try {
      const apiKeys = await getApiKeys()
      const product = await lookupBarcodeAll(code.trim(), { apiKeys, language: lang })
      if (product) {
        setResults([product])
      } else {
        setError(t.log_barcode_not_found)
      }
    } catch {
      setError(t.log_barcode_failed)
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
          source: 'openfoodfacts',
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

  const localMatches = query.trim()
    ? (customFoods ?? []).filter(f => f.name.toLowerCase().includes(query.toLowerCase()))
    : []

  const customFields = [
    { key: 'name',     label: t.log_field_name,     type: 'text',   placeholder: t.log_field_name_ph },
    { key: 'brand',    label: t.log_field_brand,    type: 'text',   placeholder: t.log_field_brand_ph },
    { key: 'calories', label: t.log_field_calories, type: 'number', placeholder: '0' },
    { key: 'protein',  label: t.log_field_protein,  type: 'number', placeholder: '0' },
    { key: 'carbs',    label: t.log_field_carbs,    type: 'number', placeholder: '0' },
    { key: 'fat',      label: t.log_field_fat,      type: 'number', placeholder: '0' },
  ]

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onDone} className="text-slate-400 hover:text-white text-2xl">←</button>
        <h1 className="text-xl font-bold">{t.log_title}</h1>
      </div>

      <div className="flex bg-slate-800 rounded-xl p-1 gap-1">
        {(['search', 'custom'] as Tab[]).map(tab_ => (
          <button
            key={tab_}
            onClick={() => setTab(tab_)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition
              ${tab === tab_ ? 'bg-green-600 text-white' : 'text-slate-400'}`}
          >
            {tab_ === 'search' ? t.log_tab_search : t.log_tab_custom}
          </button>
        ))}
      </div>

      {tab === 'search' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="search"
              placeholder={t.log_search_placeholder}
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
              {loading ? t.log_search_loading : t.log_search_go}
            </button>
            <button
              onClick={handleBarcodeScan}
              className="bg-slate-700 hover:bg-slate-600 px-3 rounded-xl transition text-xl"
              title={t.log_barcode_title}
            >
              📦
            </button>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          {localMatches.map(f => (
            <ProductCard key={`local-${f.id}`} p={toFoodItem(f, myFoodsLabel)} onAdd={p => setPending(p)} />
          ))}

          {results.map(p => (
            <ProductCard key={p.key} p={p} onAdd={p => setPending(p)} />
          ))}

          {!query && (
            <div className="space-y-2">
              <p className="text-slate-500 text-xs uppercase tracking-wide font-semibold">{t.log_recent_label}</p>
              {(customFoods ?? []).slice(-10).reverse().map(f => (
                <ProductCard key={`recent-${f.id}`} p={toFoodItem(f, myFoodsLabel)} onAdd={p => setPending(p)} />
              ))}
              {(customFoods ?? []).length === 0 && (
                <p className="text-slate-500 text-sm text-center py-4">{t.log_recent_empty}</p>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'custom' && (
        <div className="space-y-3">
          <p className="text-slate-400 text-sm">{t.log_custom_subtitle}</p>
          {customFields.map(field => (
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
            {cfSaved ? t.log_saved : t.log_save_custom}
          </button>

          {customFoods && customFoods.filter(f => f.source === 'custom').length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-slate-500 text-xs uppercase tracking-wide font-semibold">{t.log_my_foods_label}</p>
              {customFoods.filter(f => f.source === 'custom').map(f => (
                <ProductCard key={f.id} p={toFoodItem(f, myFoodsLabel)} onAdd={p => setPending(p)} />
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
