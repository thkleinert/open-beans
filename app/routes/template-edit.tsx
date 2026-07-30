import { asc, eq } from "drizzle-orm";
import { data, redirect } from "react-router";

import type { Route } from "./+types/template-edit";
import { TemplateForm } from "../components/TemplateForm";
import { getDb } from "../db";
import { recipeTemplates, tags } from "../db/schema";

export function meta(): Route.MetaDescriptors {
  return [{ title: "Edit Recipe – Open Beans" }];
}

export async function loader({ params }: Route.LoaderArgs) {
  const db = getDb();
  const template = await db.query.recipeTemplates.findFirst({
    where: eq(recipeTemplates.id, Number(params.templateId)),
  });
  if (!template) throw data("Not found", { status: 404 });
  return {
    template,
    tags: await db.query.tags.findMany({ orderBy: asc(tags.name) }),
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const { parseTemplateForm } = await import("../lib/template-form.server");
  const values = parseTemplateForm(await request.formData());
  const db = getDb();
  const templateId = Number(params.templateId);
  const existing = await db.query.recipeTemplates.findFirst({
    where: eq(recipeTemplates.id, templateId),
  });
  if (existing) {
    await db
      .update(recipeTemplates)
      .set({ ...values, name: values.name || existing.name })
      .where(eq(recipeTemplates.id, templateId));
  }
  return redirect("/settings");
}

export default function EditTemplate({ loaderData }: Route.ComponentProps) {
  return (
    <TemplateForm title="Edit Recipe" template={loaderData.template} tags={loaderData.tags} />
  );
}
