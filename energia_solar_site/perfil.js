(() => {
  const visitor = (() => {
    try { return JSON.parse(sessionStorage.getItem('visitante') || 'null'); }
    catch { return null; }
  })();

  if (!visitor?.id) {
    location.replace('/login');
    return;
  }

  const $ = (selector) => document.querySelector(selector);
  const moneyTime = (seconds) => {
    if (!Number.isInteger(seconds)) return '—';
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}min ${String(sec).padStart(2, '0')}s`;
  };

  const date = (value) => new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });

  async function load() {
    try {
      const [profileRes, historyRes, rewardsRes] = await Promise.all([
        fetch(`/api/users/${visitor.id}`),
        fetch(`/api/users/${visitor.id}/history`),
        fetch(`/api/users/${visitor.id}/rewards`)
      ]);

      if (!profileRes.ok || !historyRes.ok || !rewardsRes.ok) throw new Error('Não foi possível carregar o perfil.');

      const { user, stats } = await profileRes.json();
      const history = await historyRes.json();
      const rewards = await rewardsRes.json();

      renderProfile(user, stats);
      renderHistory(history);
      renderChart(history);
      renderRewards(rewards);
    } catch (error) {
      $('#history').innerHTML = `<p class="empty">${error.message}</p>`;
      $('#rewards').innerHTML = '<p class="empty">Não foi possível carregar as recompensas.</p>';
    }
  }

  function renderProfile(user, stats) {
    $('#userName').textContent = user.name;
    $('#userEmail').textContent = user.email || 'Perfil identificado pelo nome';
    $('#avatar').textContent = user.name.charAt(0).toUpperCase();
    $('#statPoints').textContent = Number(user.points || 0).toLocaleString('pt-BR');
    $('#statQuizzes').textContent = stats.quizzes;
    $('#statAverage').textContent = `${Number(stats.average).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
    $('#statCorrect').textContent = stats.correct_answers;
  }

  function renderHistory(history) {
    if (!history.length) {
      $('#history').innerHTML = '<div class="empty">Você ainda não realizou nenhum quiz.<br><a href="/">Começar agora →</a></div>';
      return;
    }

    $('#history').innerHTML = history.map(item => `
      <article class="history-row">
        <div class="history-date"><strong>${date(item.created_at)}</strong><span>${item.activity}</span></div>
        <div class="history-score"><strong>${Number(item.percentage).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</strong><span>${item.score}/${item.total}</span></div>
        <div class="history-meta"><span>${item.points || 0} pontos</span><span>${item.correct_answers} acertos</span><span>${moneyTime(item.time_seconds)}</span></div>
      </article>
    `).join('');
  }

  function renderChart(history) {
    const chart = $('#historyChart');
    if (!history.length) {
      chart.innerHTML = '<div class="empty">O gráfico aparecerá depois da primeira tentativa.</div>';
      return;
    }

    const items = [...history].reverse();
    const W = 800, H = 260, p = { l: 42, r: 18, t: 20, b: 38 };
    const iw = W - p.l - p.r, ih = H - p.t - p.b;
    const x = i => p.l + (items.length === 1 ? iw / 2 : (i / (items.length - 1)) * iw);
    const y = value => p.t + ih - (Math.max(0, Math.min(100, value)) / 100) * ih;
    const points = items.map((item, i) => [x(i), y(item.percentage)]);
    const path = points.map((point, i) => `${i ? 'L' : 'M'} ${point[0].toFixed(1)} ${point[1].toFixed(1)}`).join(' ');

    chart.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolução das notas dos quizzes">
        <line x1="${p.l}" y1="${y(100)}" x2="${W-p.r}" y2="${y(100)}" class="grid-line"/>
        <line x1="${p.l}" y1="${y(70)}" x2="${W-p.r}" y2="${y(70)}" class="grid-line"/>
        <line x1="${p.l}" y1="${y(0)}" x2="${W-p.r}" y2="${y(0)}" class="grid-line"/>
        <text x="${p.l-8}" y="${y(100)+4}" text-anchor="end">100%</text>
        <text x="${p.l-8}" y="${y(70)+4}" text-anchor="end">70%</text>
        <text x="${p.l-8}" y="${y(0)+4}" text-anchor="end">0%</text>
        <path d="${path}" class="history-line"/>
        ${points.map((point, i) => `<circle cx="${point[0]}" cy="${point[1]}" r="5" class="history-point"><title>${items[i].percentage}% — ${items[i].points || 0} pontos — ${date(items[i].created_at)}</title></circle>`).join('')}
      </svg>
    `;

    if (items.length >= 2) {
      const first = Number(items[0].percentage);
      const last = Number(items[items.length - 1].percentage);
      const diff = last - first;
      $('#trendText').textContent = diff >= 0 ? `Evolução de +${diff.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} pontos` : `Variação de ${diff.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} pontos`;
    }
  }

  function renderRewards(rewards) {
    if (!rewards.length) {
      $('#rewards').innerHTML = `
        <div class="reward-locked">
          <div class="reward-icon">🎁</div>
          <strong>Seu e-book ainda está bloqueado</strong>
          <p>Conclua o quiz com pelo menos <b>70%</b> para desbloquear a recompensa.</p>
          <a href="/#quiz">Fazer o quiz →</a>
        </div>`;
      return;
    }

    $('#rewards').innerHTML = rewards.map(reward => `
      <article class="reward-card">
        <div class="reward-icon">📘</div>
        <div>
          <strong>${reward.name}</strong>
          <p>${reward.description || ''}</p>
          <small>Desbloqueado em ${date(reward.unlocked_at)}</small>
          <a class="reward-link" href="${reward.file_path}" target="_blank" rel="noopener">Abrir e-book →</a>
        </div>
      </article>
    `).join('');
  }

  $('#logout')?.addEventListener('click', () => {
    sessionStorage.removeItem('visitante');
    sessionStorage.removeItem('quizStartedAt');
    sessionStorage.removeItem('quizLastResult');
    location.replace('/login');
  });

  load();
})();
