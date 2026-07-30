import { asc, max } from "drizzle-orm";
import { redirect } from "react-router";

import type { Route } from "./+types/template-new";
import { TemplateForm } from "../components/TemplateForm";
import { getDb } from "../db";
import { recipeTemplates, tags } from "../db/schema";

export function meta(): Route.MetaDescriptors {
  return [{ title: "New Recipe – Open Beans" }];
}

export async function loader() {
  const db = getDb();
  return { tags: await db.query.tags.findMany({ orderBy: asc(tags.name) }) };
}

export async function action({ request }: Route.ActionArgs) {
  const { parseTemplateForm } = await import("../lib/template-form.server");
  const values = parseTemplateForm(await request.formData());
  if (values.name) {
    const db = getDb();
    const [{ maxPos }] = await db
      .select({ maxPos: max(recipeTemplates.position) })
      .from(recipeTemplates);
    await db.insert(recipeTemplates).values({ ...values, position: (maxPos ?? 0) + 1 });
  }
  return redirect("/settings");
}

export default function NewTemplate({ loaderData }: Route.ComponentProps) {
  return <TemplateForm title="New Recipe" template={null} tags={loaderData.tags} />;
}
