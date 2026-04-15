export interface OFFProduct {
  id: string
  name: string
  brand?: string
  calories_per_100g: number
  protein_per_100g: number
  carbs_per_100g: number
  fat_per_100g: number
  barcode?: string
}

function parseProduct(p: Record<string, unknown>): OFFProduct | null {
  const nutriments = (p.nutriments ?? {}) as Record<string, unknown>
  const calories = Number(nutriments['energy-kcal_100g'] ?? nutriments['energy-kcal'] ?? 0)
  if (!calories) return null
  return {
    id: String(p.code ?? p.id ?? ''),
    name: String(p.product_name ?? p.product_name_en ?? ''),
    brand: String(p.brands ?? ''),
    calories_per_100g: calories,
    protein_per_100g: Number(nutriments.proteins_100g ?? 0),
    carbs_per_100g: Number(nutriments.carbohydrates_100g ?? 0),
    fat_per_100g: Number(nutriments.fat_100g ?? 0),
    barcode: String(p.code ?? ''),
  }
}

export async function searchFoods(query: string, page = 1): Promise<OFFProduct[]> {
  const url = new URL('https://world.openfoodfacts.org/cgi/search.pl')
  url.searchParams.set('search_terms', query)
  url.searchParams.set('search_simple', '1')
  url.searchParams.set('action', 'process')
  url.searchParams.set('json', '1')
  url.searchParams.set('page', String(page))
  url.searchParams.set('page_size', '20')
  url.searchParams.set('fields', 'code,product_name,product_name_en,brands,nutriments')

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error('OpenFoodFacts search failed')
  const data = await res.json() as { products?: Record<string, unknown>[] }
  return (data.products ?? []).map(parseProduct).filter(Boolean) as OFFProduct[]
}

export async function lookupBarcode(barcode: string): Promise<OFFProduct | null> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=code,product_name,product_name_en,brands,nutriments`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json() as { status: number; product?: Record<string, unknown> }
  if (data.status !== 1 || !data.product) return null
  return parseProduct({ ...data.product, code: barcode })
}
