import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { getSetting, setSetting } from './db'

export type Lang = 'en' | 'de'

// ─── Translation strings ──────────────────────────────────────────────────────

const en = {
  // Navigation
  nav_today:    'Today',
  nav_add_food: 'Add Food',
  nav_ai_scan:  'AI Scan',
  nav_history:  'History',
  nav_settings: 'Settings',

  // Today screen
  today_title:          'Today',
  today_kcal_remaining: 'kcal remaining',
  today_over_goal:      'over goal',
  today_calories:       'Calories',
  today_food_log:       'Food Log',
  today_empty:          'No food logged yet today',
  today_add_food:       '+ Add Food',
  today_ai_scan:        '📷 AI Scan',

  // Macros
  macro_protein:  'Protein',
  macro_carbs:    'Carbs',
  macro_fat:      'Fat',
  macro_calories: 'Calories',

  // Log food screen
  log_title:           'Add Food',
  log_tab_search:      '🔍 Search',
  log_tab_custom:      '✏️ Custom',
  log_search_placeholder: 'e.g. chicken breast, apple, yogurt…',
  log_search_go:       'Go',
  log_search_loading:  '…',
  log_barcode_title:   'Enter barcode',
  log_barcode_prompt:  'Enter barcode number:',
  log_no_results:      'No results found. Try different keywords.',
  log_search_failed:   'Search failed. Check your connection.',
  log_barcode_not_found: 'Barcode not found',
  log_barcode_failed:  'Barcode lookup failed.',
  log_recent_label:    'Recent / saved foods',
  log_recent_empty:    'Search above — results from USDA (generic foods) and OpenFoodFacts (packaged products) will appear here.',
  log_custom_subtitle: 'Add a custom food to your local database',
  log_field_name:      'Name *',
  log_field_brand:     'Brand',
  log_field_calories:  'Calories (kcal/100g) *',
  log_field_protein:   'Protein (g/100g)',
  log_field_carbs:     'Carbs (g/100g)',
  log_field_fat:       'Fat (g/100g)',
  log_field_name_ph:   'e.g. Chicken breast',
  log_field_brand_ph:  'Optional',
  log_save_custom:     'Save to My Foods',
  log_saved:           '✓ Saved!',
  log_my_foods_label:  'My Foods',
  log_qty_label:       'Quantity (grams)',
  log_log_it:          'Log It',
  log_cancel:          'Cancel',
  log_per_100g:        '/100g',
  log_tab_chat:        '💬 AI',
  log_chat_subtitle:   'Describe what you ate and AI will estimate the nutrition',
  log_chat_placeholder:'e.g. oatmeal with milk and a banana, 150g chicken breast with rice…',
  log_chat_go:         'Ask AI',
  log_chat_loading:    'Thinking…',
  log_chat_review:     'Review estimates — adjust quantities before logging',
  log_chat_no_results: 'AI could not identify any food items. Try describing more specifically.',
  log_chat_failed:     'AI request failed.',
  log_chat_no_key:     'No Gemini API key configured. Add it in Settings.',
  log_chat_log:        (n: number) => `Log ${n} item${n !== 1 ? 's' : ''}`,
  log_chat_try_again:  'Try again',

  // Camera screen
  cam_title:          'AI Food Scan',
  cam_subtitle:       'Take or upload a photo of your meal. AI will estimate the calories and macros.',
  cam_pick_button:    'Take Photo or Upload',
  cam_pick_hint:      'Tap to open camera',
  cam_analyse:        '🤖 Analyse with AI',
  cam_analysing:      'Analysing image…',
  cam_no_food:        'AI could not identify any food in the image. Try a clearer photo.',
  cam_review:         'Review estimates — tap to toggle, adjust quantities',
  cam_try_again:      '📷 Try Different Photo',
  cam_log_items:      (n: number) => `Log ${n} item${n !== 1 ? 's' : ''}`,
  cam_qty_label:      'Qty (g):',
  cam_disclaimer:     '⚠️ AI estimates — actual calories may vary. Always check the quantity and adjust if needed. Powered by Google Gemini. Requires a Google AI Studio API key in Settings.',
  cam_no_key:         'No Gemini API key configured. Add it in Settings.',

  // History screen
  history_title:      'History',
  history_days:       'days logged',
  history_avg:        'avg kcal/day',
  history_entries:    'total entries',
  history_empty:      'No history yet. Start logging food!',
  history_export:     '📥 Export All Data (JSON)',
  history_reset:      '🗑️ Reset Database',
  history_items:      (n: number) => `${n} item${n !== 1 ? 's' : ''}`,
  reset_title:        'Reset Database?',
  reset_body:         'This will permanently delete all food log entries and your custom food database. Settings (goals, API keys) will be kept.',
  reset_warning:      'Consider exporting your data first.',
  reset_confirm:      'Delete Everything',
  reset_cancel:       'Cancel',

  // Settings screen
  settings_title:        'Settings',
  settings_goals:        'Daily Goals',
  settings_databases:    'Food Databases',
  settings_db_off:       'OpenFoodFacts',
  settings_db_off_desc:  'Packaged products & barcodes — no key required',
  settings_active:       'Active',
  settings_db_usda:      'USDA FoodData Central',
  settings_db_usda_desc: 'Generic & raw ingredients (chicken breast, rice, eggs…). Free key at fdc.nal.usda.gov → API Key. 1,000 requests/hour.',
  settings_db_bls:       'BLS — Bundeslebensmittelschlüssel',
  settings_db_bls_desc:  'German national food database · 7,100 foods · bundled offline — no key required',
  settings_usda_key:     'USDA API Key',
  settings_usda_ph:      'Leave blank to skip USDA search',
  settings_usda_warn:    'Without a key, only OpenFoodFacts will be searched.',
  settings_bls_key:      'BLS API Key',
  settings_bls_ph:       'Leave blank to skip BLS search',
  settings_ai:           'AI Image Analysis',
  settings_ai_desc:      'Required for the AI camera feature. Free key at aistudio.google.com → Get API Key.',
  settings_gemini_key:   'Gemini API Key',
  settings_gemini_ph:    'AIza…',
  settings_gemini_model: 'Gemini Model',
  settings_gemini_note:  "Stored only on this device. Never sent anywhere except Google's API.",
  settings_language:     'Language',
  settings_save:         'Save Settings',
  settings_saved:        '✓ Saved!',
  settings_about:        'About',
  settings_about_line1:  'Food Tracker — all data stored on your device',
  settings_about_line2:  'Packaged foods: OpenFoodFacts (open data)',
  settings_about_line3:  'Generic ingredients: USDA FoodData Central',
  settings_about_line4:  'German ingredients: BLS via naehrwerte.io',
  settings_about_line5:  'AI analysis: Google Gemini',
  settings_unit_kcal:    'kcal',
  settings_unit_g:       'g',
}

const de: Record<keyof typeof en, string | ((...args: never[]) => string)> = {
  // Navigation
  nav_today:    'Heute',
  nav_add_food: 'Hinzufügen',
  nav_ai_scan:  'KI-Scan',
  nav_history:  'Verlauf',
  nav_settings: 'Einstellungen',

  // Today screen
  today_title:          'Heute',
  today_kcal_remaining: 'kcal übrig',
  today_over_goal:      'über Ziel',
  today_calories:       'Kalorien',
  today_food_log:       'Tagebuch',
  today_empty:          'Noch keine Mahlzeiten eingetragen',
  today_add_food:       '+ Hinzufügen',
  today_ai_scan:        '📷 KI-Scan',

  // Macros
  macro_protein:  'Protein',
  macro_carbs:    'Kohlenhydrate',
  macro_fat:      'Fett',
  macro_calories: 'Kalorien',

  // Log food screen
  log_title:           'Essen hinzufügen',
  log_tab_search:      '🔍 Suche',
  log_tab_custom:      '✏️ Eigene',
  log_search_placeholder: 'z.B. Hähnchenbrust, Apfel, Joghurt…',
  log_search_go:       'Los',
  log_search_loading:  '…',
  log_barcode_title:   'Barcode eingeben',
  log_barcode_prompt:  'Barcode-Nummer eingeben:',
  log_no_results:      'Keine Ergebnisse. Versuche andere Suchbegriffe.',
  log_search_failed:   'Suche fehlgeschlagen. Verbindung prüfen.',
  log_barcode_not_found: 'Barcode nicht gefunden',
  log_barcode_failed:  'Barcode-Suche fehlgeschlagen.',
  log_recent_label:    'Zuletzt / gespeicherte Lebensmittel',
  log_recent_empty:    'Suche oben — Ergebnisse aus BLS (Zutaten) und OpenFoodFacts (Produkte) erscheinen hier.',
  log_custom_subtitle: 'Eigenes Lebensmittel zur lokalen Datenbank hinzufügen',
  log_field_name:      'Name *',
  log_field_brand:     'Marke',
  log_field_calories:  'Kalorien (kcal/100g) *',
  log_field_protein:   'Protein (g/100g)',
  log_field_carbs:     'Kohlenhydrate (g/100g)',
  log_field_fat:       'Fett (g/100g)',
  log_field_name_ph:   'z.B. Hähnchenbrust',
  log_field_brand_ph:  'Optional',
  log_save_custom:     'In Meine Lebensmittel speichern',
  log_saved:           '✓ Gespeichert!',
  log_my_foods_label:  'Meine Lebensmittel',
  log_qty_label:       'Menge (Gramm)',
  log_log_it:          'Eintragen',
  log_cancel:          'Abbrechen',
  log_per_100g:        '/100g',
  log_tab_chat:        '💬 KI',
  log_chat_subtitle:   'Beschreibe was du gegessen hast und die KI schätzt die Nährwerte',
  log_chat_placeholder:'z.B. Haferflocken mit Milch und eine Banane, 150g Hähnchenbrust mit Reis…',
  log_chat_go:         'KI fragen',
  log_chat_loading:    'Analysiere…',
  log_chat_review:     'Schätzungen prüfen — Mengen anpassen, dann eintragen',
  log_chat_no_results: 'KI konnte keine Lebensmittel erkennen. Versuche eine genauere Beschreibung.',
  log_chat_failed:     'KI-Anfrage fehlgeschlagen.',
  log_chat_no_key:     'Kein Gemini API-Schlüssel konfiguriert. Bitte in Einstellungen hinzufügen.',
  log_chat_log:        (n: number) => `${n} Eintrag${n !== 1 ? 'einträge' : ''} eintragen`,
  log_chat_try_again:  'Erneut versuchen',

  // Camera screen
  cam_title:          'KI-Lebensmittelscan',
  cam_subtitle:       'Foto deiner Mahlzeit aufnehmen oder hochladen. KI schätzt Kalorien und Makros.',
  cam_pick_button:    'Foto aufnehmen oder hochladen',
  cam_pick_hint:      'Tippen zum Öffnen der Kamera',
  cam_analyse:        '🤖 Mit KI analysieren',
  cam_analysing:      'Bild wird analysiert…',
  cam_no_food:        'KI konnte kein Lebensmittel erkennen. Versuche ein klareres Foto.',
  cam_review:         'Schätzungen prüfen — antippen zum Auswählen, Mengen anpassen',
  cam_try_again:      '📷 Anderes Foto versuchen',
  cam_log_items:      (n: number) => `${n} Eintrag${n !== 1 ? 'einträge' : ''} eintragen`,
  cam_qty_label:      'Menge (g):',
  cam_disclaimer:     '⚠️ KI-Schätzungen — tatsächliche Kalorien können abweichen. Menge immer prüfen. Powered by Google Gemini. Erfordert einen Google AI Studio API-Schlüssel.',
  cam_no_key:         'Kein Gemini API-Schlüssel konfiguriert. Bitte in Einstellungen hinzufügen.',

  // History screen
  history_title:      'Verlauf',
  history_days:       'Tage protokolliert',
  history_avg:        'Ø kcal/Tag',
  history_entries:    'Einträge gesamt',
  history_empty:      'Noch kein Verlauf. Fange an, Essen einzutragen!',
  history_export:     '📥 Alle Daten exportieren (JSON)',
  history_reset:      '🗑️ Datenbank zurücksetzen',
  history_items:      (n: number) => `${n} Eintrag${n !== 1 ? 'einträge' : ''}`,
  reset_title:        'Datenbank zurücksetzen?',
  reset_body:         'Alle Tagebucheinträge und eigene Lebensmittel werden dauerhaft gelöscht. Einstellungen (Ziele, API-Schlüssel) bleiben erhalten.',
  reset_warning:      'Daten vorher exportieren empfohlen.',
  reset_confirm:      'Alles löschen',
  reset_cancel:       'Abbrechen',

  // Settings screen
  settings_title:        'Einstellungen',
  settings_goals:        'Tagesziele',
  settings_databases:    'Lebensmitteldatenbanken',
  settings_db_off:       'OpenFoodFacts',
  settings_db_off_desc:  'Verpackte Produkte & Barcodes — kein Schlüssel erforderlich',
  settings_active:       'Aktiv',
  settings_db_usda:      'USDA FoodData Central',
  settings_db_usda_desc: 'Generische & rohe Zutaten (Hähnchenbrust, Reis, Eier…). Kostenloser Schlüssel unter fdc.nal.usda.gov.',
  settings_db_bls:       'BLS — Bundeslebensmittelschlüssel',
  settings_db_bls_desc:  'Offizielle deutsche Lebensmitteldatenbank · 7.100 Lebensmittel · lokal gebündelt — kein Schlüssel erforderlich',
  settings_usda_key:     'USDA API-Schlüssel',
  settings_usda_ph:      'Leer lassen, um USDA zu überspringen',
  settings_usda_warn:    'Ohne Schlüssel wird nur OpenFoodFacts durchsucht.',
  settings_bls_key:      'BLS API-Schlüssel',
  settings_bls_ph:       'Leer lassen, um BLS zu überspringen',
  settings_ai:           'KI-Bildanalyse',
  settings_ai_desc:      'Für die KI-Kamerafunktion erforderlich. Kostenloser Schlüssel unter aistudio.google.com → API-Schlüssel abrufen.',
  settings_gemini_key:   'Gemini API-Schlüssel',
  settings_gemini_ph:    'AIza…',
  settings_gemini_model: 'Gemini Modell',
  settings_gemini_note:  'Nur auf diesem Gerät gespeichert. Wird nur an die Google-API gesendet.',
  settings_language:     'Sprache',
  settings_save:         'Einstellungen speichern',
  settings_saved:        '✓ Gespeichert!',
  settings_about:        'Über die App',
  settings_about_line1:  'Food Tracker — alle Daten werden auf deinem Gerät gespeichert',
  settings_about_line2:  'Verpackte Lebensmittel: OpenFoodFacts (offene Daten)',
  settings_about_line3:  'Generische Zutaten: USDA FoodData Central',
  settings_about_line4:  'Deutsche Zutaten: BLS über naehrwerte.io',
  settings_about_line5:  'KI-Analyse: Google Gemini',
  settings_unit_kcal:    'kcal',
  settings_unit_g:       'g',
}

const translations: Record<Lang, typeof en> = { en, de: de as typeof en }

// ─── Context ──────────────────────────────────────────────────────────────────

type TFunc = typeof en

interface I18nContext {
  lang: Lang
  setLang: (l: Lang) => void
  t: TFunc
}

const Ctx = createContext<I18nContext>({ lang: 'en', setLang: () => {}, t: en })

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en')

  useEffect(() => {
    getSetting('language').then(v => {
      if (v === 'de' || v === 'en') setLangState(v)
    })
  }, [])

  async function setLang(l: Lang) {
    setLangState(l)
    await setSetting('language', l)
  }

  return (
    <Ctx.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </Ctx.Provider>
  )
}

export function useI18n() {
  return useContext(Ctx)
}
