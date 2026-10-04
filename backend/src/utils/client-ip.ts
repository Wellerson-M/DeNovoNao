import type { Request } from "express";

/**
 * IP real de quem fez a requisição.
 *
 * A API fica atrás do Cloudflare e do proxy do Render, então `request.ip`
 * pode devolver o IP do proxy — e aí todos os visitantes contariam como um só
 * no limite de tentativas. O Cloudflare preenche `CF-Connecting-IP` com o IP
 * verdadeiro e sobrescreve o que o cliente mandar, então ele vem primeiro.
 */
export function clientIp(request: Request) {
  const candidates = [
    request.headers["cf-connecting-ip"],
    request.headers["x-real-ip"],
    request.headers["x-forwarded-for"],
    request.ip,
  ];

  for (const candidate of candidates) {
    const raw = Array.isArray(candidate) ? candidate[0] : candidate;
    const value = raw?.split(",")[0]?.trim();

    if (value) {
      return value.slice(0, 64);
    }
  }

  return "desconhecido";
}
