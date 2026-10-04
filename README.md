# DeNovoNao

Aplicativo web (PWA) para casais registrarem avaliações de lanchonetes, restaurantes e deliveries — e **não repetirem erros gastronômicos**. Cada avaliação guarda a nota do lugar, a opinião de cada pessoa do casal, alertas críticos ("veio frio", "maionese azeda"…) e se a visita foi presencial ou por delivery.

> O nome interno antigo do projeto era **Avalieitor**. Ele ainda aparece nos `package.json`, no nome do banco (`avalieitor`), no container Docker e no cache do service worker.

## Funcionalidades

- **Feed de avaliações** com busca por texto, filtro por lugar/local/nota, paginação e média de nota por lugar.
- **Avaliações públicas ou privadas**: as privadas só aparecem para o próprio casal.
- **Casais (`id_casal`)**: usuários com o mesmo `id_casal` compartilham as avaliações e podem editá-las/excluí-las.
- **Delivery**: a avaliação pode ser marcada como delivery em vez de ter um local físico.
- **Contas**: cadastro e login (por login ou e-mail), edição do perfil e troca de senha.
- **Área administrativa** (`/admin`): gerenciar usuários (papel, casal, ativo, exclusão) e ver todas as avaliações.
- **Offline-first**: se a rede cair, a avaliação vai para uma fila local (IndexedDB) e é enviada quando a conexão volta.
- **PWA instalável** no Android e no iPhone, com tema claro/escuro.

### Papéis de usuário (`role`)

| Valor | Papel | Pode |
|---|---|---|
| `0` | Visitante | Ver o feed público |
| `1` | Usuário | Criar, editar e excluir avaliações do próprio casal (padrão no cadastro) |
| `2` | Admin | Tudo acima + acessar `/admin` e editar/excluir qualquer avaliação |

## Stack

- **Frontend** (`frontend/`): Next.js 15 (App Router), React 19, Tailwind CSS 3, Dexie (IndexedDB), lucide-react, service worker manual.
- **Backend** (`backend/`): Node + Express 4 em TypeScript, MongoDB via Mongoose 8, autenticação JWT + bcrypt.
- **Banco**: MongoDB (local via Docker ou MongoDB Atlas em produção).
- **Deploy**: frontend no Vercel, backend no Render, banco no Atlas — veja [DEPLOY.md](DEPLOY.md).

## Mapa do projeto — onde mexer em cada coisa

```txt
DeNovoNao/
├── package.json            # Scripts da raiz: sobe front + back juntos (concurrently), Mongo via Docker
├── docker-compose.yml      # MongoDB 7 local (container "avalieitor-mongo", porta 27017)
├── DEPLOY.md               # Passo a passo de publicação (Vercel + Render + Atlas)
├── cspell.json             # Palavras liberadas no corretor ortográfico do editor
├── scripts/
│   ├── start-dev.ps1       # Instala tudo, cria os .env, sobe Mongo (se houver Docker) e roda o app
│   └── stop-dev.ps1        # Mata os processos nas portas 3000 e 4000
├── backend/
│   ├── .env.example        # Modelo das variáveis do backend
│   └── src/
│       ├── server.ts       # Ponto de entrada: conecta no Mongo e sobe a API
│       ├── app.ts          # Express: CORS, JSON, /api/health e registro das rotas
│       ├── config/
│       │   ├── env.ts      # Leitura das variáveis de ambiente (com valores padrão)
│       │   └── mongodb.ts  # Conexão com o Mongo + limpeza de índices legados
│       ├── data/review-store.ts   # Guarda se o driver ativo é "mongo" ou "memory"
│       ├── middlewares/auth.ts    # Lê o JWT, recarrega o usuário do banco, checa login e papel
│       ├── models/
│       │   ├── User.js     # Schema do usuário (name, login, email, passwordHash, role, id_casal, active)
│       │   └── Review.js   # Schema da avaliação (lugar, nota, opiniões, alertas, delivery, público…)
│       ├── routes/         # Definição dos endpoints (auth, reviews, admin) e permissões de cada um
│       ├── controllers/    # Regras de negócio de cada endpoint
│       │   ├── auth-controller.ts     # Cadastro, login, atualizar perfil/senha
│       │   ├── reviews-controller.ts  # Feed, criar, editar, excluir avaliações
│       │   └── admin-controller.ts    # Gestão de usuários e listagem geral
│       ├── utils/          # Geração de token e validação/parse dos dados de avaliação
│       └── types/auth.ts   # Tipos de usuário autenticado e papéis
└── frontend/
    ├── .env.example        # Modelo das variáveis do frontend
    ├── next.config.ts      # Config do Next (inclui IPs liberados para testar no celular em dev)
    ├── tailwind.config.ts
    ├── public/
    │   ├── manifest.json   # Manifesto do PWA (nome, ícones, cores)
    │   └── sw.js           # Service worker: cache e funcionamento offline (só em produção)
    └── src/
        ├── app/            # Rotas do Next (App Router)
        │   ├── layout.tsx  # HTML raiz, metadados, manifest/PWA, providers
        │   ├── globals.css # Variáveis de cor dos temas claro/escuro e estilos globais
        │   ├── page.tsx    # "/"      → HomePage
        │   ├── login/      # "/login" → LoginPage
        │   └── admin/      # "/admin" → AdminPage
        ├── components/     # Telas e componentes visuais
        │   ├── home-page.tsx    # Tela principal: feed, filtros, tema, perfil/troca de senha
        │   ├── review-form.tsx  # Formulário de criar/editar avaliação
        │   ├── login-page.tsx   # Login e cadastro
        │   ├── admin-page.tsx   # Painel administrativo
        │   └── providers/app-providers.tsx  # Junta os contexts e registra/atualiza o service worker
        ├── contexts/       # Estado global
        │   ├── auth-context.tsx        # Sessão do usuário (salva no localStorage)
        │   ├── connection-context.tsx  # Online/offline
        │   ├── pwa-context.tsx         # Estado de atualização do PWA
        │   └── ui-context.tsx          # Loader global
        ├── hooks/          # useAuth, useConnection, useReviews (carrega o feed)
        └── lib/
            ├── api/        # Chamadas HTTP ao backend (auth, reviews, admin)
            ├── offline/    # Dexie: fila local, sincronização e mescla com dados remotos
            ├── auth/decode-token.ts
            ├── client-id.ts
            └── types.ts    # Tipos compartilhados do frontend
```

### Guia rápido de manutenção

| Quero… | Vá em |
|---|---|
| Adicionar/alterar um campo da avaliação | `backend/src/models/Review.js` → `backend/src/utils/parse-review-input.ts` → normalização em `reviews-controller.ts` → `frontend/src/lib/types.ts` → `review-form.tsx` e exibição em `home-page.tsx` |
| Criar um endpoint novo | Controller em `backend/src/controllers/`, rota em `backend/src/routes/`, registrar em `backend/src/app.ts` se for um router novo, chamada em `frontend/src/lib/api/` |
| Mudar quem pode fazer o quê | `backend/src/routes/*.ts` (`requireAuth`, `requireRoleAtLeast`) e checagens de `id_casal` nos controllers |
| Mudar cores/tema | Variáveis CSS em `frontend/src/app/globals.css` (`:root` = escuro, `:root[data-theme="light"]` = claro) |
| Mudar nome/ícone do app instalado | `frontend/public/manifest.json`, ícones em `frontend/public/` e `metadata` em `frontend/src/app/layout.tsx` |
| Forçar atualização do PWA nos celulares | Incrementar `CACHE_NAME` em `frontend/public/sw.js` |
| Liberar um novo domínio do frontend | Variável `CLIENT_ORIGIN` do backend (separada por vírgula) |
| Testar pelo celular na rede local | Adicionar o IP em `allowedDevOrigins` no `frontend/next.config.ts` e em `CLIENT_ORIGIN` |
| Problemas de login/token | `backend/src/middlewares/auth.ts`, `backend/src/utils/auth-token.ts`, `frontend/src/contexts/auth-context.tsx` |
| Problemas com envio offline | `frontend/src/lib/offline/sync.ts` e `db.ts` |

## Como rodar localmente

### Pré-requisitos

- Node.js 20+
- MongoDB: Docker (recomendado) **ou** uma string de conexão do MongoDB Atlas

### Forma mais simples (Windows PowerShell)

```powershell
.\scripts\start-dev.ps1   # instala, cria os .env, sobe Mongo e roda tudo
.\scripts\stop-dev.ps1    # para tudo
```

### Forma manual

```bash
npm install
npm --prefix backend install
npm --prefix frontend install

copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env.local

npm run mongo:up   # opcional, se usar Docker
npm run dev        # frontend em http://localhost:3000 e API em http://localhost:4000
```

### Scripts da raiz

| Script | O que faz |
|---|---|
| `npm run dev` | Sobe backend e frontend juntos |
| `npm run dev:frontend` / `dev:backend` | Sobe só um dos lados |
| `npm run build` | Compila backend e frontend |
| `npm run mongo:up` / `mongo:down` | Liga/desliga o MongoDB no Docker |

## Variáveis de ambiente

**Backend** (`backend/.env`)

| Variável | Para quê | Padrão |
|---|---|---|
| `PORT` | Porta da API | `4000` |
| `MONGODB_URI` | Conexão com o MongoDB | `mongodb://127.0.0.1:27017/avalieitor` |
| `CLIENT_ORIGIN` | Origens liberadas no CORS (separadas por vírgula; aceita `*` como curinga, ex.: `https://<projeto>-*.vercel.app`) | `http://localhost:3000,http://127.0.0.1:3000` |
| `STORAGE_MODE` | `auto` tenta o Mongo; `memory` desliga o Mongo | `auto` |
| `JWT_SECRET` | Segredo para assinar os tokens — **troque em produção** | `change-me` |

**Frontend** (`frontend/.env.local`)

| Variável | Para quê |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL base da API, ex.: `http://localhost:4000/api` |

## Endpoints da API

Todas as rotas ficam sob `/api`. Rotas autenticadas usam `Authorization: Bearer <token>`.

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/health` | Livre | Status da API e modo de armazenamento |
| POST | `/auth/register` | Livre | Cadastro (`name`, `login`, `password`) |
| POST | `/auth/login` | Livre | Login por login ou e-mail |
| PUT | `/auth/me` | Logado | Atualiza nome, login e/ou senha |
| GET | `/reviews` | Livre | Feed (`q`, `placeName`, `locationLabel`, `rating`, `page`) |
| POST | `/reviews` | Papel ≥ 1 | Cria avaliação (precisa ter `id_casal`) |
| PUT | `/reviews/:id` | Papel ≥ 1 | Edita (dono do casal ou admin) |
| DELETE | `/reviews/:id` | Papel ≥ 1 | Exclui — `soft` (desativa) ou `hard` (apaga) |
| GET | `/admin/users` | Admin | Lista usuários (`q`) |
| PUT | `/admin/users/:id` | Admin | Edita usuário (papel, casal, ativo…) |
| DELETE | `/admin/users/:id` | Admin | Exclui usuário e desativa as avaliações dele |
| GET | `/admin/users/:id/reviews` | Admin | Avaliações do casal do usuário |
| GET | `/admin/reviews` | Admin | Todas as avaliações (`q`, `sort=alpha\|recent`, `page`) |

## Fluxo offline-first

1. O usuário preenche a avaliação.
2. Com internet, o frontend envia para `POST /api/reviews`.
3. Sem rede, a avaliação é salva no IndexedDB (`denovonao` → `queuedReviews`) com status `pending`.
4. O feed mostra as avaliações locais mescladas com as do servidor.
5. Quando a conexão volta (e há sessão), `syncPendingReviews` reenvia a fila; em caso de erro o item fica `failed` e é tentado de novo depois.

## Observações importantes

- **O MongoDB é obrigatório para o app funcionar de verdade.** Se o Mongo não conectar, a API sobe em modo `memory`, mas as rotas de avaliações, login e admin respondem `503`. Esse modo serve só para checar se a API está no ar.
- Ao conectar, o backend remove automaticamente índices antigos do banco (de versões anteriores do schema) e sincroniza os novos.
- O controller de avaliações ainda entende campos antigos (`coupleRating`, `myOpinion`, `herOpinion`, `redFlags`, `createdBy`) para manter compatíveis os registros legados.
- O service worker só é registrado em `production`. Em `localhost`/rede local ele se desregistra sozinho para não deixar cache quebrado.
- A sessão (token JWT) fica no `localStorage`; o tema escolhido também (`denovonao-theme`).
