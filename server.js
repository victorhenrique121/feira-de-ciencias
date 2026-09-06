// Servidor principal da aplicação da Feira de Ciências.
// Responsável por servir a interface web, expor a API e persistir os dados do quiz.
const express = require('express');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');

const {
  db,
  findUserById,
  createOrUpdateUser,
  saveQuizAttempt,
  unlockEbook,
  updateLatestQuizInvestment,
  listRewardsForUser,
  redeemReward
} = require('./server/database');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'energia_solar_site');
const OLD_DATA_FILE = path.join(__dirname, 'server', 'data', 'quiz-results.json');

// Middleware global para parse de JSON e entrega dos arquivos estáticos da aplicação.
app.use(express.json({ limit: '50kb' }));
app.use(express.static(PUBLIC_DIR, { extensions: ['html'], index: false }));

function positiveInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// Migra os resultados antigos armazenados em JSON para o banco SQLite.
// Isso mantém compatibilidade com dados históricos já existentes no projeto.
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
    const insert = db.prepare(`INSERT INTO quiz_attempts (user_id, activity_id, score, total, points, correct_answers, wrong_answers, percentage, time_seconds, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`);

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
        insert.run(user.id, activity.id, score, total, 0, score, wrong, percentage, item.data || new Date().toISOString());
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

// Cria ou atualiza um usuário com nome e e-mail informados pela interface.
app.post('/api/users', (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').toLowerCase().trim();

    // Validação robusta do nome (mínimo de 2 caracteres e sem caracteres estrambóticos excessivos se desejar)
    if (name.length < 2) {
      return res.status(400).json({ ok: false, erro: 'Digite um nome válido (mínimo de 2 caracteres).' });
    }

    // Validação básica de formato de e-mail usando expressão regular (Regex)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ ok: false, erro: 'Digite um e-mail válido.' });
    }

    const user = createOrUpdateUser(name, email);
    
    return res.status(201).json({ ok: true, user });
  } catch (error) {
    console.error('Erro ao criar/atualizar usuário:', error);
    return res.status(500).json({ ok: false, erro: 'Não foi possível salvar o perfil. Tente novamente mais tarde.' });
  }
});

// Retorna os dados principais do usuário e algumas estatísticas gerais do quiz.
app.get('/api/users/:id', (req, res) => {
  const userId = positiveInt(req.params.id);
  if (!userId) return res.status(400).json({ erro: 'Usuário inválido.' });
  const user = findUserById(userId);
  if (!user) return res.status(404).json({ erro: 'Usuário não encontrado.' });
  const stats = db.prepare(`SELECT COUNT(*) AS quizzes, COALESCE(ROUND(AVG(percentage), 2), 0) AS average, COALESCE(MAX(percentage), 0) AS best_score, COALESCE(SUM(correct_answers), 0) AS correct_answers, COALESCE(SUM(wrong_answers), 0) AS wrong_answers, COALESCE(SUM(points), 0) AS quiz_points FROM quiz_attempts WHERE user_id = ?`).get(userId);
  res.json({ user, stats });
});

// Lista o histórico completo de tentativas do usuário, incluindo pontuação e tempo.
app.get('/api/users/:id/history', (req, res) => {
  const userId = positiveInt(req.params.id);
  if (!userId) return res.status(400).json({ erro: 'Usuário inválido.' });
  const history = db.prepare(`SELECT qa.id, a.slug AS activity_slug, a.name AS activity, qa.score, qa.total, qa.points, qa.correct_answers, qa.wrong_answers, qa.percentage, qa.time_seconds, qa.would_invest, qa.created_at FROM quiz_attempts qa INNER JOIN activities a ON a.id = qa.activity_id WHERE qa.user_id = ? ORDER BY datetime(qa.created_at) DESC, qa.id DESC`).all(userId);
  res.json(history);
});

// Retorna os prêmios desbloqueados por um usuário específico.
app.get('/api/users/:id/rewards', (req, res) => {
  const userId = positiveInt(req.params.id);
  if (!userId) return res.status(400).json({ erro: 'Usuário inválido.' });
  if (!findUserById(userId)) return res.status(404).json({ erro: 'Usuário não encontrado.' });
  res.json(listRewardsForUser(userId));
});

// Resgata uma recompensa em uma transação atômica, validando saldo e duplicidade no servidor.
app.post('/api/users/:id/rewards/:rewardId/redeem', (req, res) => {
  const userId = positiveInt(req.params.id);
  const rewardId = positiveInt(req.params.rewardId);
  if (!userId || !rewardId) return res.status(400).json({ erro: 'Usuário ou recompensa inválidos.' });

  try {
    const result = redeemReward(userId, rewardId);
    res.status(201).json({ ok: true, reward: result.reward, redemptionId: result.redemptionId, user: result.user });
  } catch (error) {
    const status = /não encontrado|insuficientes|já foi/i.test(error.message) ? 409 : 400;
    res.status(status).json({ erro: error.message });
  }
});

// Libera o arquivo somente para o usuário que já possui o resgate registrado.
app.get('/api/users/:id/rewards/:rewardId/download', (req, res) => {
  const userId = positiveInt(req.params.id);
  const rewardId = positiveInt(req.params.rewardId);
  if (!userId || !rewardId) return res.status(400).json({ erro: 'Usuário ou recompensa inválidos.' });

  const reward = db.prepare(`SELECT r.file_path FROM user_rewards ur INNER JOIN rewards r ON r.id = ur.reward_id WHERE ur.user_id = ? AND ur.reward_id = ?`).get(userId, rewardId);
  if (!reward) return res.status(403).json({ erro: 'Recompensa ainda não resgatada.' });
  if (!reward.file_path) return res.status(404).json({ erro: 'Arquivo da recompensa ainda não publicado.' });
  res.redirect(reward.file_path);
});

// Salva o resultado de uma tentativa do quiz.
// Se apenas a resposta de "would_invest" vier no payload, atualiza o último registro.
function saveQuizRequest(req, res) {
  try {
    const userId = positiveInt(req.body?.userId);
    if (!userId) return res.status(400).json({ erro: 'Usuário não identificado.' });

    const wouldInvest = String(req.body?.would_invest || '').trim().toLowerCase();
    const hasScore = req.body?.score !== undefined && req.body?.total !== undefined;

    if (!hasScore && wouldInvest) {
      const updated = updateLatestQuizInvestment(userId, wouldInvest);
      return res.status(200).json({ ok: true, id: updated.id, userId, would_invest: updated.would_invest });
    }

    const result = saveQuizAttempt({
      userId,
      score: Number(req.body?.score),
      total: Number(req.body?.total),
      points: Number(req.body?.points),
      timeSeconds: Number.isInteger(Number(req.body?.timeSeconds)) ? Number(req.body.timeSeconds) : null,
      wouldInvest
    });

    res.status(201).json({
      ok: true,
      id: result.id,
      userId,
      score: result.score,
      total: result.total,
      points: result.points,
      totalPoints: result.totalPoints,
      percentual: result.percentage,
      acertos: result.correctAnswers,
      erros: result.wrongAnswers,
      tempoSegundos: result.timeSeconds,
      would_invest: result.wouldInvest,
      rewardUnlocked: result.rewardUnlocked,
      reward: result.reward
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: error.message || 'Não foi possível salvar o resultado.' });
  }
}

app.post('/api/quiz-results', saveQuizRequest);
app.post('/api/quiz-attempts', saveQuizRequest);

// Lista as atividades disponíveis para o quiz e para o sistema de recompensas.
app.get('/api/activities', (_req, res) => {
  res.json(db.prepare(`SELECT id, slug, name, type, created_at FROM activities ORDER BY id`).all());
});

// Rotas de páginas e arquivos públicos do front-end.
app.get('/login', (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'login.html')));
app.get('/perfil', (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'perfil.html')));
app.get('/ebook', (_req, res) => res.redirect('/ebook/energia-sustentavel.html'));

// Página inicial: injeta os scripts necessários para o funcionamento da aplicação.
app.get('/', async (_req, res) => {
  try {
    let html = await fs.readFile(path.join(PUBLIC_DIR, 'index.html'), 'utf8');
    if (!html.includes('account.js')) html = html.replace('</body>', '<script src="account.js"></script></body>');
    if (!html.includes('quiz-ui.js')) html = html.replace('</body>', '<script src="quiz-ui.js"></script></body>');
    res.type('html').send(html);
  } catch (error) {
    res.status(500).send('Não foi possível carregar a aplicação.');
  }
});

// Fallback para rotas não mapeadas: serve a SPA principal.
app.get(/.*/, (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));

// Inicializa a migração e inicia o servidor.
migrateOldResults().finally(() => {
  app.listen(PORT, () => console.log(`Servidor em http://localhost:${PORT}`));
});
