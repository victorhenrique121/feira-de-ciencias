(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const modal = $('#quizModal');
  const quiz = $('#quizContainer');
  const quizBtn = $('#quizBtn');
  const quizNext = $('#quizNext');
  const quizSection = $('#quiz');

  // O quiz/CTA não pode ficar invisível caso o IntersectionObserver do app.js
  // não seja executado. A seção deve estar visível no estado inicial.
  if (quizSection) {
    quizSection.classList.add('show');
    quizSection.style.opacity = '1';
    quizSection.style.transform = 'none';
  }

  // O modal deve começar fechado. Somente a ação "Quiz" o abre.
  if (modal) {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }

  if (!modal || !quiz || !quizBtn || !quizNext) return;

  const images = [
    'https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=1200&q=82',
    'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=1200&q=82',
    'https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=1200&q=82',
    'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?auto=format&fit=crop&w=1200&q=82',
    'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&w=1200&q=82'
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

  const clearQuizStorage = () => {
    ['quizFinished', 'quizCompleted', 'quizState', 'quizLastResult'].forEach((key) => {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    });
  };

  const getVisitor = () => {
    try {
      return JSON.parse(sessionStorage.getItem('visitante') || '{}');
    } catch {
      return {};
    }
  };

  const shuffle = (array) => [...array].sort(() => Math.random() - 0.5);
  const randomBasePoints = () => Math.floor(Math.random() * 10) + 4;
  const pointsForAnswer = (base, correct) => (correct ? Math.round(base * 1.2) : base);

  function resetQuiz() {
    clearQuizStorage();

    const pool = Array.isArray(window.PERGUNTAS) ? window.PERGUNTAS : [];
    questions = shuffle(pool).slice(0, Math.min(8, pool.length));

    // Estado inicial obrigatório de uma nova rodada.
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
    // Tela final só pode existir depois da última confirmação.
    if (isFinished) {
      showResult();
      return;
    }

    const question = questions[currentQuestionIndex];
    if (!question) {
      // Nunca converte uma rodada vazia diretamente em resultado.
      // Se não houver perguntas carregadas, informe o problema e permita reiniciar.
      quiz.innerHTML = `
        <div class="quiz-result">
          <h3>Quiz indisponível</h3>
          <p>Não foi possível carregar as perguntas.</p>
          <button class="btn primary" id="quizRetry" type="button">Recarregar Quiz</button>
        </div>
      `;
      quizBtn.hidden = true;
      quizNext.hidden = true;
      $('#quizRetry')?.addEventListener('click', resetQuiz);
      return;
    }

    selectedAnswer = null;
    answered = false;
    currentBasePoints = randomBasePoints();

    const letters = ['A', 'B', 'C', 'D'];
    const progress = Math.round((currentQuestionIndex / questions.length) * 100);

    quiz.innerHTML = `
      <div class="quiz-progress">
        <div class="quiz-progress-top">
          <span>Questão ${currentQuestionIndex + 1} de ${questions.length}</span>
          <strong>${progress}%</strong>
        </div>
        <div class="quiz-progress-track"><span style="width:${progress}%"></span></div>
      </div>
      <article class="question">
        <div class="quiz-image-wrap">
          <img src="${images[currentQuestionIndex % images.length]}" alt="Energia e sustentabilidade" loading="lazy">
        </div>
        <h3>${currentQuestionIndex + 1}. ${question.pergunta}</h3>
        <div class="quiz-options">
          ${question.opcoes.map((option, index) => `
            <button class="quiz-option" type="button" data-answer="${index}" aria-pressed="false">
              <span class="quiz-letter">${letters[index]}</span><span>${option}</span>
            </button>
          `).join('')}
        </div>
        <div class="quiz-points-badge">🎯 ${currentBasePoints} pontos base nesta pergunta</div>
        <p class="quiz-confirm-help">Selecione uma alternativa e clique em <strong>Confirmar Resposta</strong>.</p>
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
    const question = questions[currentQuestionIndex];
    if (!Number.isInteger(index) || !question?.opcoes?.[index]) return;

    selectedAnswer = index;
    $$('.quiz-option').forEach((option) => {
      const active = option === button;
      option.classList.toggle('selected', active);
      option.setAttribute('aria-pressed', String(active));
    });

    quizBtn.disabled = false;
  }

  function confirmAnswer() {
    if (answered || selectedAnswer === null || saving || isFinished) return;

    const question = questions[currentQuestionIndex];
    if (!question) return;

    answered = true;
    quizBtn.disabled = true;
    quizBtn.textContent = 'Confirmando...';

    const correct = selectedAnswer === Number(question.correta);
    const earned = pointsForAnswer(currentBasePoints, correct);

    if (correct) score += 1;
    totalScore += earned;

    $$('.quiz-option').forEach((button) => {
      button.disabled = true;
      const value = Number(button.dataset.answer);
      if (value === Number(question.correta)) button.classList.add('correct');
      if (value === selectedAnswer && value !== Number(question.correta)) button.classList.add('wrong');
    });

    const feedback = $('#quizFeedback');
    if (feedback) {
      feedback.hidden = false;
      feedback.className = `quiz-feedback ${correct ? 'correct' : 'wrong'}`;
      feedback.textContent = correct
        ? `✓ Correto! +${earned} pontos.`
        : `✕ Incorreto. +${earned} pontos. Resposta: ${question.opcoes[question.correta]}.`;
    }

    const explanation = $('#quizExplanation');
    if (explanation) {
      explanation.textContent = question.explicacao || '';
      explanation.classList.add('visible');
    }

    if (currentQuestionIndex === questions.length - 1) {
      // Somente aqui o estado final é ativado.
      isFinished = true;
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

    const user = getVisitor();
    const total = questions.length;
    const percentage = total ? Math.round((score / total) * 100) : 0;

    if (!user.id) {
      saving = false;
      return null;
    }

    try {
      const response = await fetch('/api/quiz-attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          nome: user.nome || 'Visitante',
          email: user.email || '',
          score,
          total,
          points: totalScore,
          timeSeconds: Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.erro || 'Falha ao salvar');

      sessionStorage.setItem('quizLastResult', JSON.stringify({
        score,
        total,
        points: totalScore,
        totalPoints: data.totalPoints,
        percentage
      }));

      return data;
    } catch (error) {
      console.warn('Não foi possível salvar o resultado:', error);
      return null;
    } finally {
      saving = false;
    }
  }

  async function showResult() {
    if (!isFinished) {
      renderQuestion();
      return;
    }

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
    if (status) {
      status.textContent = saved
        ? `Pontuação salva! Total na conta: ${saved.totalPoints ?? totalScore} pontos.`
        : 'Resultado exibido. Não foi possível sincronizar com o perfil.';
    }

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

  // Abrir o quiz sempre cria uma rodada nova e limpa.
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('#openQuiz, [data-open-quiz], .open-quiz');
    if (!trigger) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    clearQuizStorage();
    resetQuiz();
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lock');
  }, true);

  // Confirmar usa captura para não ser sobrescrito pelo handler antigo do app.js.
  document.addEventListener('click', (event) => {
    const button = event.target.closest('#quizBtn');
    if (!button) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    confirmAnswer();
  }, true);

  quiz.addEventListener('click', (event) => {
    const option = event.target.closest('.quiz-option');
    if (option) selectAnswer(option);
  });

  quizNext.addEventListener('click', nextQuestion);

  // Não restaura resultado antigo ao carregar a página.
  clearQuizStorage();
  currentQuestionIndex = 0;
  score = 0;
  totalScore = 0;
  isFinished = false;
  selectedAnswer = null;
  answered = false;
})();
