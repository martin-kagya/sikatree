# sikatree

sikatree gives Ghanaian vendors a shop link from photos and a few WhatsApp messages: prices,
MoMo payments, orders and bookings. This repository holds the landing page and waitlist
(Phase L of `docs/PLAN.md`) and grows into the product.

- Product requirements: [`docs/requirement.md`](docs/requirement.md)
- Delivery plan: [`docs/PLAN.md`](docs/PLAN.md)
- Design language: [`docs/DESIGN.md`](docs/DESIGN.md)
- Waitlist backend and operations: [`docs/WAITLIST.md`](docs/WAITLIST.md)

## Stack

Next.js 15 (App Router) and TypeScript, Tailwind CSS, Postgres for the waitlist (Supabase in
production), pnpm.

## Local setup

```bash
pnpm install
createdb sikatree_dev
cp .env.example .env.local     # then set ADMIN_PASSWORD
pnpm db:migrate
pnpm dev
```

Open http://localhost:3000. The waitlist writes to Postgres; `/admin` is protected by
`ADMIN_PASSWORD`.

For the Supabase project, set `DATABASE_URL` to the session pooler string
(`aws-0-eu-west-1.pooler.supabase.com:5432`), then run `pnpm db:migrate`. The direct
`db.<ref>.supabase.co` host is IPv6 only. Details in `docs/WAITLIST.md`.

## WhatsApp bot

The Phase 1 slice runs without a Meta account: the default `console` provider
prints replies to the server log, and `pnpm wa:sim` injects signed messages.

```bash
pnpm dev
pnpm wa:sim "START"          # then follow the replies in the dev log
```

Set `WHATSAPP_PROVIDER=cloud` with the phone number id and access token to talk
to the real Cloud API. The bot's `Open dashboard` sends a magic link; set
`AUTH_SECRET` to sign vendor sessions and `CRON_SECRET` for the queue worker.
Item photos use the public Supabase Storage bucket named by
`SUPABASE_STORAGE_BUCKET` (default `items`).
Details in [`docs/WHATSAPP.md`](docs/WHATSAPP.md).

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Development server |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm typecheck` | TypeScript, no emit |
| `pnpm test` | Unit and integration tests (creates `sikatree_test`) |
| `pnpm db:migrate` | Apply `db/migrations` to `DATABASE_URL` |
| `pnpm db:check` | Print the masked database target and row counts |
| `pnpm budget` | Performance budget on a production build (needs Chrome) |
| `pnpm images:build` | Regenerate responsive WebP photos and blur placeholders |
| `pnpm seed:demo` | Reseed the demo storefront catalogue and sample photos |
| `pnpm wa:sim "START"` | Send a signed fake WhatsApp message to the local webhook |

## Environment

See `.env.example`. `DATABASE_URL` is required in production. `ADMIN_PASSWORD` enables the
admin. `NEXT_PUBLIC_WHATSAPP_NUMBER` turns on the "Confirm on WhatsApp" button. Never commit
`.env.local`.

## Deployment

**Cloudflare Workers** for the web app, **Supabase** for Postgres. The production target is
`sikatree.zqt.workers.dev`; Vercel is not used.

The app is adapted with **OpenNext Cloudflare** (`@opennextjs/cloudflare` + `wrangler`). Build and
deploy with:

```bash
pnpm deploy            # opennextjs-cloudflare build && opennextjs-cloudflare deploy
# or, in Workers Builds: build command `opennextjs-cloudflare build`, deploy command `npx wrangler deploy`
```

[`wrangler.jsonc`](wrangler.jsonc) is version-controlled and declares the `main` entry, the static
`assets`, the `nodejs_compat` + `global_fetch_strictly_public` flags, the `WORKER_SELF_REFERENCE`
service, and the `HYPERDRIVE` binding (with the Hyperdrive config id). Set `ADMIN_PASSWORD`,
`AUTH_SECRET`, `CRON_SECRET`, `NEXT_PUBLIC_WHATSAPP_NUMBER` and the Supabase storage keys as Worker
secrets/variables, and run `pnpm db:migrate` against the Supabase database before the first deploy
and after every migration.

### Cloudflare Workers

The Worker opens one Postgres client per query or transaction and closes it before the request
ends. A global pool leaves dead sockets behind between Workers requests.

For the connection, create a **Hyperdrive** configuration for the Supabase database (pooler host
on port 5432) and declare it in `wrangler.jsonc` under `hyperdrive` with `binding = "HYPERDRIVE"`.
Keep `DATABASE_URL` for local development and `pnpm db:migrate`. At runtime the Worker reads
`env.HYPERDRIVE.connectionString` from `cloudflare:workers`; without that binding it fails loudly
with `[db] HYPERDRIVE binding missing` instead of the misleading
`Connection terminated unexpectedly`.

The Worker runtime needs Node compatibility (`nodejs_compat`, already in `wrangler.jsonc`).

**Verify after every deploy** — hit `GET /api/health`:

- `{"ok":true,"source":"HYPERDRIVE"}` → the database hop is wired correctly.
- `{"ok":false,"source":"DATABASE_URL"}` (or 503) → the binding is missing; re-attach it.

**Scheduled jobs.** `GET /api/internal/jobs/run` drains the WhatsApp queue (secured by
`CRON_SECRET`). Schedule it with a Cloudflare Cron Trigger plus a `scheduled` handler, or an
external HTTP scheduler that GETs that path with `Authorization: Bearer $CRON_SECRET`. Vercel Cron
is not used.
