import { env } from "cloudflare:workers";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

// Allow-list rather than a `image/*` prefix check: SVG is an image type that
// can carry script, and these objects are served back from our own origin.
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
}

/**
 * Store an uploaded image in R2 and return the public path (`/images/<key>`),
 * or null when nothing usable was uploaded.
 */
export async function uploadImage(value: FormDataEntryValue | null): Promise<string | null> {
  if (!(value instanceof File) || value.size === 0) return null;
  if (!ALLOWED_TYPES.has(value.type)) return null;
  if (value.size > MAX_UPLOAD_BYTES) return null;

  const key = `${crypto.randomUUID()}_${sanitizeFilename(value.name || "image")}`;
  await env.IMAGES.put(key, value, {
    httpMetadata: { contentType: value.type },
  });
  return `/images/${key}`;
}
