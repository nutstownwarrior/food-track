/**
 * Unified food search abstraction.
 *
 * Each data source implements FoodSource. To add BLS or any other database
 * later, create a new module that satisfies FoodSource and register it in
 * getActiveSources().
 */

export interface FoodResult {
  /** Unique key scoped to the source, e.g. "usda:123456" */
  key: string
  name: string
  brand?: string
  calories_per_100g: number
  protein_per_100g: number
  carbs_per_100g: number
  fat_per_100g: number
  barcode?: string
  source: string
  /** Human-readable label shown in the UI, e.g. "USDA" or "OpenFoodFacts" */
  sourceLabel: string
}

export interface FoodSource {
  id: string
  label: string
  /** Whether this source needs an API key to function */
  requiresApiKey: boolean
  search(query: string, apiKey?: string, language?: 'en' | 'de'): Promise<FoodResult[]>
  lookupBarcode?(barcode: string, apiKey?: string, language?: 'en' | 'de'): Promise<FoodResult | null>
}

// ─── Source registry ──────────────────────────────────────────────────────────

import { offSource } from './sources/openfoodfacts-source'
import { usdaSource } from './sources/usda-source'
import { blsSource } from './sources/bls-source'

const ALL_SOURCES: FoodSource[] = [
  offSource,
  usdaSource,
  blsSource,
]

export function getAllSources(): FoodSource[] {
  return ALL_SOURCES
}

// ─── Unified search ───────────────────────────────────────────────────────────

export interface SearchOptions {
  /** Map of sourceId → apiKey */
  apiKeys?: Record<string, string>
  /** UI language — passed to sources that support localised results */
  language?: 'en' | 'de'
}

/**
 * Query all sources in parallel. Results from sources that error are silently
 * dropped so a single broken source never blocks the UI.
 * Results are ranked so exact/prefix matches appear before "contains" matches.
 */
export async function searchAll(query: string, options: SearchOptions = {}): Promise<FoodResult[]> {
  const settled = await Promise.allSettled(
    ALL_SOURCES.map(source => {
      const key = options.apiKeys?.[source.id]
      if (source.requiresApiKey && !key) return Promise.resolve([])
      return source.search(query, key, options.language)
    })
  )

  const flat = settled.flatMap(r => (r.status === 'fulfilled' ? r.value : []))
  return rankResults(flat, query)
}

import { scoreAgainstQuery } from './fuzzy'

function rankResults(results: FoodResult[], query: string): FoodResult[] {
  // BLS results are already sorted by the local scorer; re-score everything
  // so that API results (USDA, OFF) are also ranked consistently.
  return [...results]
    .map(r => ({ r, score: scoreAgainstQuery(query, r.name) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ r }) => r)
}

export async function lookupBarcodeAll(barcode: string, options: SearchOptions = {}): Promise<FoodResult | null> {
  for (const source of ALL_SOURCES) {
    if (!source.lookupBarcode) continue
    const key = options.apiKeys?.[source.id]
    if (source.requiresApiKey && !key) continue
    try {
      const result = await source.lookupBarcode(barcode, key, options.language)
      if (result) return result
    } catch {
      // try next source
    }
  }
  return null
}
