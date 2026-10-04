import type { MetadataRoute } from "next";

/** Mantém o painel e a redefinição de senha fora dos buscadores. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/redefinir-senha"] }],
  };
}
