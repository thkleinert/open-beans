import { createRequestHandler } from "react-router";

declare global {
  interface Env {
    AUTH_PASSPHRASE?: string;
  }
}

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

const COOKIE_NAME = "ob_auth";
const SESSION_SECONDS = 365 * 24 * 60 * 60; // one login per device per year

const encoder = new TextEncoder();

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Length-independent comparison, so a mismatch's position never leaks. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function isAuthed(request: Request, secret: string): Promise<boolean> {
  const cookies = request.headers.get("Cookie") ?? "";
  const match = cookies.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  if (!match) return false;
  const [expires, sig] = match[1].split(".");
  if (!expires || !sig) return false;
  if (Number(expires) * 1000 < Date.now()) return false;
  return safeEqual(await hmac(secret, `auth:${expires}`), sig);
}

function loginPage(error?: string): Response {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>Open Beans</title>
<style>
  :root { color-scheme: light dark; }
  body {
    margin: 0; min-height: 100svh; display: flex; align-items: center; justify-content: center;
    background: #faf6f1; color: #3d2c2e;
    font-family: system-ui, sans-serif;
    padding: env(safe-area-inset-top) 1.25rem env(safe-area-inset-bottom);
  }
  @media (prefers-color-scheme: dark) { body { background: #1c1917; color: #e7e5e4; } }
  .card {
    width: 100%; max-width: 20rem; background: rgba(255,255,255,.95);
    border-radius: 1.5rem; padding: 2rem; box-shadow: 0 1px 10px rgba(61,44,46,.05), 0 0 0 1px rgba(61,44,46,.03);
    text-align: center;
  }
  @media (prefers-color-scheme: dark) { .card { background: rgba(41,37,36,.95); box-shadow: none; border: 1px solid #57534e; } }
  h1 { font-size: 1.1rem; letter-spacing: .18em; text-transform: uppercase; color: #e8a84a; margin: 0 0 1.5rem; font-weight: 600; }
  input {
    width: 100%; box-sizing: border-box; padding: .8rem 1rem; min-height: 48px;
    border: 1px solid rgba(61,44,46,.15); border-radius: 1rem; font-size: 1rem;
    background: #faf6f1; color: inherit; margin-bottom: .75rem;
  }
  @media (prefers-color-scheme: dark) { input { background: #44403c; border-color: #78716c; } }
  button {
    width: 100%; padding: .8rem 1rem; min-height: 48px; border: 0; border-radius: 1rem;
    font-size: 1rem; font-weight: 700; color: #fff; cursor: pointer;
    background: linear-gradient(135deg, #e8a84a 0%, #d99738 50%, #c47b5b 100%);
  }
  .error { color: #dc2626; font-size: .85rem; margin: 0 0 .75rem; }
</style>
</head>
<body>
  <form class="card" method="post" action="/login">
    <h1>Open Beans</h1>
    ${error ? `<p class="error">${error}</p>` : ""}
    <input type="password" name="passphrase" placeholder="Passphrase" autofocus required
           autocomplete="current-password">
    <button type="submit">Unlock</button>
  </form>
</body>
</html>`;
  return new Response(html, {
    status: error ? 401 : 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

async function authCookie(secret: string): Promise<string> {
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const sig = await hmac(secret, `auth:${expires}`);
  return `${COOKIE_NAME}=${expires}.${sig}; Max-Age=${SESSION_SECONDS}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

export default {
  async fetch(request, env) {
    const secret = env.AUTH_PASSPHRASE;

    // Fail-open until the AUTH_PASSPHRASE secret is configured, so a fresh
    // deploy can't lock anyone out before the secret exists.
    if (secret) {
      const url = new URL(request.url);

      if (url.pathname === "/login") {
        if (request.method === "POST") {
          const form = await request.formData();
          const given = String(form.get("passphrase") ?? "");
          // Compare HMACs rather than raw strings to avoid timing leaks.
          const ok = (await hmac(secret, given)) === (await hmac(secret, secret));
          if (!ok) return loginPage("Wrong passphrase — try again.");
          return new Response(null, {
            status: 302,
            headers: { Location: "/", "Set-Cookie": await authCookie(secret) },
          });
        }
        if (await isAuthed(request, secret)) {
          return Response.redirect(new URL("/", request.url).toString(), 302);
        }
        return loginPage();
      }

      if (!(await isAuthed(request, secret))) {
        // React Router data requests get a bare 401 instead of a redirect so
        // client-side navigations fail fast rather than swallowing HTML.
        if (url.pathname.endsWith(".data")) {
          return new Response("Unauthorized", { status: 401 });
        }
        return Response.redirect(new URL("/login", request.url).toString(), 302);
      }
    }

    return requestHandler(request);
  },
} satisfies ExportedHandler<Env>;
