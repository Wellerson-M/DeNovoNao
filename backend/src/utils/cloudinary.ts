import crypto from "node:crypto";
import { env } from "../config/env.js";

/** Todas as fotos ficam nesta pasta; o servidor recusa qualquer foto de fora dela. */
export const PHOTO_FOLDER = "denovonao/reviews";
export const MAX_PHOTOS = 4;

export type ReviewPhoto = {
  publicId: string;
  url: string;
  width: number | null;
  height: number | null;
};

export function isCloudinaryConfigured() {
  const { cloudName, apiKey, apiSecret } = env.cloudinary;
  return Boolean(cloudName && apiKey && apiSecret);
}

/** Assinatura do Cloudinary: parâmetros em ordem alfabética, "a=1&b=2" + secret, em SHA-1. */
function sign(params: Record<string, string | number>) {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return crypto.createHash("sha1").update(payload + env.cloudinary.apiSecret).digest("hex");
}

/**
 * Autoriza UM envio direto do aparelho para o Cloudinary. O secret nunca sai do servidor;
 * a assinatura vale só para esta pasta e estes formatos, e expira em 1 hora.
 */
export function createUploadSignature() {
  const params = {
    allowed_formats: "jpg,jpeg,png,webp,heic,avif",
    folder: PHOTO_FOLDER,
    timestamp: Math.floor(Date.now() / 1000),
  };

  return {
    cloudName: env.cloudinary.cloudName,
    apiKey: env.cloudinary.apiKey,
    ...params,
    signature: sign(params),
  };
}

function asDimension(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : null;
}

/** Aceita só fotos que foram enviadas para a pasta do app na conta configurada. */
export function parsePhotos(value: unknown): ReviewPhoto[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error("As fotos enviadas estão inválidas.");
  }

  if (value.length > MAX_PHOTOS) {
    throw new Error(`Cada avaliação aceita no máximo ${MAX_PHOTOS} fotos.`);
  }

  const urlPrefix = `https://res.cloudinary.com/${env.cloudinary.cloudName}/image/upload/`;

  return value.map((item) => {
    const photo = (item ?? {}) as Record<string, unknown>;
    const publicId = typeof photo.publicId === "string" ? photo.publicId.trim() : "";
    const url = typeof photo.url === "string" ? photo.url.trim() : "";

    if (
      !isCloudinaryConfigured() ||
      !publicId.startsWith(`${PHOTO_FOLDER}/`) ||
      !/^[\w\-/]+$/.test(publicId) ||
      !url.startsWith(urlPrefix) ||
      !url.includes(publicId)
    ) {
      throw new Error("Uma das fotos não pôde ser validada. Tente enviá-la de novo.");
    }

    return { publicId, url, width: asDimension(photo.width), height: asDimension(photo.height) };
  });
}

export function photoIdsOf(review: { photos?: unknown } | null | undefined) {
  return Array.isArray(review?.photos)
    ? review.photos
        .map((photo) => (photo && typeof photo.publicId === "string" ? photo.publicId : ""))
        .filter(Boolean)
    : [];
}

/**
 * Apaga as imagens no Cloudinary. É "melhor esforço": se falhar, a avaliação continua
 * sendo apagada normalmente e a imagem órfã pode ser limpa depois pelo painel do Cloudinary.
 */
export async function destroyPhotos(publicIds: string[]) {
  const ids = publicIds.filter((id) => id.startsWith(`${PHOTO_FOLDER}/`));

  if (ids.length === 0 || !isCloudinaryConfigured()) {
    return;
  }

  const { cloudName, apiKey, apiSecret } = env.cloudinary;
  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

  // A Admin API apaga até 100 por chamada.
  for (let start = 0; start < ids.length; start += 100) {
    const params = new URLSearchParams();
    for (const id of ids.slice(start, start + 100)) {
      params.append("public_ids[]", id);
    }

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload?${params.toString()}`,
        { method: "DELETE", headers: { Authorization: `Basic ${auth}` } }
      );

      if (!response.ok) {
        console.warn("Cloudinary recusou apagar fotos", response.status, await response.text());
      }
    } catch (error) {
      console.warn("Não foi possível apagar fotos no Cloudinary", error);
    }
  }
}

/** Formato devolvido pela API; avaliações antigas simplesmente não têm fotos. */
export function normalizePhotos(value: unknown): ReviewPhoto[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((photo) => photo && typeof photo.publicId === "string" && typeof photo.url === "string")
    .map((photo) => ({
      publicId: photo.publicId,
      url: photo.url,
      width: asDimension(photo.width),
      height: asDimension(photo.height),
    }));
}
