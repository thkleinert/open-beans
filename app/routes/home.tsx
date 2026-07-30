import { eq } from "drizzle-orm";
import { useRef } from "react";
import { Link, useFetcher } from "react-router";

import type { Route } from "./+types/home";
import {
  ArchiveOutlineIcon,
  ArchiveSolidIcon,
  GearIcon,
  ImagePlaceholderIcon,
  PlusIcon,
} from "../components/icons";
import { StarRating } from "../components/StarRating";
import { ThemeToggle } from "../components/ThemeToggle";
import { CarouselDots, useCarouselDots } from "../components/useCarouselDots";
import { getDb } from "../db";
import { beans, recipes } from "../db/schema";

export function meta(): Route.MetaDescriptors {
  return [{ title: "Open Beans – Coffee Tracker" }];
}

export async function loader() {
  const db = getDb();
  const openBeans = await db.query.beans.findMany({
    where: eq(beans.isArchived, false),
    with: { recipes: { with: { template: { with: { tag: true } } } } },
  });
  return {
    beans: openBeans.map((bean) => ({
      ...bean,
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
  const db = getDb();
  const form = await request.formData();
  const intent = form.get("intent");
  const beanId = Number(form.get("bean_id"));
  if (!Number.isInteger(beanId)) return null;

  if (intent === "rate") {
    const rating = Number(form.get("rating"));
    if (rating >= 1 && rating <= 3) {
      await db.update(beans).set({ rating }).where(eq(beans.id, beanId));
    }
  } else if (intent === "archive") {
    await db.update(beans).set({ isArchived: true }).where(eq(beans.id, beanId));
  }
  return null;
}

type BeanItem = Awaited<ReturnType<typeof loader>>["beans"][number];

function BeanCard({ bean, index }: { bean: BeanItem; index: number }) {
  const archiveFetcher = useFetcher();

  return (
    <article
      className="group flex-shrink-0 flex flex-col bg-white/90 dark:bg-stone-800/95 rounded-3xl shadow-card dark:shadow-none dark:border dark:border-stone-600/80 overflow-hidden opacity-0 animate-fade-in-up"
      style={{
        width: "100%",
        height: "100%",
        scrollSnapAlign: "start",
        scrollSnapStop: "always",
        animationDelay: `${index * 50}ms`,
      }}
    >
      <Link to={`/bean/${bean.id}`} className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 min-h-0 flex items-center justify-center bg-cream/80 dark:bg-stone-700/60 p-8 transition-colors duration-300 group-hover:bg-cream dark:group-hover:bg-stone-700/80">
          {bean.imageUrl ? (
            <img
              src={bean.imageUrl}
              alt={`${bean.brand} ${bean.name}`}
              className="max-h-full max-w-full object-contain drop-shadow-sm transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <ImagePlaceholderIcon className="w-20 h-20 text-coffee/15 dark:text-stone-600" />
          )}
        </div>
        <div className="flex-none px-5 pt-4 pb-2">
          <h2 className="font-display font-semibold text-xl text-coffee dark:text-stone-200 line-clamp-2">
            {bean.brand} – {bean.name}
          </h2>
        </div>
      </Link>
      <div className="flex-none px-5 pb-5">
        <div className="flex items-center justify-between">
          <StarRating beanId={bean.id} rating={bean.rating} />
          <button
            type="button"
            onClick={() =>
              archiveFetcher.submit(
                { intent: "archive", bean_id: String(bean.id) },
                { method: "post" },
              )
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-coffee/40 dark:text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border border-coffee/10 dark:border-stone-600 transition-all duration-200 text-xs font-medium touch-manipulation"
            title="Archive"
          >
            <ArchiveSolidIcon className="h-4 w-4" />
            Archive
          </button>
        </div>
        {bean.tagNames.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {bean.tagNames.map((name) => (
              <span
                key={name}
                className="bg-amber-dim dark:bg-amber-500/20 text-coffee-light dark:text-amber-200 text-xs font-semibold px-3 py-1.5 rounded-xl border border-amber/20 dark:border-amber-500/30"
              >
                {name}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const activeIndex = useCarouselDots(trackRef, loaderData.beans.length);

  return (
    <div
      className="flex flex-col"
      style={{
        height:
          "calc(100svh - max(1.5rem, env(safe-area-inset-top)) - env(safe-area-inset-bottom))",
      }}
    >
      <header className="flex-none flex flex-wrap justify-between items-center gap-3 mb-8 opacity-0 animate-fade-in-up">
        <h1 className="text-2xl sm:text-4xl font-display font-medium text-amber/90 dark:text-amber-400/90 uppercase tracking-widest m-0">
          Beans
        </h1>
        <div className="flex gap-2 items-center">
          <Link
            to="/add"
            className="btn-circle bg-gradient-accent text-white font-display font-bold shadow-glow-sm hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 touch-manipulation"
            aria-label="Add bean"
          >
            <PlusIcon className="w-6 h-6" />
          </Link>
          <Link
            to="/archive"
            className="btn-circle border border-coffee/12 dark:border-stone-500 text-coffee dark:text-stone-300 hover:bg-coffee/5 dark:hover:bg-stone-700 hover:border-coffee/20 dark:hover:border-stone-500 active:scale-[0.98] transition-all duration-200 touch-manipulation"
            aria-label="Archive"
          >
            <ArchiveOutlineIcon className="w-5 h-5" />
          </Link>
          <Link
            to="/settings"
            className="btn-circle border border-coffee/12 dark:border-stone-500 text-coffee dark:text-stone-300 hover:bg-coffee/5 dark:hover:bg-stone-700 hover:border-coffee/20 dark:hover:border-stone-500 active:scale-[0.98] transition-all duration-200 touch-manipulation"
            aria-label="Settings"
          >
            <GearIcon className="w-5 h-5" />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {loaderData.beans.length > 0 ? (
        <div className="flex-1 flex flex-col min-h-0">
          <div
            ref={trackRef}
            className="carousel-track flex-1 -mx-5 pl-5 pr-5 overflow-x-scroll overflow-y-hidden flex gap-2"
            style={{ scrollSnapType: "x mandatory", scrollPaddingLeft: "1.25rem" }}
          >
            {loaderData.beans.map((bean, i) => (
              <BeanCard key={bean.id} bean={bean} index={i} />
            ))}
          </div>
          {loaderData.beans.length > 1 ? (
            <CarouselDots count={loaderData.beans.length} activeIndex={activeIndex} />
          ) : (
            <div className="flex-none pt-3 pb-6" />
          )}
        </div>
      ) : (
        <p className="text-center py-16 text-coffee/40 dark:text-stone-500 font-display">
          No beans yet — add your first!
        </p>
      )}
    </div>
  );
}
