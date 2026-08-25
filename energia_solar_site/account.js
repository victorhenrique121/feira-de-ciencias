(() => {
  const visitor = (() => {
    try { return JSON.parse(sessionStorage.getItem('visitante') || 'null'); }
    catch { return null; }
  })();

  if (!visitor?.id) {
    if (!location.pathname.startsWith('/login')) location.replace('/login');
    return;
  }

  const quizStartedAt = Date.now();
  sessionStorage.setItem('quizStartedAt', String(quizStartedAt));

  const style = document.createElement('style');
  style.textContent = `.reward-toast{position:fixed;right:24px;bottom:24px;z-index:9999;width:min(390px,calc(100vw - 32px));display:flex;gap:14px;align-items:flex-start;padding:18px;background:#0f2f26;color:#fff;border:1px solid #34584b;border-radius:18px;box-shadow:0 18px 45px #10201b40;font:14px/1.45 "DM Sans",sans-serif}.reward-toast-icon{width:42px;height:42px;border-radius:13px;background:#d8f581;color:#10201b;display:grid;place-items:center;font-size:20px;flex:none}.reward-toast strong{font-family:"Space Grotesk",sans-serif}.reward-toast p{margin:3px 0 7px;color:#c7d4ce}.reward-toast a{color:#d8f581;font-weight:700;text-decoration:none}.reward-toast button{margin-left:auto;background:none;border:0;color:#b9c9c1;font-size:22px;cursor:pointer}`;
  document.head.appendChild(style);

  function addProfileLink() {
    const nav = document.querySelector('#navLinks');
    if (!nav || nav.querySelector('[data-profile-link]')) return;
    const link = document.createElement('a');
    link.href = '/perfil';
    link.dataset.profileLink = 'true';
    link.textContent = `Olá, ${String(visitor.nome || 'Visitante').split(' ')[0]}`;
    nav.appendChild(link);
  }

  addProfileLink();

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url || '';

    if (url.includes('/api/quiz-results') && init.body) {
      try {
        const body = JSON.parse(init.body);
        body.userId = visitor.id;
        body.nome = visitor.nome;
        body.email = visitor.email || '';
        body.timeSeconds = Math.max(0, Math.floor((Date.now() - Number(sessionStorage.getItem('quizStartedAt') || quizStartedAt)) / 1000));
        init.body = JSON.stringify(body);
      } catch {}
    }

    const response = await originalFetch(input, init);

    if (url.includes('/api/quiz-results') && response.ok) {
      try {
        const data = await response.clone().json();
        if (data.rewardUnlocked) showRewardNotice(data.reward);
      } catch {}
    }

    return response;
  };

  function showRewardNotice(reward) {
    if (document.querySelector('.reward-toast')) return;
    const toast = document.createElement('aside');
    toast.className = 'reward-toast';
    toast.innerHTML = `
      <div class="reward-toast-icon">🎁</div>
      <div>
        <strong>Recompensa desbloqueada</strong>
        <p>${reward?.name || 'E-book Energia Sustentável'}</p>
        <a href="/ebook" target="_blank" rel="noopener">Abrir e-book →</a>
      </div>
      <button type="button" aria-label="Fechar">×</button>
    `;
    toast.querySelector('button').addEventListener('click', () => toast.remove());
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 12000);
  }
})();
