export const SESSION_EXPIRED_EVENT = "denovonao:session-expired";

function hasAuthorization(init?: RequestInit) {
  const headers = init?.headers;
  if (!headers) {
    return false;
  }
  if (headers instanceof Headers) {
    return headers.has("Authorization");
  }
  return Object.keys(headers as Record<string, string>).some((key) => key.toLowerCase() === "authorization");
}

/**
 * fetch que percebe sessão vencida: se a requisição foi feita com token e a API
 * responder 401 ou o cabeçalho X-Auth-Error, avisa o AuthProvider para sair.
 */
export async function apiFetch(input: string, init?: RequestInit) {
  const response = await fetch(input, init);

  if (hasAuthorization(init) && (response.status === 401 || response.headers.get("X-Auth-Error") === "session-expired")) {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }

  return response;
}
