const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/kalotrack.db');

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Schema migrations
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS user_profiles (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    display_name TEXT,
    gender TEXT CHECK(gender IN ('männlich','weiblich','divers')),
    birth_year INTEGER,
    height_cm REAL,
    weight_kg REAL,
    body_fat_pct REAL,
    activity_level TEXT DEFAULT 'sedentary',
    target_weight_kg REAL,
    weekly_goal_kg REAL DEFAULT 0.5,
    calorie_goal INTEGER,
    protein_goal_g INTEGER,
    bmr_formula TEXT DEFAULT 'mifflin',
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS weight_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    weight_kg REAL NOT NULL,
    logged_at TEXT DEFAULT (date('now'))
  );

  CREATE TABLE IF NOT EXISTS food_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    name TEXT NOT NULL,
    calories INTEGER NOT NULL,
    protein_g REAL DEFAULT 0,
    carbs_g REAL DEFAULT 0,
    fat_g REAL DEFAULT 0,
    ai_detected INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_food_entries_user_date ON food_entries(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_weight_log_user ON weight_log(user_id, logged_at);
`);

module.exports = db;
