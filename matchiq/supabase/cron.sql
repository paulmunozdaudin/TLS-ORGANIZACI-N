-- Schedules for the data jobs. Run once in the SQL editor of the Supabase
-- project after deploying the `sync` function. Requires the pg_cron and
-- pg_net extensions (Database → Extensions).
--
-- Replace the two placeholders first. Do not commit real values.
--   <PROJECT_REF>   your project reference (Settings → General)
--   <CRON_SECRET>   the same value set with `supabase secrets set CRON_SECRET=...`
--
-- Cadence follows what the providers actually publish and what the quotas
-- allow; see docs/PROVIDERS.md → "Request budget".

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.run_sync(p_job text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/sync',
    headers := jsonb_build_object('content-type', 'application/json', 'x-cron-secret', '<CRON_SECRET>'),
    body := jsonb_build_object('job', p_job),
    timeout_milliseconds := 120000
  );
end $$;
revoke execute on function public.run_sync(text) from public, anon, authenticated;

select cron.schedule('matchiq-fixtures',        '10 */6 * * *',  $$select public.run_sync('fixtures')$$);
select cron.schedule('matchiq-reference',       '40 4 * * *',    $$select public.run_sync('reference')$$);
select cron.schedule('matchiq-reference-stats', '10 5 * * 2',    $$select public.run_sync('reference-stats')$$);
select cron.schedule('matchiq-odds',            '*/30 * * * *',  $$select public.run_sync('odds')$$);
select cron.schedule('matchiq-live',            '* * * * *',     $$select public.run_sync('live')$$);
select cron.schedule('matchiq-details',         '*/5 * * * *',   $$select public.run_sync('details')$$);
select cron.schedule('matchiq-settle',          '2-59/5 * * * *', $$select public.run_sync('settle')$$);
select cron.schedule('matchiq-seasons',         '5 * * * *',     $$select public.run_sync('seasons')$$);
