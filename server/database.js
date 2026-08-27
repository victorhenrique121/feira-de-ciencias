const Database = require('better-sqlite3');
const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'terceirao.db');
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS quiz_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    activity_id INTEGER NOT NULL,
    score INTEGER NOT NULL,
    total INTEGER NOT NULL,
    correct_answers INTEGER NOT NULL,
    wrong_answers INTEGER NOT NULL,
    percentage REAL NOT NULL,
    time_seconds INTEGER,
    would_invest TEXT CHECK (would_invest IN ('sim', 'nao', 'talvez')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE RESTRICT
  );

  CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_date
    ON quiz_attempts(user_id, created_at DESC);

  CREATE TABLE IF NOT EXISTS rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,
    file_path TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    reward_id INTEGER NOT NULL,
    unlocked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, reward_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reward_id) REFERENCES rewards(id) ON DELETE CASCADE
  );
`);

const columns = db.prepare(`PRAGMA table_info(quiz_attempts)`).all();
if (!columns.some((column) => column.name === 'would_invest')) {
  db.exec(`ALTER TABLE quiz_attempts ADD COLUMN would_invest TEXT CHECK (would_invest IN ('sim', 'nao', 'talvez'))`);
}

db.prepare(`INSERT OR IGNORE INTO activities (slug, name, type) VALUES (?, ?, ?)`).run(
  'quiz-energia-solar', 'Quiz de Energia Solar', 'quiz'
);

db.prepare(`INSERT OR IGNORE INTO rewards (slug, name, description, type, file_path) VALUES (?, ?, ?, ?, ?)`).run(
  'ebook-energia-sustentavel',
  'E-book Energia Sustentável',
  'Guia educativo sobre energia solar, sustentabilidade e consumo consciente.',
  'ebook',
  '/ebook/energia-sustentavel.html'
);

function findUserById(id) {
  return db.prepare(`SELECT id, name, email, created_at FROM users WHERE id = ?`).get(id);
}

function findUserByEmail(email) {
  if (!email) return undefined;
  return db.prepare(`SELECT id, name, email, created_at FROM users WHERE email = ?`).get(email.toLowerCase());
}

function createOrUpdateUser(name, email) {
  const cleanName = String(name || '').trim().slice(0, 60);
  const cleanEmail = String(email || '').trim().toLowerCase().slice(0, 120) || null;
  if (cleanName.length < 2) throw new Error('Nome inválido.');

  if (cleanEmail) {
    const existing = findUserByEmail(cleanEmail);
    if (existing) {
      db.prepare(`UPDATE users SET name = ? WHERE id = ?`).run(cleanName, existing.id);
      return findUserById(existing.id);
    }
  }

  const result = db.prepare(`INSERT INTO users (name, email) VALUES (?, ?)`).run(cleanName, cleanEmail);
  return findUserById(result.lastInsertRowid);
}

function unlockEbook(userId) {
  const reward = db.prepare(`SELECT id, slug, name, description, type, file_path FROM rewards WHERE slug = 'ebook-energia-sustentavel'`).get();
  if (!reward) return null;
  db.prepare(`INSERT OR IGNORE INTO user_rewards (user_id, reward_id) VALUES (?, ?)`).run(userId, reward.id);
  return reward;
}

function saveQuizAttempt({ userId, score, total, timeSeconds, wouldInvest }) {
  const user = findUserById(userId);
  if (!user) throw new Error('Usuário não encontrado.');

  const safeTotal = Math.floor(Number(total));
  const safeScore = Math.max(0, Math.min(safeTotal, Math.floor(Number(score))));
  if (!Number.isInteger(safeTotal) || safeTotal <= 0 || !Number.isInteger(safeScore)) {
    throw new Error('Pontuação inválida.');
  }

  const allowedInvestments = new Set(['sim', 'nao', 'talvez']);
  const safeWouldInvest = allowedInvestments.has(wouldInvest) ? wouldInvest : null;
  const correctAnswers = safeScore;
  const wrongAnswers = safeTotal - safeScore;
  const percentage = Number(((safeScore / safeTotal) * 100).toFixed(2));
  const safeTime = Number.isInteger(timeSeconds) && timeSeconds >= 0 ? Math.min(timeSeconds, 86400) : null;

  const activity = db.prepare(`SELECT id FROM activities WHERE slug = 'quiz-energia-solar'`).get();
  const result = db.prepare(`INSERT INTO quiz_attempts (user_id, activity_id, score, total, correct_answers, wrong_answers, percentage, time_seconds, would_invest) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    userId, activity.id, safeScore, safeTotal, correctAnswers, wrongAnswers, percentage, safeTime, safeWouldInvest
  );

  const reward = percentage >= 70 ? unlockEbook(userId) : null;

  return {
    id: result.lastInsertRowid,
    score: safeScore,
    total: safeTotal,
    correctAnswers,
    wrongAnswers,
    percentage,
    timeSeconds: safeTime,
    wouldInvest: safeWouldInvest,
    rewardUnlocked: Boolean(reward),
    reward
  };
}

function updateLatestQuizInvestment(userId, wouldInvest) {
  const allowed = new Set(['sim', 'nao', 'talvez']);
  if (!allowed.has(wouldInvest)) throw new Error('Resposta de investimento inválida.');
  const latest = db.prepare(`SELECT id FROM quiz_attempts WHERE user_id = ? ORDER BY datetime(created_at) DESC, id DESC LIMIT 1`).get(userId);
  if (!latest) throw new Error('Nenhum quiz concluído foi encontrado para este usuário.');
  db.prepare(`UPDATE quiz_attempts SET would_invest = ? WHERE id = ?`).run(wouldInvest, latest.id);
  return db.prepare(`SELECT id, would_invest FROM quiz_attempts WHERE id = ?`).get(latest.id);
}

module.exports = {
  db,
  findUserById,
  findUserByEmail,
  createOrUpdateUser,
  unlockEbook,
  saveQuizAttempt,
  updateLatestQuizInvestment
};
