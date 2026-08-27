(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const modal = $('#quizModal');
  const quiz = $('#quizContainer');
  const quizBtn = $('#quizBtn');
  const quizNext = $('#quizNext');
  const quizScore = $('#quizScore');

  if (!modal || !quiz || !quizBtn || !quizNext) return;

  const imageUrls = [
    'https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=1200&q=82',
    'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=1200&q=82',
    'https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=1200&q=82',
    'https://images.unsplash.com/photo-1509390670806-7dcb9f7b6f4a?auto=format&fit=crop&w=1200&q=82',
    'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?auto=format&fit=crop&w=1200&q=82',
    'https://images.unsplash.com/photo-1548337138-e87d889cc369?auto=format&fit=crop&w=1200&q=82',
    'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&w=1200&q=82',
    'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&w=1200&q=82'
  ];

  const style = document.createElement('style');
  style.textContent = `
    .quiz-image-wrap{margin:16px 0 20px;border-radius:16px;overflow:hidden;background:#eaf0eb;aspect-ratio:16/7}
    .quiz-image-wrap img{width:100%;height:100%;display:block;object-fit:cover}
    .quiz-option.selected{border-color:#b7d45f!important;background:#d8f581!important;color:#10201b!important;transform:translateY(-1px)}
    .quiz-option{transition:transform .15s ease,background .15s ease,border-color .15s ease}
    .quiz-confirm-help{margin:12px 0 0;color:#62736c;font-size:13px}
  `;
  document.head.appendChild(style);

  let questions = [];
  let current = 0;
  let score = 0;
  let selected = null;
  let answered = false;
  let startedAt = 0;
  let saving = false;

  const shuffle = (items) => [...items].sort(() => Math.random() - 0.5);

  function resetQuiz() {
    const pool = Array.isArray(window.PERGUNTAS) ? window.PERGUNTAS : [];
    questions = shuffle(pool).slice(0, Math.min(8, pool.length));
    current = 0;
    score = 0;
    selected = null;
    answered = false;
    saving = false;
    startedAt = Date.now();
    sessionStorage.setItem('quizStartedAt', String(startedAt));
    if (quizScore) quizScore.textContent = '';
    quizBtn.hidden = false;
    quizNext.hidden = true;
    renderQuestion();
  }

  function renderQuestion() {
    const q = questions[current];
    if (!q) return showResult();

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
            <button class="quiz-option" type="button" data-answer="${index}">
              <span class="quiz-letter">${letters[index]}</span><span>${option}</span>
            </button>
          `).join('')}
        </div>
        <p class="quiz-confirm-help">Selecione uma alternativa e depois clique em <strong>Confirmar Resposta</strong>.</p>
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
    if (answered || option.disabled) return;
    selected = Number(option.dataset.answer);
    $$('.quiz-option').forEach((button) => button.classList.toggle('selected', button === option));
    quizBtn.disabled = false;
  }

  function confirmAnswer() {
    if (answered || selected === null) return;
    const q = questions[current];
    if (!q) return;

    answered = true;
    const options = $$('.quiz-option');
    const feedback = $('#quizFeedback');
    const explanation = $('#quizExplanation');

    options.forEach((button) => {
      button.disabled = true;
      const value = Number(button.dataset.answer);
      if (value === q.correta) button.classList.add('correct');
      if (value === selected && value !== q.correta) button.classList.add('wrong');
    });

    if (selected === q.correta) {
      score += 1;
      feedback.textContent = '✓ Correto! Você ganhou 100 pontos.';
      feedback.className = 'quiz-feedback correct';
    } else {
      feedback.textContent = `✕ Não foi dessa vez. Resposta: ${q.opcoes[q.correta]}.`;
      feedback.className = 'quiz-feedback wrong';
    }

    feedback.hidden = false;
    explanation.textContent = q.explicacao || '';
    explanation.classList.add('visible');
    quizBtn.disabled = true;
    quizNext.hidden = false;
    quizNext.textContent = current === questions.length - 1 ? 'Ver resultado' : 'Próxima questão';
  }

  function nextQuestion() {
    if (!answered) return;
    current += 1;
    renderQuestion();
  }

  async function saveResult() {
    if (saving) return;
    saving = true;
    const total = questions.length;
    const percentage = total ? Math.round((score / total) * 100) : 0;
    const timeSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    const visitor = (() => {
      try { return JSON.parse(sessionStorage.getItem('visitante') || '{}'); } catch { return {}; }
    })();

    try {
      const response = await fetch('/api/quiz-attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: visitor.id,
          nome: visitor.nome || 'Visitante',
          email: visitor.email || '',
          score,
          total,
          timeSeconds
        })
      });

      if (!response.ok) throw new Error('Falha ao salvar resultado');
      return await response.json();
    } catch (error) {
      console.warn('Não foi possível registrar o quiz:', error);
      return null;
    } finally {
      saving = false;
    }
  }

  async function showResult() {
    const total = questions.length;
    const percentage = total ? Math.round((score / total) * 100) : 0;
    let title = 'Continue investigando!';
    if (percentage >= 90) title = 'Especialista em Energia!';
    else if (percentage >= 70) title = 'Mandou muito bem!';
    else if (percentage >= 50) title = 'Bom trabalho!';

    quiz.innerHTML = `
      <div class="quiz-result">
        <div class="quiz-result-icon">✓</div>
        <div class="quiz-result-score">${percentage}%</div>
        <h3>${title}</h3>
        <p>Você acertou <strong>${score} de ${total}</strong> questões. Conhecimento também faz parte da sustentabilidade.</p>
        <div class="quiz-result-bar"><span style="width:${percentage}%"></span></div>
        <strong>${score * 100} pontos</strong>
        <div id="quizSaveStatus" class="quiz-save-status" aria-live="polite">Salvando seu resultado no perfil...</div>
      </div>
    `;

    quizBtn.hidden = false;
    quizBtn.disabled = false;
    quizBtn.textContent = 'Jogar novamente';
    quizNext.hidden = true;

    const result = await saveResult();
    const status = $('#quizSaveStatus');
    if (status) status.textContent = result ? '✓ Resultado registrado no seu perfil.' : 'Não foi possível registrar agora. Tente novamente.';
  }

  // Captura os eventos antes do app.js antigo para impedir que a alternativa confirme sozinha.
  document.addEventListener('click', (event) => {
    if (!modal.classList.contains('open')) return;

    const option = event.target.closest?.('.quiz-option');
    if (option) {
      event.preventDefault();
      event.stopImmediatePropagation();
      selectOption(option);
      return;
    }

    if (event.target.closest?.('#quizBtn')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (quizBtn.textContent.trim() === 'Jogar novamente') resetQuiz();
      else confirmAnswer();
      return;
    }

    if (event.target.closest?.('#quizNext')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      nextQuestion();
      return;
    }

    if (event.target.closest?.('#openQuiz')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      modal.classList.add('open');
      document.body.classList.add('lock');
      resetQuiz();
      $('#closeQuiz')?.focus();
    }
  }, true);
})();
