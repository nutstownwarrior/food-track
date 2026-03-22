const express = require('express');
const { GoogleGenAI } = require('@google/genai');
const { requireAuth } = require('../auth');

const router = express.Router();

// POST /api/ai/analyze
router.post('/analyze', requireAuth, async (req, res) => {
  const { image, mimeType } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'Kein Bild übermittelt' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'KI-Dienst nicht konfiguriert (GEMINI_API_KEY fehlt)' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{
        parts: [
          {
            inlineData: {
              mimeType: mimeType || 'image/jpeg',
              data: image,
            }
          },
          {
            text: `Du bist ein Ernährungsexperte. Analysiere das Bild und schätze den Nährwert der abgebildeten Mahlzeit.

Antworte NUR mit einem JSON-Objekt — kein Text davor oder danach:
{"name": "Kurze Beschreibung auf Deutsch", "calories": 450, "protein_g": 25, "carbs_g": 40, "fat_g": 15}

Hinweise:
- "calories" ist die Gesamtkalorienzahl der sichtbaren Portion
- Schätze die Portionsgröße anhand typischer Mahlzeiten
- Wenn kein Essen erkennbar ist: {"error": "Kein Essen erkannt"}
- Wenn mehrere Gerichte: kombiniere alle zu einem Objekt`
          }
        ]
      }]
    });

    const text = response.text;

    // Extract JSON from response (may have markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(422).json({ error: 'KI konnte das Bild nicht analysieren' });
    }

    const result = JSON.parse(jsonMatch[0]);

    if (result.error) {
      return res.status(422).json({ error: result.error });
    }

    res.json({
      name: result.name || 'Unbekannte Mahlzeit',
      calories: Math.round(result.calories || 0),
      protein_g: Math.round((result.protein_g || 0) * 10) / 10,
      carbs_g: Math.round((result.carbs_g || 0) * 10) / 10,
      fat_g: Math.round((result.fat_g || 0) * 10) / 10,
    });
  } catch (err) {
    console.error('Gemini API error:', err.message);
    res.status(500).json({ error: 'KI-Analyse fehlgeschlagen. Bitte erneut versuchen.' });
  }
});

module.exports = router;
