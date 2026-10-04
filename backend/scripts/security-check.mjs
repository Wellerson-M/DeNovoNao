/**
 * Bateria de testes de segurança da API.
 *
 *   node scripts/security-check.mjs                      (testa http://localhost:4000)
 *   node scripts/security-check.mjs https://sua-api.com  (testa outro endereço)
 *
 * Para checar também as regras de papel com uma conta real (sem poderes de
 * admin), informe credenciais de um usuário comum:
 *   SEC_LOGIN=fulano SEC_PASSWORD=senha node scripts/security-check.mjs
 *
 * Só faz leituras e tentativas de acesso indevido que DEVEM ser recusadas.
 * Nenhum teste apaga ou altera dados de verdade.
 */
import jwt from "jsonwebtoken";
import "dotenv/config";

const BASE = (process.argv[2] ?? "http://localhost:4000").replace(/\/$/, "");
const API = `${BASE}/api`;
const SECRET = process.env.JWT_SECRET ?? "change-me";

const results = [];
let currentGroup = "";

function group(name) {
  currentGroup = name;
}

let skipped = 0;

function skip(name, reason) {
  skipped += 1;
  console.log(`  [33mPULOU[0m ${name}  [90m${reason}[0m`);
}

function check(name, passed, detail = "") {
  results.push({ group: currentGroup, name, passed, detail });
  const icon = passed ? "\u001b[32mOK  \u001b[0m" : "\u001b[31mFALHA\u001b[0m";
  console.log(`  ${icon} ${name}${detail ? `  \u001b[90m${detail}\u001b[0m` : ""}`);
}

async function call(path, { method = "GET", token, body, headers = {}, raw } = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : raw ? body : JSON.stringify(body),
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  return { status: response.status, headers: response.headers, body: payload };
}

/** 401 (não autenticado) e 403 (sem permissão) contam como bloqueado. */
function blocked(status) {
  return status === 401 || status === 403;
}

function sign(payload, options = {}, secret = SECRET) {
  return jwt.sign(payload, secret, { expiresIn: "5m", ...options });
}

const FAKE_ID = "aaaaaaaaaaaaaaaaaaaaaaaa";
const ADMIN_ROUTES = [
  ["GET", "/admin/users"],
  ["GET", "/admin/reviews"],
  ["GET", "/admin/overview"],
  ["GET", "/admin/trash"],
  ["GET", "/admin/logs"],
  ["POST", "/admin/purge"],
  ["DELETE", `/admin/trash/${FAKE_ID}`],
  ["PUT", `/admin/users/${FAKE_ID}`],
  ["DELETE", `/admin/users/${FAKE_ID}`],
];

async function run() {
  console.log(`\nTestando ${API}\n`);

  // ---------------------------------------------------------------- sanidade
  group("Disponibilidade");
  const health = await call("/health");
  check("API responde em /health", health.status === 200, `status ${health.status}`);
  if (health.status !== 200) {
    console.log("\nAPI fora do ar. Abortando.\n");
    process.exit(1);
  }
  const usingMongo = health.body?.storageMode !== "memory";

  // ------------------------------------------------------- segredo do token
  group("Segredo do JWT");
  const defaultSecretToken = jwt.sign({ role: 2 }, "change-me", { subject: FAKE_ID, expiresIn: "5m" });
  const withDefault = await call("/admin/users", { token: defaultSecretToken });
  check(
    "Token assinado com o segredo padrão 'change-me' é recusado",
    withDefault.status === 401 || withDefault.status === 403,
    `status ${withDefault.status}`
  );

  // ------------------------------------------------------ acesso sem permissão
  group("Acesso ao painel admin");
  for (const [method, path] of ADMIN_ROUTES) {
    const anon = await call(path, { method, body: method === "POST" || method === "PUT" ? {} : undefined });
    check(`${method} ${path} exige login`, anon.status === 401, `status ${anon.status}`);
  }

  // Token de um usuário que não existe mais no banco.
  const ghostToken = sign({ name: "fantasma", login: "fantasma", role: 2, id_casal: "1" }, { subject: FAKE_ID });
  for (const [method, path] of ADMIN_ROUTES) {
    const asGhost = await call(path, { method, token: ghostToken, body: method === "POST" || method === "PUT" ? {} : undefined });
    check(`${method} ${path} bloqueia token de usuário apagado`, blocked(asGhost.status), `status ${asGhost.status}`);
  }

  // Conta real sem poderes de admin, se informada por variável de ambiente.
  let realUserToken = null;
  if (process.env.SEC_LOGIN && process.env.SEC_PASSWORD) {
    const session = await call("/auth/login", {
      method: "POST",
      body: { login: process.env.SEC_LOGIN, password: process.env.SEC_PASSWORD },
    });

    if (session.status === 200 && session.body?.token) {
      if (session.body.user?.role >= 2) {
        console.log("  [33mAVISO[0m SEC_LOGIN é admin; use uma conta comum para testar as regras de papel.");
      } else {
        realUserToken = session.body.token;
      }
    } else {
      console.log(`  [33mAVISO[0m não consegui entrar com SEC_LOGIN (status ${session.status}).`);
    }
  }

  if (realUserToken) {
    for (const [method, path] of ADMIN_ROUTES) {
      const asUser = await call(path, { method, token: realUserToken, body: method === "POST" || method === "PUT" ? {} : undefined });
      check(`${method} ${path} recusa usuário comum real`, asUser.status === 403, `status ${asUser.status}`);
    }
  } else {
    console.log("  [90m(pulei os testes com conta real: defina SEC_LOGIN e SEC_PASSWORD)[0m");
  }

  // ------------------------------------------------------- escalada de papel
  group("Escalada de privilégio");
  const promoteToken = realUserToken ?? ghostToken;
  const selfPromote = await call("/me", { method: "PUT", token: promoteToken, body: { role: 2, id_casal: "1", active: true } });
  check(
    "PUT /auth/me ignora role e id_casal no corpo",
    selfPromote.status !== 200 || (selfPromote.body?.user?.role !== 2 && selfPromote.body?.user?.id_casal !== "1"),
    `status ${selfPromote.status}`
  );

  const forgedAccess = await call("/admin/users", { token: ghostToken });
  check(
    "Token com role=2 de usuário inexistente não vira admin",
    forgedAccess.status !== 200,
    `status ${forgedAccess.status}`
  );

  // -------------------------------------------------------------- tokens
  group("Validação de token");
  const tampered = sign({ role: 1 }, { subject: FAKE_ID }, "outro-segredo-qualquer");
  const tamperedFeed = await call("/reviews", { token: tampered });
  check("Token com assinatura inválida não autentica", tamperedFeed.headers.get("x-auth-error") === "session-expired");
  check("Feed público continua respondendo com token inválido", tamperedFeed.status === 200 || !usingMongo, `status ${tamperedFeed.status}`);

  const expired = jwt.sign({ role: 1, id_casal: "1" }, SECRET, { subject: FAKE_ID, expiresIn: "-1h" });
  const expiredWrite = await call("/reviews", { method: "POST", token: expired, body: { placeName: "x" } });
  check("Token expirado não consegue publicar", expiredWrite.status === 401, `status ${expiredWrite.status}`);

  const noneAlg = `${Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url")}.${Buffer.from(
    JSON.stringify({ sub: FAKE_ID, role: 2 })
  ).toString("base64url")}.`;
  const noneAttack = await call("/admin/users", { token: noneAlg });
  check("Token com alg=none é recusado", noneAttack.status !== 200, `status ${noneAttack.status}`);

  // ------------------------------------------------------------ permissões
  group("Permissão de escrita");
  const anonWrite = await call("/reviews", { method: "POST", body: { placeName: "x", locationLabel: "y", placeRating: 5 } });
  check("Visitante não publica avaliação", anonWrite.status === 401, `status ${anonWrite.status}`);

  const anonDelete = await call(`/reviews/${FAKE_ID}`, { method: "DELETE" });
  check("Visitante não exclui avaliação", anonDelete.status === 401, `status ${anonDelete.status}`);

  if (realUserToken) {
    const legacyFeed = await call("/reviews?q=torresmo");
    const legacyId = legacyFeed.body?.items?.[0]?._id;

    if (legacyId) {
      const legacyEdit = await call(`/reviews/${legacyId}`, { method: "PUT", token: realUserToken, body: { placeName: "invadido" } });
      check("Usuário comum não edita avaliação de outro casal", legacyEdit.status === 403, `status ${legacyEdit.status}`);
    }

    const badId = await call("/reviews/nao-e-um-id", { method: "DELETE", token: realUserToken });
    check("ID inválido responde 400, não 500", badId.status === 400, `status ${badId.status}`);
  }

  // --------------------------------------------------------- vazamento de dados
  group("Privacidade do feed");
  const publicFeed = await call("/reviews");
  const items = Array.isArray(publicFeed.body?.items) ? publicFeed.body.items : [];
  check("Feed anônimo não traz avaliação privada", !items.some((item) => item.isPublic === false), `${items.length} itens`);
  check("Feed anônimo não traz avaliação na lixeira", !items.some((item) => item.active === false));
  check("Feed não expõe hash de senha", !JSON.stringify(publicFeed.body ?? {}).includes("passwordHash"));

  const loginProbe = await call("/auth/login", { method: "POST", body: { login: "usuario-que-nao-existe-xyz", password: "qualquer" } });
  const loginWrong = await call("/auth/login", { method: "POST", body: { login: "wellerson", password: "senha-errada-xyz" } });
  if (loginProbe.status === 429 || loginWrong.status === 429) {
    skip("Login não revela se a conta existe", "limite de tentativas já ativo; reinicie a API e rode de novo");
  } else {
    check(
      "Login não revela se a conta existe",
      loginProbe.body?.message === loginWrong.body?.message,
      `"${loginProbe.body?.message}" vs "${loginWrong.body?.message}"`
    );
  }

  // ------------------------------------------------------------- injeção
  group("Injeção e entrada inválida");
  const nosql = await call("/auth/login", { method: "POST", body: { login: { $ne: null }, password: { $ne: null } } });
  if (nosql.status === 429) {
    skip("Login rejeita operador do Mongo no corpo ($ne)", "limite de tentativas já ativo; reinicie a API e rode de novo");
  } else {
    check("Login rejeita operador do Mongo no corpo ($ne)", nosql.status === 400 || nosql.status === 401, `status ${nosql.status}`);
  }

  const regexBomb = await call(`/reviews?q=${encodeURIComponent("((((((a+)+)+)+)+)+)+$")}`);
  check("Busca com regex perigosa não quebra a API", regexBomb.status === 200, `status ${regexBomb.status}`);

  const bracket = await call(`/reviews?q=${encodeURIComponent("teste[(")}`);
  check("Busca com caractere especial não quebra a API", bracket.status === 200, `status ${bracket.status}`);

  // Rotas sem limite de tentativas, para estes testes não esbarrarem no 429.
  const badJson = await call("/reviews", { method: "POST", body: "{isso nao e json", raw: true });
  check("JSON malformado responde 4xx (sem vazar stack)", badJson.status >= 400 && badJson.status < 500, `status ${badJson.status}`);

  const hugeBody = await call("/reviews", { method: "POST", body: { placeName: "a".repeat(400000) } });
  check("Corpo gigante é recusado", hugeBody.status === 413 || hugeBody.status === 400, `status ${hugeBody.status}`);

  // --------------------------------------------------------------- CORS
  group("CORS");
  const evil = await call("/reviews", { headers: { Origin: "https://site-malicioso.example" } });
  check("Origem desconhecida não recebe liberação de CORS", !evil.headers.get("access-control-allow-origin"));
  check("CORS não libera para qualquer um (*)", evil.headers.get("access-control-allow-origin") !== "*");

  // ------------------------------------------------------------ cabeçalhos
  group("Cabeçalhos de resposta");
  check("Não expõe a tecnologia do servidor (X-Powered-By)", !health.headers.get("x-powered-by"));
  check("Envia X-Content-Type-Options: nosniff", health.headers.get("x-content-type-options") === "nosniff");

  // -------------------------------------------------------- força bruta
  // Deixado por último: consome a cota de tentativas deste IP.
  group("Força bruta no login");
  let limiterTripped = false;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const tentativa = await call("/auth/login", { method: "POST", body: { login: "alvo-brute-force", password: `tentativa-${attempt}` } });
    if (tentativa.status === 429) {
      limiterTripped = true;
      break;
    }
  }
  check("Tentativas repetidas de login são bloqueadas (429)", limiterTripped);

  if (limiterTripped) {
    // O bloqueio tem de valer por visitante, não para o site inteiro.
    const outroVisitante = await call("/auth/login", {
      method: "POST",
      body: { login: "alvo-brute-force", password: "outra" },
      headers: { "CF-Connecting-IP": "198.51.100.77" },
    });
    check(
      "Bloqueio vale por visitante, não derruba o login de todos",
      outroVisitante.status !== 429,
      `status ${outroVisitante.status}`
    );
  }

  // --------------------------------------------------------------- resumo
  const failed = results.filter((item) => !item.passed);
  console.log(`\n${results.length - failed.length}/${results.length} verificações passaram${skipped ? `, ${skipped} puladas` : ""}.`);

  if (failed.length) {
    console.log("\nFalharam:");
    for (const item of failed) {
      console.log(`  - [${item.group}] ${item.name} ${item.detail}`);
    }
    process.exit(1);
  }

  console.log("Nenhum problema encontrado.\n");
}

run().catch((error) => {
  console.error("Erro ao rodar os testes:", error);
  process.exit(1);
});
