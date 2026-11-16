-- MATCH.IQ server-side logic.
-- Everything that moves coins or writes football/odds data lives here, runs
-- with definer rights and a pinned search_path, and is the only write path.
-- Errors raise SQLSTATE P0001 with a stable code as the message and a
-- human-readable sentence as the hint.

create or replace function cfg(p_key text, p_default jsonb) returns jsonb
language sql stable set search_path = public as $$
  select coalesce((select value from app_config where key = p_key), p_default);
$$;

create or replace function odds_stale_interval() returns interval
language sql stable set search_path = public as $$
  select make_interval(mins => (cfg('odds_stale_minutes', '90'))::int);
$$;

create or replace function fail(p_code text, p_hint text) returns void
language plpgsql as $$
begin
  raise exception '%', p_code using errcode = 'P0001', hint = p_hint;
end $$;

/* ============================================================== INGESTION */

create or replace function ingest_reference(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_provider text := p->>'provider';
  n_comp int; n_team int; n_stand int; n_player int; n_stats int;
begin
  insert into competitions (provider, external_id, name, country, kind, logo_url, season, coverage)
  select v_provider, c->>'external_id', c->>'name', c->>'country', c->>'kind', c->>'logo_url',
         (c->>'season')::int, coalesce(c->'coverage', '{}')
  from jsonb_array_elements(coalesce(p->'competitions', '[]')) c
  on conflict (provider, external_id) do update
    set name = excluded.name, country = excluded.country, kind = excluded.kind, logo_url = excluded.logo_url,
        season = excluded.season, coverage = excluded.coverage, updated_at = now();
  get diagnostics n_comp = row_count;

  insert into teams (provider, external_id, name, short_name, code, country, logo_url, venue)
  select v_provider, t->>'external_id', t->>'name', t->>'short_name', t->>'code', t->>'country', t->>'logo_url', t->>'venue'
  from jsonb_array_elements(coalesce(p->'teams', '[]')) t
  on conflict (provider, external_id) do update
    set name = excluded.name, short_name = coalesce(excluded.short_name, teams.short_name),
        code = coalesce(excluded.code, teams.code), country = coalesce(excluded.country, teams.country),
        logo_url = coalesce(excluded.logo_url, teams.logo_url), venue = coalesce(excluded.venue, teams.venue),
        updated_at = now();
  get diagnostics n_team = row_count;

  insert into standings (competition_id, season, team_id, position, played, won, drawn, lost,
                         goals_for, goals_against, points, form, home, away)
  select c.id, (s->>'season')::int, t.id, (s->>'position')::int, (s->>'played')::int, (s->>'won')::int,
         (s->>'drawn')::int, (s->>'lost')::int, (s->>'goals_for')::int, (s->>'goals_against')::int,
         (s->>'points')::int, s->>'form', coalesce(s->'home', '{}'), coalesce(s->'away', '{}')
  from jsonb_array_elements(coalesce(p->'standings', '[]')) s
  join competitions c on c.provider = v_provider and c.external_id = s->>'competition_external_id'
  join teams t on t.provider = v_provider and t.external_id = s->>'team_external_id'
  on conflict (competition_id, season, team_id) do update
    set position = excluded.position, played = excluded.played, won = excluded.won, drawn = excluded.drawn,
        lost = excluded.lost, goals_for = excluded.goals_for, goals_against = excluded.goals_against,
        points = excluded.points, form = excluded.form, home = excluded.home, away = excluded.away, updated_at = now();
  get diagnostics n_stand = row_count;

  insert into players (provider, external_id, name, full_name, photo_url, nationality, position, shirt_number, team_id)
  select v_provider, x->>'external_id', x->>'name', x->>'full_name', x->>'photo_url', x->>'nationality',
         x->>'position', (x->>'shirt_number')::int, t.id
  from jsonb_array_elements(coalesce(p->'players', '[]')) x
  left join teams t on t.provider = v_provider and t.external_id = x->>'team_external_id'
  on conflict (provider, external_id) do update
    set name = excluded.name, full_name = coalesce(excluded.full_name, players.full_name),
        photo_url = coalesce(excluded.photo_url, players.photo_url),
        nationality = coalesce(excluded.nationality, players.nationality),
        position = coalesce(excluded.position, players.position),
        shirt_number = coalesce(excluded.shirt_number, players.shirt_number),
        team_id = coalesce(excluded.team_id, players.team_id), updated_at = now();
  get diagnostics n_player = row_count;

  insert into player_season_stats (player_id, competition_id, season, appearances, starts, minutes, goals, assists,
                                   yellow_cards, red_cards, shots, shots_on_target)
  select pl.id, c.id, (x->>'season')::int, (x->>'appearances')::int, (x->>'starts')::int, (x->>'minutes')::int,
         (x->>'goals')::int, (x->>'assists')::int, (x->>'yellow_cards')::int, (x->>'red_cards')::int,
         (x->>'shots')::int, (x->>'shots_on_target')::int
  from jsonb_array_elements(coalesce(p->'player_season_stats', '[]')) x
  join players pl on pl.provider = v_provider and pl.external_id = x->>'player_external_id'
  join competitions c on c.provider = v_provider and c.external_id = x->>'competition_external_id'
  on conflict (player_id, competition_id, season) do update
    set appearances = excluded.appearances, starts = excluded.starts, minutes = excluded.minutes,
        goals = excluded.goals, assists = excluded.assists, yellow_cards = excluded.yellow_cards,
        red_cards = excluded.red_cards, shots = excluded.shots, shots_on_target = excluded.shots_on_target,
        updated_at = now();
  get diagnostics n_stats = row_count;

  return jsonb_build_object('competitions', n_comp, 'teams', n_team, 'standings', n_stand,
                            'players', n_player, 'player_season_stats', n_stats);
end $$;

-- Fixtures are keyed by (provider, external_id): re-running never duplicates.
create or replace function ingest_fixtures(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_provider text := p->>'provider';
  n int; n_skipped int;
begin
  select count(*) into n_skipped
  from jsonb_array_elements(coalesce(p->'fixtures', '[]')) f
  where not exists (select 1 from competitions c where c.provider = v_provider and c.external_id = f->>'competition_external_id')
     or not exists (select 1 from teams t where t.provider = v_provider and t.external_id = f->>'home_external_id')
     or not exists (select 1 from teams t where t.provider = v_provider and t.external_id = f->>'away_external_id');

  insert into fixtures (provider, external_id, competition_id, season, round, home_team_id, away_team_id, kickoff_at,
                        venue, status, status_raw, elapsed, home_goals, away_goals, ht_home, ht_away, ft_home, ft_away,
                        went_to_extra_time)
  select v_provider, f->>'external_id', c.id, (f->>'season')::int, f->>'round', h.id, a.id,
         (f->>'kickoff_at')::timestamptz, f->>'venue', coalesce(f->>'status', 'unknown'), f->>'status_raw',
         (f->>'elapsed')::int, (f->>'home_goals')::int, (f->>'away_goals')::int, (f->>'ht_home')::int,
         (f->>'ht_away')::int, (f->>'ft_home')::int, (f->>'ft_away')::int,
         coalesce((f->>'went_to_extra_time')::boolean, false)
  from jsonb_array_elements(coalesce(p->'fixtures', '[]')) f
  join competitions c on c.provider = v_provider and c.external_id = f->>'competition_external_id'
  join teams h on h.provider = v_provider and h.external_id = f->>'home_external_id'
  join teams a on a.provider = v_provider and a.external_id = f->>'away_external_id'
  on conflict (provider, external_id) do update
    set competition_id = excluded.competition_id, season = excluded.season, round = excluded.round,
        home_team_id = excluded.home_team_id, away_team_id = excluded.away_team_id,
        kickoff_at = excluded.kickoff_at, venue = coalesce(excluded.venue, fixtures.venue),
        status = excluded.status, status_raw = excluded.status_raw, elapsed = excluded.elapsed,
        home_goals = excluded.home_goals, away_goals = excluded.away_goals,
        ht_home = excluded.ht_home, ht_away = excluded.ht_away,
        ft_home = excluded.ft_home, ft_away = excluded.ft_away,
        went_to_extra_time = excluded.went_to_extra_time, updated_at = now();
  get diagnostics n = row_count;
  return jsonb_build_object('fixtures', n, 'skipped', n_skipped);
end $$;

-- Events, lineups and statistics for one fixture. Each section is replaced
-- as a whole when present, so corrections from the provider overwrite cleanly.
create or replace function ingest_fixture_details(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_provider text := p->>'provider';
  v_fixture bigint;
  n_events int := 0; n_lineups int := 0; n_pstats int := 0; n_tstats int := 0;
begin
  select id into v_fixture from fixtures where provider = v_provider and external_id = p->>'fixture_external_id';
  if v_fixture is null then
    return jsonb_build_object('error', 'unknown fixture');
  end if;

  -- Players seen in a match but not yet in a squad sync.
  insert into players (provider, external_id, name, team_id)
  select v_provider, x->>'external_id', x->>'name', t.id
  from jsonb_array_elements(coalesce(p->'players', '[]')) x
  left join teams t on t.provider = v_provider and t.external_id = x->>'team_external_id'
  where x->>'external_id' is not null and x->>'name' is not null
  on conflict (provider, external_id) do nothing;

  if p ? 'events' then
    delete from fixture_events where fixture_id = v_fixture;
    insert into fixture_events (fixture_id, seq, minute, extra_minute, period, team_id, player_id, related_player_id, kind, detail)
    select v_fixture, (e->>'seq')::int, (e->>'minute')::int, (e->>'extra_minute')::int,
           coalesce(e->>'period', 'regular'), t.id, pl.id, rp.id, e->>'kind', e->>'detail'
    from jsonb_array_elements(p->'events') e
    left join teams t on t.provider = v_provider and t.external_id = e->>'team_external_id'
    left join players pl on pl.provider = v_provider and pl.external_id = e->>'player_external_id'
    left join players rp on rp.provider = v_provider and rp.external_id = e->>'related_player_external_id';
    get diagnostics n_events = row_count;
  end if;

  if p ? 'lineups' then
    delete from lineups where fixture_id = v_fixture;
    insert into lineups (fixture_id, team_id, player_id, is_starter, position, shirt_number, formation)
    select v_fixture, t.id, pl.id, (l->>'is_starter')::boolean, l->>'position', (l->>'shirt_number')::int, l->>'formation'
    from jsonb_array_elements(p->'lineups') l
    join teams t on t.provider = v_provider and t.external_id = l->>'team_external_id'
    join players pl on pl.provider = v_provider and pl.external_id = l->>'player_external_id'
    on conflict (fixture_id, player_id) do nothing;
    get diagnostics n_lineups = row_count;
    if n_lineups > 0 then
      update fixtures set lineups_at = coalesce(lineups_at, now()) where id = v_fixture;
    end if;
  end if;

  if p ? 'player_stats' then
    delete from player_statistics where fixture_id = v_fixture;
    insert into player_statistics (fixture_id, player_id, team_id, minutes, started, goals, assists, shots, shots_on_target,
                                   yellow_cards, red_cards, fouls_committed, tackles, saves, rating)
    select v_fixture, pl.id, t.id, (s->>'minutes')::int, coalesce((s->>'started')::boolean, false),
           (s->>'goals')::int, (s->>'assists')::int, (s->>'shots')::int, (s->>'shots_on_target')::int,
           (s->>'yellow_cards')::int, (s->>'red_cards')::int, (s->>'fouls_committed')::int,
           (s->>'tackles')::int, (s->>'saves')::int, (s->>'rating')::numeric
    from jsonb_array_elements(p->'player_stats') s
    join teams t on t.provider = v_provider and t.external_id = s->>'team_external_id'
    join players pl on pl.provider = v_provider and pl.external_id = s->>'player_external_id'
    on conflict (fixture_id, player_id) do nothing;
    get diagnostics n_pstats = row_count;
  end if;

  if p ? 'team_stats' then
    insert into fixture_statistics (fixture_id, team_id, possession, shots, shots_on_target, corners, fouls,
                                    yellow_cards, red_cards, offsides, raw)
    select v_fixture, t.id, (s->>'possession')::numeric, (s->>'shots')::int, (s->>'shots_on_target')::int,
           (s->>'corners')::int, (s->>'fouls')::int, (s->>'yellow_cards')::int, (s->>'red_cards')::int,
           (s->>'offsides')::int, coalesce(s->'raw', '{}')
    from jsonb_array_elements(p->'team_stats') s
    join teams t on t.provider = v_provider and t.external_id = s->>'team_external_id'
    on conflict (fixture_id, team_id) do update
      set possession = excluded.possession, shots = excluded.shots, shots_on_target = excluded.shots_on_target,
          corners = excluded.corners, fouls = excluded.fouls, yellow_cards = excluded.yellow_cards,
          red_cards = excluded.red_cards, offsides = excluded.offsides, raw = excluded.raw, updated_at = now();
    get diagnostics n_tstats = row_count;
  end if;

  if p ? 'injuries' then
    delete from injuries where fixture_id = v_fixture;
    insert into injuries (provider, player_id, team_id, fixture_id, kind, reason)
    select v_provider, pl.id, t.id, v_fixture, i->>'kind', i->>'reason'
    from jsonb_array_elements(p->'injuries') i
    join players pl on pl.provider = v_provider and pl.external_id = i->>'player_external_id'
    left join teams t on t.provider = v_provider and t.external_id = i->>'team_external_id'
    on conflict (player_id, fixture_id) do nothing;
  end if;

  update fixtures
     set events_final = coalesce((p->>'events_final')::boolean, events_final),
         player_stats_final = coalesce((p->>'player_stats_final')::boolean, player_stats_final),
         updated_at = now()
   where id = v_fixture;

  return jsonb_build_object('fixture_id', v_fixture, 'events', n_events, 'lineups', n_lineups,
                            'player_stats', n_pstats, 'team_stats', n_tstats);
end $$;

-- Prices from an odds provider. Quotes are already matched to our fixture and
-- player ids by the sync job; anything it could not match never gets here.
-- A market or selection is created the first time a real price arrives.
create or replace function ingest_odds(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_provider text := p->>'provider';
  q record;
  v_bookmaker bigint; v_market bigint; v_selection bigint;
  v_latest odds_snapshots%rowtype;
  n_new int := 0; n_changed int := 0; n_same int := 0; n_skipped int := 0; n_withdrawn int := 0;
  -- Start of the sync run this batch belongs to (a run may send several batches).
  v_run_started timestamptz := coalesce(
    (select started_at from data_sync_logs where id = (p->>'sync_id')::bigint), now());
begin
  if not exists (select 1 from odds_providers where id = v_provider) then
    perform fail('UNKNOWN_PROVIDER', 'Odds provider is not registered.');
  end if;

  insert into provider_events (provider_id, external_id, fixture_id, match_score)
  select v_provider, e->>'external_id', (e->>'fixture_id')::bigint, (e->>'match_score')::numeric
  from jsonb_array_elements(coalesce(p->'events', '[]')) e
  on conflict (provider_id, external_id) do update
    set fixture_id = excluded.fixture_id, match_score = excluded.match_score, matched_at = now();

  for q in
    select * from jsonb_to_recordset(coalesce(p->'quotes', '[]')) as x(
      fixture_id bigint, market_key text, line numeric, side text, selection_key text, player_id bigint,
      label text, bookmaker_key text, bookmaker_name text, bookmaker_region text, decimal_odds numeric,
      suspended boolean, provider_updated_at timestamptz, source_ref text)
  loop
    if q.decimal_odds is null or q.decimal_odds <= 1 or q.fixture_id is null or q.selection_key is null
       or q.bookmaker_key is null
       or not exists (select 1 from markets m where m.key = q.market_key and m.enabled)
       or not exists (select 1 from fixtures f where f.id = q.fixture_id) then
      n_skipped := n_skipped + 1;
      continue;
    end if;

    insert into bookmakers (key, name, region) values (q.bookmaker_key, coalesce(q.bookmaker_name, q.bookmaker_key), q.bookmaker_region)
    on conflict (key) do update set name = excluded.name, region = coalesce(excluded.region, bookmakers.region)
    returning id into v_bookmaker;

    insert into fixture_markets (fixture_id, market_key, line, side) values (q.fixture_id, q.market_key, q.line, q.side)
    on conflict (fixture_id, market_key, line, side) do update set market_key = excluded.market_key
    returning id into v_market;

    insert into market_selections (fixture_market_id, key, player_id, label)
    values (v_market, q.selection_key, q.player_id, coalesce(q.label, q.selection_key))
    on conflict (fixture_market_id, key, player_id) do update set label = excluded.label
    returning id into v_selection;

    select * into v_latest from odds_snapshots
     where selection_id = v_selection and bookmaker_id = v_bookmaker and is_latest for update;

    if found and v_latest.decimal_odds = round(q.decimal_odds, 3) and v_latest.suspended = coalesce(q.suspended, false) then
      update odds_snapshots
         set last_seen_at = now(), withdrawn_at = null,
             provider_updated_at = coalesce(q.provider_updated_at, provider_updated_at)
       where id = v_latest.id;
      n_same := n_same + 1;
    else
      if found then
        update odds_snapshots set is_latest = false where id = v_latest.id;
        n_changed := n_changed + 1;
      else
        n_new := n_new + 1;
      end if;
      insert into odds_snapshots (selection_id, bookmaker_id, provider_id, decimal_odds, suspended, provider_updated_at, source_ref)
      values (v_selection, v_bookmaker, v_provider, round(q.decimal_odds, 3), coalesce(q.suspended, false),
              q.provider_updated_at, q.source_ref);
    end if;
  end loop;

  -- `scopes` lists the markets this run fetched completely for a fixture.
  -- Any quote of ours in those markets that the run did not see again has
  -- been pulled by the bookmaker: mark it withdrawn so it stops being priced.
  update odds_snapshots o
     set withdrawn_at = now()
    from market_selections s
    join fixture_markets fm on fm.id = s.fixture_market_id
    join jsonb_array_elements(coalesce(p->'scopes', '[]')) sc on (sc->>'fixture_id')::bigint = fm.fixture_id
   where o.selection_id = s.id and o.is_latest and o.provider_id = v_provider and o.withdrawn_at is null
     and o.last_seen_at < v_run_started
     and sc->'market_keys' ? fm.market_key;
  get diagnostics n_withdrawn = row_count;

  return jsonb_build_object('new', n_new, 'changed', n_changed, 'unchanged', n_same, 'skipped', n_skipped, 'withdrawn', n_withdrawn);
end $$;

/* ------------------------------------------------------------ sync logging */

create or replace function sync_start(p_job text, p_provider text) returns bigint
language sql security definer set search_path = public as $$
  insert into data_sync_logs (job, provider) values (p_job, p_provider) returning id;
$$;

create or replace function sync_finish(p_id bigint, p_status text, p_items int, p_requests int, p_error text, p_meta jsonb)
returns void language sql security definer set search_path = public as $$
  update data_sync_logs
     set status = p_status, finished_at = now(), items = p_items, requests = p_requests,
         error = p_error, meta = coalesce(p_meta, '{}')
   where id = p_id;
$$;

-- Freshness per job, for "last updated" labels and delayed-data warnings.
create or replace view data_freshness as
select job, provider,
       max(finished_at) filter (where status = 'ok') as last_ok_at,
       max(finished_at) filter (where status = 'error') as last_error_at,
       (array_agg(error order by id desc) filter (where status = 'error'))[1] as last_error
from data_sync_logs
group by job, provider;

/* ================================================================== PRICES */

-- Latest quote per bookmaker for every selection, with freshness worked out.
create or replace view current_quotes as
select o.id as snapshot_id, o.selection_id, o.bookmaker_id, b.key as bookmaker_key, b.name as bookmaker_name,
       o.provider_id, o.decimal_odds, o.suspended, o.provider_updated_at, o.last_seen_at, o.withdrawn_at, o.source_ref,
       -- Usable only if: not suspended or withdrawn, confirmed by our feed
       -- recently, and the bookmaker itself was still updating it then.
       (not o.suspended and o.withdrawn_at is null
        and o.last_seen_at > now() - odds_stale_interval()
        and (o.provider_updated_at is null
             or o.provider_updated_at > o.last_seen_at - make_interval(mins => (cfg('odds_max_bookmaker_age_minutes', '60'))::int))
       ) as fresh
from odds_snapshots o
join bookmakers b on b.id = o.bookmaker_id
where o.is_latest;

-- Best / average / count per selection. Null prices mean "unavailable".
create or replace view selection_prices as
select s.id as selection_id, s.fixture_market_id,
       max(q.decimal_odds) filter (where q.fresh) as best_odds,
       round(avg(q.decimal_odds) filter (where q.fresh), 2) as avg_odds,
       count(*) filter (where q.fresh) as bookmaker_count,
       count(q.snapshot_id) as total_quotes,
       count(*) filter (where q.suspended) as suspended_count,
       count(*) filter (where not q.suspended and not q.fresh) as stale_count,
       max(q.provider_updated_at) as bookmaker_updated_at,
       max(q.last_seen_at) as last_seen_at
from market_selections s
left join current_quotes q on q.selection_id = s.id
group by s.id;

/* ================================================================= SEASONS */

-- The weekly season containing "now": Monday 00:00 to next Monday 00:00, Europe/Madrid.
create or replace function current_season() returns weekly_seasons
language plpgsql security definer set search_path = public as $$
declare
  v_local timestamp := date_trunc('week', now() at time zone 'Europe/Madrid');
  v_row weekly_seasons;
begin
  insert into weekly_seasons (starts_at, ends_at)
  values (v_local at time zone 'Europe/Madrid', (v_local + interval '7 days') at time zone 'Europe/Madrid')
  on conflict (starts_at) do nothing;
  select * into v_row from weekly_seasons where starts_at = v_local at time zone 'Europe/Madrid';
  return v_row;
end $$;

create or replace function ensure_wallet(p_user uuid) returns virtual_wallets
language plpgsql security definer set search_path = public as $$
declare
  v_season weekly_seasons := current_season();
  v_coins int := (cfg('season_coins', '1000'))::int;
  v_wallet virtual_wallets;
begin
  insert into virtual_wallets (user_id, season_id, granted, balance)
  values (p_user, v_season.id, v_coins, v_coins)
  on conflict (user_id, season_id) do nothing
  returning * into v_wallet;
  if found then
    insert into wallet_ledger (wallet_id, user_id, season_id, kind, amount, balance_after)
    values (v_wallet.id, p_user, v_season.id, 'season_grant', v_coins, v_coins);
  else
    select * into v_wallet from virtual_wallets where user_id = p_user and season_id = v_season.id;
  end if;
  return v_wallet;
end $$;

-- Client entry point: the caller's wallet for the current season.
create or replace function get_wallet() returns virtual_wallets
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then perform fail('NOT_AUTHENTICATED', 'Sign in first.'); end if;
  return ensure_wallet(auth.uid());
end $$;

/* ============================================================= PREDICTIONS */

-- Places a prediction atomically: validates the market, prices it from the
-- caller's reference (their bookmaker, best price or market average), freezes
-- that price, and debits the wallet in the same transaction.
create or replace function place_prediction(
  p_selection_id bigint,
  p_stake int,
  p_request_id uuid,
  p_expected_odds numeric default null
) returns predictions
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_profile profiles;
  v_pred predictions;
  v_sel market_selections;
  v_fm fixture_markets;
  v_fx fixtures;
  v_season weekly_seasons;
  v_wallet virtual_wallets;
  v_odds numeric(8,3);
  v_snapshot bigint;
  v_bookmaker bigint;
  v_detail jsonb;
  v_basis int;
  v_return int;
begin
  if v_user is null then perform fail('NOT_AUTHENTICATED', 'Sign in first.'); end if;

  -- Retrying the same request returns the original prediction.
  select * into v_pred from predictions where user_id = v_user and client_request_id = p_request_id;
  if found then return v_pred; end if;

  select * into v_profile from profiles where id = v_user;
  if not found then perform fail('NO_PROFILE', 'Finish creating your profile first.'); end if;
  if (cfg('require_adult', 'true'))::boolean and v_profile.adult_confirmed_at is null then
    perform fail('AGE_NOT_CONFIRMED', 'Confirm that you are 18 or older to make predictions.');
  end if;

  if p_stake is null or p_stake < (cfg('min_stake', '1'))::int then
    perform fail('INVALID_STAKE', 'Choose a stake of at least 1 coin.');
  end if;

  select * into v_sel from market_selections where id = p_selection_id;
  if not found then perform fail('MARKET_UNAVAILABLE', 'This market is no longer offered.'); end if;
  select * into v_fm from fixture_markets where id = v_sel.fixture_market_id;
  select * into v_fx from fixtures where id = v_fm.fixture_id;

  if v_fx.status <> 'scheduled' or v_fx.kickoff_at <= now() then
    perform fail('MARKET_LOCKED', 'Predictions close at kick-off.');
  end if;
  if v_fm.status <> 'open' or v_sel.result is not null
     or not exists (select 1 from markets m where m.key = v_fm.market_key and m.enabled) then
    perform fail('MARKET_UNAVAILABLE', 'This market is suspended.');
  end if;

  v_season := current_season();
  if v_fx.kickoff_at >= v_season.ends_at then
    perform fail('OUTSIDE_SEASON', 'This match is played after the current weekly season ends.');
  end if;

  -- Price from the user's reference. No fresh quote means no prediction.
  if v_profile.reference_mode = 'bookmaker' then
    select q.decimal_odds, q.snapshot_id, q.bookmaker_id into v_odds, v_snapshot, v_bookmaker
      from current_quotes q
     where q.selection_id = p_selection_id and q.bookmaker_id = v_profile.reference_bookmaker_id and q.fresh;
    v_basis := 1;
  elsif v_profile.reference_mode = 'best' then
    select q.decimal_odds, q.snapshot_id, q.bookmaker_id into v_odds, v_snapshot, v_bookmaker
      from current_quotes q
     where q.selection_id = p_selection_id and q.fresh
     order by q.decimal_odds desc, q.bookmaker_key limit 1;
    select count(*) into v_basis from current_quotes q where q.selection_id = p_selection_id and q.fresh;
  else
    select round(avg(q.decimal_odds), 2), count(*) into v_odds, v_basis
      from current_quotes q where q.selection_id = p_selection_id and q.fresh;
  end if;

  if v_odds is null or v_odds <= 1 then
    perform fail('ODDS_UNAVAILABLE', 'No current price is available for this selection.');
  end if;
  if p_expected_odds is not null and v_odds <> round(p_expected_odds, 3) then
    raise exception 'ODDS_CHANGED' using errcode = 'P0001',
      hint = 'The price moved. Review the new odds and confirm again.',
      detail = v_odds::text;
  end if;

  select jsonb_build_object(
           'mode', v_profile.reference_mode, 'basis', v_basis, 'priced_at', now(),
           'quotes', coalesce(jsonb_agg(jsonb_build_object(
             'snapshot_id', q.snapshot_id, 'bookmaker', q.bookmaker_key, 'odds', q.decimal_odds,
             'provider', q.provider_id, 'bookmaker_updated_at', q.provider_updated_at,
             'source_ref', q.source_ref) order by q.bookmaker_key), '[]'))
    into v_detail
    from current_quotes q where q.selection_id = p_selection_id and q.fresh;

  v_wallet := ensure_wallet(v_user);
  select * into v_wallet from virtual_wallets where id = v_wallet.id for update;
  if v_wallet.balance < p_stake then
    perform fail('INSUFFICIENT_BALANCE', format('You have %s coins available.', v_wallet.balance));
  end if;

  v_return := round(p_stake * v_odds);

  insert into predictions (user_id, season_id, wallet_id, fixture_id, selection_id, market_key, line, player_id,
                           selection_label, stake, locked_odds, odds_mode, bookmaker_id, odds_snapshot_id,
                           price_detail, potential_return, locks_at, client_request_id)
  values (v_user, v_season.id, v_wallet.id, v_fx.id, v_sel.id, v_fm.market_key, v_fm.line, v_sel.player_id,
          v_sel.label, p_stake, v_odds, v_profile.reference_mode, v_bookmaker, v_snapshot,
          v_detail, v_return, v_fx.kickoff_at, p_request_id)
  returning * into v_pred;

  update virtual_wallets
     set balance = balance - p_stake, open_stakes = open_stakes + p_stake, total_staked = total_staked + p_stake
   where id = v_wallet.id
  returning * into v_wallet;

  insert into wallet_ledger (wallet_id, user_id, season_id, kind, amount, balance_after, prediction_id)
  values (v_wallet.id, v_user, v_season.id, 'stake', -p_stake, v_wallet.balance, v_pred.id);

  insert into prediction_transactions (prediction_id, action, to_status, detail)
  values (v_pred.id, 'placed', 'open', jsonb_build_object('stake', p_stake, 'locked_odds', v_odds));

  return v_pred;
end $$;

/* ============================================================== SETTLEMENT */

create or replace function payout_for(p_result text, p_stake int, p_odds numeric) returns int
language sql immutable as $$
  select case p_result when 'won' then round(p_stake * p_odds)::int when 'void' then p_stake else 0 end;
$$;

-- Records the official result of one selection and settles every prediction
-- on it. Safe to call any number of times: open predictions are settled once
-- (guarded by status and by the unique ledger index); calling again with a
-- different result re-settles and writes compensating ledger entries.
create or replace function settle_selection(p_selection_id bigint, p_result text, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_sel market_selections;
  v_pred predictions;
  v_wallet virtual_wallets;
  v_payout int; v_delta int;
  n_settled int := 0; n_corrected int := 0;
begin
  if p_result not in ('won','lost','void') then perform fail('INVALID_RESULT', 'Result must be won, lost or void.'); end if;
  select * into v_sel from market_selections where id = p_selection_id for update;
  if not found then perform fail('UNKNOWN_SELECTION', 'Selection does not exist.'); end if;

  -- Corrections: the provider changed its data after we settled.
  if v_sel.result is not null and v_sel.result <> p_result then
    for v_pred in select * from predictions where selection_id = p_selection_id and status <> 'open' for update loop
      v_payout := payout_for(p_result, v_pred.stake, v_pred.locked_odds);
      v_delta := v_payout - coalesce(v_pred.payout, 0);
      update predictions set status = p_result, payout = v_payout, settled_at = now(), settlement_reason = p_reason
       where id = v_pred.id;
      update virtual_wallets set balance = balance + v_delta, total_returned = total_returned + v_delta
       where id = v_pred.wallet_id returning * into v_wallet;
      if v_delta <> 0 then
        insert into wallet_ledger (wallet_id, user_id, season_id, kind, amount, balance_after, prediction_id)
        values (v_wallet.id, v_pred.user_id, v_pred.season_id, 'correction', v_delta, v_wallet.balance, v_pred.id);
      end if;
      insert into prediction_transactions (prediction_id, action, from_status, to_status, payout, detail)
      values (v_pred.id, 'resettled', v_pred.status, p_result, v_payout, jsonb_build_object('reason', p_reason, 'delta', v_delta));
      insert into notifications (user_id, kind, title, body, data)
      values (v_pred.user_id, 'prediction_corrected', 'A result was corrected',
              format('%s is now %s after an official data correction.', v_pred.selection_label, p_result),
              jsonb_build_object('prediction_id', v_pred.id, 'fixture_id', v_pred.fixture_id));
      n_corrected := n_corrected + 1;
    end loop;
  end if;

  update market_selections set result = p_result, result_reason = p_reason, settled_at = now() where id = p_selection_id;

  for v_pred in select * from predictions where selection_id = p_selection_id and status = 'open' for update loop
    v_payout := payout_for(p_result, v_pred.stake, v_pred.locked_odds);
    update predictions set status = p_result, payout = v_payout, settled_at = now(), settlement_reason = p_reason
     where id = v_pred.id;
    update virtual_wallets
       set balance = balance + v_payout, open_stakes = open_stakes - v_pred.stake,
           total_returned = total_returned + v_payout
     where id = v_pred.wallet_id returning * into v_wallet;
    if v_payout > 0 then
      insert into wallet_ledger (wallet_id, user_id, season_id, kind, amount, balance_after, prediction_id)
      values (v_wallet.id, v_pred.user_id, v_pred.season_id,
              case when p_result = 'void' then 'refund' else 'payout' end, v_payout, v_wallet.balance, v_pred.id);
    end if;
    insert into prediction_transactions (prediction_id, action, from_status, to_status, payout, detail)
    values (v_pred.id, case when p_result = 'void' then 'voided' else 'settled' end, 'open', p_result, v_payout,
            jsonb_build_object('reason', p_reason));
    insert into notifications (user_id, kind, title, body, data)
    values (v_pred.user_id, 'prediction_' || p_result,
            case p_result when 'won' then 'Prediction won' when 'lost' then 'Prediction lost' else 'Prediction void' end,
            case p_result
              when 'won' then format('%s came in: +%s coins.', v_pred.selection_label, v_payout)
              when 'lost' then format('%s did not come in.', v_pred.selection_label)
              else format('%s was void. Your %s coins are back.', v_pred.selection_label, v_pred.stake) end,
            jsonb_build_object('prediction_id', v_pred.id, 'fixture_id', v_pred.fixture_id));
    if p_result = 'won' then
      insert into user_achievements (user_id, achievement_key) values (v_pred.user_id, 'first_win') on conflict do nothing;
      if v_pred.locked_odds >= 5 then
        insert into user_achievements (user_id, achievement_key) values (v_pred.user_id, 'longshot') on conflict do nothing;
      end if;
    end if;
    n_settled := n_settled + 1;
  end loop;

  insert into audit_log (action, entity, entity_id, payload)
  values ('settle_selection', 'market_selection', p_selection_id::text,
          jsonb_build_object('result', p_result, 'reason', p_reason, 'settled', n_settled, 'corrected', n_corrected));
  return jsonb_build_object('settled', n_settled, 'corrected', n_corrected);
end $$;

-- Fixtures that have open predictions and may now be settleable.
create or replace function fixtures_to_settle() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(distinct p.fixture_id), '[]')
  from predictions p join fixtures f on f.id = p.fixture_id
  where p.status = 'open' and f.status in ('finished','cancelled','abandoned','awarded','postponed');
$$;

-- Official facts of a fixture in the shape the settlement engine consumes
-- (see core/types.ts → FixtureFacts). Player ids are internal ids as strings.
create or replace function fixture_facts(p_fixture_id bigint) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'status', f.status,
    'kickoffAt', (extract(epoch from f.kickoff_at) * 1000)::bigint,
    'htHome', f.ht_home, 'htAway', f.ht_away, 'ftHome', f.ft_home, 'ftAway', f.ft_away,
    'wentToExtraTime', f.went_to_extra_time,
    'eventsFinal', f.events_final,
    'playerStatsFinal', f.player_stats_final,
    'goals', coalesce((
      select jsonb_agg(jsonb_build_object(
        'seq', e.seq, 'minute', e.minute,
        -- an own goal is credited to the other side
        'side', case when (e.team_id = f.home_team_id) <> (e.kind = 'own_goal') then 'home' else 'away' end,
        'playerId', e.player_id::text, 'assistId', e.related_player_id::text,
        'ownGoal', e.kind = 'own_goal', 'penalty', e.kind = 'penalty_goal', 'period', e.period) order by e.seq)
      from fixture_events e
      where e.fixture_id = f.id and e.kind in ('goal','own_goal','penalty_goal') and e.period <> 'shootout'), '[]'),
    'cards', coalesce((
      select jsonb_agg(jsonb_build_object(
        'seq', e.seq, 'minute', e.minute, 'playerId', e.player_id::text, 'card', e.kind, 'period', e.period) order by e.seq)
      from fixture_events e
      where e.fixture_id = f.id and e.kind in ('yellow','second_yellow','red')), '[]'),
    'players', coalesce((
      select jsonb_object_agg(s.player_id::text, jsonb_build_object(
        'playerId', s.player_id::text,
        'side', case when s.team_id = f.home_team_id then 'home' else 'away' end,
        'minutes', s.minutes, 'started', s.started,
        'enteredMinute', case
          when s.started then 0
          else (select min(e.minute) from fixture_events e
                 where e.fixture_id = f.id and e.kind = 'substitution'
                   and s.player_id in (e.player_id, e.related_player_id)) end,
        'shots', s.shots, 'shotsOnTarget', s.shots_on_target, 'foulsCommitted', s.fouls_committed,
        'tackles', s.tackles, 'saves', s.saves))
      from player_statistics s where s.fixture_id = f.id), '{}'))
  from fixtures f where f.id = p_fixture_id;
$$;

-- Selections of a fixture that still have open predictions.
create or replace function open_selections(p_fixture_id bigint)
returns table (selection_id bigint, market_key text, line numeric, side text, key text, player_id text)
language sql stable security definer set search_path = public as $$
  select s.id, fm.market_key, fm.line, fm.side, s.key, s.player_id::text
  from market_selections s join fixture_markets fm on fm.id = s.fixture_market_id
  where fm.fixture_id = p_fixture_id
    and exists (select 1 from predictions p where p.selection_id = s.id and p.status = 'open');
$$;

/* ========================================================== SEASON CLOSING */

-- Closes every season whose week has ended (plus a grace period for late
-- results). Predictions still open are refunded, final rankings are frozen
-- into season_results, league winners recorded, achievements awarded.
-- History is only ever added to, never deleted.
create or replace function close_due_seasons() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_season weekly_seasons;
  v_sel record;
  v_grace interval := make_interval(hours => (cfg('season_close_grace_hours', '6'))::int);
  n_closed int := 0;
begin
  for v_season in
    select * from weekly_seasons where status = 'active' and ends_at + v_grace <= now() order by starts_at for update
  loop
    -- Refund anything that could not be settled in time.
    for v_sel in
      select p.id, p.user_id, p.wallet_id, p.stake, p.season_id, p.selection_label, p.fixture_id
      from predictions p where p.season_id = v_season.id and p.status = 'open' for update
    loop
      update predictions set status = 'void', payout = stake, settled_at = now(),
             settlement_reason = 'Unsettled when the weekly season closed'
       where id = v_sel.id;
      with w as (
        update virtual_wallets set balance = balance + v_sel.stake, open_stakes = open_stakes - v_sel.stake,
               total_returned = total_returned + v_sel.stake
         where id = v_sel.wallet_id returning id, balance)
      insert into wallet_ledger (wallet_id, user_id, season_id, kind, amount, balance_after, prediction_id)
      select w.id, v_sel.user_id, v_sel.season_id, 'refund', v_sel.stake, w.balance, v_sel.id from w;
      insert into prediction_transactions (prediction_id, action, from_status, to_status, payout, detail)
      values (v_sel.id, 'voided', 'open', 'void', v_sel.stake, jsonb_build_object('reason', 'season closed'));
    end loop;

    insert into season_results (season_id, user_id, rank, final_balance, net_profit, total_staked, total_returned, predictions, won)
    select v_season.id, w.user_id,
           rank() over (order by w.balance - w.granted desc, coalesce(c.won, 0) desc),
           w.balance, w.balance - w.granted, w.total_staked, w.total_returned,
           coalesce(c.total, 0), coalesce(c.won, 0)
    from virtual_wallets w
    left join (select user_id, count(*) as total, count(*) filter (where status = 'won') as won
                 from predictions where season_id = v_season.id group by user_id) c on c.user_id = w.user_id
    where w.season_id = v_season.id and coalesce(c.total, 0) > 0
    on conflict (season_id, user_id) do nothing;

    insert into league_season_results (league_id, season_id, user_id, rank, net_profit)
    select m.league_id, v_season.id, r.user_id,
           rank() over (partition by m.league_id order by r.net_profit desc, r.won desc), r.net_profit
    from league_members m join season_results r on r.user_id = m.user_id and r.season_id = v_season.id
    on conflict do nothing;

    insert into user_achievements (user_id, achievement_key, season_id)
    select user_id, 'season_winner', season_id from season_results where season_id = v_season.id and rank = 1
    union all
    select user_id, 'podium', season_id from season_results where season_id = v_season.id and rank <= 3
    union all
    select user_id, 'profitable_week', season_id from season_results where season_id = v_season.id and net_profit > 0
    union all
    select user_id, 'league_winner', season_id from league_season_results where season_id = v_season.id and rank = 1 group by user_id, season_id
    on conflict do nothing;

    insert into notifications (user_id, kind, title, body, data)
    select user_id, 'season_closed', 'Weekly season finished',
           format('You finished #%s with %s%s coins. A new week has started with fresh coins.',
                  rank, case when net_profit >= 0 then '+' else '' end, net_profit),
           jsonb_build_object('season_id', season_id, 'rank', rank)
    from season_results where season_id = v_season.id;

    update weekly_seasons set status = 'closed', closed_at = now() where id = v_season.id;
    insert into audit_log (action, entity, entity_id) values ('close_season', 'weekly_season', v_season.id::text);
    n_closed := n_closed + 1;
  end loop;
  perform current_season();
  return jsonb_build_object('closed', n_closed);
end $$;

/* ================================================================ RANKINGS */

-- Leaderboards. p_scope: 'season' (everyone, one season), 'friends',
-- 'league' (needs p_league_id), 'alltime' (closed seasons plus the live one).
-- Live seasons rank by equity (balance plus stakes still in play) minus the grant.
create or replace function get_rankings(
  p_scope text default 'season',
  p_season_id bigint default null,
  p_league_id uuid default null,
  p_limit int default 100
) returns table (
  rank bigint, user_id uuid, username citext, avatar_color text,
  net_profit bigint, staked bigint, predictions bigint, won bigint, is_me boolean
) language plpgsql stable security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_season bigint := coalesce(p_season_id, (select id from weekly_seasons where now() >= starts_at and now() < ends_at));
  v_live boolean := coalesce((select status = 'active' from weekly_seasons where id = v_season), false);
begin
  if v_me is null then perform fail('NOT_AUTHENTICATED', 'Sign in first.'); end if;
  if p_scope = 'league' and not exists (
       select 1 from leagues l where l.id = p_league_id
          and (l.is_public or exists (select 1 from league_members m where m.league_id = l.id and m.user_id = v_me))) then
    perform fail('NOT_A_MEMBER', 'You cannot see this league.');
  end if;

  return query
  with pool as (
    select p.id from profiles p
    where case p_scope
      when 'friends' then p.id = v_me or exists (
        select 1 from friendships f where f.status = 'accepted'
           and ((f.user_id = v_me and f.friend_id = p.id) or (f.friend_id = v_me and f.user_id = p.id)))
      when 'league' then exists (select 1 from league_members m where m.league_id = p_league_id and m.user_id = p.id)
      else true end
  ),
  live as (
    select w.user_id, (w.balance + w.open_stakes - w.granted)::bigint as net, w.total_staked::bigint as staked,
           (select count(*) from predictions x where x.wallet_id = w.id) as n,
           (select count(*) from predictions x where x.wallet_id = w.id and x.status = 'won') as won
    from virtual_wallets w join weekly_seasons s on s.id = w.season_id
    where s.status = 'active' and (p_scope = 'alltime' or w.season_id = v_season)
  ),
  closed as (
    select r.user_id, r.net_profit::bigint as net, r.total_staked::bigint as staked,
           r.predictions::bigint as n, r.won::bigint as won
    from season_results r
    where p_scope = 'alltime' or (r.season_id = v_season and not v_live)
  ),
  totals as (
    select u.user_id, sum(u.net) as net, sum(u.staked) as staked, sum(u.n) as n, sum(u.won) as won
    from (select * from live union all select * from closed) u
    join pool on pool.id = u.user_id
    group by u.user_id
    having sum(u.n) > 0 or u.user_id = v_me
  )
  select rank() over (order by t.net desc, t.won desc), t.user_id, p.username, p.avatar_color,
         t.net::bigint, t.staked::bigint, t.n::bigint, t.won::bigint, t.user_id = v_me
  from totals t join profiles p on p.id = t.user_id
  order by 1, p.username
  limit greatest(1, least(p_limit, 500));
end $$;

/* ================================================================= LEAGUES */

create or replace function gen_code(p_len int default 6) returns text
language sql volatile as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '')
  from generate_series(1, p_len);
$$;

create or replace function create_league(p_name text, p_is_public boolean default false) returns leagues
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_league leagues;
  v_code text;
begin
  if v_user is null then perform fail('NOT_AUTHENTICATED', 'Sign in first.'); end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 3 and 28 then
    perform fail('INVALID_NAME', 'League names have 3 to 28 characters.');
  end if;
  if (select count(*) from leagues where owner_id = v_user) >= 20 then
    perform fail('TOO_MANY_LEAGUES', 'You can own up to 20 leagues.');
  end if;
  loop
    v_code := gen_code();
    exit when not exists (select 1 from leagues where code = v_code);
  end loop;
  insert into leagues (name, code, is_public, owner_id) values (btrim(p_name), v_code, coalesce(p_is_public, false), v_user)
  returning * into v_league;
  insert into league_members (league_id, user_id, role) values (v_league.id, v_user, 'owner');
  insert into user_achievements (user_id, achievement_key) values (v_user, 'founder') on conflict do nothing;
  return v_league;
end $$;

-- Joins by league code or by an invitation token from a shared link.
create or replace function join_league(p_code text) returns leagues
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_league leagues;
  v_inv invitations;
  v_code text := upper(btrim(coalesce(p_code, '')));
begin
  if v_user is null then perform fail('NOT_AUTHENTICATED', 'Sign in first.'); end if;
  select * into v_league from leagues where code = v_code;
  if not found then
    select * into v_inv from invitations where token = btrim(p_code) for update;
    if not found then perform fail('CODE_NOT_FOUND', 'No league matches that code.'); end if;
    if v_inv.expires_at is not null and v_inv.expires_at < now() then perform fail('INVITE_EXPIRED', 'This invitation has expired.'); end if;
    if v_inv.max_uses is not null and v_inv.uses >= v_inv.max_uses then perform fail('INVITE_USED', 'This invitation has been used up.'); end if;
    select * into v_league from leagues where id = v_inv.league_id;
  end if;
  if exists (select 1 from league_members where league_id = v_league.id and user_id = v_user) then
    return v_league;
  end if;
  perform 1 from leagues where id = v_league.id for update;
  if (select count(*) from league_members where league_id = v_league.id) >= v_league.max_members then
    perform fail('LEAGUE_FULL', 'This league is full.');
  end if;
  insert into league_members (league_id, user_id) values (v_league.id, v_user);
  if v_inv.token is not null then update invitations set uses = uses + 1 where token = v_inv.token; end if;
  insert into notifications (user_id, kind, title, body, data)
  select v_league.owner_id, 'league_joined', 'New league member',
         format('%s joined %s.', (select username from profiles where id = v_user), v_league.name),
         jsonb_build_object('league_id', v_league.id)
  where v_league.owner_id <> v_user;
  return v_league;
end $$;

create or replace function create_invitation(p_league_id uuid, p_max_uses int default null, p_expires_hours int default 168)
returns invitations language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_inv invitations;
begin
  if not exists (select 1 from league_members where league_id = p_league_id and user_id = v_user) then
    perform fail('NOT_A_MEMBER', 'Only members can invite to a league.');
  end if;
  insert into invitations (token, league_id, created_by, max_uses, expires_at)
  values (encode(gen_random_bytes(12), 'hex'), p_league_id, v_user, p_max_uses,
          case when p_expires_hours is null then null else now() + make_interval(hours => p_expires_hours) end)
  returning * into v_inv;
  return v_inv;
end $$;

create or replace function leave_league(p_league_id uuid, p_user_id uuid default null) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_target uuid := coalesce(p_user_id, auth.uid());
  v_owner uuid;
begin
  select owner_id into v_owner from leagues where id = p_league_id;
  if v_owner is null then perform fail('UNKNOWN_LEAGUE', 'League not found.'); end if;
  if v_target <> v_user and v_owner <> v_user then perform fail('NOT_OWNER', 'Only the owner can remove members.'); end if;
  if v_target = v_owner then perform fail('OWNER_CANNOT_LEAVE', 'The owner cannot leave. Delete the league instead.'); end if;
  delete from league_members where league_id = p_league_id and user_id = v_target;
end $$;

create or replace function delete_league(p_league_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from leagues where id = p_league_id and owner_id = auth.uid()) then
    perform fail('NOT_OWNER', 'Only the owner can delete a league.');
  end if;
  delete from leagues where id = p_league_id;
end $$;

/* ======================================================= PROFILE & FRIENDS */

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_name text := nullif(btrim(new.raw_user_meta_data->>'username'), '');
begin
  if v_name is null or v_name !~ '^[a-zA-Z0-9_.]{3,18}$' or exists (select 1 from profiles where username = v_name) then
    v_name := 'fan_' || substr(replace(new.id::text, '-', ''), 1, 10);
  end if;
  insert into profiles (id, username) values (new.id, v_name) on conflict (id) do nothing;
  return new;
end $$;

create or replace function update_profile(
  p_username text default null,
  p_avatar_color text default null,
  p_reference_mode text default null,
  p_reference_bookmaker_id bigint default null,
  p_confirm_adult boolean default null
) returns profiles language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_row profiles;
begin
  if v_user is null then perform fail('NOT_AUTHENTICATED', 'Sign in first.'); end if;
  if p_username is not null then
    if p_username !~ '^[a-zA-Z0-9_.]{3,18}$' then
      perform fail('INVALID_USERNAME', 'Use 3 to 18 letters, numbers, dots or underscores.');
    end if;
    if exists (select 1 from profiles where username = p_username and id <> v_user) then
      perform fail('USERNAME_TAKEN', 'That username is taken.');
    end if;
  end if;
  if p_avatar_color is not null and p_avatar_color !~ '^#[0-9A-Fa-f]{6}$' then
    perform fail('INVALID_COLOR', 'Pick one of the available colours.');
  end if;
  if p_reference_mode = 'bookmaker' and p_reference_bookmaker_id is null then
    perform fail('INVALID_REFERENCE', 'Choose a bookmaker.');
  end if;
  update profiles
     set username = coalesce(p_username, username),
         avatar_color = coalesce(p_avatar_color, avatar_color),
         reference_mode = coalesce(p_reference_mode, reference_mode),
         reference_bookmaker_id = case
           when p_reference_mode is null then reference_bookmaker_id
           when p_reference_mode = 'bookmaker' then p_reference_bookmaker_id
           else null end,
         adult_confirmed_at = case when p_confirm_adult then coalesce(adult_confirmed_at, now()) else adult_confirmed_at end
   where id = v_user
  returning * into v_row;
  return v_row;
end $$;

create or replace function request_friend(p_username text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_other uuid;
begin
  select id into v_other from profiles where username = p_username;
  if v_other is null then perform fail('USER_NOT_FOUND', 'No player has that username.'); end if;
  if v_other = v_user then perform fail('SELF', 'That is you.'); end if;
  -- An existing request from them becomes a friendship straight away.
  update friendships set status = 'accepted' where user_id = v_other and friend_id = v_user;
  if found then return; end if;
  insert into friendships (user_id, friend_id) values (v_user, v_other) on conflict do nothing;
  insert into notifications (user_id, kind, title, body, data)
  values (v_other, 'friend_request', 'Friend request',
          format('%s wants to compare predictions with you.', (select username from profiles where id = v_user)),
          jsonb_build_object('user_id', v_user));
end $$;

create or replace function respond_friend(p_user_id uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_accept then
    update friendships set status = 'accepted' where user_id = p_user_id and friend_id = auth.uid();
  else
    delete from friendships
     where (user_id = p_user_id and friend_id = auth.uid()) or (user_id = auth.uid() and friend_id = p_user_id);
  end if;
end $$;

create or replace function mark_notifications_read() returns void
language sql security definer set search_path = public as $$
  update notifications set read_at = now() where user_id = auth.uid() and read_at is null;
$$;

-- Public leagues can be joined from discovery without knowing the code.
create or replace function join_public_league(p_league_id uuid) returns leagues
language plpgsql security definer set search_path = public as $$
declare
  v_code text;
begin
  select code into v_code from leagues where id = p_league_id and is_public;
  if v_code is null then perform fail('CODE_NOT_FOUND', 'This league is private. Ask a member for the code.'); end if;
  return join_league(v_code);
end $$;
