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
  search(query: string, apiKey?: string): Promise<FoodResult[]>
  lookupBarcode?(barcode: string, apiKey?: string): Promise<FoodResult | null>
}

// ─── Source registry ──────────────────────────────────────────────────────────

import { offSource } from './sources/openfoodfacts-source'
import { usdaSource } from './sources/usda-source'
// To add BLS later:  import { blsSource } from './sources/bls-source'

const ALL_SOURCES: FoodSource[] = [
  offSource,
  usdaSource,
  // blsSource,
]

export function getAllSources(): FoodSource[] {
  return ALL_SOURCES
}

// ─── Unified search ───────────────────────────────────────────────────────────

export interface SearchOptions {
  /** Map of sourceId → apiKey */
  apiKeys?: Record<string, string>
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
      return source.search(query, key)
    })
  )

  const flat = settled.flatMap(r => (r.status === 'fulfilled' ? r.value : []))
  return rankResults(flat, query)
}

/**
 * Score a food name against the query so that closer matches sort first.
 *
 * USDA names are in inverted form: "Apples, Raw, Without Skin"
 * The primary food concept is always before the first comma, so we extract
 * and score that separately at a higher tier.
 *
 * Score tiers (higher = better):
 *  50  exact match (whole name or primary term)
 *  40  primary term exactly equals query (e.g. "Apples, Raw" for "apple")
 *  30  primary term starts with query word ("Apple Juice" primary = "apple juice")
 *  20  query is a whole word at the start of the full name
 *  10  query is a whole word anywhere in the full name
 *   0  substring fallback
 */
function scoreResult(name: string, query: string): number {
  const n = name.toLowerCase().trim()
  const q = query.toLowerCase().trim()

  // Primary term = everything before the first comma ("Apples" from "Apples, Raw, ...")
  const primary = n.split(',')[0].trim()

  // Basic stemmer: apple↔apples, berry↔berries, etc.
  const stem = (s: string) => s.replace(/ies\b/, 'y').replace(/s\b/, '')
  const qStem = stem(q)

  const exactMatch  = (s: string) => s === q || stem(s) === qStem
  const prefixMatch = (s: string) => s.startsWith(q + ' ') || s.startsWith(q + ',') || stem(s).startsWith(qStem + ' ')
  const wordMatch   = (s: string) => new RegExp(`\\b${escRe(q)}(s|es|ies)?\\b`).test(s)
  const startMatch  = (s: string) => new RegExp(`^${escRe(q)}`).test(s)

  if (exactMatch(n) || exactMatch(primary)) return 50
  if (prefixMatch(primary) || startMatch(primary) && wordMatch(primary)) return 40
  if (prefixMatch(n) || startMatch(n)) return 30
  if (wordMatch(primary)) return 20
  if (wordMatch(n)) return 10
  return 0
}

function escRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function rankResults(results: FoodResult[], query: string): FoodResult[] {
  return [...results].sort((a, b) => {
    const diff = scoreResult(b.name, query) - scoreResult(a.name, query)
    if (diff !== 0) return diff
    // Within the same tier: shorter names first (more generic)
    return a.name.length - b.name.length
  })
}

export async function lookupBarcodeAll(barcode: string, options: SearchOptions = {}): Promise<FoodResult | null> {
  for (const source of ALL_SOURCES) {
    if (!source.lookupBarcode) continue
    const key = options.apiKeys?.[source.id]
    if (source.requiresApiKey && !key) continue
    try {
      const result = await source.lookupBarcode(barcode, key)
      if (result) return result
    } catch {
      // try next source
    }
  }
  return null
}
