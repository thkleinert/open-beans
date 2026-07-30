import { Form, Link } from "react-router";

import type { RecipeTemplate, Tag } from "../db/schema";
import { BackIcon } from "./icons";

const inputClass =
  "w-full px-3 py-2 rounded-xl border border-coffee/15 dark:border-stone-500 bg-transparent text-coffee dark:text-stone-200 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-amber/40";
const labelClass =
  "block text-xs font-semibold text-coffee/50 dark:text-stone-400 uppercase tracking-wider mb-1.5";
const sectionTitleClass =
  "text-xs font-display font-semibold text-coffee/40 dark:text-stone-500 uppercase tracking-widest mb-3";
const cardClass =
  "bg-white/95 dark:bg-stone-800/95 rounded-3xl shadow-card dark:border dark:border-stone-600 p-5";

interface ParamSectionProps {
  title: string;
  prefix: "bean" | "grinder" | "weight" | "brew";
  step: string;
  defaults: { min: number; max: number; step: number; default: number };
  template: RecipeTemplate | null;
}

function ParamSection({ title, prefix, step, defaults, template }: ParamSectionProps) {
  const fields = [
    ["min", "Min", template ? template[`${prefix}Min`] : defaults.min],
    ["max", "Max", template ? template[`${prefix}Max`] : defaults.max],
    ["step", "Step", template ? template[`${prefix}Step`] : defaults.step],
    ["default", "Default", template ? template[`${prefix}Default`] : defaults.default],
  ] as const;

  return (
    <section className="mb-6">
      <h2 className={sectionTitleClass}>{title}</h2>
      <div className={cardClass}>
        <div className="grid grid-cols-2 gap-4">
          {fields.map(([suffix, label, value]) => (
            <div key={suffix}>
              <label className={labelClass}>{label}</label>
              <input
                type="number"
                name={`${prefix}_${suffix}`}
                step={step}
                required
                defaultValue={value ?? undefined}
                className={inputClass}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TemplateForm({
  title,
  template,
  tags,
}: {
  title: string;
  template: RecipeTemplate | null;
  tags: Tag[];
}) {
  return (
    <>
      <header className="flex justify-between items-center gap-3 mb-8 opacity-0 animate-fade-in-up">
        <h1 className="text-2xl sm:text-4xl font-display font-medium text-amber/90 dark:text-amber-400/90 uppercase tracking-widest m-0">
          {title}
        </h1>
        <Link
          to="/settings"
          className="hidden md:inline-flex flex-shrink-0 p-2 -mr-2 text-coffee/50 dark:text-stone-400 hover:text-coffee dark:hover:text-stone-200 rounded-lg hover:bg-coffee/5 dark:hover:bg-stone-700 transition-colors touch-manipulation"
          aria-label="Back to settings"
        >
          <BackIcon className="w-6 h-6" />
        </Link>
      </header>

      <Form method="post" className="opacity-0 animate-fade-in-up" style={{ animationDelay: "50ms" }}>
        <section className="mb-6">
          <h2 className={sectionTitleClass}>Basic Info</h2>
          <div className="bg-white/95 dark:bg-stone-800/95 rounded-3xl shadow-card dark:border dark:border-stone-600 overflow-hidden">
            <div className="px-5 py-4 border-b border-coffee/5 dark:border-stone-700">
              <label className={labelClass}>Name</label>
              <input
                type="text"
                name="name"
                required
                defaultValue={template?.name ?? ""}
                placeholder="e.g. Espresso Small"
                className={inputClass}
              />
            </div>
            <div className="px-5 py-4">
              <label className={labelClass}>Style</label>
              <select
                name="tag_id"
                defaultValue={template?.tagId ?? ""}
                className="w-full px-3 py-2 min-h-[44px] rounded-xl border border-coffee/15 dark:border-stone-500 bg-white dark:bg-stone-800 text-coffee dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-amber/40"
              >
                <option value="">— None —</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <ParamSection
          title="Bean Amount (g)"
          prefix="bean"
          step="any"
          defaults={{ min: 10, max: 30, step: 0.5, default: 18 }}
          template={template}
        />
        <ParamSection
          title="Grinder"
          prefix="grinder"
          step="1"
          defaults={{ min: 0, max: 50, step: 1, default: 12 }}
          template={template}
        />
        <ParamSection
          title="Cup Weight (g)"
          prefix="weight"
          step="any"
          defaults={{ min: 20, max: 200, step: 1, default: 40 }}
          template={template}
        />
        <ParamSection
          title="Brew Time (s)"
          prefix="brew"
          step="1"
          defaults={{ min: 20, max: 600, step: 5, default: 30 }}
          template={template}
        />

        <div className="flex gap-3 pb-8">
          <button
            type="submit"
            className="flex-1 py-3 rounded-2xl bg-gradient-accent text-white font-display font-semibold shadow-glow-sm hover:opacity-95 active:scale-[0.98] transition-all touch-manipulation"
          >
            Save
          </button>
          <Link
            to="/settings"
            className="flex-1 py-3 rounded-2xl bg-coffee/5 dark:bg-stone-700 text-coffee/70 dark:text-stone-300 font-display font-semibold text-center hover:bg-coffee/10 dark:hover:bg-stone-600 transition-colors touch-manipulation"
          >
            Cancel
          </Link>
        </div>
      </Form>
    </>
  );
}
