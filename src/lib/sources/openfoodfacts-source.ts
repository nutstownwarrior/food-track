import { searchFoods, lookupBarcode } from '../openfoodfacts'
import type { FoodSource, FoodResult } from '../search'

export const offSource: FoodSource = {
  id: 'openfoodfacts',
  label: 'OpenFoodFacts',
  requiresApiKey: false,

  async search(query, _apiKey, language): Promise<FoodResult[]> {
    const products = await searchFoods(query, 1, language)
    return products.map(p => ({
      key: `off:${p.id || p.barcode || p.name}`,
      name: p.name,
      brand: p.brand,
      calories_per_100g: p.calories_per_100g,
      protein_per_100g: p.protein_per_100g,
      carbs_per_100g: p.carbs_per_100g,
      fat_per_100g: p.fat_per_100g,
      barcode: p.barcode,
      source: 'openfoodfacts',
      sourceLabel: 'OpenFoodFacts',
    }))
  },

  async lookupBarcode(barcode, _apiKey, language): Promise<FoodResult | null> {
    const p = await lookupBarcode(barcode, language)
    if (!p) return null
    return {
      key: `off:${p.barcode}`,
      name: p.name,
      brand: p.brand,
      calories_per_100g: p.calories_per_100g,
      protein_per_100g: p.protein_per_100g,
      carbs_per_100g: p.carbs_per_100g,
      fat_per_100g: p.fat_per_100g,
      barcode: p.barcode,
      source: 'openfoodfacts',
      sourceLabel: 'OpenFoodFacts',
    }
  },
}
