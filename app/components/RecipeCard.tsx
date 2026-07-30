import { useRef, useState } from "react";
import { useFetcher } from "react-router";

import type { Recipe, RecipeTemplate, Tag } from "../db/schema";
import { XIcon } from "./icons";

type RecipeWithTemplate = Recipe & {
  template: (RecipeTemplate & { tag: Tag | null }) | null;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function roundToStep(value: number, step: number) {
  const decimals = (String(step).split(".")[1] || "").length;
  return parseFloat(value.toFixed(decimals));
}

interface SliderConfig {
  key: string;
  label: string;
  field: "bean_amount" | "grinder_coarseness" | "final_weight" | "brew_time";
  min: number;
  max: number;
  step: number;
  initial: number;
  unit: string;
}

function sliderConfigs(recipe: RecipeWithTemplate): SliderConfig[] {
  const t = recipe.template;
  const grinderRaw = recipe.grinderCoarseness
    ? parseInt(recipe.grinderCoarseness, 10)
    : (t?.grinderDefault ?? 12);
  const brewRaw = recipe.brewTime ? parseInt(recipe.brewTime, 10) : (t?.brewDefault ?? 30);
  return [
    {
      key: "beans",
      label: "Beans",
      field: "bean_amount",
      min: t?.beanMin ?? 0,
      max: t?.beanMax ?? 30,
      step: t?.beanStep ?? 0.5,
      initial: clamp(recipe.beanAmount ?? t?.beanDefault ?? 18, t?.beanMin ?? 0, t?.beanMax ?? 30),
      unit: "g",
    },
    {
      key: "grinder",
      label: "Grinder",
      field: "grinder_coarseness",
      min: t?.grinderMin ?? 0,
      max: t?.grinderMax ?? 50,
      step: t?.grinderStep ?? 1,
      initial: clamp(grinderRaw, t?.grinderMin ?? 0, t?.grinderMax ?? 50),
      unit: "",
    },
    {
      key: "weight",
      label: "Cup weight",
      field: "final_weight",
      min: t?.weightMin ?? 20,
      max: t?.weightMax ?? 200,
      step: t?.weightStep ?? 1,
      initial: clamp(recipe.finalWeight ?? t?.weightDefault ?? 40, t?.weightMin ?? 20, t?.weightMax ?? 200),
      unit: "g",
    },
    {
      key: "brew",
      label: "Brew time",
      field: "brew_time",
      min: t?.brewMin ?? 0,
      max: t?.brewMax ?? 600,
      step: t?.brewStep ?? 5,
      initial: clamp(brewRaw, t?.brewMin ?? 0, t?.brewMax ?? 600),
      unit: "s",
    },
  ];
}

export function RecipeCard({ recipe }: { recipe: RecipeWithTemplate }) {
  const fetcher = useFetcher();
  const deleteFetcher = useFetcher();
  const configs = useRef(sliderConfigs(recipe)).current;
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(configs.map((c) => [c.field, c.initial])),
  );
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced auto-save: every slider move updates local state immediately and
  // persists all four values shortly after the last change.
  const update = (field: string, value: number) => {
    const next = { ...values, [field]: value };
    setValues(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetcher.submit(
        {
          intent: "update-recipe",
          recipe_id: String(recipe.id),
          ...Object.fromEntries(Object.entries(next).map(([k, v]) => [k, String(v)])),
        },
        { method: "post" },
      );
    }, 400);
  };

  return (
    <div
      className="flex-shrink-0 bg-white/95 dark:bg-stone-800/95 rounded-3xl shadow-card dark:shadow-none dark:border dark:border-stone-600 border border-coffee/5 p-5"
      style={{ width: "100%", scrollSnapAlign: "start", scrollSnapStop: "always" }}
    >
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="font-display font-semibold text-base text-coffee dark:text-stone-200 leading-tight">
            {recipe.name}
          </h2>
          {recipe.template?.tag && (
            <p className="text-xs text-coffee/35 dark:text-stone-500 mt-0.5">
              {recipe.template.tag.name}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            if (confirm("Delete this recipe?")) {
              deleteFetcher.submit(
                { intent: "delete-recipe", recipe_id: String(recipe.id) },
                { method: "post" },
              );
            }
          }}
          className="btn-circle flex-shrink-0 text-coffee/25 dark:text-stone-600 hover:text-red-400 transition-colors touch-manipulation"
          aria-label="Delete recipe"
        >
          <XIcon className="w-4 h-4" />
        </button>
      </div>

      {configs.map((c, i) => (
        <div key={c.key} className={i < configs.length - 1 ? "mb-8" : ""}>
          <div className="flex items-baseline gap-2 mb-1.5">
            <span className="text-xs font-display font-semibold uppercase tracking-widest text-coffee/40 dark:text-stone-500">
              {c.label}
            </span>
            <span className="tabular-nums leading-none">
              <span className="text-2xl font-bold text-amber">{values[c.field]}</span>
              {c.unit && (
                <span className="text-xs text-coffee/30 dark:text-stone-500 ml-0.5">{c.unit}</span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => update(c.field, roundToStep(clamp(values[c.field] - c.step, c.min, c.max), c.step))}
              className="btn-circle bg-transparent text-coffee/50 dark:text-stone-500 hover:text-amber dark:hover:text-amber hover:bg-coffee/5 dark:hover:bg-stone-700 transition-all active:scale-95 touch-manipulation select-none text-lg leading-none"
              aria-label="Decrease"
            >
              −
            </button>
            <input
              type="range"
              min={c.min}
              max={c.max}
              step={c.step}
              value={values[c.field]}
              onChange={(e) => update(c.field, parseFloat(e.target.value))}
              className="flex-1 min-w-0"
            />
            <button
              type="button"
              onClick={() => update(c.field, roundToStep(clamp(values[c.field] + c.step, c.min, c.max), c.step))}
              className="btn-circle bg-transparent text-coffee/50 dark:text-stone-500 hover:text-amber dark:hover:text-amber hover:bg-coffee/5 dark:hover:bg-stone-700 transition-all active:scale-95 touch-manipulation select-none text-lg leading-none"
              aria-label="Increase"
            >
              +
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
