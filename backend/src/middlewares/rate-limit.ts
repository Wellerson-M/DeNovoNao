import type { NextFunction, Request, Response } from "express";
import { clientIp } from "../utils/client-ip.js";

type Bucket = { count: number; resetAt: number };

/**
 * Limite simples de requisições por IP, guardado em memória.
 * Serve para travar tentativa de adivinhar senha. Como fica na memória do
 * processo, reinícios zeram a contagem e várias instâncias contam separado —
 * para o tamanho deste app, é suficiente.
 */
export function rateLimit({
  windowMs,
  max,
  message,
  keyBy,
}: {
  windowMs: number;
  max: number;
  message: string;
  /** Como agrupar as tentativas. O padrão é por IP. */
  keyBy?: (request: Request) => string | null;
}) {
  const buckets = new Map<string, Bucket>();

  return (request: Request, response: Response, next: NextFunction) => {
    const now = Date.now();

    // Limpeza preguiçosa para o mapa não crescer sem limite.
    if (buckets.size > 5000) {
      for (const [key, bucket] of buckets) {
        if (bucket.resetAt <= now) {
          buckets.delete(key);
        }
      }
    }

    const key = keyBy ? keyBy(request) : clientIp(request);

    // Sem chave (ex.: requisição sem login no corpo): não conta.
    if (!key) {
      return next();
    }

    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    bucket.count += 1;

    if (bucket.count > max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      response.setHeader("Retry-After", String(retryAfter));
      return response.status(429).json({ message });
    }

    return next();
  };
}
