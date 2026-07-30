import { env } from "cloudflare:workers";

import type { Route } from "./+types/images";

export async function loader({ params }: Route.LoaderArgs) {
  const object = await env.IMAGES.get(params.key);
  if (!object) {
    return new Response("Not found", { status: 404 });
  }
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  // Keys are unique per upload, so responses can be cached forever.
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(object.body, { headers });
}
