const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../auth');

router.use(verifyToken);

// GET /api/activity?date=YYYY-MM-DD
router.get('/', (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const entries = db.prepare(
    'SELECT * FROM activity_entries WHERE user_id = ? AND date = ? ORDER BY created_at ASC'
  ).all(req.userId, date);

  const totalActiveCalories = entries.reduce((sum, e) => sum + (e.active_calories || 0), 0);
  const totalSteps = entries.reduce((sum, e) => sum + (e.steps || 0), 0);

  res.json({ entries, totals: { active_calories: totalActiveCalories, steps: totalSteps } });
});

// POST /api/activity — add single manual entry
router.post('/', (req, res) => {
  const { date, name, active_calories, steps, duration_min, type } = req.body;
  if (!active_calories && !steps) {
    return res.status(400).json({ error: 'active_calories oder steps erforderlich' });
  }
  const entryDate = date || new Date().toISOString().slice(0, 10);
  const result = db.prepare(
    `INSERT INTO activity_entries (user_id, date, source, type, name, active_calories, steps, duration_min)
     VALUES (?, ?, 'manual', ?, ?, ?, ?, ?)`
  ).run(req.userId, entryDate, type || 'workout', name || 'Aktivität', active_calories || 0, steps || 0, duration_min || 0);

  res.json({ id: result.lastInsertRowid, message: 'Aktivität hinzugefügt' });
});

// POST /api/activity/import — bulk import from Apple Health
router.post('/import', (req, res) => {
  const { entries } = req.body;
  if (!Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ error: 'Keine Einträge übergeben' });
  }

  // Collect unique dates from incoming entries, delete existing apple_health entries for those dates
  const dates = [...new Set(entries.map(e => e.date))];
  const deletePlaceholders = dates.map(() => '?').join(',');
  db.prepare(
    `DELETE FROM activity_entries WHERE user_id = ? AND source = 'apple_health' AND date IN (${deletePlaceholders})`
  ).run(req.userId, ...dates);

  const insert = db.prepare(
    `INSERT INTO activity_entries (user_id, date, source, type, name, active_calories, steps, duration_min)
     VALUES (?, ?, 'apple_health', ?, ?, ?, ?, ?)`
  );

  const insertMany = db.transaction((rows) => {
    for (const e of rows) {
      insert.run(
        req.userId,
        e.date,
        e.type || 'active_energy',
        e.name || 'Apple Health',
        e.active_calories || 0,
        e.steps || 0,
        e.duration_min || 0
      );
    }
  });

  insertMany(entries);
  res.json({ message: `${entries.length} Einträge importiert`, count: entries.length });
});

// DELETE /api/activity/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare(
    'DELETE FROM activity_entries WHERE id = ? AND user_id = ?'
  ).run(req.params.id, req.userId);

  if (result.changes === 0) return res.status(404).json({ error: 'Nicht gefunden' });
  res.json({ message: 'Gelöscht' });
});

module.exports = router;
