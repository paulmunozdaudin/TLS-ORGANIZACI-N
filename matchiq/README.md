# MATCH.IQ — the game behind the game

A social football prediction game: real fixtures, real bookmaker odds as
reference prices, 1,000 virtual coins a week, private leagues and leaderboards.
Coins are points only. There is no deposit, purchase, withdrawal, transfer or
prize anywhere in the product.

![Home, match markets, player markets and the prediction slip](docs/preview.png)

*Screens captured from the app running on a local database of synthetic test
data (hence the TEST DATA banner). No real fixtures or odds have been loaded yet.*

This folder is a self-contained project inside a repository that also holds two
unrelated apps (`/` — TLS Organización, Next.js; `/fantasy` — Rondo, an earlier
fantasy-football prototype). Nothing here depends on them.

## Status

| Area | State |
| --- | --- |
| Provider research and choice | Done: [docs/PROVIDERS.md](docs/PROVIDERS.md). The Odds API was read in full; the other providers could only be researched through search snippets. |
| Database: schema, RLS, prediction / settlement / season / league logic | Built. 19 tests run the real migrations on Postgres 16. |
| Provider clients, sync jobs, settlement job, Edge Function | Built and type-checked with Deno. Tested end to end against canned responses in the providers' documented shapes. **Not yet run against the live APIs: no keys were available.** |
| Mobile app (Expo): all screens | Built. Exercised in a browser against a local stand-in backend with synthetic test data. Not yet run on an iOS or Android device. |
| Supabase project, deployed functions, scheduled jobs | Not created. Needs your Supabase account. |
| Real fixtures and odds in the app | **None yet.** They arrive when the keys in docs/PROVIDERS.md §4 are set and the sync runs. |
| Google / Apple sign-in, push notifications, store builds | Not started. Email and password sign-in works. |

The app has no demo mode. Without a backend it shows a "not connected" screen;
with a backend but no provider data it shows empty states.

## Layout

```
supabase/
  migrations/            schema, server logic, RLS, registries, read API (apply in order)
  functions/sync/        Edge Function: one data job per call
  functions/_shared/
    core/                pure TypeScript shared by server and app:
                         markets, settlement, odds, wallet, season, matching, model
    providers/           API-Football and The Odds API clients and normalisers
    jobs.ts              sync and settlement jobs
  cron.sql               pg_cron schedule (placeholders for project ref and secret)
  tests/                 database tests, local dev backend, test seed, real-sync script
src/
  app/                   Expo Router screens
  components/  lib/  theme/
  __tests__/             engine tests
docs/PROVIDERS.md        research, costs, licensing, integration notes
```

## Run the checks

Needs Node 22.18+ and a local Postgres 15+ for the database tests.

```bash
npm install
```

```bash
npm test
```

```bash
DATABASE_URL=postgres://user:pass@127.0.0.1:5432/matchiq_test npm run test:db
```

```bash
npm run typecheck && npm run lint && npm run check:functions
```

`test:db` wipes and rebuilds the database named in `DATABASE_URL`.

## Try the app locally (synthetic TEST data)

This runs the real migrations and the real app against a small local server
that stands in for Supabase Auth and RPC. The data is synthetic ("Test Madrid",
"Test Book A") and the app shows a TEST DATA banner.

```bash
EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321 EXPO_PUBLIC_SUPABASE_ANON_KEY=local-dev npx expo export -p web
```

```bash
npm run dev:backend
```

Then open http://localhost:54321 and create an account.

## Pull real data into a local database

Once you have provider keys this runs the same jobs the Edge Function runs,
against the real APIs, into local Postgres. It spends provider quota.

```bash
API_FOOTBALL_KEY=... THE_ODDS_API_KEY=... npm run sync:local -- --fresh fixtures reference odds
```

The output lists matched and unmatched events and players, requests used and
what the database now holds.

## Deploy

1. Create a Supabase project. Enable the `pg_cron` and `pg_net` extensions.
2. Apply the schema:

   ```bash
   supabase link --project-ref <ref>
   ```

   ```bash
   supabase db push
   ```

3. Set the secrets (never in the app, never in git):

   ```bash
   supabase secrets set API_FOOTBALL_KEY=... THE_ODDS_API_KEY=... CRON_SECRET=...
   ```

4. Deploy the function:

   ```bash
   supabase functions deploy sync
   ```

5. Edit the two placeholders in `supabase/cron.sql` and run it in the SQL editor.
6. Trigger the first syncs by hand (fixtures, then reference, then odds) and
   check `select * from data_freshness;`.
7. Build the app with `EXPO_PUBLIC_SUPABASE_URL` and
   `EXPO_PUBLIC_SUPABASE_ANON_KEY` set (see `.env.example`).

## Rules the code enforces

- Markets and prices are created only by `ingest_odds` from provider quotes.
- A prediction's odds are frozen at submission (`predictions.locked_odds`,
  with the snapshot or quote list that produced them).
- Balances change only inside `place_prediction`, `settle_selection` and
  `close_due_seasons`; every change has a `wallet_ledger` row, and each
  wallet's balance equals the sum of its ledger.
- Settlement is idempotent and re-settles with compensating entries when a
  provider corrects its data.
- Clients have no insert, update or delete rights on any table.
- Weeks run Monday 00:00 to Sunday 23:59 Europe/Madrid, daylight saving
  included; closed weeks are never deleted.
