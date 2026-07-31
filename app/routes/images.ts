import { env } from "cloudflare:workers";

import type { Route } from "./+types/images";

const TYPE_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

const ALLOWED_TYPES = new Set(Object.values(TYPE_BY_EXTENSION));

/**
 * Decide what to serve an object as. Objects imported with
 * `wrangler r2 object put` often carry no content type at all, which paired
 * with `nosniff` would leave the browser nothing to go on — so fall back to
 * the file extension, and serve nothing we can't name as a known image type.
 */
function resolveContentType(stored: string | null, key: string): string | null {
  if (stored && ALLOWED_TYPES.has(stored)) return stored;
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  return TYPE_BY_EXTENSION[ext] ?? null;
}

export async function loader({ params }: Route.LoaderArgs) {
  const object = await env.IMAGES.get(params.key);
  if (!object) {
    return new Response("Not found", { status: 404 });
  }
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  const type = resolveContentType(headers.get("content-type"), params.key);
  if (!type) return new Response("Unsupported media type", { status: 415 });
  headers.set("content-type", type);
  headers.set("etag", object.httpEtag);
  // Keys are unique per upload, so responses can be cached forever.
  headers.set("cache-control", "public, max-age=31536000, immutable");
  // Never let a stored object be sniffed into an active content type, and keep
  // it from rendering as a top-level document even if one slipped in.
  headers.set("x-content-type-options", "nosniff");
  headers.set("content-security-policy", "default-src 'none'; sandbox");
  return new Response(object.body, { headers });
}
