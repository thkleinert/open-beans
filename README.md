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

One-time setup (the D1 database `open-beans-db` and R2 bucket `open-beans-images` already exist; `wrangler.jsonc` references them):

```bash
npx wrangler login           # authenticate the CLI with your Cloudflare account
npm run db:migrate:remote    # create tables in the production D1 database
npm run deploy               # build + deploy the Worker
```

Subsequent deploys are just `npm run deploy`. Schema changes: edit `app/db/schema.ts`, run `npm run db:generate`, then `npm run db:migrate:local` / `npm run db:migrate:remote`.

## Migrating data from the legacy app

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

## Authentication (Cloudflare Access)

The app itself has no login — protect it at the edge:

1. Add a route/custom domain to the Worker (Workers → open-beans → Settings → Domains & Routes), e.g. `beans.example.com`.
2. In [Cloudflare Zero Trust](https://one.dash.cloudflare.com/) → Access → Applications, add a self-hosted application for that hostname.
3. Add a policy allowing only your email (one-time PIN, or Google/GitHub login).

The free Zero Trust plan covers up to 50 users. Note: the `workers.dev` subdomain should be disabled once Access is configured on the custom domain, otherwise the app stays reachable without auth.

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
