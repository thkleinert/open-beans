import { eq } from "drizzle-orm";

import type { Route } from "./+types/theme";
import { getAppSettings, getDb } from "../db";
import { appSettings } from "../db/schema";

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const theme = String(form.get("theme") ?? "");
  if (["light", "dark", "auto"].includes(theme)) {
    const db = getDb();
    const settings = await getAppSettings(db);
    await db.update(appSettings).set({ theme }).where(eq(appSettings.id, settings.id));
  }
  return null;
}
