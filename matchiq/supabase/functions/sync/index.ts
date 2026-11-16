/**
 * Edge Function `sync` — runs one data job per call.
 *
 *   POST /functions/v1/sync   { "job": "fixtures" | "reference" | "reference-stats" | "live" | "details" | "odds" | "settle" | "seasons" }
 *   header  x-cron-secret: <CRON_SECRET>
 *
 * Called by pg_cron (see supabase/cron.sql). Deployed with JWT verification
 * off and guarded by the shared secret instead, because the caller is the
 * database scheduler, not a user.
 *
 * Secrets (set with `supabase secrets set`, never in the app bundle):
 *   API_FOOTBALL_KEY, THE_ODDS_API_KEY, CRON_SECRET
 *   SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by the platform.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

import { JOBS, runJob, type Db, type JobName } from '../_shared/jobs.ts';
import { createApiFootball } from '../_shared/providers/apiFootball.ts';
import { createTheOddsApi } from '../_shared/providers/theOddsApi.ts';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

Deno.serve(async (req) => {
  const secret = Deno.env.get('CRON_SECRET');
  if (!secret || req.headers.get('x-cron-secret') !== secret) return json(401, { error: 'unauthorized' });

  const body = await req.json().catch(() => ({}));
  const name = String(body.job ?? '') as JobName;
  const job = JOBS[name];
  if (!job) return json(400, { error: `unknown job "${name}"`, jobs: Object.keys(JOBS) });

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
  const db: Db = {
    async rpc<T>(fn: string, args?: Record<string, unknown>) {
      const { data, error } = await supabase.rpc(fn, args ?? {});
      if (error) throw new Error(`${fn}: ${error.message}`);
      return data as T;
    },
  };
  const ctx = {
    db,
    football: createApiFootball(Deno.env.get('API_FOOTBALL_KEY') ?? ''),
    odds: createTheOddsApi(Deno.env.get('THE_ODDS_API_KEY') ?? ''),
  };

  const result = await runJob(ctx, name, job.provider, () => job.run(ctx));
  return json(result.ok ? 200 : 502, { job: name, ...result });
});
