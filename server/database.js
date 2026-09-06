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
    points INTEGER NOT NULL DEFAULT 0,
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
    points INTEGER NOT NULL DEFAULT 0,
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
    points_cost INTEGER NOT NULL DEFAULT 0,
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

const userColumns = db.prepare(`PRAGMA table_info(users)`).all();
if (!userColumns.some((column) => column.name === 'points')) {
  db.exec(`ALTER TABLE users ADD COLUMN points INTEGER NOT NULL DEFAULT 0`);
}

const attemptColumns = db.prepare(`PRAGMA table_info(quiz_attempts)`).all();
if (!attemptColumns.some((column) => column.name === 'would_invest')) {
  db.exec(`ALTER TABLE quiz_attempts ADD COLUMN would_invest TEXT CHECK (would_invest IN ('sim', 'nao', 'talvez'))`);
}
if (!attemptColumns.some((column) => column.name === 'points')) {
  db.exec(`ALTER TABLE quiz_attempts ADD COLUMN points INTEGER NOT NULL DEFAULT 0`);
}

const rewardColumns = db.prepare(`PRAGMA table_info(rewards)`).all();
if (!rewardColumns.some((column) => column.name === 'points_cost')) {
  db.exec(`ALTER TABLE rewards ADD COLUMN points_cost INTEGER NOT NULL DEFAULT 0`);
}

db.prepare(`INSERT OR IGNORE INTO activities (slug, name, type) VALUES (?, ?, ?)`).run(
  'quiz-energia-solar', 'Quiz de Energia Solar', 'quiz'
);

const rewards = [
  ['ebook-energia-sustentavel', 'E-book: Energia Sustentável', 'Guia educativo sobre energia solar, sustentabilidade e consumo consciente.', 'ebook', 300, '/ebook/energia-sustentavel.html'],
  ['planilha-payback-avancada', 'Planilha Avançada de Payback', 'Planilha para simular investimento, economia e retorno de sistemas solares.', 'planilha', 500, null],
  ['guia-paineis-solares', 'Guia de Painéis Solares', 'Material de apoio para comparar tecnologias e escolher painéis solares.', 'guia', 700, null],
  ['infografico-alta-resolucao', 'Infográfico em Alta Resolução', 'Infográfico visual com os principais conceitos de energia sustentável.', 'infografico', 900, null],
  ['ebook-carros-eletricos', 'E-book: Carros Elétricos', 'Conteúdo sobre mobilidade elétrica, eficiência e impacto ambiental.', 'ebook', 1200, null],
  ['certificado-especialista-digital', 'Certificado de Especialista Digital', 'Certificado digital pela conclusão da trilha de aprendizagem.', 'certificado', 1500, null],
  ['conteudo-secreto-projeto', 'Acesso Antecipado / Conteúdo Secreto do Projeto', 'Acesso antecipado a materiais exclusivos do Terceirão 2026.', 'acesso', 2000, null]
];

const saveReward = db.prepare(`INSERT OR IGNORE INTO rewards (slug, name, description, type, points_cost, file_path) VALUES (?, ?, ?, ?, ?, ?)`);
const updateReward = db.prepare(`UPDATE rewards SET name = ?, description = ?, type = ?, points_cost = ?, file_path = ? WHERE slug = ?`);
for (const [slug, name, description, type, pointsCost, filePath] of rewards) {
  saveReward.run(slug, name, description, type, pointsCost, filePath);
  updateReward.run(name, description, type, pointsCost, filePath, slug);
}

function findUserById(id) {
  return db.prepare(`SELECT id, name, email, points, created_at FROM users WHERE id = ?`).get(id);
}

function findUserByEmail(email) {
  if (!email) return undefined;
  return db.prepare(`SELECT id, name, email, points, created_at FROM users WHERE email = ?`).get(email.toLowerCase());
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
  const reward = db.prepare(`SELECT id, slug, name, description, type, points_cost, file_path FROM rewards WHERE slug = 'ebook-energia-sustentavel'`).get();
  if (!reward) return null;
  db.prepare(`INSERT OR IGNORE INTO user_rewards (user_id, reward_id) VALUES (?, ?)`).run(userId, reward.id);
  return reward;
}

function listRewardsForUser(userId) {
  const user = findUserById(userId);
  return db.prepare(`
    SELECT r.id, r.slug, r.name, r.description, r.type, r.points_cost, r.file_path,
      CASE WHEN ur.id IS NULL THEN 0 ELSE 1 END AS redeemed,
      ur.unlocked_at AS redeemed_at
    FROM rewards r
    LEFT JOIN user_rewards ur ON ur.reward_id = r.id AND ur.user_id = ?
    ORDER BY r.points_cost ASC, r.id ASC
  `).all(userId).map((reward) => ({
    ...reward,
    redeemed: Boolean(reward.redeemed),
    canRedeem: !reward.redeemed && user.points >= reward.points_cost
  }));
}

function redeemReward(userId, rewardId) {
  const transaction = db.transaction(() => {
    const user = findUserById(userId);
    if (!user) throw new Error('Usuário não encontrado.');
    const reward = db.prepare(`SELECT id, slug, name, description, type, points_cost, file_path FROM rewards WHERE id = ?`).get(rewardId);
    if (!reward) throw new Error('Recompensa não encontrada.');
    if (db.prepare(`SELECT id FROM user_rewards WHERE user_id = ? AND reward_id = ?`).get(userId, reward.id)) {
      throw new Error('Esta recompensa já foi resgatada.');
    }
    if (user.points < reward.points_cost) throw new Error('Pontos insuficientes para resgatar esta recompensa.');

    db.prepare(`UPDATE users SET points = points - ? WHERE id = ? AND points >= ?`).run(reward.points_cost, userId, reward.points_cost);
    const redemption = db.prepare(`INSERT INTO user_rewards (user_id, reward_id) VALUES (?, ?)`).run(userId, reward.id);
    return { reward, redemptionId: redemption.lastInsertRowid, user: findUserById(userId) };
  });
  return transaction();
}

function saveQuizAttempt({ userId, score, total, points, timeSeconds, wouldInvest }) {
  const user = findUserById(userId);
  if (!user) throw new Error('Usuário não encontrado.');

  const safeTotal = Math.floor(Number(total));
  const safeScore = Math.max(0, Math.min(safeTotal, Math.floor(Number(score))));
  const safePoints = Math.max(0, Math.floor(Number(points)));
  if (!Number.isInteger(safeTotal) || safeTotal <= 0 || !Number.isInteger(safeScore) || !Number.isInteger(safePoints)) {
    throw new Error('Pontuação inválida.');
  }

  const allowedInvestments = new Set(['sim', 'nao', 'talvez']);
  const safeWouldInvest = allowedInvestments.has(wouldInvest) ? wouldInvest : null;
  const correctAnswers = safeScore;
  const wrongAnswers = safeTotal - safeScore;
  const percentage = Number(((safeScore / safeTotal) * 100).toFixed(2));
  const safeTime = Number.isInteger(timeSeconds) && timeSeconds >= 0 ? Math.min(timeSeconds, 86400) : null;

  const activity = db.prepare(`SELECT id FROM activities WHERE slug = 'quiz-energia-solar'`).get();

  const transaction = db.transaction(() => {
    const result = db.prepare(`INSERT INTO quiz_attempts (user_id, activity_id, score, total, points, correct_answers, wrong_answers, percentage, time_seconds, would_invest) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      userId, activity.id, safeScore, safeTotal, safePoints, correctAnswers, wrongAnswers, percentage, safeTime, safeWouldInvest
    );

    db.prepare(`UPDATE users SET points = points + ? WHERE id = ?`).run(safePoints, userId);

    const updatedUser = findUserById(userId);

    return { result, reward: null, updatedUser };
  });

  const { result, reward, updatedUser } = transaction();

  return {
    id: result.lastInsertRowid,
    score: safeScore,
    total: safeTotal,
    points: safePoints,
    totalPoints: updatedUser.points,
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
  listRewardsForUser,
  redeemReward,
  saveQuizAttempt,
  updateLatestQuizInvestment
};
