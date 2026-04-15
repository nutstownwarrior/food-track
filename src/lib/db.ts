import Dexie, { type EntityTable } from 'dexie'

export interface Food {
  id?: number
  name: string
  brand?: string
  calories_per_100g: number
  protein_per_100g: number
  carbs_per_100g: number
  fat_per_100g: number
  barcode?: string
  source: 'custom' | 'openfoodfacts'
  created_at: number
}

export interface LogEntry {
  id?: number
  food_id?: number
  // Snapshot fields so log is self-contained even if food is deleted
  food_name: string
  brand?: string
  calories_per_100g: number
  protein_per_100g: number
  carbs_per_100g: number
  fat_per_100g: number
  quantity_g: number
  // Derived (stored for fast querying)
  calories: number
  protein: number
  carbs: number
  fat: number
  date: string  // ISO "YYYY-MM-DD"
  logged_at: number  // timestamp
  source: 'manual' | 'search' | 'ai'
  ai_note?: string
}

export interface Settings {
  key: string
  value: string | number
}

export const DEFAULT_GOALS = {
  calories: 2000,
  protein: 150,
  carbs: 200,
  fat: 65,
}

class FoodTrackDB extends Dexie {
  foods!: EntityTable<Food, 'id'>
  logs!: EntityTable<LogEntry, 'id'>
  settings!: EntityTable<Settings, 'key'>

  constructor() {
    super('FoodTrackDB')
    this.version(1).stores({
      foods: '++id, name, barcode, source',
      logs: '++id, date, logged_at',
      settings: 'key',
    })
  }
}

export const db = new FoodTrackDB()

// Settings helpers
export async function getSetting(key: string): Promise<string | number | undefined> {
  const row = await db.settings.get(key)
  return row?.value
}

export async function setSetting(key: string, value: string | number): Promise<void> {
  await db.settings.put({ key, value })
}

export async function getGoals() {
  const [calories, protein, carbs, fat] = await Promise.all([
    getSetting('goal_calories'),
    getSetting('goal_protein'),
    getSetting('goal_carbs'),
    getSetting('goal_fat'),
  ])
  return {
    calories: Number(calories ?? DEFAULT_GOALS.calories),
    protein: Number(protein ?? DEFAULT_GOALS.protein),
    carbs: Number(carbs ?? DEFAULT_GOALS.carbs),
    fat: Number(fat ?? DEFAULT_GOALS.fat),
  }
}

export async function getGeminiKey(): Promise<string> {
  return String((await getSetting('gemini_api_key')) ?? '')
}

// Log helpers
export function calcMacros(entry: Pick<LogEntry, 'calories_per_100g' | 'protein_per_100g' | 'carbs_per_100g' | 'fat_per_100g' | 'quantity_g'>) {
  const f = entry.quantity_g / 100
  return {
    calories: Math.round(entry.calories_per_100g * f),
    protein: Math.round(entry.protein_per_100g * f * 10) / 10,
    carbs: Math.round(entry.carbs_per_100g * f * 10) / 10,
    fat: Math.round(entry.fat_per_100g * f * 10) / 10,
  }
}

export function todayString() {
  return new Date().toISOString().slice(0, 10)
}

export async function addLogEntry(
  food: Omit<LogEntry, 'id' | 'calories' | 'protein' | 'carbs' | 'fat' | 'date' | 'logged_at'>
): Promise<number> {
  const macros = calcMacros(food)
  return db.logs.add({
    ...food,
    ...macros,
    date: todayString(),
    logged_at: Date.now(),
  }) as Promise<number>
}

export async function getLogsForDate(date: string): Promise<LogEntry[]> {
  return db.logs.where('date').equals(date).sortBy('logged_at')
}

export async function exportAllData(): Promise<string> {
  const [foods, logs, settings] = await Promise.all([
    db.foods.toArray(),
    db.logs.toArray(),
    db.settings.toArray(),
  ])
  return JSON.stringify({ foods, logs, settings }, null, 2)
}

export async function resetDatabase(): Promise<void> {
  await Promise.all([
    db.foods.clear(),
    db.logs.clear(),
  ])
}
