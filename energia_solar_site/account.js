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
