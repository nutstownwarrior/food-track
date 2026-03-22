const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();

// GET /api/weight — last 30 entries
router.get('/', requireAuth, (req, res) => {
  const entries = db.prepare(
    'SELECT * FROM weight_log WHERE user_id = ? ORDER BY logged_at DESC LIMIT 30'
  ).all(req.userId);
  res.json(entries);
});

// POST /api/weight
router.post('/', requireAuth, (req, res) => {
  const { weight_kg, logged_at } = req.body;
  if (!weight_kg || weight_kg <= 0) {
    return res.status(400).json({ error: 'Ungültiges Gewicht' });
  }
  const date = logged_at || new Date().toISOString().slice(0, 10);
  const result = db.prepare(
    'INSERT INTO weight_log (user_id, weight_kg, logged_at) VALUES (?, ?, ?)'
  ).run(req.userId, weight_kg, date);

  // Update current weight in profile
  db.prepare('UPDATE user_profiles SET weight_kg = ?, updated_at = datetime(\'now\') WHERE user_id = ?')
    .run(weight_kg, req.userId);

  const entry = db.prepare('SELECT * FROM weight_log WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(entry);
});

// DELETE /api/weight/:id
router.delete('/:id', requireAuth, (req, res) => {
  const result = db.prepare(
    'DELETE FROM weight_log WHERE id = ? AND user_id = ?'
  ).run(req.params.id, req.userId);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Eintrag nicht gefunden' });
  }
  res.json({ success: true });
});

module.exports = router;
