(() => {
  'use strict';

  let confirming = false;
  let selectedOption = null;

  function quizButton() {
    return document.querySelector('#quizBtn');
  }

  function refreshConfirmButton() {
    const button = quizButton();
    if (!button || button.hidden) return;
    if (button.textContent !== 'Jogar novamente') {
      button.textContent = 'Confirmar Resposta';
      button.disabled = !selectedOption;
    }
  }

  // O app original adiciona o listener diretamente às alternativas. Este listener
  // captura o clique antes dele para transformar a alternativa em seleção.
  document.addEventListener('click', (event) => {
    const option = event.target.closest?.('.quiz-option');
    if (option && !confirming && !option.disabled) {
      event.preventDefault();
      event.stopImmediatePropagation();
      document.querySelectorAll('.quiz-option').forEach((button) => button.classList.remove('selected'));
      option.classList.add('selected');
      selectedOption = option;
      refreshConfirmButton();
      return;
    }

    const button = event.target.closest?.('#quizBtn');
    if (button && !button.hidden && !button.disabled && button.textContent.trim() === 'Confirmar Resposta') {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!selectedOption) return;

      confirming = true;
      selectedOption.click();
      confirming = false;
      selectedOption = null;
      refreshConfirmButton();
    }
  }, true);

  const observer = new MutationObserver(() => {
    const question = document.querySelector('.question');
    if (!question) {
      selectedOption = null;
      return;
    }

    const options = document.querySelectorAll('.quiz-option');
    if (options.length) {
      selectedOption = null;
      requestAnimationFrame(refreshConfirmButton);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
