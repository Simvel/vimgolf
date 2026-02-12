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
  CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
`);

// Migration: Add start_time to sessions if checks missing
try {
  db.exec('ALTER TABLE sessions ADD COLUMN start_time DATETIME');
} catch (e) {
  if (!e.message.includes('duplicate column')) {
    // Ignore if exists, otherwise log
    // console.log('Note: start_time column might already exist or partial migration', e.message);
  }
}

// Cleanup task: Remove expired sessions
const cleanupExpiredSessions = () => {
  try {
    const now = new Date().toISOString();
    // Only delete sessions that have expired. 
    // Note: If scores reference these sessions, this might violate FK constraints if enabled,
    // but better-sqlite3 defaults to FKs disabled unless PRAGMA foreign_keys = ON is set.
    // Also, we generally want to remove old session data to keep the DB size manageable.
    const result = db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now);
    if (result.changes > 0) {
      console.log(`🧹 Cleaned up ${result.changes} expired sessions`);
    }
  } catch (error) {
    console.error('Error cleaning up sessions:', error);
  }
};

// Run cleanup on startup and then periodically every 10 minutes
cleanupExpiredSessions();
setInterval(cleanupExpiredSessions, 10 * 60 * 1000);

export default db;
