const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();

// GET /api/food?date=YYYY-MM-DD
router.get('/', requireAuth, (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const entries = db.prepare(
    'SELECT * FROM food_entries WHERE user_id = ? AND date = ? ORDER BY created_at'
  ).all(req.userId, date);

  const totals = entries.reduce((acc, e) => ({
    calories: acc.calories + e.calories,
    protein_g: acc.protein_g + (e.protein_g || 0),
    carbs_g: acc.carbs_g + (e.carbs_g || 0),
    fat_g: acc.fat_g + (e.fat_g || 0),
  }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });

  res.json({ entries, totals, date });
});

// POST /api/food
router.post('/', requireAuth, (req, res) => {
  const { name, calories, protein_g, carbs_g, fat_g, ai_detected, date } = req.body;
  if (!name || calories == null) {
    return res.status(400).json({ error: 'Name und Kalorien sind erforderlich' });
  }
  const entryDate = date || new Date().toISOString().slice(0, 10);
  const stmt = db.prepare(
    'INSERT INTO food_entries (user_id, date, name, calories, protein_g, carbs_g, fat_g, ai_detected) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const result = stmt.run(
    req.userId, entryDate, name, Math.round(calories),
    protein_g || 0, carbs_g || 0, fat_g || 0, ai_detected ? 1 : 0
  );
  const entry = db.prepare('SELECT * FROM food_entries WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(entry);
});

// DELETE /api/food/:id
router.delete('/:id', requireAuth, (req, res) => {
  const result = db.prepare(
    'DELETE FROM food_entries WHERE id = ? AND user_id = ?'
  ).run(req.params.id, req.userId);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Eintrag nicht gefunden' });
  }
  res.json({ success: true });
});

module.exports = router;
