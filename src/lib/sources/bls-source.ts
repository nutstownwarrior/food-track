/**
 * BLS 4.0 — Bundeslebensmittelschlüssel
 * CC BY 4.0 · Max Rubner-Institut · blsdb.de
 *
 * Data is bundled as /public/bls-data.json (generated from the official
 * BLS 4.0 Excel). No API key required — search runs entirely offline.
 *
 * JSON format: { v: 1, foods: [name_de, name_en, kcal, protein, fat, carbs][] }
 */

import type { FoodSource, FoodResult } from '../search'
import { scoreAgainstQuery } from '../fuzzy'

type BlsRow = [string, string, number, number, number, number]

let cache: BlsRow[] | null = null

async function loadData(): Promise<BlsRow[]> {
  if (cache) return cache
  const res = await fetch('/food-track/bls-data.json')
  if (!res.ok) throw new Error('Could not load BLS data')
  const json = await res.json() as { v: number; foods: BlsRow[] }
  cache = json.foods
  return cache
}

function toResult(row: BlsRow): FoodResult {
  const [name_de, name_en, kcal, protein, fat, carbs] = row
  return {
    key: `bls:${name_de}`,
    name: name_de,
    brand: name_en ? name_en : undefined,   // show EN name as subtitle via brand field
    calories_per_100g: kcal,
    protein_per_100g:  protein,
    carbs_per_100g:    carbs,
    fat_per_100g:      fat,
    source: 'bls',
    sourceLabel: 'BLS',
  }
}

export const blsSource: FoodSource = {
  id: 'bls',
  label: 'BLS (Deutschland)',
  requiresApiKey: false,   // bundled — no key needed

  async search(query, _apiKey, language): Promise<FoodResult[]> {
    const foods = await loadData()
    // Search German names when language is DE (or unset), English names for EN
    const nameIdx = language === 'en' ? 1 : 0

    const scored: { row: BlsRow; score: number }[] = []
    for (const row of foods) {
      const score = scoreAgainstQuery(query, row[nameIdx])
      if (score > 0) scored.push({ row, score })
    }

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 25)
      .map(({ row }) => toResult(row))
  },
}
