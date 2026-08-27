(() => {
  'use strict';
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const modal = $('#quizModal'), quiz = $('#quizContainer'), quizBtn = $('#quizBtn'), quizNext = $('#quizNext');
  if (!modal || !quiz || !quizBtn || !quizNext) return;

  const images = [
    'https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=1200&q=82',
    'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=1200&q=82',
    'https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=1200&q=82',
    'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?auto=format&fit=crop&w=1200&q=82',
    'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&w=1200&q=82'
  ];

  let questions = [], currentQuestionIndex = 0, score = 0, totalScore = 0;
  let isFinished = false, selectedAnswer = null, answered = false, startedAt = 0;
  let currentBasePoints = 0, saving = false;

  const clearQuizStorage = () => {
    ['quizFinished','quizCompleted','quizState','quizLastResult'].forEach(k => {
      sessionStorage.removeItem(k); localStorage.removeItem(k);
    });
  };
  const visitor = () => { try { return JSON.parse(sessionStorage.getItem('visitante') || '{}'); } catch { return {}; } };
  const shuffle = a => [...a].sort(() => Math.random() - .5);
  const basePoints = () => Math.floor(Math.random() * 10) + 4;
  const earnedPoints = (base, correct) => correct ? Math.round(base * 1.2) : base;

  function resetQuiz() {
    clearQuizStorage();
    const pool = Array.isArray(window.PERGUNTAS) ? window.PERGUNTAS : [];
    questions = shuffle(pool).slice(0, Math.min(8, pool.length));
    currentQuestionIndex = 0; score = 0; totalScore = 0; isFinished = false;
    selectedAnswer = null; answered = false; saving = false; startedAt = Date.now();
    sessionStorage.setItem('quizStartedAt', String(startedAt));
    quizBtn.hidden = false; quizBtn.disabled = true; quizBtn.textContent = 'Confirmar Resposta';
    quizNext.hidden = true; renderQuestion();
  }

  function renderQuestion() {
    if (isFinished) return showResult();
    const q = questions[currentQuestionIndex];
    if (!q) return;
    selectedAnswer = null; answered = false; currentBasePoints = basePoints();
    const letters = ['A','B','C','D'];
    const progress = Math.round((currentQuestionIndex / questions.length) * 100);
    quiz.innerHTML = `
      <div class="quiz-progress"><div class="quiz-progress-top"><span>Questão ${currentQuestionIndex + 1} de ${questions.length}</span><strong>${progress}%</strong></div><div class="quiz-progress-track"><span style="width:${progress}%"></span></div></div>
      <article class="question">
        <div class="quiz-image-wrap"><img src="${images[currentQuestionIndex % images.length]}" alt="Energia e sustentabilidade" loading="lazy"></div>
        <h3>${currentQuestionIndex + 1}. ${q.pergunta}</h3>
        <div class="quiz-options">${q.opcoes.map((o,i) => `<button class="quiz-option" type="button" data-answer="${i}" aria-pressed="false"><span class="quiz-letter">${letters[i]}</span><span>${o}</span></button>`).join('')}</div>
        <div class="quiz-points-badge">🎯 ${currentBasePoints} pontos base nesta pergunta</div>
        <p class="quiz-confirm-help">Selecione uma alternativa e clique em <strong>Confirmar Resposta</strong>.</p>
        <div id="quizFeedback" class="quiz-feedback" hidden></div><div id="quizExplanation" class="quiz-explanation"></div>
      </article>`;
    quizBtn.hidden = false; quizBtn.disabled = true; quizBtn.textContent = 'Confirmar Resposta'; quizNext.hidden = true;
  }

  function selectAnswer(button) {
    if (answered || !button) return;
    const n = Number(button.dataset.answer), q = questions[currentQuestionIndex];
    if (!Number.isInteger(n) || !q?.opcoes?.[n]) return;
    selectedAnswer = n;
    $$('.quiz-option').forEach(b => { const active = b === button; b.classList.toggle('selected', active); b.setAttribute('aria-pressed', String(active)); });
    quizBtn.disabled = false;
  }

  function confirmAnswer() {
    if (answered || selectedAnswer === null || saving || isFinished) return;
    const q = questions[currentQuestionIndex]; if (!q) return;
    answered = true; quizBtn.disabled = true; quizBtn.textContent = 'Confirmando...';
    const correct = selectedAnswer === Number(q.correta), points = earnedPoints(currentBasePoints, correct);
    if (correct) score++; totalScore += points;
    $$('.quiz-option').forEach(b => { b.disabled = true; const n = Number(b.dataset.answer); if (n === Number(q.correta)) b.classList.add('correct'); if (n === selectedAnswer && n !== Number(q.correta)) b.classList.add('wrong'); });
    const feedback = $('#quizFeedback');
    if (feedback) { feedback.hidden = false; feedback.className = `quiz-feedback ${correct ? 'correct' : 'wrong'}`; feedback.textContent = correct ? `✓ Correto! +${points} pontos.` : `✕ Incorreto. +${points} pontos. Resposta: ${q.opcoes[q.correta]}.`; }
    const explanation = $('#quizExplanation'); if (explanation) { explanation.textContent = q.explicacao || ''; explanation.classList.add('visible'); }
    if (currentQuestionIndex === questions.length - 1) { isFinished = true; setTimeout(showResult, 450); }
    else { quizBtn.textContent = 'Resposta confirmada'; quizNext.hidden = false; quizNext.disabled = false; quizNext.textContent = 'Próxima questão'; }
  }

  function nextQuestion() { if (!answered || isFinished) return; currentQuestionIndex++; renderQuestion(); }

  async function saveResult() {
    if (saving) return null; saving = true;
    const v = visitor(), total = questions.length, percentage = total ? Math.round(score / total * 100) : 0;
    if (!v.id) { saving = false; return null; }
    try {
      const r = await fetch('/api/quiz-attempts', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({userId:v.id,nome:v.nome||'Visitante',email:v.email||'',score,total,points:totalScore,timeSeconds:Math.max(0,Math.floor((Date.now()-startedAt)/1000))}) });
      const data = await r.json().catch(() => ({})); if (!r.ok) throw new Error(data.erro || 'Falha ao salvar');
      sessionStorage.setItem('quizLastResult', JSON.stringify({score,total,points:totalScore,totalPoints:data.totalPoints,percentage})); return data;
    } catch(e) { console.warn('Não foi possível salvar o resultado:', e); return null; }
    finally { saving = false; }
  }

  async function showResult() {
    if (!isFinished) return renderQuestion();
    const total = questions.length, percentage = total ? Math.round(score / total * 100) : 0;
    quiz.innerHTML = `<div class="quiz-result"><div class="quiz-result-icon">✓</div><div class="quiz-result-score">${percentage}%</div><h3>${percentage>=90?'Especialista em Energia!':percentage>=70?'Mandou muito bem!':percentage>=50?'Bom trabalho!':'Continue investigando!'}</h3><div class="quiz-result-grid"><div class="quiz-result-stat"><small>Acertos</small><strong>${score}/${total}</strong></div><div class="quiz-result-stat"><small>Pontos da rodada</small><strong>${totalScore}</strong></div><div class="quiz-result-stat"><small>Desempenho</small><strong>${percentage}%</strong></div></div><p>Você acumulou <strong>${totalScore} pontos</strong> nesta rodada.</p><div id="quizSaveStatus" class="quiz-save-status">Salvando sua pontuação...</div><div class="quiz-result-actions"><button class="btn secondary" id="quizBackHome" type="button">Voltar ao Início</button><button class="btn primary" id="quizRestart" type="button">Reiniciar Quiz</button></div></div>`;
    quizBtn.hidden = true; quizNext.hidden = true;
    const saved = await saveResult(); const status = $('#quizSaveStatus'); if (status) status.textContent = saved ? `Pontuação salva! Total na conta: ${saved.totalPoints ?? totalScore} pontos.` : 'Resultado exibido. Não foi possível sincronizar com o perfil.';
    $('#quizRestart')?.addEventListener('click', resetQuiz);
    $('#quizBackHome')?.addEventListener('click', () => { resetQuiz(); modal.classList.remove('open'); modal.setAttribute('aria-hidden','true'); document.body.classList.remove('lock'); location.hash='#inicio'; window.scrollTo({top:0,behavior:'smooth'}); });
  }

  // Captura antes do app.js legado: impede que seus listeners iniciem o quiz antigo.
  document.addEventListener('click', event => {
    const trigger = event.target.closest('#openQuiz, [data-open-quiz], .open-quiz');
    if (!trigger) return;
    event.preventDefault(); event.stopImmediatePropagation();
    clearQuizStorage(); resetQuiz(); modal.classList.add('open'); modal.setAttribute('aria-hidden','false'); document.body.classList.add('lock');
  }, true);

  document.addEventListener('click', event => {
    if (!event.target.closest('#quizBtn')) return;
    event.preventDefault(); event.stopImmediatePropagation(); confirmAnswer();
  }, true);

  document.addEventListener('click', event => {
    const option = event.target.closest('.quiz-option');
    if (option) selectAnswer(option);
  });
  quizNext.addEventListener('click', nextQuestion);

  // Estado inicial seguro: resultado persistido nunca é restaurado na abertura da aplicação.
  clearQuizStorage(); currentQuestionIndex = 0; score = 0; totalScore = 0; isFinished = false; selectedAnswer = null; answered = false;
})();
