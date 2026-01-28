import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = process.env.DB_PATH || join(__dirname, 'vimgolf.db');
const db = new Database(dbPath);

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    challenge_id INTEGER NOT NULL,
    variation_seed INTEGER NOT NULL,
    initial_content TEXT NOT NULL,
    target_content TEXT NOT NULL,
    variation_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL
  );

  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    challenge_id INTEGER NOT NULL,
    player_name TEXT NOT NULL,
    time_ms INTEGER NOT NULL,
    keystrokes INTEGER NOT NULL,
    keystroke_data TEXT NOT NULL,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
  );

  CREATE INDEX IF NOT EXISTS idx_scores_challenge ON scores(challenge_id);
  CREATE INDEX IF NOT EXISTS idx_scores_time ON scores(time_ms);
`);

export default db;
