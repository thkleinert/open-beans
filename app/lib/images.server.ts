import { env } from "cloudflare:workers";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
}

/**
 * Store an uploaded image in R2 and return the public path (`/images/<key>`),
 * or null when nothing usable was uploaded.
 */
export async function uploadImage(value: FormDataEntryValue | null): Promise<string | null> {
  if (!(value instanceof File) || value.size === 0) return null;
  if (!value.type.startsWith("image/")) return null;
  if (value.size > MAX_UPLOAD_BYTES) return null;

  const key = `${crypto.randomUUID()}_${sanitizeFilename(value.name || "image")}`;
  await env.IMAGES.put(key, value, {
    httpMetadata: { contentType: value.type },
  });
  return `/images/${key}`;
}
