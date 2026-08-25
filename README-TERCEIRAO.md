# Terceirão 2026 — Energia Solar

## O que foi implementado

- SQLite com `better-sqlite3`.
- Cadastro/identificação por nome e e-mail opcional.
- Perfil em `/perfil`.
- Histórico otimizado: uma linha por tentativa, sem salvar as respostas detalhadas.
- Estatísticas de quizzes: quantidade, média, melhor nota e acertos.
- Gráfico de evolução no perfil.
- Recompensa automática: quiz com 70% ou mais desbloqueia o e-book.
- E-book educativo em `/ebook`.
- Migração automática do antigo `server/data/quiz-results.json` para SQLite na primeira inicialização.
- Estrutura de atividades preparada para novos simuladores, desafios e jogos.

## Rodar localmente

Na pasta que contém `package.json`:

```powershell
npm install
npm start
```

Abra:

```text
http://localhost:3000/login
```

## Banco

O arquivo SQLite é criado automaticamente em:

```text
server/data/terceirao.db
```

Ele não deve ser commitado. O `.gitignore` já está configurado para ignorar o banco e os arquivos WAL.

## Fluxo

```text
/login
  ↓
POST /api/users
  ↓
sessionStorage: visitante { id, nome, email }
  ↓
site principal
  ↓
POST /api/quiz-results
  ↓
quiz_attempts (resumo)
  ↓
70% ou mais → user_rewards
  ↓
/perfil → histórico + evolução + e-book
```

## Rotas principais

| Método | Rota | Uso |
|---|---|---|
| POST | `/api/users` | criar/identificar usuário |
| GET | `/api/users/:id` | perfil e estatísticas |
| GET | `/api/users/:id/history` | histórico |
| GET | `/api/users/:id/rewards` | recompensas |
| POST | `/api/quiz-results` | salvar tentativa resumida |
| GET | `/api/activities` | atividades disponíveis |
| GET | `/perfil` | painel do usuário |
| GET | `/ebook` | e-book |

## Observação sobre produção

SQLite é excelente para a versão local, apresentação e hospedagem com disco persistente. Em plataformas serverless com filesystem efêmero, como determinadas configurações da Vercel, o arquivo SQLite local não deve ser usado como banco persistente de produção. Nesse cenário, a camada de banco pode ser trocada por PostgreSQL/Neon sem alterar o modelo de negócio da aplicação.
