import type { FoodSource, FoodResult } from '../search'

const API_BASE = 'https://api.nal.usda.gov/fdc/v1'

// Nutrient IDs in the USDA FDC schema
const NUTRIENT = {
  CALORIES: 1008,
  PROTEIN:  1003,
  CARBS:    1005,
  FAT:      1004,
} as const

interface UsdaNutrient {
  nutrientId: number
  value: number
}

interface UsdaFood {
  fdcId: number
  description: string
  brandOwner?: string
  dataType: string
  foodNutrients: UsdaNutrient[]
}

function parseFood(f: UsdaFood): FoodResult | null {
  const get = (id: number) => f.foodNutrients.find(n => n.nutrientId === id)?.value ?? 0
  const calories = get(NUTRIENT.CALORIES)
  if (!calories) return null

  return {
    key: `usda:${f.fdcId}`,
    name: toTitleCase(f.description),
    brand: f.brandOwner || undefined,
    calories_per_100g: Math.round(calories),
    protein_per_100g: Math.round(get(NUTRIENT.PROTEIN) * 10) / 10,
    carbs_per_100g:   Math.round(get(NUTRIENT.CARBS)   * 10) / 10,
    fat_per_100g:     Math.round(get(NUTRIENT.FAT)     * 10) / 10,
    source: 'usda',
    sourceLabel: 'USDA',
  }
}

/** USDA descriptions are ALL CAPS — convert to Title Case for display */
function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

export const usdaSource: FoodSource = {
  id: 'usda',
  label: 'USDA FoodData Central',
  requiresApiKey: true,

  async search(query, apiKey, _language): Promise<FoodResult[]> {
    if (!apiKey) return []

    const url = new URL(`${API_BASE}/foods/search`)
    url.searchParams.set('query', query)
    url.searchParams.set('api_key', apiKey)
    // Foundation + SR Legacy = raw/generic ingredients; skip Branded (OFF covers that)
    url.searchParams.set('dataType', 'Foundation,SR Legacy')
    url.searchParams.set('pageSize', '15')
    url.searchParams.set('nutrients', Object.values(NUTRIENT).join(','))

    const res = await fetch(url.toString())
    if (!res.ok) throw new Error(`USDA search failed: ${res.status}`)

    const data = await res.json() as { foods?: UsdaFood[] }
    return (data.foods ?? []).map(parseFood).filter(Boolean) as FoodResult[]
  },
}

// ─── Placeholder for BLS (German Bundeslebensmittelschlüssel) ─────────────────
// When ready, create src/lib/sources/bls-source.ts implementing FoodSource and
// register it in src/lib/search.ts. The interface is identical — only the fetch
// logic and API key setting name differ.
//
// export const blsSource: FoodSource = {
//   id: 'bls',
//   label: 'BLS (Deutschland)',
//   requiresApiKey: true,
//   async search(query, apiKey) { ... }
// }
