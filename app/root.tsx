import { useEffect } from "react";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import { ensureSeeded, getAppSettings, getDb } from "./db";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=Outfit:wght@400;500;600;700&display=swap",
  },
  { rel: "manifest", href: "/manifest.json" },
  { rel: "icon", type: "image/png", href: "/icon-192.png" },
  { rel: "apple-touch-icon", href: "/icon-192.png" },
];

export async function loader() {
  const db = getDb();
  await ensureSeeded(db);
  const settings = await getAppSettings(db);
  return { theme: settings.theme ?? "auto" };
}

const themeScript = (theme: string) => `
(function() {
  var t = ${JSON.stringify(theme)};
  function apply() {
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = t === 'dark' || (t === 'auto' && prefersDark);
    document.documentElement.classList.toggle('dark', isDark);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = isDark ? '#1c1917' : '#faf6f1';
  }
  apply();
  if (t === 'auto') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', apply);
  }
})();
`;

function applyTheme(theme: string) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = theme === "dark" || (theme === "auto" && prefersDark);
  document.documentElement.classList.toggle("dark", isDark);
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = isDark ? "#1c1917" : "#faf6f1";
}

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useRouteLoaderData<typeof loader>("root");
  const theme = data?.theme ?? "auto";
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light dark" />
        <meta name="theme-color" content="#faf6f1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <Meta />
        <Links />
        <script dangerouslySetInnerHTML={{ __html: themeScript(theme) }} />
      </head>
      <body className="min-h-screen bg-cream dark:bg-stone-900 font-sans text-coffee dark:text-stone-200 antialiased">
        <div className="relative min-h-screen">
          <div
            className="absolute inset-0 bg-gradient-radial pointer-events-none dark:opacity-40"
            aria-hidden="true"
          />
          <div className="container relative mx-auto px-5 py-6 pb-[env(safe-area-inset-bottom)] pt-[max(1.5rem,env(safe-area-inset-top))] md:px-6 md:py-8 max-w-6xl">
            {children}
          </div>
        </div>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

/** Pull-to-refresh gesture with an animated spinner, ported from the legacy app. */
function usePullToRefresh() {
  useEffect(() => {
    if (!("ontouchstart" in window)) return;
    let startY = 0;
    let pullY = 0;
    let active = false;
    const THRESHOLD = 80;
    const el = document.createElement("div");
    el.style.cssText =
      "position:fixed;top:0;left:0;right:0;display:flex;justify-content:center;align-items:flex-end;height:0;overflow:hidden;z-index:50;transition:height 0.1s;pointer-events:none;";
    el.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="#e8a84a" stroke-width="2.5" style="width:22px;height:22px;margin-bottom:6px;opacity:0;transition:opacity 0.1s,transform 0.2s;"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>';
    document.body.appendChild(el);
    const icon = el.querySelector("svg")!;

    const onStart = (e: TouchEvent) => {
      if (window.scrollY === 0 && e.touches.length === 1) {
        startY = e.touches[0].clientY;
        active = true;
      }
    };
    const onMove = (e: TouchEvent) => {
      if (!active) return;
      pullY = e.touches[0].clientY - startY;
      if (pullY > 0) {
        el.style.height = Math.min(pullY * 0.45, 56) + "px";
        const p = Math.min(pullY / THRESHOLD, 1);
        icon.style.opacity = String(p);
        if (p >= 1) {
          icon.style.transition = "opacity 0.1s";
          icon.style.animation = "ptr-spin 0.6s linear infinite";
        } else {
          icon.style.animation = "";
          icon.style.transition = "opacity 0.1s,transform 0.2s";
          icon.style.transform = "rotate(" + p * 240 + "deg)";
        }
      }
    };
    const onEnd = () => {
      if (!active) return;
      active = false;
      if (pullY >= THRESHOLD) {
        window.location.reload();
      } else {
        el.style.height = "0";
        icon.style.opacity = "0";
        icon.style.animation = "";
      }
      startY = 0;
      pullY = 0;
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      el.remove();
    };
  }, []);
}

export default function App({ loaderData }: Route.ComponentProps) {
  usePullToRefresh();

  // Re-apply theme when it changes via the toggle/settings (no full reload).
  useEffect(() => {
    applyTheme(loaderData.theme ?? "auto");
  }, [loaderData.theme]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1 className="text-2xl font-display font-semibold mb-2">{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
