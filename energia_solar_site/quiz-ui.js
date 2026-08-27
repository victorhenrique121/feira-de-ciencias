(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const modal = $('#quizModal');
  const quiz = $('#quizContainer');
  const quizBtn = $('#quizBtn');
  const quizNext = $('#quizNext');
  if (!modal || !quiz || !quizBtn || !quizNext) return;

  const images = [
    'https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=1200&q=82',
    'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=1200&q=82',
    'https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=1200&q=82',
    'https://images.unsplash.com/photo-1509390670806-7dcb9f7b6f4a?auto=format&fit=crop&w=1200&q=82',
    'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?auto=format&fit=crop&w=1200&q=82'
  ];

  let questions = [];
  let currentQuestionIndex = 0;
  let score = 0;
  let totalScore = 0;
  let isFinished = false;
  let selectedAnswer = null;
  let answered = false;
  let startedAt = 0;
  let currentBasePoints = 0;
  let saving = false;

  const clearPersistedQuizState = () => {
    sessionStorage.removeItem('quizLastResult');
    sessionStorage.removeItem('quizFinished');
    sessionStorage.removeItem('quizCompleted');
    sessionStorage.removeItem('quizState');
    localStorage.removeItem('quizFinished');
    localStorage.removeItem('quizCompleted');
    localStorage.removeItem('quizState');
  };

  const getVisitor = () => {
    try { return JSON.parse(sessionStorage.getItem('visitante') || '{}'); }
    catch { return {}; }
  };

  const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
  const randomBasePoints = () => Math.floor(Math.random() * 10) + 4;
  const pointsForAnswer = (base, correct) => correct ? Math.round(base * 1.2) : base;

  function resetQuiz() {
    clearPersistedQuizState();
    const pool = Array.isArray(window.PERGUNTAS) ? window.PERGUNTAS : [];
    questions = shuffle(pool).slice(0, Math.min(8, pool.length));
    currentQuestionIndex = 0;
    score = 0;
    totalScore = 0;
    isFinished = false;
    selectedAnswer = null;
    answered = false;
    saving = false;
    startedAt = Date.now();
    sessionStorage.setItem('quizStartedAt', String(startedAt));

    quizBtn.hidden = false;
    quizBtn.disabled = true;
    quizBtn.textContent = 'Confirmar Resposta';
    quizNext.hidden = true;
    renderQuestion();
  }

  function renderQuestion() {
    if (isFinished) return showResult();
    const q = questions[currentQuestionIndex];
    if (!q) return;

    selectedAnswer = null;
    answered = false;
    currentBasePoints = randomBasePoints();
    const progress = Math.round((currentQuestionIndex / questions.length) * 100);
    const letters = ['A', 'B', 'C', 'D'];

    quiz.innerHTML = `
      <div class="quiz-progress">
        <div class="quiz-progress-top"><span>Questão ${currentQuestionIndex + 1} de ${questions.length}</span><strong>${progress}%</strong></div>
        <div class="quiz-progress-track"><span style="width:${progress}%"></span></div>
      </div>
      <article class="question">
        <div class="quiz-image-wrap"><img src="${images[currentQuestionIndex % images.length]}" alt="Imagem ilustrativa sobre energia e sustentabilidade" loading="lazy"></div>
        <h3>${currentQuestionIndex + 1}. ${q.pergunta}</h3>
        <div class="quiz-options">
          ${q.opcoes.map((option, index) => `<button class="quiz-option" type="button" data-answer="${index}" aria-pressed="false"><span class="quiz-letter">${letters[index]}</span><span>${option}</span></button>`).join('')}
        </div>
        <div class="quiz-points-badge">🎯 ${currentBasePoints} pontos base nesta pergunta</div>
        <p class="quiz-confirm-help">Escolha uma alternativa. Depois clique em <strong>Confirmar Resposta</strong>.</p>
        <div id="quizFeedback" class="quiz-feedback" hidden></div>
        <div id="quizExplanation" class="quiz-explanation"></div>
      </article>
    `;

    quizBtn.hidden = false;
    quizBtn.disabled = true;
    quizBtn.textContent = 'Confirmar Resposta';
    quizNext.hidden = true;
  }

  function selectAnswer(button) {
    if (answered || !button) return;
    const index = Number(button.dataset.answer);
    if (!Number.isInteger(index) || !questions[currentQuestionIndex]?.opcoes[index]) return;
    selectedAnswer = index;
    $$('.quiz-option').forEach((b) => {
      const active = b === button;
      b.classList.toggle('selected', active);
      b.setAttribute('aria-pressed', String(active));
    });
    quizBtn.disabled = false;
  }

  function confirmAnswer() {
    if (answered || selectedAnswer === null || saving || isFinished) return;
    const q = questions[currentQuestionIndex];
    if (!q) return;

    answered = true;
    quizBtn.disabled = true;
    quizBtn.textContent = 'Confirmando...';

    const correct = selectedAnswer === Number(q.correta);
    const earned = pointsForAnswer(currentBasePoints, correct);
    if (correct) score += 1;
    totalScore += earned;

    $$('.quiz-option').forEach((button) => {
      button.disabled = true;
      const value = Number(button.dataset.answer);
      if (value === Number(q.correta)) button.classList.add('correct');
      if (value === selectedAnswer && value !== Number(q.correta)) button.classList.add('wrong');
    });

    const feedback = $('#quizFeedback');
    if (feedback) {
      feedback.hidden = false;
      feedback.className = `quiz-feedback ${correct ? 'correct' : 'wrong'}`;
      feedback.textContent = correct
        ? `✓ Correto! +${earned} pontos (${currentBasePoints} × 1,2).`
        : `✕ Incorreto. +${earned} pontos. Resposta: ${q.opcoes[q.correta]}.`;
    }
    const explanation = $('#quizExplanation');
    if (explanation) { explanation.textContent = q.explicacao || ''; explanation.classList.add('visible'); }

    if (currentQuestionIndex === questions.length - 1) {
      isFinished = true;
      sessionStorage.removeItem('quizFinished');
      window.setTimeout(showResult, 450);
      return;
    }

    quizBtn.textContent = 'Resposta confirmada';
    quizNext.hidden = false;
    quizNext.disabled = false;
    quizNext.textContent = 'Próxima questão';
  }

  function nextQuestion() {
    if (!answered || isFinished) return;
    currentQuestionIndex += 1;
    renderQuestion();
  }

  async function saveResult() {
    if (saving) return null;
    saving = true;
    const visitor = getVisitor();
    const total = questions.length;
    const percentage = total ? Math.round((score / total) * 100) : 0;
    const timeSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    if (!visitor.id) { saving = false; return null; }

    try {
      const response = await fetch('/api/quiz-attempts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: visitor.id, nome: visitor.nome || 'Visitante', email: visitor.email || '', score, total, points: totalScore, timeSeconds })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.erro || 'Falha ao salvar resultado');
      sessionStorage.setItem('quizLastResult', JSON.stringify({ score, total, points: totalScore, totalPoints: data.totalPoints, percentage }));
      return data;
    } catch (error) {
      console.warn('Não foi possível salvar o resultado:', error);
      return null;
    } finally { saving = false; }
  }

  async function showResult() {
    if (!isFinished) return renderQuestion();
    const total = questions.length;
    const percentage = total ? Math.round((score / total) * 100) : 0;
    quiz.innerHTML = `
      <div class="quiz-result">
        <div class="quiz-result-icon">✓</div>
        <div class="quiz-result-score">${percentage}%</div>
        <h3>${percentage >= 90 ? 'Especialista em Energia!' : percentage >= 70 ? 'Mandou muito bem!' : percentage >= 50 ? 'Bom trabalho!' : 'Continue investigando!'}</h3>
        <div class="quiz-result-grid">
          <div class="quiz-result-stat"><small>Acertos</small><strong>${score}/${total}</strong></div>
          <div class="quiz-result-stat"><small>Pontos da rodada</small><strong>${totalScore}</strong></div>
          <div class="quiz-result-stat"><small>Desempenho</small><strong>${percentage}%</strong></div>
        </div>
        <p>Você acumulou <strong>${totalScore} pontos</strong> nesta rodada.</p>
        <div id="quizSaveStatus" class="quiz-save-status">Salvando sua pontuação...</div>
        <div class="quiz-result-actions">
          <button class="btn secondary" id="quizBackHome" type="button">Voltar ao Início</button>
          <button class="btn primary" id="quizRestart" type="button">Reiniciar Quiz</button>
        </div>
      </div>
    `;
    quizBtn.hidden = true;
    quizNext.hidden = true;
    const saved = await saveResult();
    const status = $('#quizSaveStatus');
    if (status) status.textContent = saved ? `Pontuação salva! Total na conta: ${saved.totalPoints ?? totalScore} pontos.` : 'Resultado exibido. Não foi possível sincronizar com o perfil.';
    $('#quizRestart')?.addEventListener('click', resetQuiz);
    $('#quizBackHome')?.addEventListener('click', () => {
      resetQuiz();
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('lock');
      location.hash = '#inicio';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // O quiz só é inicializado quando o usuário solicita uma nova rodada.
  // Nunca restauramos uma tela de resultado a partir de localStorage/sessionStorage.
  quizBtn.addEventListener('click', () => {
    if (quizBtn.hidden) return;
    if (quizBtn.textContent.includes('Jogar novamente')) return resetQuiz();
    confirmAnswer();
  });
  quizNext.addEventListener('click', nextQuestion);

  quiz.addEventListener('click', (event) => {
    const option = event.target.closest('.quiz-option');
    if (option) selectAnswer(option);
  });

  // O botão que abre o quiz deve sempre começar uma rodada limpa.
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-open-quiz], #openQuiz, .open-quiz');
    if (!trigger) return;
    event.preventDefault();
    clearPersistedQuizState();
    resetQuiz();
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lock');
  });

  // Estado inicial seguro: nunca mostrar resultado ao carregar a página.
  clearPersistedQuizState();
  isFinished = false;
  currentQuestionIndex = 0;
  score = 0;
  totalScore = 0;
  selectedAnswer = null;
  answered = false;
})();
