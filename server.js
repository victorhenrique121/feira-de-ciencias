const express = require('express');
const fs = require('fs/promises');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'server', 'data');
const DATA_FILE = path.join(DATA_DIR, 'quiz-results.json');
const PUBLIC_DIR = path.join(__dirname, 'energia_solar_site');

app.use(express.json({ limit: '100kb' }));
app.use(express.static(PUBLIC_DIR));

async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try { await fs.access(DATA_FILE); }
  catch { await fs.writeFile(DATA_FILE, '[]', 'utf8'); }
}

app.post('/api/quiz-results', async (req, res) => {
  try {
    const { nome, score, total, percentual, respostas, data } = req.body || {};

    if (typeof score !== 'number' || typeof total !== 'number' || !Array.isArray(respostas)) {
      return res.status(400).json({ erro: 'Dados do quiz inválidos.' });
    }

    const resultado = {
      id: Date.now().toString(),
      nome: String(nome || 'Visitante').trim().slice(0, 60) || 'Visitante',
      score: Math.max(0, Math.floor(score)),
      total: Math.max(0, Math.floor(total)),
      percentual: Math.max(0, Math.min(100, Math.floor(percentual || 0))),
      respostas: respostas.map((r) => ({
        pergunta: String(r.pergunta || '').slice(0, 500),
        respostaSelecionada: Number.isInteger(r.respostaSelecionada) ? r.respostaSelecionada : null,
        resposta: String(r.resposta || '').slice(0, 300),
        correta: Number.isInteger(r.correta) ? r.correta : null,
        acertou: Boolean(r.acertou)
      })),
      data: data || new Date().toISOString()
    };

    await ensureDataFile();
    const atual = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
    atual.push(resultado);
    await fs.writeFile(DATA_FILE, JSON.stringify(atual, null, 2), 'utf8');

    res.status(201).json({ ok: true, id: resultado.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Não foi possível salvar o resultado.' });
  }
});

app.get('/api/quiz-results', async (_req, res) => {
  await ensureDataFile();
  const resultados = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
  res.json(resultados);
});

app.get('/login', (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'login.html'));
});

app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

ensureDataFile().then(() => {
  app.listen(PORT, () => console.log(`Servidor em http://localhost:${PORT}`));
});
