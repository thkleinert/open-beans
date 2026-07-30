import { useFetcher, useRouteLoaderData } from "react-router";

import type { loader as rootLoader } from "../root";
import { MoonIcon, SunIcon } from "./icons";

const CYCLE: Record<string, string> = { light: "dark", dark: "auto", auto: "light" };

/** Desktop-only theme toggle cycling light → dark → auto, persisted server-side. */
export function ThemeToggle() {
  const data = useRouteLoaderData<typeof rootLoader>("root");
  const fetcher = useFetcher();
  const current = data?.theme ?? "auto";

  return (
    <button
      type="button"
      onClick={() =>
        fetcher.submit({ theme: CYCLE[current] ?? "auto" }, { method: "post", action: "/theme" })
      }
      className="hidden md:inline-flex btn-circle flex-shrink-0 bg-white/80 dark:bg-stone-800 border border-coffee/10 dark:border-stone-600 text-coffee/70 dark:text-stone-300 hover:text-amber dark:hover:text-amber hover:border-amber/30 transition-colors touch-manipulation"
      aria-label="Toggle dark mode"
    >
      <SunIcon className="w-5 h-5 hidden dark:block" />
      <MoonIcon className="w-5 h-5 block dark:hidden" />
    </button>
  );
}
