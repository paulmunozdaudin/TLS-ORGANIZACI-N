-- Read helpers for the sync and settlement jobs (service role only).
-- Jobs talk to the database through RPCs alone, which keeps them testable
-- against plain Postgres and keeps table access out of Edge Function code.

-- Applies operator configuration (odds keys, ordering) to synced competitions.
create or replace function apply_competition_config() returns jsonb
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update competitions c
     set odds_sport_key = x->>'odds_sport_key',
         priority = coalesce((x->>'priority')::int, c.priority)
    from jsonb_array_elements(cfg('competitions', '[]')) x
   where c.provider = x->>'provider' and c.external_id = x->>'external_id';
  get diagnostics n = row_count;
  return jsonb_build_object('configured', n);
end $$;

create or replace function team_names(p_team bigint) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_agg(n) from (
    select name as n from teams where id = p_team
    union select short_name from teams where id = p_team and short_name is not null
    union select alias from team_aliases where team_id = p_team) x;
$$;

-- Fixtures that can still take predictions, with what matching needs.
create or replace function upcoming_fixtures(p_hours int default 168) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', f.id, 'external_id', f.external_id,
    'kickoff_at', (extract(epoch from f.kickoff_at) * 1000)::bigint,
    'odds_sport_key', c.odds_sport_key,
    'home', jsonb_build_object('id', f.home_team_id, 'name', h.name, 'names', team_names(f.home_team_id)),
    'away', jsonb_build_object('id', f.away_team_id, 'name', a.name, 'names', team_names(f.away_team_id))
  ) order by f.kickoff_at), '[]')
  from fixtures f
  join competitions c on c.id = f.competition_id and c.enabled
  join teams h on h.id = f.home_team_id
  join teams a on a.id = f.away_team_id
  where f.status = 'scheduled' and f.kickoff_at > now() and f.kickoff_at < now() + make_interval(hours => p_hours);
$$;

create or replace function squad_players(p_team_ids bigint[]) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id, 'team_id', p.team_id, 'name', p.name,
    'names', to_jsonb(array_remove(array[p.name, p.full_name], null)))), '[]')
  from players p where p.team_id = any(p_team_ids);
$$;

-- Fixtures whose status or score may have moved: kicked off but not final.
create or replace function fixtures_in_play(p_provider text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(f.external_id order by f.kickoff_at), '[]')
  from fixtures f
  where f.provider = p_provider
    and ((f.status in ('live','suspended'))
      or (f.status in ('scheduled','unknown') and f.kickoff_at <= now() and f.kickoff_at > now() - interval '2 days')
      or (f.status = 'postponed' and f.kickoff_at > now() - interval '3 days'));
$$;

-- Fixtures that need lineups (from about an hour before kick-off) or match
-- data (while live, and after the whistle until everything is final).
create or replace function fixtures_needing_details(p_provider text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', f.id, 'external_id', f.external_id, 'status', f.status,
    'home_external_id', h.external_id, 'away_external_id', a.external_id,
    'need_lineups', f.lineups_at is null,
    'need_match_data', f.status in ('live','suspended','finished'),
    'has_predictions', exists (select 1 from predictions p where p.fixture_id = f.id)
  ) order by f.kickoff_at), '[]')
  from fixtures f
  join teams h on h.id = f.home_team_id
  join teams a on a.id = f.away_team_id
  where f.provider = p_provider
    and ((f.status = 'scheduled' and f.lineups_at is null
          and f.kickoff_at between now() - interval '15 minutes' and now() + interval '70 minutes')
      or f.status in ('live','suspended')
      or (f.status = 'finished' and f.kickoff_at > now() - interval '4 days'
          and (not f.events_final or not f.player_stats_final)));
$$;

revoke execute on function apply_competition_config(), team_names(bigint), upcoming_fixtures(int),
  squad_players(bigint[]), fixtures_in_play(text), fixtures_needing_details(text) from public, anon, authenticated;
grant execute on function apply_competition_config(), team_names(bigint), upcoming_fixtures(int),
  squad_players(bigint[]), fixtures_in_play(text), fixtures_needing_details(text) to service_role;
