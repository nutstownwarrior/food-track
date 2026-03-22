const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const { generateToken } = require('../auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Benutzername und Passwort sind erforderlich' });
  }
  if (username.length < 3) {
    return res.status(400).json({ error: 'Benutzername muss mindestens 3 Zeichen haben' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Passwort muss mindestens 6 Zeichen haben' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const stmt = db.prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)');
    const result = stmt.run(username.toLowerCase(), email || null, passwordHash);
    const userId = result.lastInsertRowid;

    // Create empty profile
    db.prepare('INSERT OR IGNORE INTO user_profiles (user_id, display_name) VALUES (?, ?)').run(userId, username);

    const token = generateToken(userId);
    res.json({ token, username: username.toLowerCase() });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Benutzername bereits vergeben' });
    }
    res.status(500).json({ error: 'Registrierung fehlgeschlagen' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Benutzername und Passwort sind erforderlich' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
  }

  const token = generateToken(user.id);
  res.json({ token, username: user.username });
});

module.exports = router;
