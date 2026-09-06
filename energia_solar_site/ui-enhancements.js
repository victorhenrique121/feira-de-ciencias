(() => {
  const storageKeys = {
    theme: 'terceirao.theme',
    house: 'terceirao.house-simulator',
    finance: 'terceirao.finance-simulator'
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function read(key, fallback = {}) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; }
    catch { return fallback; }
  }

  function applyTheme(theme) {
    const dark = theme === 'dark';
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    const toggle = $('#themeToggle');
    if (!toggle) return;
    toggle.setAttribute('aria-pressed', String(dark));
    toggle.setAttribute('aria-label', dark ? 'Ativar modo claro' : 'Ativar modo escuro');
    toggle.innerHTML = `<span aria-hidden="true">${dark ? '☀' : '☾'}</span><span class="theme-toggle-label">${dark ? 'Modo claro' : 'Modo escuro'}</span>`;
  }

  function setupTheme() {
    const saved = localStorage.getItem(storageKeys.theme);
    const preferred = saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(preferred);
    $('#themeToggle')?.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem(storageKeys.theme, next);
      applyTheme(next);
    });
  }

  function setupSimulatorStorage() {
    const groups = [
      { key: storageKeys.house, ids: ['houseKwh', 'houseBill', 'houseInvestment', 'houseSaving'] },
      { key: storageKeys.finance, ids: ['investimento', 'economia', 'anos'] }
    ];
    groups.forEach(({ key, ids }) => {
      const fields = ids.map((id) => document.getElementById(id)).filter(Boolean);
      const saved = read(key);
      fields.forEach((field) => {
        if (saved[field.id] !== undefined) field.value = saved[field.id];
        field.addEventListener('input', () => {
          const current = read(key);
          current[field.id] = field.value;
          localStorage.setItem(key, JSON.stringify(current));
        });
      });
    });
    $('#calcBtn')?.dispatchEvent(new Event('click'));
    fieldsInputEvent();
  }

  function fieldsInputEvent() {
    ['houseKwh', 'houseBill', 'houseInvestment', 'houseSaving'].forEach((id) => {
      document.getElementById(id)?.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  function addTooltips() {
    const tips = {
      houseKwh: 'Consumo mensal em quilowatt-hora, indicado na conta de luz.',
      houseBill: 'Valor médio pago mensalmente pela residência.',
      houseInvestment: 'Estimativa do custo de compra e instalação do sistema.',
      houseSaving: 'Percentual da conta que a geração solar pode compensar.',
      investimento: 'Valor inicial usado para instalar o sistema.',
      economia: 'Valor estimado economizado a cada mês.',
      anos: 'Quantidade de anos observada no cenário educativo.'
    };
    Object.entries(tips).forEach(([id, text]) => {
      const field = document.getElementById(id);
      const label = field?.closest('label');
      if (!field || !label || label.querySelector('.help-tip')) return;
      const tip = document.createElement('button');
      tip.type = 'button';
      tip.className = 'help-tip';
      tip.setAttribute('aria-label', `Ajuda: ${text}`);
      tip.setAttribute('data-tooltip', text);
      tip.textContent = '?';
      label.insertBefore(tip, field);
    });
  }

  function setupFeedback() {
    document.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button || button.classList.contains('help-tip')) return;
      button.classList.remove('is-clicked');
      requestAnimationFrame(() => button.classList.add('is-clicked'));
    });
  }

  function setupModals() {
    $$('.modal').forEach((modal) => {
      const getFocusable = () => $$('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]', modal);
      const observer = new MutationObserver(() => {
        const open = modal.classList.contains('open');
        modal.setAttribute('aria-hidden', String(!open));
        modal.classList.toggle('is-opening', open);
      });
      observer.observe(modal, { attributes: true, attributeFilter: ['class'] });
      modal.addEventListener('keydown', (event) => {
        if (event.key !== 'Tab' || !modal.classList.contains('open')) return;
        const focusable = getFocusable();
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      });
    });
  }

  function setupFactoids() {
    const items = [
      'A energia solar não emite poluentes durante a geração.',
      'Painéis também produzem energia em dias nublados, usando luz difusa.',
      'Reduzir o consumo é tão importante quanto gerar energia limpa.',
      'Payback é uma estimativa, não uma garantia de retorno financeiro.'
    ];
    const target = $('#factoidText');
    if (!target) return;
    let index = 0;
    window.setInterval(() => {
      target.classList.add('factoid-out');
      window.setTimeout(() => {
        index = (index + 1) % items.length;
        target.textContent = items[index];
        target.classList.remove('factoid-out');
      }, 180);
    }, 5000);
  }

  setupTheme();
  setupSimulatorStorage();
  addTooltips();
  setupFeedback();
  setupModals();
  setupFactoids();
})();