import { asc, eq, max } from "drizzle-orm";
import { useRef, useState } from "react";
import { data, Link, useFetcher } from "react-router";

import type { Route } from "./+types/bean";
import { BackIcon, CheckIcon, PencilIcon, PlusIcon, XIcon } from "../components/icons";
import { RecipeCard } from "../components/RecipeCard";
import { ThemeToggle } from "../components/ThemeToggle";
import { CarouselDots, useCarouselDots } from "../components/useCarouselDots";
import { getAppSettings, getDb } from "../db";
import { beans, recipes, recipeTemplates } from "../db/schema";

export function meta({ loaderData }: Route.MetaArgs): Route.MetaDescriptors {
  return [
    { title: loaderData ? `${loaderData.bean.brand} – ${loaderData.bean.name}` : "Open Beans" },
  ];
}

export async function loader({ params }: Route.LoaderArgs) {
  const db = getDb();
  const [bean, settings] = await Promise.all([
    db.query.beans.findFirst({
      where: eq(beans.id, Number(params.beanId)),
      with: { recipes: { with: { template: { with: { tag: true } } } } },
    }),
    getAppSettings(db),
  ]);
  if (!bean) throw data("Not found", { status: 404 });

  const sortedRecipes = [...bean.recipes].sort((a, b) => {
    const pa = a.template?.position ?? 99;
    const pb = b.template?.position ?? 99;
    return pa - pb || (a.position ?? 0) - (b.position ?? 0);
  });

  const usedTemplateIds = new Set(
    bean.recipes.map((r) => r.templateId).filter((id): id is number => id != null),
  );
  const allTemplates = await db.query.recipeTemplates.findMany({
    orderBy: asc(recipeTemplates.position),
    with: { tag: true },
  });

  return {
    bean: { id: bean.id, brand: bean.brand, name: bean.name },
    recipes: sortedRecipes,
    availableTemplates: allTemplates.filter((t) => !usedTemplateIds.has(t.id)),
    grinderOffset: settings.grinderOffset ?? 0,
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const db = getDb();
  const beanId = Number(params.beanId);
  const form = await request.formData();
  const intent = form.get("intent");

  if (intent === "update-recipe") {
    const recipeId = Number(form.get("recipe_id"));
    const updates: Partial<typeof recipes.$inferInsert> = {};
    const beanAmount = form.get("bean_amount");
    const grinder = form.get("grinder_coarseness");
    const brewTime = form.get("brew_time");
    const finalWeight = form.get("final_weight");
    if (beanAmount != null) updates.beanAmount = beanAmount === "" ? null : Number(beanAmount);
    if (grinder != null) updates.grinderCoarseness = String(grinder);
    if (brewTime != null) updates.brewTime = String(brewTime);
    if (finalWeight != null) updates.finalWeight = finalWeight === "" ? null : Number(finalWeight);
    if (Object.keys(updates).length > 0) {
      await db.update(recipes).set(updates).where(eq(recipes.id, recipeId));
    }
    return { ok: true };
  }

  if (intent === "add-recipe") {
    const templateId = Number(form.get("template_id"));
    const tmpl = await db.query.recipeTemplates.findFirst({
      where: eq(recipeTemplates.id, templateId),
    });
    if (tmpl) {
      const [{ maxPos }] = await db
        .select({ maxPos: max(recipes.position) })
        .from(recipes)
        .where(eq(recipes.beanId, beanId));
      await db.insert(recipes).values({
        name: tmpl.name,
        templateId: tmpl.id,
        beanId,
        position: (maxPos ?? -1) + 1,
        grinderCoarseness: String(tmpl.grinderDefault),
        beanAmount: tmpl.beanDefault,
        brewTime: String(tmpl.brewDefault),
        finalWeight: tmpl.weightDefault,
      });
    }
    return { ok: true };
  }

  if (intent === "delete-recipe") {
    const recipeId = Number(form.get("recipe_id"));
    await db.delete(recipes).where(eq(recipes.id, recipeId));
    return { ok: true };
  }

  if (intent === "edit-title") {
    const brand = String(form.get("brand") ?? "").trim();
    const name = String(form.get("name") ?? "").trim();
    if (brand && name) {
      await db.update(beans).set({ brand, name }).where(eq(beans.id, beanId));
    }
    return { ok: true };
  }

  return null;
}

// Slider saves keep their own local state; skip the loader round-trip for them.
export function shouldRevalidate({
  formData,
  defaultShouldRevalidate,
}: {
  formData?: FormData | undefined;
  defaultShouldRevalidate: boolean;
}) {
  if (formData?.get("intent") === "update-recipe") return false;
  return defaultShouldRevalidate;
}

function BeanTitle({ bean }: { bean: { id: number; brand: string; name: string } }) {
  const [editing, setEditing] = useState(false);
  const fetcher = useFetcher();

  if (editing) {
    return (
      <div className="flex-1 min-w-0">
        <fetcher.Form
          method="post"
          onSubmit={() => setEditing(false)}
          className="flex flex-wrap gap-2 items-center"
        >
          <input type="hidden" name="intent" value="edit-title" />
          <input
            type="text"
            name="brand"
            defaultValue={bean.brand}
            required
            className="px-3 py-2 border border-coffee/15 dark:border-stone-500 rounded-xl bg-white dark:bg-stone-800 text-coffee dark:text-stone-200 font-medium min-h-[44px]"
          />
          <input
            type="text"
            name="name"
            defaultValue={bean.name}
            required
            className="px-3 py-2 border border-coffee/15 dark:border-stone-500 rounded-xl bg-white dark:bg-stone-800 text-coffee dark:text-stone-200 font-medium min-h-[44px]"
          />
          <button
            type="submit"
            className="btn-circle bg-gradient-accent text-white font-bold hover:opacity-90 active:scale-95"
          >
            ✓
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="btn-circle bg-cream-dark dark:bg-stone-700 text-coffee dark:text-stone-300 hover:bg-cream-dark dark:hover:bg-stone-600 active:scale-95"
          >
            ✕
          </button>
        </fetcher.Form>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-4xl font-display font-medium text-amber/90 dark:text-amber-400/90 uppercase tracking-widest leading-tight m-0">
            {bean.name}
          </h1>
          <p className="text-xs sm:text-base font-display font-medium text-amber/60 dark:text-amber-400/60 uppercase tracking-widest mt-0.5">
            {bean.brand}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="btn-circle flex-shrink-0 bg-transparent text-coffee/40 dark:text-stone-500 hover:text-coffee dark:hover:text-stone-300 hover:bg-coffee/5 dark:hover:bg-stone-700 transition-colors touch-manipulation"
          aria-label="Edit title"
        >
          <PencilIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default function BeanPage({ loaderData }: Route.ComponentProps) {
  const { bean, recipes: beanRecipes, availableTemplates, grinderOffset } = loaderData;
  const trackRef = useRef<HTMLDivElement>(null);
  const cardCount = beanRecipes.length + (availableTemplates.length > 0 ? 1 : 0);
  const activeIndex = useCarouselDots(trackRef, cardCount);
  const addFetcher = useFetcher();

  return (
    <div
      className="flex flex-col"
      style={{
        height:
          "calc(100svh - max(1.5rem, env(safe-area-inset-top)) - env(safe-area-inset-bottom))",
      }}
    >
      <header className="flex-none flex flex-wrap justify-between items-start gap-3 mb-8 opacity-0 animate-fade-in-up">
        <BeanTitle bean={bean} />
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

      <div className="flex-1 flex flex-col min-h-0">
        <div
          ref={trackRef}
          className="carousel-track flex-1 min-h-0 -mx-5 pl-5 pr-5 overflow-x-scroll overflow-y-auto flex gap-2"
          style={{ scrollSnapType: "x mandatory", scrollPaddingLeft: "1.25rem" }}
        >
          {beanRecipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} grinderOffset={grinderOffset} />
          ))}

          {availableTemplates.length > 0 && (
            <div
              className="flex-shrink-0 rounded-3xl border-2 border-dashed border-coffee/15 dark:border-stone-600 p-5 flex flex-col items-center justify-center gap-5"
              style={{
                width: "100%",
                scrollSnapAlign: "start",
                scrollSnapStop: "always",
                minHeight: 300,
              }}
            >
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-cream-dark dark:bg-stone-700 flex items-center justify-center mx-auto mb-3">
                  <PlusIcon className="w-5 h-5 text-coffee/40 dark:text-stone-400" />
                </div>
                <p className="font-display font-semibold text-coffee/50 dark:text-stone-400">
                  Add recipe
                </p>
              </div>
              <addFetcher.Form method="post" className="flex flex-col gap-3 w-full max-w-xs">
                <input type="hidden" name="intent" value="add-recipe" />
                <select
                  name="template_id"
                  required
                  defaultValue=""
                  className="w-full px-3 py-2 min-h-[44px] border border-coffee/15 dark:border-stone-500 rounded-xl bg-white dark:bg-stone-800 text-coffee dark:text-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber/40"
                >
                  <option value="">Choose type…</option>
                  {availableTemplates.map((tmpl) => (
                    <option key={tmpl.id} value={tmpl.id}>
                      {tmpl.name}
                      {tmpl.tag ? ` (${tmpl.tag.name})` : ""}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-gradient-accent text-white font-display font-semibold text-sm hover:opacity-95 active:scale-[0.98] transition-all touch-manipulation"
                >
                  Add
                </button>
              </addFetcher.Form>
            </div>
          )}
        </div>

        <CarouselDots count={cardCount} activeIndex={activeIndex} />
      </div>
    </div>
  );
}
