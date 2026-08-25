(() => {
  'use strict';

  const visitor = (() => {
    try { return JSON.parse(sessionStorage.getItem('visitante') || 'null'); }
    catch { return null; }
  })();

  if (!visitor?.id) {
    if (!location.pathname.startsWith('/login')) location.replace('/login');
    return;
  }

  const firstName = String(visitor.nome || 'Visitante').trim().split(/\s+/)[0] || 'Visitante';
  const style = document.createElement('style');
  style.textContent = `
    .compact-userbar{position:fixed;top:0;left:0;right:0;z-index:10000;height:54px;background:#0f2f26;color:#fff;border-bottom:1px solid #315347;display:flex;align-items:center;box-sizing:border-box;font:500 14px/1 "DM Sans",sans-serif;box-shadow:0 8px 24px #10201b18}
    .compact-userbar *{box-sizing:border-box}.compact-userbar-inner{width:min(1180px,calc(100% - 28px));margin:auto;display:flex;align-items:center;gap:22px}.compact-brand{color:#fff;text-decoration:none;font:700 16px/1 "Space Grotesk",sans-serif;white-space:nowrap}.compact-brand b{color:#d8f581}.compact-nav{display:flex;align-items:center;gap:4px}.compact-nav a{color:#c9d8d2;text-decoration:none;padding:9px 11px;border-radius:9px}.compact-nav a:hover,.compact-nav a[aria-current="page"]{color:#fff;background:#ffffff12}.compact-profile{margin-left:auto;color:#d8f581;text-decoration:none;white-space:nowrap;max-width:190px;overflow:hidden;text-overflow:ellipsis}.compact-profile:hover{text-decoration:underline}.compact-spacer{height:54px}.compact-userbar + *{ }
    .invest-question{margin-top:24px;padding:22px;border:1px solid #dfe9e3;border-radius:18px;background:#f8fbf8;text-align:left}.invest-question h4{margin:0 0 6px;font:700 18px/1.2 "Space Grotesk",sans-serif;color:#102f26}.invest-question p{margin:0 0 14px;color:#52645c}.invest-options{display:flex;gap:9px;flex-wrap:wrap}.invest-option{border:1px solid #b9cbc1;background:#fff;color:#17352c;border-radius:11px;padding:10px 16px;font:700 14px/1 "DM Sans",sans-serif;cursor:pointer}.invest-option:hover,.invest-option.selected{background:#d8f581;border-color:#b7d45f;color:#10201b}.invest-confirm{margin-top:14px;border:0;border-radius:11px;padding:11px 18px;background:#0f2f26;color:#fff;font:700 14px/1 "DM Sans",sans-serif;cursor:pointer}.invest-confirm:disabled{opacity:.45;cursor:not-allowed}.invest-status{margin-top:10px;font-size:13px;color:#466057}.reward-toast{position:fixed;right:24px;bottom:24px;z-index:10001;width:min(390px,calc(100vw - 32px));display:flex;gap:14px;align-items:flex-start;padding:18px;background:#0f2f26;color:#fff;border:1px solid #34584b;border-radius:18px;box-shadow:0 18px 45px #10201b40;font:14px/1.45 "DM Sans",sans-serif}.reward-toast-icon{width:42px;height:42px;border-radius:13px;background:#d8f581;color:#10201b;display:grid;place-items:center;font-size:20px;flex:none}.reward-toast strong{font-family:"Space Grotesk",sans-serif}.reward-toast p{margin:3px 0 7px;color:#c7d4ce}.reward-toast a{color:#d8f581;font-weight:700;text-decoration:none}.reward-toast button{margin-left:auto;background:none;border:0;color:#b9c9c1;font-size:22px;cursor:pointer}
    @media(max-width:640px){.compact-userbar-inner{gap:7px}.compact-brand{font-size:14px}.compact-nav a{padding:8px 7px;font-size:12px}.compact-profile{max-width:90px;font-size:12px}.compact-userbar-inner{width:calc(100% - 14px)}}
  `;
  document.head.appendChild(style);

  function injectCompactNav() {
    if (document.querySelector('.compact-userbar') || location.pathname.startsWith('/login')) return;
    const bar = document.createElement('header');
    bar.className = 'compact-userbar';
    const path = location.pathname;
    bar.innerHTML = `
      <div class="compact-userbar-inner">
        <a class="compact-brand" href="/">Terceirão <b>2026</b></a>
        <nav class="compact-nav" aria-label="Navegação rápida">
          <a href="/" ${path === '/' ? 'aria-current="page"' : ''}>Home</a>
          <a href="/#quiz" ${path === '/' && location.hash === '#quiz' ? 'aria-current="page"' : ''}>Quiz</a>
          <a href="/perfil" ${path === '/perfil' ? 'aria-current="page"' : ''}>Perfil</a>
        </nav>
        <a class="compact-profile" href="/perfil" title="Abrir perfil">Olá, ${firstName}</a>
      </div>`;
    document.body.prepend(bar);
    const spacer = document.createElement('div');
    spacer.className = 'compact-spacer';
    bar.after(spacer);
  }

  injectCompactNav();

  const quizStartedAt = Number(sessionStorage.getItem('quizStartedAt')) || Date.now();
  sessionStorage.setItem('quizStartedAt', String(quizStartedAt));

  let pendingQuiz = null;
  let pendingOriginalFetch = null;

  function createInvestmentQuestion() {
    if (!document.querySelector('.quiz-result') || document.querySelector('.invest-question')) return;
    const result = document.querySelector('.quiz-result');
    const box = document.createElement('section');
    box.className = 'invest-question';
    box.innerHTML = `
      <h4>Com esses dados, você investiria em energia solar?</h4>
      <p>Sua resposta será registrada como parte da pesquisa da Feira de Ciências.</p>
      <div class="invest-options" role="group" aria-label="Você investiria em energia solar?">
        <button class="invest-option" type="button" data-invest="sim">Sim</button>
        <button class="invest-option" type="button" data-invest="nao">Não</button>
        <button class="invest-option" type="button" data-invest="talvez">Talvez</button>
      </div>
      <button class="invest-confirm" type="button" disabled>Confirmar resposta</button>
      <div class="invest-status" aria-live="polite"></div>
    `;
    result.appendChild(box);

    let selected = '';
    box.querySelectorAll('.invest-option').forEach((button) => {
      button.addEventListener('click', () => {
        selected = button.dataset.invest;
        box.querySelectorAll('.invest-option').forEach((b) => b.classList.toggle('selected', b === button));
        box.querySelector('.invest-confirm').disabled = false;
      });
    });

    box.querySelector('.invest-confirm').addEventListener('click', async () => {
      if (!selected || !pendingQuiz) return;
      const confirm = box.querySelector('.invest-confirm');
      const status = box.querySelector('.invest-status');
      confirm.disabled = true;
      status.textContent = 'Salvando sua resposta...';
      try {
        pendingQuiz.would_invest = selected;
        const response = await pendingOriginalFetch(pendingQuiz.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pendingQuiz.body)
        });
        if (!response.ok) throw new Error('Falha ao salvar');
        const data = await response.clone().json();
        pendingQuiz = null;
        status.textContent = '✓ Resultado e resposta registrados.';
        if (data.rewardUnlocked) showRewardNotice(data.reward);
        confirm.textContent = 'Resposta registrada';
      } catch (error) {
        confirm.disabled = false;
        status.textContent = 'Não foi possível salvar. Tente novamente.';
        console.warn(error);
      }
    });
  }

  const observer = new MutationObserver(() => createInvestmentQuestion());
  observer.observe(document.body, { childList: true, subtree: true });
  createInvestmentQuestion();

  const originalFetch = window.fetch.bind(window);
  pendingOriginalFetch = originalFetch;
  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url || '';

    if ((url.includes('/api/quiz-results') || url.includes('/api/quiz-attempts')) && init.body) {
      try {
        const body = JSON.parse(init.body);
        body.userId = visitor.id;
        body.nome = visitor.nome;
        body.email = visitor.email || '';
        body.timeSeconds = Math.max(0, Math.floor((Date.now() - Number(sessionStorage.getItem('quizStartedAt') || quizStartedAt)) / 1000));
        pendingQuiz = { url, body };
        // A tentativa só é realmente gravada depois que o participante responde à pesquisa.
        return new Promise((resolve) => {
          pendingQuiz.resolve = resolve;
        });
      } catch {}
    }

    return originalFetch(input, init);
  };

  function showRewardNotice(reward) {
    if (document.querySelector('.reward-toast')) return;
    const toast = document.createElement('aside');
    toast.className = 'reward-toast';
    toast.innerHTML = `
      <div class="reward-toast-icon">🎁</div>
      <div><strong>Recompensa desbloqueada</strong><p>${reward?.name || 'E-book Energia Sustentável'}</p><a href="/ebook" target="_blank" rel="noopener">Abrir e-book →</a></div>
      <button type="button" aria-label="Fechar">×</button>`;
    toast.querySelector('button').addEventListener('click', () => toast.remove());
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 12000);
  }
})();
