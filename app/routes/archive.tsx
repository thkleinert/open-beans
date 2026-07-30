import { asc, eq } from "drizzle-orm";
import { useState } from "react";
import { Link, useFetcher } from "react-router";

import type { Route } from "./+types/archive";
import { BackIcon, SearchIcon, StarIcon } from "../components/icons";
import { ThemeToggle } from "../components/ThemeToggle";
import { getDb } from "../db";
import { beans } from "../db/schema";

export function meta(): Route.MetaDescriptors {
  return [{ title: "Archived beans – Open Beans" }];
}

export async function loader() {
  const db = getDb();
  const archived = await db.query.beans.findMany({
    where: eq(beans.isArchived, true),
    orderBy: asc(beans.brand),
    with: { recipes: { with: { template: { with: { tag: true } } } } },
  });
  return {
    beans: archived.map((bean) => ({
      id: bean.id,
      brand: bean.brand,
      name: bean.name,
      rating: bean.rating,
      tagNames: [
        ...new Set(
          bean.recipes
            .map((r) => r.template?.tag?.name)
            .filter((n): n is string => Boolean(n)),
        ),
      ],
    })),
  };
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  if (form.get("intent") === "unarchive") {
    const beanId = Number(form.get("bean_id"));
    if (Number.isInteger(beanId)) {
      await getDb().update(beans).set({ isArchived: false }).where(eq(beans.id, beanId));
    }
  }
  return null;
}

function ArchivedRow({ bean }: { bean: Awaited<ReturnType<typeof loader>>["beans"][number] }) {
  const fetcher = useFetcher();
  return (
    <li className="flex items-center gap-4 py-4 px-5 hover:bg-cream/50 dark:hover:bg-stone-700/50 transition-colors duration-200">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-coffee dark:text-stone-200 leading-snug">{bean.brand}</p>
        <p className="text-sm text-coffee/60 dark:text-stone-400">{bean.name}</p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <div className="flex gap-0.5">
            {[1, 2, 3].map((i) => (
              <StarIcon
                key={i}
                className={`w-4 h-4 ${
                  bean.rating && i <= bean.rating
                    ? "text-amber"
                    : "text-coffee/20 dark:text-stone-600"
                }`}
              />
            ))}
          </div>
          {bean.tagNames.map((name) => (
            <span
              key={name}
              className="text-xs text-coffee/40 dark:text-stone-500 bg-coffee/5 dark:bg-stone-700 px-2 py-0.5 rounded-lg"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
      <fetcher.Form method="post">
        <input type="hidden" name="intent" value="unarchive" />
        <input type="hidden" name="bean_id" value={bean.id} />
        <button
          type="submit"
          className="flex-shrink-0 inline-flex items-center justify-center min-h-[44px] px-4 py-2 rounded-2xl bg-gradient-accent text-white font-display font-bold text-sm hover:opacity-95 active:scale-[0.98] transition-all touch-manipulation"
        >
          Restore
        </button>
      </fetcher.Form>
    </li>
  );
}

export default function Archive({ loaderData }: Route.ComponentProps) {
  const [query, setQuery] = useState("");
  const q = query.toLowerCase().trim();
  const visible = loaderData.beans.filter(
    (bean) => !q || `${bean.brand} ${bean.name}`.toLowerCase().includes(q),
  );

  return (
    <>
      <header className="flex flex-wrap justify-between items-center gap-4 mb-10 md:mb-12">
        <h1 className="text-2xl sm:text-4xl font-display font-medium text-amber/90 dark:text-amber-400/90 uppercase tracking-widest m-0">
          Archive
        </h1>
        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="hidden md:inline-flex flex-shrink-0 p-2 -mr-2 text-coffee/50 dark:text-stone-400 hover:text-coffee dark:hover:text-stone-200 rounded-lg hover:bg-coffee/5 dark:hover:bg-stone-700 transition-colors touch-manipulation"
            aria-label="Back"
          >
            <BackIcon className="w-6 h-6" />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="relative mb-4">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-coffee/30 dark:text-stone-500 pointer-events-none" />
        <input
          type="search"
          placeholder="Search…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/95 dark:bg-stone-800/95 border border-coffee/10 dark:border-stone-600 text-coffee dark:text-stone-200 placeholder-coffee/30 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber/40 transition-colors"
        />
      </div>

      <div className="bg-white/95 dark:bg-stone-800/95 rounded-3xl shadow-card dark:shadow-none dark:border dark:border-stone-600 overflow-hidden border border-coffee/5 transition-shadow duration-300 hover:shadow-card-hover dark:hover:border-stone-500">
        {loaderData.beans.length === 0 ? (
          <p className="py-12 text-center text-coffee/40 dark:text-stone-500">
            No archived beans yet.
          </p>
        ) : visible.length === 0 ? (
          <p className="py-12 text-center text-coffee/40 dark:text-stone-500">No results.</p>
        ) : (
          <ul className="divide-y divide-coffee/5 dark:divide-stone-600">
            {visible.map((bean) => (
              <ArchivedRow key={bean.id} bean={bean} />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
