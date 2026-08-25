const express = require('express');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');

const { db, findUserById, createOrUpdateUser, saveQuizAttempt, unlockEbook } = require('./server/database');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'energia_solar_site');
const OLD_DATA_FILE = path.join(__dirname, 'server', 'data', 'quiz-results.json');

app.use(express.json({ limit: '50kb' }));
app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));

function positiveInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

async function migrateOldResults() {
  if (!fsSync.existsSync(OLD_DATA_FILE)) return;
  try {
    const raw = await fs.readFile(OLD_DATA_FILE, 'utf8');
    const results = JSON.parse(raw);
    if (!Array.isArray(results) || !results.length) return;

    db.exec(`CREATE TABLE IF NOT EXISTS legacy_migrations (legacy_id TEXT PRIMARY KEY, migrated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
    const activity = db.prepare(`SELECT id FROM activities WHERE slug = 'quiz-energia-solar'`).get();
    const seen = db.prepare(`SELECT 1 FROM legacy_migrations WHERE legacy_id = ?`);
    const mark = db.prepare(`INSERT OR IGNORE INTO legacy_migrations (legacy_id) VALUES (?)`);
    const insert = db.prepare(`INSERT INTO quiz_attempts (user_id, activity_id, score, total, correct_answers, wrong_answers, percentage, time_seconds, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?)`);

    const migrate = db.transaction((items) => {
      for (const item of items) {
        const legacyId = String(item.id || `${item.nome || 'Visitante'}-${item.data || ''}-${item.score || 0}`);
        if (seen.get(legacyId)) continue;
        const user = createOrUpdateUser(item.nome || 'Visitante', null);
        const total = Math.max(0, Math.floor(Number(item.total) || 0));
        const score = Math.max(0, Math.min(total, Math.floor(Number(item.score) || 0)));
        if (!total) continue;
        const wrong = total - score;
        const percentage = Number(((score / total) * 100).toFixed(2));
        insert.run(user.id, activity.id, score, total, score, wrong, percentage, item.data || new Date().toISOString());
        if (percentage >= 70) unlockEbook(user.id);
        mark.run(legacyId);
      }
    });

    migrate(results);
    console.log(`Migração legada concluída: ${results.length} resultado(s) analisado(s).`);
  } catch (error) {
    console.error('Falha ao migrar quiz-results.json:', error.message);
  }
}

app.post('/api/users', (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim();
    if (name.length < 2) return res.status(400).json({ erro: 'Digite um nome válido.' });
    const user = createOrUpdateUser(name, email);
    res.status(201).json({ ok: true, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Não foi possível criar o perfil.' });
  }
});

app.get('/api/users/:id', (req, res) => {
  const userId = positiveInt(req.params.id);
  if (!userId) return res.status(400).json({ erro: 'Usuário inválido.' });
  const user = findUserById(userId);
  if (!user) return res.status(404).json({ erro: 'Usuário não encontrado.' });
  const stats = db.prepare(`SELECT COUNT(*) AS quizzes, COALESCE(ROUND(AVG(percentage), 2), 0) AS average, COALESCE(MAX(percentage), 0) AS best_score, COALESCE(SUM(correct_answers), 0) AS correct_answers, COALESCE(SUM(wrong_answers), 0) AS wrong_answers FROM quiz_attempts WHERE user_id = ?`).get(userId);
  res.json({ user, stats });
});

app.get('/api/users/:id/history', (req, res) => {
  const userId = positiveInt(req.params.id);
  if (!userId) return res.status(400).json({ erro: 'Usuário inválido.' });
  const history = db.prepare(`SELECT qa.id, a.slug AS activity_slug, a.name AS activity, qa.score, qa.total, qa.correct_answers, qa.wrong_answers, qa.percentage, qa.time_seconds, qa.created_at FROM quiz_attempts qa INNER JOIN activities a ON a.id = qa.activity_id WHERE qa.user_id = ? ORDER BY datetime(qa.created_at) DESC, qa.id DESC`).all(userId);
  res.json(history);
});

app.get('/api/users/:id/rewards', (req, res) => {
  const userId = positiveInt(req.params.id);
  if (!userId) return res.status(400).json({ erro: 'Usuário inválido.' });
  const rewards = db.prepare(`SELECT r.id, r.slug, r.name, r.description, r.type, r.file_path, ur.unlocked_at FROM user_rewards ur INNER JOIN rewards r ON r.id = ur.reward_id WHERE ur.user_id = ? ORDER BY datetime(ur.unlocked_at) DESC`).all(userId);
  res.json(rewards);
});

/* O front-end antigo ainda pode enviar "respostas"; elas são ignoradas e não são armazenadas. */
app.post('/api/quiz-results', (req, res) => {
  try {
    let userId = positiveInt(req.body?.userId);
    const nome = String(req.body?.nome || '').trim();
    const email = String(req.body?.email || '').trim();
    if (!userId) {
      if (nome.length < 2) return res.status(400).json({ erro: 'Usuário não identificado.' });
      userId = createOrUpdateUser(nome, email).id;
    }
    const result = saveQuizAttempt({
      userId,
      score: Number(req.body?.score),
      total: Number(req.body?.total),
      timeSeconds: Number.isInteger(Number(req.body?.timeSeconds)) ? Number(req.body.timeSeconds) : null
    });
    res.status(201).json({ ok: true, id: result.id, userId, score: result.score, total: result.total, percentual: result.percentage, acertos: result.correctAnswers, erros: result.wrongAnswers, tempoSegundos: result.timeSeconds, rewardUnlocked: result.rewardUnlocked, reward: result.reward });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: error.message || 'Não foi possível salvar o resultado.' });
  }
});

app.get('/api/activities', (_req, res) => {
  res.json(db.prepare(`SELECT id, slug, name, type, created_at FROM activities ORDER BY id`).all());
});

app.get('/login', (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'login.html')));
app.get('/perfil', (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'perfil.html')));
app.get('/ebook', (_req, res) => res.redirect('/ebook/energia-sustentavel.html'));

/* Injeta a integração de conta antes do app principal. */
app.get('/', async (_req, res) => {
  try {
    let html = await fs.readFile(path.join(PUBLIC_DIR, 'index.html'), 'utf8');
    if (!html.includes('account.js')) html = html.replace('</body>', '<script src="account.js"></script></body>');
    res.type('html').send(html);
  } catch (error) {
    res.status(500).send('Não foi possível carregar a aplicação.');
  }
});

app.get(/.*/, (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));

migrateOldResults().finally(() => {
  app.listen(PORT, () => console.log(`Servidor em http://localhost:${PORT}`));
});
