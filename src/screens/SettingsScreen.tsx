import { useState, useEffect } from 'react'
import { getSetting, setSetting, DEFAULT_GOALS } from '../lib/db'
import { DEFAULT_MODEL } from '../lib/gemini'
import { useI18n, type Lang } from '../lib/i18n'

export default function SettingsScreen() {
  const { t, lang, setLang } = useI18n()
  const [goals, setGoals]       = useState({ calories: '', protein: '', carbs: '', fat: '' })
  const [geminiKey, setGeminiKey]     = useState('')
  const [geminiModel, setGeminiModel] = useState('')
  const [usdaKey, setUsdaKey]         = useState('')
  const [saved, setSaved]       = useState(false)

  useEffect(() => {
    async function load() {
      const [cal, pro, carb, fat, gemini, geminiMdl, usda] = await Promise.all([
        getSetting('goal_calories'),
        getSetting('goal_protein'),
        getSetting('goal_carbs'),
        getSetting('goal_fat'),
        getSetting('gemini_api_key'),
        getSetting('gemini_model'),
        getSetting('usda_api_key'),
      ])
      setGoals({
        calories: String(cal  ?? DEFAULT_GOALS.calories),
        protein:  String(pro  ?? DEFAULT_GOALS.protein),
        carbs:    String(carb ?? DEFAULT_GOALS.carbs),
        fat:      String(fat  ?? DEFAULT_GOALS.fat),
      })
      setGeminiKey(String(gemini ?? ''))
      setGeminiModel(String(geminiMdl ?? ''))
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
      setSetting('gemini_model',   geminiModel.trim()),
      setSetting('usda_api_key',   usdaKey.trim()),
    ])
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const goalFields = [
    { key: 'calories', label: t.macro_calories, unit: t.settings_unit_kcal, color: 'text-green-400' },
    { key: 'protein',  label: t.macro_protein,  unit: t.settings_unit_g,    color: 'text-blue-400' },
    { key: 'carbs',    label: t.macro_carbs,    unit: t.settings_unit_g,    color: 'text-yellow-400' },
    { key: 'fat',      label: t.macro_fat,      unit: t.settings_unit_g,    color: 'text-pink-400' },
  ]

  return (
    <div className="px-4 pt-6 pb-4 space-y-6">
      <h1 className="text-2xl font-bold">{t.settings_title}</h1>

      {/* Language toggle */}
      <section className="space-y-3">
        <h2 className="font-semibold text-slate-300">{t.settings_language}</h2>
        <div className="flex bg-slate-800 rounded-xl p-1 gap-1">
          {(['en', 'de'] as Lang[]).map(l => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`flex-1 py-2.5 rounded-lg font-semibold transition text-sm
                ${lang === l ? 'bg-green-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              {l === 'en' ? '🇬🇧 English' : '🇩🇪 Deutsch'}
            </button>
          ))}
        </div>
      </section>

      {/* Daily Goals */}
      <section className="space-y-3">
        <h2 className="font-semibold text-slate-300">{t.settings_goals}</h2>
        {goalFields.map(field => (
          <div key={field.key} className="flex items-center gap-3 bg-slate-800 rounded-xl px-4 py-3">
            <span className={`font-medium w-28 ${field.color}`}>{field.label}</span>
            <input
              type="number"
              value={goals[field.key as keyof typeof goals]}
              onChange={e => setGoals(prev => ({ ...prev, [field.key]: e.target.value }))}
              className="flex-1 bg-slate-700 rounded-lg px-3 py-2 text-right outline-none focus:ring-2 focus:ring-green-500"
              min="0"
            />
            <span className="text-slate-400 w-8 text-right text-sm">{field.unit}</span>
          </div>
        ))}
      </section>

      {/* Food Databases */}
      <section className="space-y-3">
        <h2 className="font-semibold text-slate-300">{t.settings_databases}</h2>

        {/* OpenFoodFacts */}
        <div className="bg-slate-800 rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium">{t.settings_db_off}</p>
            <p className="text-xs text-slate-400">{t.settings_db_off_desc}</p>
          </div>
          <span className="text-green-400 text-sm font-semibold">{t.settings_active}</span>
        </div>

        {/* USDA */}
        <div className="bg-slate-800 rounded-xl px-4 py-4 space-y-3">
          <div>
            <p className="text-sm font-medium">{t.settings_db_usda}</p>
            <p className="text-xs text-slate-400 mt-0.5">{t.settings_db_usda_desc}</p>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">{t.settings_usda_key}</label>
            <input
              type="password"
              value={usdaKey}
              onChange={e => setUsdaKey(e.target.value)}
              placeholder={t.settings_usda_ph}
              className="w-full bg-slate-700 rounded-xl px-4 py-3 font-mono text-sm outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          {!usdaKey && <p className="text-xs text-yellow-500">{t.settings_usda_warn}</p>}
        </div>

        {/* BLS */}
        <div className="bg-slate-800 rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium">{t.settings_db_bls}</p>
            <p className="text-xs text-slate-400">{t.settings_db_bls_desc}</p>
          </div>
          <span className="text-green-400 text-sm font-semibold">{t.settings_active}</span>
        </div>
      </section>

      {/* Gemini */}
      <section className="space-y-3">
        <h2 className="font-semibold text-slate-300">{t.settings_ai}</h2>
        <div className="bg-slate-800 rounded-xl px-4 py-4 space-y-3">
          <p className="text-sm text-slate-400">{t.settings_ai_desc}</p>
          <div>
            <label className="text-xs text-slate-400 block mb-1">{t.settings_gemini_key}</label>
            <input
              type="password"
              value={geminiKey}
              onChange={e => setGeminiKey(e.target.value)}
              placeholder={t.settings_gemini_ph}
              className="w-full bg-slate-700 rounded-xl px-4 py-3 font-mono text-sm outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">{t.settings_gemini_model}</label>
            <input
              type="text"
              value={geminiModel}
              onChange={e => setGeminiModel(e.target.value)}
              placeholder={DEFAULT_MODEL}
              className="w-full bg-slate-700 rounded-xl px-4 py-3 font-mono text-sm outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <p className="text-xs text-slate-500">{t.settings_gemini_note}</p>
        </div>
      </section>

      <button
        onClick={handleSave}
        className={`w-full py-3 rounded-xl font-semibold transition
          ${saved ? 'bg-green-700 text-green-200' : 'bg-green-600 hover:bg-green-500 text-white'}`}
      >
        {saved ? t.settings_saved : t.settings_save}
      </button>

      <section className="space-y-2 pt-2">
        <h2 className="font-semibold text-slate-300">{t.settings_about}</h2>
        <div className="bg-slate-800 rounded-xl px-4 py-3 space-y-1 text-sm text-slate-400">
          <p>{t.settings_about_line1}</p>
          <p>{t.settings_about_line2}</p>
          <p>{t.settings_about_line3}</p>
          <p>{t.settings_about_line4}</p>
          <p>{t.settings_about_line5}</p>
        </div>
      </section>
    </div>
  )
}
