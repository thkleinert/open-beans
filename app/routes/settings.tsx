import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { and, asc, eq, ne } from "drizzle-orm";
import { useEffect, useState } from "react";
import { Form, Link, useFetcher } from "react-router";

import type { Route } from "./+types/settings";
import { CheckIcon, GripIcon, PencilIcon, PlusIcon, XIcon } from "../components/icons";
import { getAppSettings, getDb } from "../db";
import { appSettings, recipes, recipeTemplates, tags } from "../db/schema";

export function meta(): Route.MetaDescriptors {
  return [{ title: "Settings – Open Beans" }];
}

export async function loader() {
  const db = getDb();
  const [settings, allTags, templates] = await Promise.all([
    getAppSettings(db),
    db.query.tags.findMany({ orderBy: asc(tags.name), with: { templates: true } }),
    db.query.recipeTemplates.findMany({
      orderBy: asc(recipeTemplates.position),
      with: { tag: true },
    }),
  ]);
  return {
    theme: settings.theme ?? "auto",
    tags: allTags.map((t) => ({ id: t.id, name: t.name, templateCount: t.templates.length })),
    templates: templates.map((t) => ({ id: t.id, name: t.name, tagName: t.tag?.name ?? null })),
  };
}

export async function action({ request }: Route.ActionArgs) {
  const db = getDb();
  const form = await request.formData();
  const intent = form.get("intent");

  if (intent === "theme") {
    const theme = String(form.get("theme") ?? "");
    if (["light", "dark", "auto"].includes(theme)) {
      const settings = await getAppSettings(db);
      await db.update(appSettings).set({ theme }).where(eq(appSettings.id, settings.id));
    }
    return null;
  }

  if (intent === "add-tag") {
    const name = String(form.get("name") ?? "").trim();
    if (name) {
      const existing = await db.query.tags.findFirst({ where: eq(tags.name, name) });
      if (!existing) await db.insert(tags).values({ name });
    }
    return null;
  }

  if (intent === "rename-tag") {
    const tagId = Number(form.get("tag_id"));
    const name = String(form.get("name") ?? "").trim();
    if (name && Number.isInteger(tagId)) {
      const clash = await db.query.tags.findFirst({
        where: and(ne(tags.id, tagId), eq(tags.name, name)),
      });
      if (!clash) await db.update(tags).set({ name }).where(eq(tags.id, tagId));
    }
    return null;
  }

  if (intent === "delete-tag") {
    const tagId = Number(form.get("tag_id"));
    if (Number.isInteger(tagId)) {
      // Unlink templates first (parity with the legacy app: templates survive).
      await db.update(recipeTemplates).set({ tagId: null }).where(eq(recipeTemplates.tagId, tagId));
      await db.delete(tags).where(eq(tags.id, tagId));
    }
    return null;
  }

  if (intent === "delete-template") {
    const templateId = Number(form.get("template_id"));
    if (Number.isInteger(templateId)) {
      await db.update(recipes).set({ templateId: null }).where(eq(recipes.templateId, templateId));
      await db.delete(recipeTemplates).where(eq(recipeTemplates.id, templateId));
    }
    return null;
  }

  if (intent === "reorder-templates") {
    const ids: unknown = JSON.parse(String(form.get("ids") ?? "[]"));
    if (Array.isArray(ids) && ids.every((id) => Number.isInteger(id))) {
      for (const [position, id] of ids.entries()) {
        await db
          .update(recipeTemplates)
          .set({ position })
          .where(eq(recipeTemplates.id, id as number));
      }
    }
    return null;
  }

  return null;
}

function TagRow({ tag }: { tag: { id: number; name: string; templateCount: number } }) {
  const [editing, setEditing] = useState(false);
  const fetcher = useFetcher();

  if (editing) {
    return (
      <fetcher.Form
        method="post"
        onSubmit={() => setEditing(false)}
        className="flex items-center gap-2 py-1.5"
      >
        <input type="hidden" name="intent" value="rename-tag" />
        <input type="hidden" name="tag_id" value={tag.id} />
        <input
          type="text"
          name="name"
          defaultValue={tag.name}
          required
          autoFocus
          className="flex-1 text-sm px-2.5 py-1 rounded-xl border border-coffee/15 dark:border-stone-500 bg-white/80 dark:bg-stone-800 text-coffee dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-amber/40"
        />
        <button
          type="submit"
          className="p-1.5 text-amber hover:text-amber/80 transition-colors rounded-lg touch-manipulation"
          aria-label="Save"
        >
          <CheckIcon className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="p-1.5 text-coffee/30 dark:text-stone-500 hover:text-coffee transition-colors rounded-lg touch-manipulation"
          aria-label="Cancel"
        >
          <XIcon className="w-3.5 h-3.5" />
        </button>
      </fetcher.Form>
    );
  }

  return (
    <div className="flex items-center gap-2 py-2">
      <span className="text-sm font-medium text-coffee dark:text-stone-200">{tag.name}</span>
      {tag.templateCount > 0 && (
        <span className="text-xs text-coffee/35 dark:text-stone-500">
          {tag.templateCount} recipe{tag.templateCount !== 1 ? "s" : ""}
        </span>
      )}
      <div className="flex-1" />
      <button
        type="button"
        onClick={() =>
          fetcher.submit({ intent: "delete-tag", tag_id: String(tag.id) }, { method: "post" })
        }
        className="p-1.5 text-coffee/25 dark:text-stone-600 hover:text-red-400 transition-colors rounded-lg touch-manipulation"
        aria-label="Delete"
      >
        <XIcon className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="p-1.5 text-coffee/25 dark:text-stone-600 hover:text-amber transition-colors rounded-lg touch-manipulation"
        aria-label="Rename"
      >
        <PencilIcon className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

type TemplateItem = { id: number; name: string; tagName: string | null };

function SortableTemplateRow({ template }: { template: TemplateItem }) {
  const fetcher = useFetcher();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: template.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : undefined,
      }}
      className="flex items-center gap-2 py-2 bg-transparent"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="p-1.5 -ml-1.5 text-coffee/10 dark:text-stone-700 cursor-grab active:cursor-grabbing touch-manipulation"
        aria-label="Reorder"
        style={{ touchAction: "none" }}
      >
        <GripIcon className="w-3 h-3" />
      </button>
      <span className="text-sm font-medium text-coffee dark:text-stone-200">{template.name}</span>
      {template.tagName && (
        <span className="text-xs text-coffee/35 dark:text-stone-500">{template.tagName}</span>
      )}
      <div className="flex-1" />
      <button
        type="button"
        onClick={() =>
          fetcher.submit(
            { intent: "delete-template", template_id: String(template.id) },
            { method: "post" },
          )
        }
        className="p-1.5 text-coffee/25 dark:text-stone-600 hover:text-red-400 transition-colors rounded-lg touch-manipulation"
        aria-label="Delete"
      >
        <XIcon className="w-3.5 h-3.5" />
      </button>
      <Link
        to={`/settings/templates/${template.id}/edit`}
        className="p-1.5 text-coffee/25 dark:text-stone-600 hover:text-amber transition-colors rounded-lg touch-manipulation"
        aria-label="Edit"
      >
        <PencilIcon className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

export default function Settings({ loaderData }: Route.ComponentProps) {
  const reorderFetcher = useFetcher();
  const [templateOrder, setTemplateOrder] = useState(loaderData.templates);
  useEffect(() => setTemplateOrder(loaderData.templates), [loaderData.templates]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setTemplateOrder((items) => {
      const oldIndex = items.findIndex((t) => t.id === active.id);
      const newIndex = items.findIndex((t) => t.id === over.id);
      const next = arrayMove(items, oldIndex, newIndex);
      reorderFetcher.submit(
        { intent: "reorder-templates", ids: JSON.stringify(next.map((t) => t.id)) },
        { method: "post" },
      );
      return next;
    });
  };

  return (
    <>
      <header className="flex justify-between items-center gap-3 mb-6 opacity-0 animate-fade-in-up">
        <h1 className="text-2xl sm:text-4xl font-display font-medium text-amber/90 dark:text-amber-400/90 uppercase tracking-widest m-0">
          Settings
        </h1>
      </header>

      <section className="mb-12 opacity-0 animate-fade-in-up" style={{ animationDelay: "50ms" }}>
        <h2 className="text-xs font-display font-semibold text-coffee/40 dark:text-stone-500 uppercase tracking-widest mb-3">
          Appearance
        </h2>
        <Form method="post" className="flex gap-2">
          <input type="hidden" name="intent" value="theme" />
          {(
            [
              ["light", "Light"],
              ["auto", "Auto"],
              ["dark", "Dark"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="submit"
              name="theme"
              value={value}
              className={`flex-1 py-2 rounded-xl font-display font-semibold text-sm transition-all touch-manipulation ${
                loaderData.theme === value
                  ? "bg-gradient-accent text-white shadow-glow-sm"
                  : "bg-coffee/8 dark:bg-stone-700/80 text-coffee/60 dark:text-stone-400 hover:bg-coffee/12 dark:hover:bg-stone-700"
              }`}
            >
              {label}
            </button>
          ))}
        </Form>
      </section>

      <section className="mb-12 opacity-0 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
        <h2 className="text-xs font-display font-semibold text-coffee/40 dark:text-stone-500 uppercase tracking-widest mb-1">
          Styles
        </h2>
        <p className="text-xs text-coffee/40 dark:text-stone-500 mb-3">
          Brew methods like Espresso or Filter. Every recipe belongs to a style, and a style can
          group multiple recipes.
        </p>
        <div className="flex flex-col">
          {loaderData.tags.map((tag) => (
            <TagRow key={tag.id} tag={tag} />
          ))}
          <Form method="post" className="flex gap-2 mt-3" key={loaderData.tags.length}>
            <input type="hidden" name="intent" value="add-tag" />
            <input
              type="text"
              name="name"
              placeholder="New style…"
              required
              className="flex-1 px-3 py-1.5 text-sm rounded-xl border border-coffee/15 dark:border-stone-500 bg-white/80 dark:bg-stone-800 text-coffee dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-amber/40"
            />
            <button
              type="submit"
              className="flex items-center gap-1 text-sm text-coffee/40 dark:text-stone-500 hover:text-amber transition-colors touch-manipulation px-1"
              aria-label="Add style"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              Add
            </button>
          </Form>
        </div>
      </section>

      <section className="mb-12 opacity-0 animate-fade-in-up" style={{ animationDelay: "150ms" }}>
        <h2 className="text-xs font-display font-semibold text-coffee/40 dark:text-stone-500 uppercase tracking-widest mb-1">
          Recipes
        </h2>
        <p className="text-xs text-coffee/40 dark:text-stone-500 mb-3">
          Define slider ranges and defaults for a specific brew, e.g. single or double espresso. A
          style can have multiple recipes, but each recipe can only be added once per bean.
        </p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={templateOrder.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col">
              {templateOrder.map((template) => (
                <SortableTemplateRow key={template.id} template={template} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <Link
          to="/settings/templates/new"
          className="flex items-center gap-1.5 text-sm text-coffee/40 dark:text-stone-500 hover:text-amber transition-colors touch-manipulation py-2 mt-1"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          Add Recipe
        </Link>
      </section>
    </>
  );
}
