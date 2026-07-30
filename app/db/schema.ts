import { relations } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Table and column names deliberately match the legacy Flask/SQLAlchemy schema
// so a data-only dump of the old SQLite database imports into D1 unchanged.

export const appSettings = sqliteTable("app_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  theme: text("theme", { length: 10 }).default("auto"),
});

export const tags = sqliteTable("tag", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name", { length: 50 }).notNull().unique(),
});

export const beans = sqliteTable("bean", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  brand: text("brand", { length: 100 }).notNull(),
  name: text("name", { length: 100 }).notNull(),
  imageUrl: text("image_url", { length: 255 }),
  isArchived: integer("is_archived", { mode: "boolean" }).default(false),
  rating: integer("rating").default(0),
});

export const recipeTemplates = sqliteTable("recipe_template", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name", { length: 100 }).notNull(),
  tagId: integer("tag_id").references(() => tags.id),
  position: integer("position").default(0),
  beanMin: real("bean_min").default(10),
  beanMax: real("bean_max").default(30),
  beanStep: real("bean_step").default(0.5),
  beanDefault: real("bean_default").default(18),
  grinderMin: integer("grinder_min").default(1),
  grinderMax: integer("grinder_max").default(50),
  grinderStep: integer("grinder_step").default(1),
  grinderDefault: integer("grinder_default").default(12),
  weightMin: real("weight_min").default(20),
  weightMax: real("weight_max").default(200),
  weightStep: real("weight_step").default(1),
  weightDefault: real("weight_default").default(40),
  brewMin: integer("brew_min").default(20),
  brewMax: integer("brew_max").default(600),
  brewStep: integer("brew_step").default(5),
  brewDefault: integer("brew_default").default(30),
});

export const recipes = sqliteTable("recipe", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name", { length: 100 }).notNull(),
  category: text("category", { length: 50 }),
  templateId: integer("template_id").references(() => recipeTemplates.id),
  position: integer("position"),
  beanId: integer("bean_id")
    .notNull()
    .references(() => beans.id),
  grinderCoarseness: text("grinder_coarseness", { length: 50 }),
  beanAmount: real("bean_amount"),
  brewTime: text("brew_time", { length: 50 }),
  finalWeight: real("final_weight"),
});

export const tagRelations = relations(tags, ({ many }) => ({
  templates: many(recipeTemplates),
}));

export const recipeTemplateRelations = relations(recipeTemplates, ({ one, many }) => ({
  tag: one(tags, { fields: [recipeTemplates.tagId], references: [tags.id] }),
  recipes: many(recipes),
}));

export const beanRelations = relations(beans, ({ many }) => ({
  recipes: many(recipes),
}));

export const recipeRelations = relations(recipes, ({ one }) => ({
  bean: one(beans, { fields: [recipes.beanId], references: [beans.id] }),
  template: one(recipeTemplates, {
    fields: [recipes.templateId],
    references: [recipeTemplates.id],
  }),
}));

export type Bean = typeof beans.$inferSelect;
export type Recipe = typeof recipes.$inferSelect;
export type RecipeTemplate = typeof recipeTemplates.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type AppSettings = typeof appSettings.$inferSelect;
