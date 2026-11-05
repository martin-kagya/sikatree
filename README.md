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
| `pnpm wa:sim "START"` | Send a signed fake WhatsApp message to the local webhook |

## Environment

See `.env.example`. `DATABASE_URL` is required in production. `ADMIN_PASSWORD` enables the
admin. `NEXT_PUBLIC_WHATSAPP_NUMBER` turns on the "Confirm on WhatsApp" button. Never commit
`.env.local`.

## Deployment

Vercel for the web app, Supabase for Postgres. Set `DATABASE_URL`, `ADMIN_PASSWORD` and
`NEXT_PUBLIC_WHATSAPP_NUMBER` in the hosting project, then run `pnpm db:migrate` against the
Supabase database before the first deploy and after every migration.
