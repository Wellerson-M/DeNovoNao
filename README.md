# Avalieitor

Starter full stack para um app responsivo e offline-first de avaliacoes de lanchonetes.

## Stack

- `frontend/`: Next.js App Router + React + Tailwind CSS + Dexie + Service Worker
- `backend/`: Express + MongoDB + Mongoose

## Estrutura

- `frontend/src/app`: layout, pagina inicial e estilos globais
- `frontend/src/components`: tela inicial, formulario e providers
- `frontend/src/hooks`: status de rede e carga das avaliacoes
- `frontend/src/lib`: API, tipos e camada offline
- `backend/src/config`: ambiente e conexao com Mongo
- `backend/src/models`: schema Mongoose
- `backend/src/routes`: endpoints REST

## Fluxo offline-first

1. O usuario preenche a avaliacao.
2. Se a internet estiver disponivel, o frontend envia para `POST /api/reviews`.
3. Se a rede falhar, a review e salva no IndexedDB com status `pending`.
4. Quando a conexao volta, o app sincroniza automaticamente a fila offline.
5. A API usa `syncMeta.clientReviewId` para evitar duplicatas durante reenvio.

## Como rodar

1. Instale as dependencias:

```bash
npm install
npm --prefix frontend install
npm --prefix backend install
```

2. Configure os ambientes:

```bash
copy backend\\.env.example backend\\.env
copy frontend\\.env.example frontend\\.env.local
```

3. Forma mais simples no Windows PowerShell:

```powershell
.\scripts\start-dev.ps1
```

Se precisar parar tudo:

```powershell
.\scripts\stop-dev.ps1
```

4. Forma manual:

```bash
npm run dev
```

## Endpoints

- `GET /api/health`
- `GET /api/reviews?q=texto`
- `POST /api/reviews`

## Observacoes

- Se o MongoDB nao estiver disponivel, o backend entra automaticamente em modo `memory`.
- Se Docker estiver instalado, voce pode subir Mongo com `npm run mongo:up`.
- O service worker atual cuida do cache da app shell e fallback basico offline.
- A sincronizacao das reviews pendentes acontece no cliente quando o navegador detecta reconexao.
- Se quiser, o proximo passo natural e trocar o `sw.js` manual por uma configuracao mais avancada com Workbox.
