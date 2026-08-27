(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const modal = $('#quizModal');
  const quiz = $('#quizContainer');
  const quizBtn = $('#quizBtn');
  const quizNext = $('#quizNext');

  if (!modal || !quiz || !quizBtn || !quizNext) return;

  const imageUrls = [
    'https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=1200&q=82',
    'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=1200&q=82',
    'https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=1200&q=82',
    'https://images.unsplash.com/photo-1509390670806-7dcb9f7b6f4a?auto=format&fit=crop&w=1200&q=82',
    'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?auto=format&fit=crop&w=1200&q=82',
    'https://images.unsplash.com/photo-1548337138-e87d889cc369?auto=format&fit=crop&w=1200&q=82',
    'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&w=1200&q=82',
    'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=1200&q=82'
  ];

  const style = document.createElement('style');
  style.textContent = `
    .quiz-image-wrap{margin:16px 0 20px;border-radius:16px;overflow:hidden;background:#eaf0eb;aspect-ratio:16/7}
    .quiz-image-wrap img{width:100%;height:100%;display:block;object-fit:cover}
    .quiz-option.selected{border-color:#b7d45f!important;background:#d8f581!important;color:#10201b!important;transform:translateY(-1px)}
    .quiz-option{transition:transform .15s ease,background .15s ease,border-color .15s ease,opacity .15s ease}
    .quiz-option:disabled{cursor:default}
    .quiz-confirm-help{margin:12px 0 0;color:#62736c;font-size:13px}
    .quiz-points-badge{display:inline-flex;align-items:center;gap:6px;margin:12px 0 0;padding:7px 10px;border-radius:999px;background:#eef6e5;color:#36552b;font-weight:700;font-size:13px}
    .quiz-total-points{font-size:18px;margin-top:12px;color:#17352c}
    .quiz-result-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:22px 0}
    .quiz-result-stat{padding:16px;border:1px solid #dfe9e3;border-radius:14px;background:#f8fbf8}
    .quiz-result-stat small{display:block;color:#6b7b74;font-size:11px;text-transform:uppercase;letter-spacing:.08em}
    .quiz-result-stat strong{display:block;margin-top:5px;font:700 25px/1.1 "Space Grotesk",sans-serif;color:#102f26}
    .quiz-result-actions{display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-top:20px}
    .quiz-save-status{margin-top:12px;color:#62736c;font-size:13px}
    .quiz-loading{display:inline-flex;align-items:center;gap:8px}
    .quiz-spinner{width:14px;height:14px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:quizSpin .7s linear infinite}
    @keyframes quizSpin{to{transform:rotate(360deg)}}
    @media(max-width:560px){.quiz-result-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  let questions = [];
  let current = 0;
  let correctCount = 0;
  let totalPoints = 0;
  let selected = null;
  let answered = false;
  let startedAt = 0;
  let saving = false;

  const shuffle = (items) => [...items].sort(() => Math.random() - 0.5);
  const randomBasePoints = () => Math.floor(Math.random() * 10) + 4; // 4 a 13, sempre inteiro.
  const finalPoints = (base, isCorrect) => isCorrect ? Math.round(base * 1.2) : base;

  function getVisitor() {
    try { return JSON.parse(sessionStorage.getItem('visitante') || '{}'); }
    catch { return {}; }
  }

  function resetQuiz() {
    const pool = Array.isArray(window.PERGUNTAS) ? window.PERGUNTAS : [];
    questions = shuffle(pool).slice(0, Math.min(8, pool.length));
    current = 0;
    correctCount = 0;
    totalPoints = 0;
    selected = null;
    answered = false;
    saving = false;
    startedAt = Date.now();

    sessionStorage.setItem('quizStartedAt', String(startedAt));
    sessionStorage.removeItem('quizLastResult');

    quizBtn.hidden = false;
    quizNext.hidden = true;
    quizBtn.disabled = true;
    quizBtn.textContent = 'Confirmar Resposta';

    renderQuestion();
  }

  function renderQuestion() {
    const q = questions[current];
    if (!q) {
      showResult();
      return;
    }

    selected = null;
    answered = false;
    const progress = Math.round((current / questions.length) * 100);
    const letters = ['A', 'B', 'C', 'D'];
    const image = imageUrls[current % imageUrls.length];

    quiz.innerHTML = `
      <div class="quiz-progress">
        <div class="quiz-progress-top">
          <span>Questão ${current + 1} de ${questions.length}</span>
          <strong>${progress}%</strong>
        </div>
        <div class="quiz-progress-track"><span style="width:${progress}%"></span></div>
      </div>
      <div class="quiz-meta"><span>⚡ Energia</span><span>＋ Matemática</span></div>
      <article class="question">
        <div class="quiz-image-wrap">
          <img src="${image}" alt="Imagem ilustrativa relacionada a energia e sustentabilidade" loading="lazy">
        </div>
        <h3>${current + 1}. ${q.pergunta}</h3>
        <div class="quiz-options">
          ${q.opcoes.map((option, index) => `
            <button class="quiz-option" type="button" data-answer="${index}" aria-pressed="false">
              <span class="quiz-letter">${letters[index]}</span><span>${option}</span>
            </button>
          `).join('')}
        </div>
        <div class="quiz-points-badge">🎯 Pontuação da pergunta: ${currentQuestionBasePoints} pontos base</div>
        <p class="quiz-confirm-help">Selecione uma alternativa. O botão <strong>Confirmar Resposta</strong> será liberado em seguida.</p>
        <div class="quiz-feedback" id="quizFeedback" hidden></div>
        <div class="quiz-explanation" id="quizExplanation"></div>
      </article>
    `;

    quizBtn.hidden = false;
    quizBtn.disabled = true;
    quizBtn.textContent = 'Confirmar Resposta';
    quizNext.hidden = true;
  }

  // Cada pergunta recebe uma única pontuação base ao ser renderizada.
  let currentQuestionBasePoints = 0;

  function renderQuestion() {
    const q = questions[current];
    if (!q) return showResult();

    selected = null;
    answered = false;
    currentQuestionBasePoints = randomBasePoints();

    const progress = Math.round((current / questions.length) * 100);
    const letters = ['A', 'B', 'C', 'D'];
    const image = imageUrls[current % imageUrls.length];

    quiz.innerHTML = `
      <div class="quiz-progress">
        <div class="quiz-progress-top">
          <span>Questão ${current + 1} de ${questions.length}</span>
          <strong>${progress}%</strong>
        </div>
        <div class="quiz-progress-track"><span style="width:${progress}%"></span></div>
      </div>
      <div class="quiz-meta"><span>⚡ Energia</span><span>＋ Matemática</span></div>
      <article class="question">
        <div class="quiz-image-wrap">
          <img src="${image}" alt="Imagem ilustrativa relacionada a energia e sustentabilidade" loading="lazy">
        </div>
        <h3>${current + 1}. ${q.pergunta}</h3>
        <div class="quiz-options">
          ${q.opcoes.map((option, index) => `
            <button class="quiz-option" type="button" data-answer="${index}" aria-pressed="false">
              <span class="quiz-letter">${letters[index]}</span><span>${option}</span>
            </button>
          `).join('')}
        </div>
        <div class="quiz-points-badge">🎯 ${currentQuestionBasePoints} pontos base nesta pergunta</div>
        <p class="quiz-confirm-help">Selecione uma alternativa. O botão <strong>Confirmar Resposta</strong> será liberado em seguida.</p>
        <div class="quiz-feedback" id="quizFeedback" hidden></div>
        <div class="quiz-explanation" id="quizExplanation"></div>
      </article>
    `;

    quizBtn.hidden = false;
    quizBtn.disabled = true;
    quizBtn.textContent = 'Confirmar Resposta';
    quizNext.hidden = true;
  }

  function selectOption(option) {
    if (answered || !option || option.disabled) return;

    const answer = Number(option.dataset.answer);
    if (!Number.isInteger(answer) || answer < 0 || answer >= questions[current].opcoes.length) return;

    selected = answer;
    $$('.quiz-option').forEach((button) => {
      const active = button === option;
      button.classList.toggle('selected', active);
      button.setAttribute('aria-pressed', String(active));
    });

    quizBtn.disabled = false;
    quizBtn.focus();
  }

  function setConfirmLoading(isLoading) {
    quizBtn.disabled = true;
    quizBtn.innerHTML = isLoading
      ? '<span class="quiz-loading"><span class="quiz-spinner"></span> Confirmando...</span>'
      : 'Confirmar Resposta';
  }

  function confirmAnswer() {
    if (answered || selected === null || saving) return;

    const q = questions[current];
    if (!q || !Array.isArray(q.opcoes) || !q.opcoes[selected]) return;

    setConfirmLoading(true);
    answered = true;

    const options = $$('.quiz-option');
    const feedback = $('#quizFeedback');
    const explanation = $('#quizExplanation');
    const isCorrect = selected === Number(q.correta);
    const earnedPoints = finalPoints(currentQuestionBasePoints, isCorrect);

    if (isCorrect) correctCount += 1;
    totalPoints += earnedPoints;

    options.forEach((button) => {
      button.disabled = true;
      const value = Number(button.dataset.answer);
      if (value === Number(q.correta)) button.classList.add('correct');
      if (value === selected && value !== Number(q.correta)) button.classList.add('wrong');
    });

    if (isCorrect) {
      feedback.textContent = `✓ Correto! +${earnedPoints} pontos (${currentQuestionBasePoints} × 1,2).`;
      feedback.className = 'quiz-feedback correct';
    } else {
      feedback.textContent = `✕ Incorreto. +${earnedPoints} pontos. Resposta: ${q.opcoes[q.correta]}.`;
      feedback.className = 'quiz-feedback wrong';
    }

    feedback.hidden = false;
    explanation.textContent = q.explicacao || '';
    explanation.classList.add('visible');

    const totalPointsLabel = document.createElement('div');
    totalPointsLabel.className = 'quiz-total-points';
    totalPointsLabel.innerHTML = `Total da rodada: <strong>${totalPoints} pontos</strong>`;
    quiz.querySelector('.question')?.appendChild(totalPointsLabel);

    if (current === questions.length - 1) {
      quizNext.hidden = true;
      window.setTimeout(showResult, 650);
    } else {
      quizBtn.disabled = true;
      quizBtn.textContent = 'Resposta confirmada';
      quizNext.hidden = false;
      quizNext.disabled = false;
      quizNext.textContent = 'Próxima questão';
    }
  }

  function nextQuestion() {
    if (!answered || current >= questions.length - 1) return;
    current += 1;
    renderQuestion();
  }

  async function saveResult() {
    if (saving) return null;
    saving = true;

    const total = questions.length;
    const percentage = total ? Math.round((correctCount / total) * 100) : 0;
    const timeSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    const visitor = getVisitor();

    if (!visitor.id) {
      saving = false;
      return null;
    }

    try {
      const response = await fetch('/api/quiz-attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: visitor.id,
          nome: visitor.nome || 'Visitante',
          email: visitor.email || '',
          score: correctCount,
          total,
          points: totalPoints,
          timeSeconds
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.erro || 'Falha ao salvar resultado');

      sessionStorage.setItem('quizLastResult', JSON.stringify({
        correctCount,
        total,
        points: totalPoints,
        totalPoints: data.totalPoints,
        percentage,
        savedAt: new Date().toISOString()
      }));

      return data;
    } catch (error) {
      console.warn('Não foi possível registrar o quiz:', error);
      return null;
    } finally {
      saving = false;
    }
  }

  async function showResult() {
    const total = questions.length;
    const percentage = total ? Math.round((correctCount / total) * 100) : 0;

    let title = 'Continue investigando!';
    if (percentage >= 90) title = 'Especialista em Energia!';
    else if (percentage >= 70) title = 'Mandou muito bem!';
    else if (percentage >= 50) title = 'Bom trabalho!';

    quiz.innerHTML = `
      <div class="quiz-result">
        <div class="quiz-result-icon">✓</div>
        <div class="quiz-result-score">${percentage}%</div>
        <h3>${title}</h3>
        <div class="quiz-result-grid">
          <div class="quiz-result-stat"><small>Acertos</small><strong>${correctCount}/${total}</strong></div>
          <div class="quiz-result-stat"><small>Pontos da rodada</small><strong>${totalPoints}</strong></div>
          <div class="quiz-result-stat"><small>Desempenho</small><strong>${percentage}%</strong></div>
        </div>
        <p>Você acumulou <strong>${totalPoints} pontos</strong> nesta rodada.</p>
        <div class="quiz-result-bar"><span style="width:${percentage}%"></span></div>
        <div id="quizSaveStatus" class="quiz-save-status" aria-live="polite">Salvando sua pontuação no perfil...</div>
      </div>
    `;

    quizBtn.hidden = false;
    quizBtn.disabled = false;
    quizBtn.textContent = 'Jogar novamente';
    quizNext.hidden = true;

    const result = await saveResult();
    const status = $('#quizSaveStatus');
    if (status) {
      status.textContent = result
        ? `✓ +${result.points} pontos adicionados. Total da conta: ${result.totalPoints} pontos.`
        : 'Não foi possível salvar agora. Verifique sua conexão e tente novamente.';
    }
  }

  // CAPTURE: intercepta apenas os controles do quiz antes dos listeners antigos do app.js.
  // Isso corrige o conflito em que o clique da alternativa podia disparar uma ação diferente.
  document.addEventListener('click', (event) => {
    const option = event.target.closest?.('#quizContainer .quiz-option');
    if (option) {
      event.preventDefault();
      event.stopImmediatePropagation();
      selectOption(option);
      return;
    }

    const confirm = event.target.closest?.('#quizBtn');
    if (confirm) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (quizBtn.textContent.trim() === 'Jogar novamente') resetQuiz();
      else confirmAnswer();
      return;
    }

    const next = event.target.closest?.('#quizNext');
    if (next) {
      event.preventDefault();
      event.stopImmediatePropagation();
      nextQuestion();
      return;
    }

    const open = event.target.closest?.('#openQuiz');
    if (open) {
      event.preventDefault();
      event.stopImmediatePropagation();
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('lock');
      resetQuiz();
      $('#closeQuiz')?.focus();
    }
  }, true);

  // Fecha o quiz sem depender do listener do app.js.
  $('#closeQuiz')?.addEventListener('click', (event) => {
    event.preventDefault();
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lock');
  });
})();
