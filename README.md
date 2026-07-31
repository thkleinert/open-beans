<div align="center">
  <img src="public/icon-192.png" width="96" alt="Open Beans">
  <h1>Open Beans</h1>
  <p>A minimal, mobile-first coffee tracker for dialling in your perfect brew — now serverless.</p>
</div>

---

Open Beans is a web app for tracking coffee beans and dialling in brew parameters. This is the serverless rewrite of the original [Flask/SQLite app](https://github.com/thkleinert/coffee-beans-tracker), running entirely on Cloudflare's free tier.

## Stack

| Layer | Technology |
|---|---|
| Framework | React Router (framework mode), TypeScript, React 19 |
| Runtime | Cloudflare Workers |
| Database | Cloudflare D1 (SQLite) via Drizzle ORM |
| Images | Cloudflare R2, downscaled client-side before upload |
| Styling | Tailwind CSS 4 |
| Drag & drop | dnd-kit |
| Auth | Cloudflare Access (in front of the domain, no app code) |

The D1 schema uses the exact table/column names of the legacy SQLite database, so old data imports losslessly.

## Local development

```bash
npm install
npm run db:migrate:local   # create tables in the local D1 emulator
npm run dev                # http://localhost:5173
```

On a fresh database the app seeds the default styles (Espresso, Filter) and recipe templates on first request, same as the legacy app.

## Deployment

Deploys happen on push via Cloudflare's Git integration (Workers Builds). One-time setup in the [Cloudflare dashboard](https://dash.cloudflare.com/):

1. Compute (Workers) → **Create** → **Import a repository** → connect GitHub and select `thkleiNERD/open-beans`.
2. Project name: `open-beans` (must match `wrangler.jsonc`).
3. Build command: `npm run build`
4. Deploy command: `npx wrangler d1 migrations apply DB --remote && npx wrangler deploy`

Every push to `main` then builds and deploys automatically, applying any pending D1 migrations first. No local wrangler login needed. (Alternative: `npx wrangler login && npm run deploy` deploys from your machine.)

The D1 database `open-beans-db` and R2 bucket `open-beans-images` already exist and are referenced by `wrangler.jsonc`; the schema migration is applied and recorded in production.

Schema changes: edit `app/db/schema.ts`, run `npm run db:generate`, commit — CI applies it on the next push (or run `npm run db:migrate:local` for local dev).

## Migrating data from the legacy app

> **Status:** the legacy data (34 beans, 54 recipes, from the 2026-05-04 snapshot) was imported into the production D1 database on 2026-07-31, with legacy recipe names mapped onto the seeded templates. Bean photos still need to be uploaded to R2 (see step 3). If a newer `db.sqlite` exists on the old server, wipe and re-import using the steps below.

Run this against the **live** database from your server (the `./instance/db.sqlite` volume of the old Docker deployment), *before* visiting the deployed app for the first time — the first visit seeds default styles/templates into an empty database, which would collide with imported IDs.

```bash
# 1. Export the old data as D1-ready SQL (also rewrites image paths)
python3 scripts/export-data.py /path/to/old/instance/db.sqlite > data.sql

# 2. Import into production D1
npx wrangler d1 execute open-beans-db --remote --file=data.sql

# 3. Upload the bean photos to R2
cd /path/to/old/static/uploads
for f in *; do npx wrangler r2 object put "open-beans-images/$f" --file "$f" --remote; done
```

If the app already seeded defaults before the import, clear them first:

```bash
npx wrangler d1 execute open-beans-db --remote --command \
  "DELETE FROM recipe; DELETE FROM recipe_template; DELETE FROM tag; DELETE FROM app_settings;"
```

To rehearse locally first, use the same commands with `--local` and `npm run dev`.

## Authentication

The Worker has a built-in login gate (`workers/app.ts`): a passphrase entered once per device sets a signed, HttpOnly cookie valid for one year. Everything the Worker serves — pages, data requests, and R2 images — requires the cookie; only the static build assets (JS/CSS bundles, icons, manifest) are public.

- **Enable it:** set the secret `AUTH_PASSPHRASE` on the Worker (dashboard → Workers → open-beans → Settings → Variables and Secrets → add as *Secret*). Until the secret exists, the gate is disabled (fail-open) so a fresh deploy can't lock you out.
- **Local dev:** put `AUTH_PASSPHRASE=whatever` in `.dev.vars` (gitignored), or leave it unset to skip login.
- **Log out / rotate:** change the secret — all existing cookies become invalid immediately.

## Project structure

```
open-beans/
├── app/
│   ├── root.tsx               # Layout, theme, pull-to-refresh, PWA registration
│   ├── routes.ts              # Route config
│   ├── app.css                # Tailwind theme (ported legacy design tokens)
│   ├── db/
│   │   ├── schema.ts          # Drizzle schema (legacy-compatible names)
│   │   └── index.ts           # D1 client + first-run seeding
│   ├── lib/                   # R2 upload, client-side image downscaling
│   ├── components/            # RecipeCard (sliders), StarRating, TemplateForm, …
│   └── routes/                # home, bean, add, archive, settings, images, theme
├── drizzle/                   # Generated SQL migrations (applied via wrangler)
├── scripts/export-data.py     # Legacy SQLite → D1 export
├── public/                    # PWA manifest, icons, service worker
├── workers/app.ts             # Worker entry
└── wrangler.jsonc             # Bindings: DB (D1), IMAGES (R2)
```

## License

MIT
