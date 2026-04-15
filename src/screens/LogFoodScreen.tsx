import { useState, useRef } from 'react'
import { db, addLogEntry, getSetting, getGeminiKey } from '../lib/db'
import { searchAll, lookupBarcodeAll, type FoodResult } from '../lib/search'
import { estimateFromText, DEFAULT_MODEL, type GeminiEstimate } from '../lib/gemini'
import { useLiveQuery } from 'dexie-react-hooks'
import { useI18n } from '../lib/i18n'
import type { Food } from '../lib/db'

interface Props {
  date: string
  onDone: () => void
}

type Tab = 'search' | 'custom' | 'chat'

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


const PRESETS = [50, 100, 150, 200, 300]

function QuantityModal({ item, onConfirm, onCancel }: QuantityModalProps) {
  const { t } = useI18n()
  const [qty, setQty] = useState(100)
  const [editing, setEditing] = useState(false)
  const [raw, setRaw] = useState('100')
  const inputRef = useRef<HTMLInputElement>(null)

  const g   = qty
  const cal = g > 0 ? Math.round(item.calories_per_100g * g / 100) : 0

  function step(delta: number) {
    setQty(prev => Math.max(1, prev + delta))
  }

  function commitEdit() {
    const v = parseInt(raw, 10)
    if (!isNaN(v) && v > 0) setQty(v)
    else setRaw(String(qty))
    setEditing(false)
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-[100] flex items-end justify-center" onClick={onCancel}>
      <div
        className="w-full max-w-lg bg-slate-800 rounded-t-2xl p-6 pb-safe space-y-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
        onClick={e => e.stopPropagation()}
      >
        <div>
          <h3 className="font-bold text-lg truncate">{item.name}</h3>
          {item.brand && <p className="text-sm text-slate-400">{item.brand}</p>}
        </div>

        {/* Preset chips */}
        <div className="flex gap-2 flex-wrap">
          {PRESETS.map(p => (
            <button
              key={p}
              onClick={() => { setQty(p); setEditing(false) }}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition
                ${qty === p ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
            >
              {p}g
            </button>
          ))}
        </div>

        {/* Stepper row */}
        <div>
          <label className="text-sm text-slate-400 block mb-2">{t.log_qty_label}</label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => step(-10)}
              className="w-12 h-12 bg-slate-700 hover:bg-slate-600 rounded-xl text-xl font-bold transition"
            >−</button>
            <button
              onClick={() => step(-1)}
              className="w-10 h-10 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-bold transition"
            >-1</button>

            {editing ? (
              <input
                ref={inputRef}
                type="number"
                value={raw}
                onChange={e => setRaw(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={e => e.key === 'Enter' && commitEdit()}
                className="flex-1 bg-slate-700 rounded-xl px-3 py-2 text-xl font-bold text-center outline-none focus:ring-2 focus:ring-green-500"
                min="1"
                autoFocus
              />
            ) : (
              <button
                onClick={() => { setRaw(String(qty)); setEditing(true) }}
                className="flex-1 bg-slate-700 rounded-xl px-3 py-2 text-xl font-bold text-center"
              >
                {qty}g
              </button>
            )}

            <button
              onClick={() => step(1)}
              className="w-10 h-10 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-bold transition"
            >+1</button>
            <button
              onClick={() => step(10)}
              className="w-12 h-12 bg-slate-700 hover:bg-slate-600 rounded-xl text-xl font-bold transition"
            >+</button>
          </div>
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

  // Chat tab state
  const [chatInput, setChatInput]       = useState('')
  const [chatLoading, setChatLoading]   = useState(false)
  const [chatError, setChatError]       = useState('')
  const [chatItems, setChatItems]       = useState<(GeminiEstimate & { selected: boolean })[]>([])

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

  async function handleChatAsk() {
    if (!chatInput.trim()) return
    setChatLoading(true)
    setChatError('')
    setChatItems([])
    try {
      const [apiKey, model] = await Promise.all([
        getGeminiKey(),
        getSetting('gemini_model').then(v => String(v || DEFAULT_MODEL)),
      ])
      const results = await estimateFromText(apiKey, chatInput.trim(), lang, model)
      if (results.length === 0) {
        setChatError(t.log_chat_no_results)
      } else {
        setChatItems(results.map(r => ({ ...r, selected: true })))
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setChatError(msg.includes('No Gemini') ? t.log_chat_no_key : t.log_chat_failed)
    } finally {
      setChatLoading(false)
    }
  }

  async function handleChatLog() {
    const selected = chatItems.filter(e => e.selected && e.quantity_g > 0)
    for (const item of selected) {
      await addLogEntry({
        food_name: item.name,
        calories_per_100g: item.calories_per_100g,
        protein_per_100g: item.protein_per_100g,
        carbs_per_100g: item.carbs_per_100g,
        fat_per_100g: item.fat_per_100g,
        quantity_g: item.quantity_g,
        source: 'ai',
        ai_note: `AI chat: ${item.quantity_desc}`,
      })
    }
    onDone()
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
        {(['search', 'chat', 'custom'] as Tab[]).map(tab_ => (
          <button
            key={tab_}
            onClick={() => setTab(tab_)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition
              ${tab === tab_ ? 'bg-green-600 text-white' : 'text-slate-400'}`}
          >
            {tab_ === 'search' ? t.log_tab_search : tab_ === 'chat' ? t.log_tab_chat : t.log_tab_custom}
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

      {tab === 'chat' && (
        <div className="space-y-3">
          <p className="text-slate-400 text-sm">{t.log_chat_subtitle}</p>

          <div className="flex gap-2">
            <textarea
              rows={3}
              placeholder={t.log_chat_placeholder}
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              className="flex-1 bg-slate-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>
          <button
            onClick={handleChatAsk}
            disabled={chatLoading || !chatInput.trim()}
            className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 py-3 rounded-xl font-semibold transition"
          >
            {chatLoading ? t.log_chat_loading : t.log_chat_go}
          </button>

          {chatError && <p className="text-red-400 text-sm">{chatError}</p>}

          {chatItems.length > 0 && (
            <div className="space-y-3">
              <p className="text-slate-400 text-sm font-semibold">{t.log_chat_review}</p>
              {chatItems.map((item, i) => {
                const cal = Math.round(item.calories_per_100g * item.quantity_g / 100)
                return (
                  <div
                    key={i}
                    onClick={() => setChatItems(prev => prev.map((e, idx) => idx === i ? { ...e, selected: !e.selected } : e))}
                    className={`bg-slate-800 rounded-xl px-4 py-3 border-2 cursor-pointer transition
                      ${item.selected ? 'border-green-500' : 'border-transparent opacity-50'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-slate-400 mb-1">{item.quantity_desc}</p>
                        <p className="text-xs text-slate-400">
                          {item.calories_per_100g} kcal/100g · P {item.protein_per_100g}g · C {item.carbs_per_100g}g · F {item.fat_per_100g}g
                        </p>
                      </div>
                      <p className="text-green-400 font-bold shrink-0">{cal} kcal</p>
                    </div>
                    <div className="mt-2 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <label className="text-xs text-slate-400">g:</label>
                      <input
                        type="number"
                        value={item.quantity_g}
                        onChange={e => {
                          const v = Number(e.target.value)
                          setChatItems(prev => prev.map((el, idx) => idx === i ? { ...el, quantity_g: isNaN(v) ? el.quantity_g : v } : el))
                        }}
                        className="w-20 bg-slate-700 rounded-lg px-2 py-1 text-sm text-center"
                        min="1"
                      />
                    </div>
                  </div>
                )
              })}
              <div className="flex gap-2">
                <button
                  onClick={() => { setChatItems([]); setChatInput('') }}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 rounded-xl text-sm font-semibold transition"
                >
                  {t.log_chat_try_again}
                </button>
                <button
                  onClick={handleChatLog}
                  disabled={chatItems.filter(e => e.selected).length === 0}
                  className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 py-3 rounded-xl font-semibold transition"
                >
                  {t.log_chat_log(chatItems.filter(e => e.selected).length)}
                </button>
              </div>
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
