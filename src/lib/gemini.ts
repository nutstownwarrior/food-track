export interface GeminiEstimate {
  name: string
  quantity_desc: string
  quantity_g: number
  calories_per_100g: number
  protein_per_100g: number
  carbs_per_100g: number
  fat_per_100g: number
}

export const DEFAULT_MODEL = 'gemini-3-flash-preview'
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta'

const IMAGE_PROMPTS: Record<string, string> = {
  en: `You are a nutrition expert. Analyse the food visible in the image.
For each distinct food item or dish, return a JSON array of objects with these exact keys:
- name (string): clear food name in English
- quantity_desc (string): portion description e.g. "1 medium apple", "200g rice"
- quantity_g (number): estimated weight in grams
- calories_per_100g (number): estimated kcal per 100g
- protein_per_100g (number): estimated protein grams per 100g
- carbs_per_100g (number): estimated carbohydrate grams per 100g
- fat_per_100g (number): estimated fat grams per 100g

Return ONLY the JSON array with no markdown, no code fences, no explanation.
Base your estimates on standard nutritional databases. Be conservative with portion sizes.`,

  de: `Du bist ein Ernährungsexperte. Analysiere die Lebensmittel auf dem Bild.
Gib für jedes erkennbare Lebensmittel oder Gericht ein JSON-Array mit folgenden Feldern zurück:
- name (string): klare Lebensmittelbezeichnung auf Deutsch
- quantity_desc (string): Portionsbeschreibung, z.B. "1 mittelgroßer Apfel", "200g Reis"
- quantity_g (number): geschätztes Gewicht in Gramm
- calories_per_100g (number): geschätzte kcal pro 100g
- protein_per_100g (number): geschätzte Proteinmenge in Gramm pro 100g
- carbs_per_100g (number): geschätzte Kohlenhydratmenge in Gramm pro 100g
- fat_per_100g (number): geschätzte Fettmenge in Gramm pro 100g

Gib NUR das JSON-Array zurück, ohne Markdown, ohne Code-Blöcke, ohne Erklärungen.
Stütze deine Schätzungen auf gängige Nährwertdatenbanken. Sei bei den Portionsgrößen eher konservativ.`,
}

const TEXT_PROMPTS: Record<string, string> = {
  en: `You are a nutrition expert. The user will describe what they ate in natural language.
Parse their description and return a JSON array of objects — one per distinct food item — with these exact keys:
- name (string): clear food name in English
- quantity_desc (string): portion description e.g. "1 medium apple", "200g cooked rice"
- quantity_g (number): weight in grams (use the amount stated, or estimate a typical serving if not given)
- calories_per_100g (number): kcal per 100g from standard nutritional databases
- protein_per_100g (number): protein grams per 100g
- carbs_per_100g (number): carbohydrate grams per 100g
- fat_per_100g (number): fat grams per 100g

Return ONLY the JSON array with no markdown, no code fences, no explanation.
If the user mentions a quantity (e.g. "150g chicken", "a bowl of oatmeal ~80g"), use it for quantity_g.
For unspecified quantities use typical portion sizes. Be conservative.`,

  de: `Du bist ein Ernährungsexperte. Der Nutzer beschreibt auf natürliche Weise, was er gegessen hat.
Analysiere die Beschreibung und gib ein JSON-Array zurück – ein Objekt pro Lebensmittel – mit diesen Feldern:
- name (string): Lebensmittelbezeichnung auf Deutsch
- quantity_desc (string): Portionsbeschreibung, z.B. "1 mittelgroßer Apfel", "200g gekochter Reis"
- quantity_g (number): Gewicht in Gramm (angegebene Menge verwenden, sonst typische Portion schätzen)
- calories_per_100g (number): kcal pro 100g laut Nährwertdatenbank
- protein_per_100g (number): Proteinmenge in Gramm pro 100g
- carbs_per_100g (number): Kohlenhydrate in Gramm pro 100g
- fat_per_100g (number): Fett in Gramm pro 100g

Gib NUR das JSON-Array zurück, ohne Markdown, ohne Code-Blöcke, ohne Erklärungen.
Falls der Nutzer eine Menge angibt (z.B. "150g Hähnchen"), diese für quantity_g verwenden.
Bei fehlenden Mengenangaben typische Portionsgrößen annehmen. Eher konservativ schätzen.`,
}

// keep old name as alias so CameraScreen import still works
const PROMPTS = IMAGE_PROMPTS

export async function estimateFromText(
  apiKey: string,
  userText: string,
  language = 'en',
  model = DEFAULT_MODEL
): Promise<GeminiEstimate[]> {
  if (!apiKey) throw new Error('No Gemini API key configured. Add it in Settings.')

  const systemPrompt = TEXT_PROMPTS[language] ?? TEXT_PROMPTS.en

  const body = {
    contents: [
      {
        parts: [
          { text: systemPrompt + '\n\nUser: ' + userText }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      response_mime_type: 'application/json',
    }
  }

  const res = await fetch(`${API_BASE}/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini API error ${res.status}: ${err}`)
  }

  const data = await res.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    error?: { message: string }
  }

  if (data.error) throw new Error(data.error.message)

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]'
  try {
    const parsed = JSON.parse(text)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    throw new Error('Could not parse Gemini response as JSON')
  }
}

export async function estimateFromImage(
  apiKey: string,
  imageBase64: string,
  mimeType: string,
  language = 'en',
  model = DEFAULT_MODEL
): Promise<GeminiEstimate[]> {
  if (!apiKey) throw new Error('No Gemini API key configured. Add it in Settings.')

  const systemPrompt = PROMPTS[language] ?? PROMPTS.en

  const body = {
    contents: [
      {
        parts: [
          { text: systemPrompt },
          { inline_data: { mime_type: mimeType, data: imageBase64 } }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      response_mime_type: 'application/json',
    }
  }

  const res = await fetch(`${API_BASE}/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini API error ${res.status}: ${err}`)
  }

  const data = await res.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    error?: { message: string }
  }

  if (data.error) throw new Error(data.error.message)

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]'
  try {
    const parsed = JSON.parse(text)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    throw new Error('Could not parse Gemini response as JSON')
  }
}

export function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const [header, base64] = result.split(',')
      const mimeType = header.replace('data:', '').replace(';base64', '')
      resolve({ base64, mimeType })
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
