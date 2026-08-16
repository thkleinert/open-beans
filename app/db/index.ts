import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";

import * as schema from "./schema";

export function getDb() {
  return drizzle(env.DB, { schema });
}

export type Db = ReturnType<typeof getDb>;

let seeded = false;

/**
 * Mirrors the legacy Flask startup seeding: create the settings row and the
 * default styles/templates on a fresh database. Runs at most once per worker
 * isolate; each check is a no-op once data exists (e.g. after a data import).
 */
export async function ensureSeeded(db: Db) {
  if (seeded) return;

  const settings = await db.select().from(schema.appSettings).limit(1);
  if (settings.length === 0) {
    await db.insert(schema.appSettings).values({ theme: "auto" });
  }

  const existingTags = await db.select().from(schema.tags).limit(1);
  if (existingTags.length === 0) {
    const [espresso, filter] = await db
      .insert(schema.tags)
      .values([{ name: "Espresso" }, { name: "Filter" }])
      .returning();
    await db.insert(schema.recipeTemplates).values([
      {
        name: "Espresso Small",
        tagId: espresso.id,
        position: 0,
        beanMin: 10, beanMax: 25, beanStep: 0.5, beanDefault: 18,
        grinderMin: 0, grinderMax: 25, grinderStep: 1, grinderDefault: 12,
        weightMin: 20, weightMax: 60, weightStep: 0.5, weightDefault: 40,
        brewMin: 20, brewMax: 45, brewStep: 1, brewDefault: 30,
      },
      {
        name: "Espresso Large",
        tagId: espresso.id,
        position: 1,
        beanMin: 10, beanMax: 25, beanStep: 0.5, beanDefault: 18,
        grinderMin: 0, grinderMax: 25, grinderStep: 1, grinderDefault: 12,
        weightMin: 20, weightMax: 120, weightStep: 0.5, weightDefault: 80,
        brewMin: 20, brewMax: 45, brewStep: 1, brewDefault: 30,
      },
      {
        name: "Filter",
        tagId: filter.id,
        position: 2,
        beanMin: 0, beanMax: 20, beanStep: 0.1, beanDefault: 15,
        grinderMin: 25, grinderMax: 60, grinderStep: 1, grinderDefault: 40,
        weightMin: 100, weightMax: 300, weightStep: 0.5, weightDefault: 200,
        brewMin: 120, brewMax: 300, brewStep: 10, brewDefault: 240,
      },
    ]);
  }

  seeded = true;
}

export async function getAppSettings(db: Db) {
  const rows = await db.select().from(schema.appSettings).limit(1);
  return rows[0] ?? { id: 0, theme: "auto", grinderOffset: 0 };
}
