function num(form: FormData, key: string, fallback: number) {
  const raw = form.get(key);
  const value = raw == null || raw === "" ? NaN : Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function int(form: FormData, key: string, fallback: number) {
  return Math.round(num(form, key, fallback));
}

/** Parse the shared template form into insert/update values. */
export function parseTemplateForm(form: FormData) {
  const tagIdRaw = Number(form.get("tag_id"));
  return {
    name: String(form.get("name") ?? "").trim(),
    tagId: Number.isInteger(tagIdRaw) && tagIdRaw > 0 ? tagIdRaw : null,
    beanMin: num(form, "bean_min", 0),
    beanMax: num(form, "bean_max", 30),
    beanStep: num(form, "bean_step", 0.5),
    beanDefault: num(form, "bean_default", 18),
    grinderMin: int(form, "grinder_min", 0),
    grinderMax: int(form, "grinder_max", 50),
    grinderStep: int(form, "grinder_step", 1),
    grinderDefault: int(form, "grinder_default", 12),
    weightMin: num(form, "weight_min", 20),
    weightMax: num(form, "weight_max", 200),
    weightStep: num(form, "weight_step", 1),
    weightDefault: num(form, "weight_default", 40),
    brewMin: int(form, "brew_min", 20),
    brewMax: int(form, "brew_max", 600),
    brewStep: int(form, "brew_step", 5),
    brewDefault: int(form, "brew_default", 30),
  };
}
