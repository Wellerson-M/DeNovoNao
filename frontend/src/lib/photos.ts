import { requestPhotoSignature } from "@/lib/api/reviews";
import type { ReviewPhoto } from "@/lib/types";

export const MAX_PHOTOS = 4;

/** Lado maior da foto enviada. Suficiente para ver no celular e bem mais leve que o original. */
const MAX_SIDE = 1600;
const QUALITY = 0.82;

function canvasToBlob(canvas: HTMLCanvasElement, type: string) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

/**
 * Reduz e comprime no próprio aparelho antes de enviar: uma foto de 4 MB do celular
 * vira algo perto de 200–400 KB. Se o navegador não conseguir abrir o formato
 * (ex.: HEIC fora do Safari), manda o arquivo original e o Cloudinary converte.
 */
export async function compressPhoto(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;

  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    if (file.size > 10 * 1024 * 1024) {
      throw new Error("Não foi possível abrir essa foto. Tente outra ou tire um print dela.");
    }
    return file;
  }

  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  // Safari antigo não gera WebP e devolve PNG (bem mais pesado); nesse caso usa JPEG.
  const webp = await canvasToBlob(canvas, "image/webp");
  if (webp && webp.type === "image/webp") {
    return webp;
  }

  const jpeg = await canvasToBlob(canvas, "image/jpeg");
  if (!jpeg) {
    throw new Error("Não foi possível preparar a foto para envio.");
  }
  return jpeg;
}

/** Envia direto do aparelho para o Cloudinary, com uma assinatura gerada pelo servidor. */
export async function uploadPhoto(blob: Blob, token: string): Promise<ReviewPhoto> {
  const signature = await requestPhotoSignature(token);
  const form = new FormData();
  form.append("file", blob);
  form.append("api_key", signature.apiKey);
  form.append("timestamp", String(signature.timestamp));
  form.append("signature", signature.signature);
  form.append("folder", signature.folder);
  form.append("allowed_formats", signature.allowed_formats);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ? `Falha ao enviar foto: ${body.error.message}` : "Falha ao enviar foto");
  }

  const data = (await response.json()) as { public_id: string; secure_url: string; width?: number; height?: number };
  return { publicId: data.public_id, url: data.secure_url, width: data.width ?? null, height: data.height ?? null };
}

export async function uploadPhotos(blobs: Blob[], token: string) {
  const photos: ReviewPhoto[] = [];
  for (const blob of blobs) {
    photos.push(await uploadPhoto(blob, token));
  }
  return photos;
}

/** Pede ao Cloudinary uma versão no tamanho certo (e no formato mais leve que o aparelho aceita). */
export function photoUrl(photo: ReviewPhoto, size: "thumb" | "full") {
  const transform = size === "thumb" ? "c_fill,w_160,h_160,f_auto,q_auto" : "c_limit,w_1600,h_1600,f_auto,q_auto";
  return photo.url.replace("/image/upload/", `/image/upload/${transform}/`);
}
