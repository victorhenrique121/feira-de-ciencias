(() => {
  const form = document.querySelector('#loginForm');
  const nomeInput = document.querySelector('#nome');
  const emailInput = document.querySelector('#email');
  const error = document.querySelector('#error');
  const button = form?.querySelector('button[type="submit"]');

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const nome = nomeInput.value.trim();
    const email = emailInput.value.trim();

    if (nome.length < 2) {
      error.textContent = 'Digite seu nome para continuar.';
      nomeInput.focus();
      return;
    }

    if (email && !emailInput.checkValidity()) {
      error.textContent = 'Digite um e-mail válido ou deixe o campo vazio.';
      emailInput.focus();
      return;
    }

    error.textContent = '';
    button.disabled = true;
    button.querySelector('span').textContent = 'Entrando...';

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nome, email })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.erro || 'Não foi possível entrar.');

      sessionStorage.setItem('visitante', JSON.stringify({
        id: data.user.id,
        nome: data.user.name,
        email: data.user.email || ''
      }));

      window.location.href = '/';
    } catch (err) {
      error.textContent = err.message || 'Erro de conexão. Tente novamente.';
      button.disabled = false;
      button.querySelector('span').textContent = 'Entrar na experiência';
    }
  });
})();
