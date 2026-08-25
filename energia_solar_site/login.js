(() => {
  const form = document.querySelector('#loginForm');
  const nomeInput = document.querySelector('#nome');
  const emailInput = document.querySelector('#email');
  const error = document.querySelector('#error');

  form?.addEventListener('submit', (event) => {
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
    sessionStorage.setItem('visitante', JSON.stringify({ nome, email }));
    window.location.href = '/';
  });
})();
