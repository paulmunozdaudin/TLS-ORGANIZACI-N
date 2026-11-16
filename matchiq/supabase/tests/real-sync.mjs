// Runs the real sync jobs against the real provider APIs, writing into a
// local Postgres. This is the same job code the Edge Function runs; use it to
// check provider access and data coverage before deploying.
//
//   API_FOOTBALL_KEY=... THE_ODDS_API_KEY=... node supabase/tests/real-sync.mjs [--fresh] fixtures reference odds
//
// Each job spends provider quota: `reference` is roughly 25 API-Football
// requests per competition, `odds` costs The Odds API credits per market and
// region (see docs/PROVIDERS.md, "Request budget").
import pg from 'pg';

import { JOBS, runJob } from '../functions/_shared/jobs.ts';
import { createApiFootball } from '../functions/_shared/providers/apiFootball.ts';
import { createTheOddsApi } from '../functions/_shared/providers/theOddsApi.ts';
import { resetDatabase } from './bootstrap.mjs';
import { pgDb } from './pg-db.mjs';

const args = process.argv.slice(2);
const jobs = args.filter((a) => !a.startsWith('--'));
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? 'postgres://matchiq_test:matchiq_test@127.0.0.1:5432/matchiq_test' });
const sql = (text, params) => pool.query(text, params).then((r) => r.rows);

if (!jobs.length || jobs.some((j) => !(j in JOBS))) {
  console.error(`usage: real-sync.mjs [--fresh] <job…>   jobs: ${Object.keys(JOBS).join(', ')}`);
  process.exit(2);
}
// --fresh rebuilds the scratch database from the migrations first.
if (args.includes('--fresh')) await resetDatabase(sql);

const ctx = {
  db: pgDb(sql),
  football: createApiFootball(process.env.API_FOOTBALL_KEY ?? ''),
  odds: createTheOddsApi(process.env.THE_ODDS_API_KEY ?? ''),
};
let failed = false;
for (const name of jobs) {
  const result = await runJob(ctx, name, JOBS[name].provider, () => JOBS[name].run(ctx));
  failed ||= !result.ok;
  console.log(`\n== ${name}: ${result.ok ? 'ok' : 'FAILED'} · ${result.items} items`);
  console.log(JSON.stringify(result.ok ? result.meta : { error: result.error }, null, 2));
}
console.log(`\nrequests: API-Football ${ctx.football.meter.requests} (remaining today: ${ctx.football.meter.remaining ?? 'n/a'}), The Odds API ${ctx.odds.meter.requests} (credits left: ${ctx.odds.meter.remaining ?? 'n/a'})`);
const counts = (
  await sql(`select (select count(*) from competitions) competitions, (select count(*) from teams) teams, (select count(*) from players) players,
                    (select count(*) from fixtures) fixtures, (select count(*) from fixture_markets) markets,
                    (select count(*) from odds_snapshots where is_latest) quotes, (select count(*) from bookmakers) bookmakers`)
)[0];
console.log('database now holds:', counts);
await pool.end();
process.exit(failed ? 1 : 0);
