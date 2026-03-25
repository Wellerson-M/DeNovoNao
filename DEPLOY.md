# Deploy Para Celular

Objetivo: publicar o app para abrir no Android e iPhone fora da rede local e permitir instalacao como web app.

## Arquitetura recomendada

- `frontend/` no Vercel
- `backend/` no Render
- MongoDB Atlas como banco principal

## 1. Backend no Render

Crie um novo `Web Service` apontando para este repositorio.

Configuracao:

- Root Directory: `backend`
- Build Command: `npm install && npm run build`
- Start Command: `npm run start`

Variaveis de ambiente:

- `PORT=4000`
- `MONGODB_URI=<sua-string-do-atlas>`
- `CLIENT_ORIGIN=<url-do-frontend>`
- `STORAGE_MODE=auto`

Depois de publicar, voce tera uma URL parecida com:

```txt
https://avalieitor-api.onrender.com
```

Teste:

```txt
https://avalieitor-api.onrender.com/api/health
```

## 2. Frontend no Vercel

Crie um projeto no Vercel apontando para este repositorio.

Configuracao:

- Root Directory: `frontend`

Variavel de ambiente:

- `NEXT_PUBLIC_API_URL=https://sua-api.onrender.com/api`

Depois do deploy, voce tera uma URL parecida com:

```txt
https://avalieitor.vercel.app
```

## 3. Ajustar CORS no backend

No Render, atualize:

```txt
CLIENT_ORIGIN=https://avalieitor.vercel.app
```

Se quiser manter mais de uma origem:

```txt
CLIENT_ORIGIN=https://avalieitor.vercel.app,https://www.seudominio.com
```

## 4. Instalar no celular

Android:

- abra a URL publicada no Chrome
- use `Adicionar a tela inicial` ou `Instalar app`

iPhone:

- abra a URL publicada no Safari
- toque em `Compartilhar`
- toque em `Adicionar a Tela de Inicio`
- ative `Abrir como App`, se aparecer

## 5. Observacoes

- PWA so deve ser usada em `production`
- em `localhost` e rede local, o projeto continua sem service worker persistente para evitar cache quebrado
- se o Atlas ficou exposto em algum momento, troque a senha do usuario
