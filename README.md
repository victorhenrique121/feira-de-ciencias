# Energia Solar — Feira de Ciências

## 1. Rodar o site com o back-end

É necessário ter Node.js instalado.

```bash
npm install
npm start
```

Depois abra:

`http://localhost:3000`

Não abra o `index.html` diretamente com duplo clique se quiser registrar os resultados do quiz, pois o `fetch('/api/quiz-results')` precisa do servidor.

## 2. Onde ficam os resultados

Os resultados são salvos automaticamente em:

`server/data/quiz-results.json`

Cada registro contém nome, score, total, percentual, data e as respostas dadas.

## 3. API

### POST /api/quiz-results

Exemplo de payload:

```json
{
  "nome": "Victor",
  "score": 7,
  "total": 8,
  "percentual": 88,
  "respostas": [
    {
      "pergunta": "...",
      "respostaSelecionada": 1,
      "resposta": "...",
      "correta": 1,
      "acertou": true
    }
  ]
}
```

### GET /api/quiz-results

Retorna os resultados registrados. Para uma feira local, isso é suficiente como demonstração; para produção, seria recomendável autenticação, banco de dados e controles de acesso.
