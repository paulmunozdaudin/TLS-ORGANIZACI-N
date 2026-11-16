-- Read API for the app. One round-trip per screen, JSON out.
-- These run with the caller's rights (security invoker), so Row Level
-- Security decides what each user can see.

create or replace function ms(p timestamptz) returns bigint language sql immutable as $$
  select (extract(epoch from p) * 1000)::bigint;
$$;

create or replace function team_json(p_id bigint) returns jsonb language sql stable as $$
  select jsonb_build_object('id', t.id, 'name', t.name, 'short_name', t.short_name, 'code', t.code, 'logo_url', t.logo_url)
  from teams t where t.id = p_id;
$$;

create or replace function fixture_json(f fixtures) returns jsonb language sql stable as $$
  select jsonb_build_object(
    'id', f.id, 'kickoff_at', ms(f.kickoff_at), 'status', f.status, 'status_raw', f.status_raw, 'elapsed', f.elapsed,
    'home_goals', f.home_goals, 'away_goals', f.away_goals, 'ht_home', f.ht_home, 'ht_away', f.ht_away,
    'venue', f.venue, 'round', f.round, 'updated_at', ms(f.updated_at),
    'competition', (select jsonb_build_object('id', c.id, 'name', c.name, 'country', c.country, 'logo_url', c.logo_url, 'priority', c.priority)
                      from competitions c where c.id = f.competition_id),
    'home', team_json(f.home_team_id), 'away', team_json(f.away_team_id));
$$;

-- Fixtures in a time window with the match-result consensus, if priced.
create or replace function list_fixtures(p_from timestamptz, p_to timestamptz, p_competition_id bigint default null)
returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(x.j order by x.priority, x.kickoff_at, x.id), '[]') from (
    select f.kickoff_at, f.id, c.priority,
      fixture_json(f) || jsonb_build_object(
        'markets', (select count(*) from fixture_markets fm where fm.fixture_id = f.id),
        'result_prices', (
          select jsonb_object_agg(s.key, jsonb_build_object(
                   'selection_id', s.id, 'avg', p.avg_odds, 'best', p.best_odds, 'count', p.bookmaker_count))
          from fixture_markets fm
          join market_selections s on s.fixture_market_id = fm.id
          join selection_prices p on p.selection_id = s.id
          where fm.fixture_id = f.id and fm.market_key = 'match_result')) as j
    from fixtures f join competitions c on c.id = f.competition_id
    where c.enabled and f.kickoff_at >= p_from and f.kickoff_at < p_to
      and (p_competition_id is null or f.competition_id = p_competition_id)
    order by f.kickoff_at limit 300) x;
$$;

create or replace function list_competitions() returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'country', country, 'logo_url', logo_url) order by priority, name), '[]')
  from competitions where enabled;
$$;

create or replace function team_form(p_team bigint, p_before timestamptz, p_limit int default 5) returns jsonb
language sql stable as $$
  select coalesce(jsonb_agg(x.j order by x.kickoff_at desc), '[]') from (
    select f.kickoff_at, jsonb_build_object(
      'fixture_id', f.id, 'kickoff_at', ms(f.kickoff_at), 'home', f.home_team_id = p_team,
      'opponent', (select name from teams where id = case when f.home_team_id = p_team then f.away_team_id else f.home_team_id end),
      'goals_for', case when f.home_team_id = p_team then f.ft_home else f.ft_away end,
      'goals_against', case when f.home_team_id = p_team then f.ft_away else f.ft_home end) as j
    from fixtures f
    where p_team in (f.home_team_id, f.away_team_id) and f.status = 'finished' and f.kickoff_at < p_before
      and f.ft_home is not null
    order by f.kickoff_at desc limit p_limit) x;
$$;

-- Everything the match page shows apart from markets.
create or replace function get_fixture(p_id bigint) returns jsonb language sql stable as $$
  select fixture_json(f) || jsonb_build_object(
    'events_final', f.events_final, 'player_stats_final', f.player_stats_final, 'lineups_at', ms(f.lineups_at),
    'standings', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'team_id', s.team_id, 'position', s.position, 'played', s.played, 'won', s.won, 'drawn', s.drawn, 'lost', s.lost,
        'goals_for', s.goals_for, 'goals_against', s.goals_against, 'points', s.points, 'form', s.form,
        'home', s.home, 'away', s.away, 'updated_at', ms(s.updated_at))), '[]')
      from standings s where s.competition_id = f.competition_id and s.season = f.season
        and s.team_id in (f.home_team_id, f.away_team_id)),
    'league_averages', (
      select jsonb_build_object(
        'home_goals', sum((s.home->>'goals_for')::numeric) / nullif(sum((s.home->>'played')::numeric), 0),
        'away_goals', sum((s.away->>'goals_for')::numeric) / nullif(sum((s.away->>'played')::numeric), 0))
      from standings s where s.competition_id = f.competition_id and s.season = f.season),
    'form', jsonb_build_object('home', team_form(f.home_team_id, f.kickoff_at), 'away', team_form(f.away_team_id, f.kickoff_at)),
    'head_to_head', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'fixture_id', h.id, 'kickoff_at', ms(h.kickoff_at), 'home', team_json(h.home_team_id), 'away', team_json(h.away_team_id),
        'ft_home', h.ft_home, 'ft_away', h.ft_away) order by h.kickoff_at desc), '[]')
      from fixtures h
      where h.status = 'finished' and h.id <> f.id and h.ft_home is not null
        and ((h.home_team_id = f.home_team_id and h.away_team_id = f.away_team_id)
          or (h.home_team_id = f.away_team_id and h.away_team_id = f.home_team_id))),
    'injuries', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'player', pl.name, 'player_id', pl.id, 'team_id', i.team_id, 'kind', i.kind, 'reason', i.reason,
        'reported_at', ms(i.reported_at))), '[]')
      from injuries i join players pl on pl.id = i.player_id where i.fixture_id = f.id),
    'lineups', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'team_id', l.team_id, 'player_id', l.player_id, 'name', pl.name, 'photo_url', pl.photo_url,
        'is_starter', l.is_starter, 'position', l.position, 'shirt_number', l.shirt_number, 'formation', l.formation)
        order by l.is_starter desc, l.shirt_number), '[]')
      from lineups l join players pl on pl.id = l.player_id where l.fixture_id = f.id),
    'events', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'seq', e.seq, 'minute', e.minute, 'extra_minute', e.extra_minute, 'kind', e.kind, 'team_id', e.team_id,
        'player', pl.name, 'related_player', rp.name, 'detail', e.detail) order by e.seq), '[]')
      from fixture_events e
      left join players pl on pl.id = e.player_id left join players rp on rp.id = e.related_player_id
      where e.fixture_id = f.id),
    'team_stats', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'team_id', s.team_id, 'possession', s.possession, 'shots', s.shots, 'shots_on_target', s.shots_on_target,
        'corners', s.corners, 'fouls', s.fouls, 'yellow_cards', s.yellow_cards, 'red_cards', s.red_cards,
        'offsides', s.offsides, 'updated_at', ms(s.updated_at))), '[]')
      from fixture_statistics s where s.fixture_id = f.id),
    'my_predictions', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', p.id, 'selection_id', p.selection_id, 'market_key', p.market_key, 'label', p.selection_label,
        'stake', p.stake, 'locked_odds', p.locked_odds, 'status', p.status, 'payout', p.payout,
        'potential_return', p.potential_return) order by p.placed_at), '[]')
      from predictions p where p.fixture_id = f.id and p.user_id = auth.uid()))
  from fixtures f where f.id = p_id;
$$;

-- Markets actually priced for a fixture, with every bookmaker quote.
create or replace function get_fixture_markets(p_id bigint) returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', fm.id, 'market_key', fm.market_key, 'name', m.name, 'group', m.grp, 'scope', m.scope, 'sort', m.sort,
    'line', fm.line, 'side', fm.side, 'status', fm.status,
    'selections', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', s.id, 'key', s.key, 'label', s.label, 'result', s.result,
        'player', case when s.player_id is null then null else (
          select jsonb_build_object('id', pl.id, 'name', pl.name, 'photo_url', pl.photo_url, 'position', pl.position,
                                    'team_id', pl.team_id, 'shirt_number', pl.shirt_number)
          from players pl where pl.id = s.player_id) end,
        'quotes', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'bookmaker_id', q.bookmaker_id, 'bookmakerKey', q.bookmaker_key, 'bookmaker', q.bookmaker_name,
            'decimal', q.decimal_odds, 'suspended', q.suspended, 'withdrawn', q.withdrawn_at is not null, 'fresh', q.fresh,
            'updatedAt', ms(q.last_seen_at),
            'bookmaker_updated_at', ms(q.provider_updated_at), 'provider', q.provider_id) order by q.bookmaker_name), '[]')
          from current_quotes q where q.selection_id = s.id)) order by s.id), '[]')
      from market_selections s where s.fixture_market_id = fm.id)
  ) order by m.sort, fm.side nulls first, fm.line nulls first), '[]')
  from fixture_markets fm join markets m on m.key = fm.market_key and m.enabled
  where fm.fixture_id = p_id;
$$;

create or replace function get_player(p_id bigint) returns jsonb language sql stable as $$
  select jsonb_build_object(
    'id', p.id, 'name', p.name, 'full_name', p.full_name, 'photo_url', p.photo_url, 'nationality', p.nationality,
    'position', p.position, 'shirt_number', p.shirt_number, 'team', team_json(p.team_id), 'updated_at', ms(p.updated_at),
    'seasons', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'competition', c.name, 'season', s.season, 'appearances', s.appearances, 'starts', s.starts, 'minutes', s.minutes,
        'goals', s.goals, 'assists', s.assists, 'yellow_cards', s.yellow_cards, 'red_cards', s.red_cards,
        'shots', s.shots, 'shots_on_target', s.shots_on_target, 'updated_at', ms(s.updated_at)) order by s.season desc, c.priority), '[]')
      from player_season_stats s join competitions c on c.id = s.competition_id where s.player_id = p.id),
    'recent', (
      select coalesce(jsonb_agg(x.j order by x.kickoff_at desc), '[]') from (
        select f.kickoff_at, jsonb_build_object(
          'fixture_id', f.id, 'kickoff_at', ms(f.kickoff_at), 'home', team_json(f.home_team_id), 'away', team_json(f.away_team_id),
          'ft_home', f.ft_home, 'ft_away', f.ft_away, 'minutes', s.minutes, 'started', s.started, 'goals', s.goals,
          'assists', s.assists, 'shots', s.shots, 'shots_on_target', s.shots_on_target,
          'yellow_cards', s.yellow_cards, 'red_cards', s.red_cards) as j
        from player_statistics s join fixtures f on f.id = s.fixture_id
        where s.player_id = p.id and f.status = 'finished'
        order by f.kickoff_at desc limit 10) x),
    'next_fixture', (
      select fixture_json(f) from fixtures f
      where p.team_id in (f.home_team_id, f.away_team_id) and f.status = 'scheduled' and f.kickoff_at > now()
      order by f.kickoff_at limit 1))
  from players p where p.id = p_id;
$$;

create or replace function my_predictions(p_status text default 'all', p_limit int default 100) returns jsonb
language sql stable as $$
  select coalesce(jsonb_agg(x.j order by x.placed_at desc), '[]') from (
    select p.placed_at, jsonb_build_object(
      'id', p.id, 'fixture', fixture_json(f), 'market_key', p.market_key, 'market', m.name, 'label', p.selection_label,
      'line', p.line, 'player', (select name from players where id = p.player_id),
      'stake', p.stake, 'locked_odds', p.locked_odds, 'odds_mode', p.odds_mode,
      'bookmaker', (select name from bookmakers where id = p.bookmaker_id),
      'basis', (p.price_detail->>'basis')::int,
      'potential_return', p.potential_return, 'status', p.status, 'payout', p.payout,
      'placed_at', ms(p.placed_at), 'settled_at', ms(p.settled_at), 'reason', p.settlement_reason,
      'season_id', p.season_id) as j
    from predictions p join fixtures f on f.id = p.fixture_id join markets m on m.key = p.market_key
    where p.user_id = auth.uid()
      and (p_status = 'all' or (p_status = 'open' and p.status = 'open') or (p_status = 'settled' and p.status <> 'open'))
    order by p.placed_at desc limit least(p_limit, 300)) x;
$$;

-- Wallet for the current week (created on first use) plus recent movements.
create or replace function my_wallet() returns jsonb language plpgsql as $$
declare
  w virtual_wallets := get_wallet();
begin
  return jsonb_build_object(
    'wallet', to_jsonb(w),
    'season', (select jsonb_build_object('id', s.id, 'starts_at', ms(s.starts_at), 'ends_at', ms(s.ends_at)) from weekly_seasons s where s.id = w.season_id),
    'counts', (select jsonb_build_object(
        'open', count(*) filter (where status = 'open'), 'won', count(*) filter (where status = 'won'),
        'lost', count(*) filter (where status = 'lost'), 'void', count(*) filter (where status = 'void'))
      from predictions where wallet_id = w.id),
    'ledger', (
      select coalesce(jsonb_agg(x.j order by x.id desc), '[]') from (
        select l.id, jsonb_build_object('id', l.id, 'kind', l.kind, 'amount', l.amount, 'balance_after', l.balance_after,
                                        'at', ms(l.created_at), 'label', p.selection_label, 'prediction_id', l.prediction_id) as j
        from wallet_ledger l left join predictions p on p.id = l.prediction_id
        where l.wallet_id = w.id order by l.id desc limit 100) x));
end $$;

create or replace function my_seasons() returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'season_id', r.season_id, 'starts_at', ms(s.starts_at), 'ends_at', ms(s.ends_at), 'rank', r.rank,
    'net_profit', r.net_profit, 'final_balance', r.final_balance, 'predictions', r.predictions, 'won', r.won,
    'players', (select count(*) from season_results x where x.season_id = r.season_id)) order by s.starts_at desc), '[]')
  from season_results r join weekly_seasons s on s.id = r.season_id where r.user_id = auth.uid();
$$;

create or replace function league_json(l leagues) returns jsonb language sql stable as $$
  select jsonb_build_object(
    'id', l.id, 'name', l.name, 'is_public', l.is_public, 'owner_id', l.owner_id, 'max_members', l.max_members,
    'code', case when is_league_member(l.id) then l.code end,
    'members', (select count(*) from league_members m where m.league_id = l.id),
    'is_member', is_league_member(l.id), 'is_owner', l.owner_id = auth.uid());
$$;

create or replace function my_leagues() returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(league_json(l) order by l.created_at desc), '[]')
  from leagues l where is_league_member(l.id);
$$;

create or replace function public_leagues(p_search text default null) returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(x.j), '[]') from (
    select league_json(l) as j from leagues l
    where l.is_public and not is_league_member(l.id)
      and (p_search is null or l.name ilike '%' || p_search || '%')
    order by (select count(*) from league_members m where m.league_id = l.id) desc, l.created_at desc limit 50) x;
$$;

create or replace function get_league(p_id uuid) returns jsonb language sql stable as $$
  select league_json(l) || jsonb_build_object(
    'member_list', (
      select coalesce(jsonb_agg(jsonb_build_object('user_id', m.user_id, 'username', p.username, 'avatar_color', p.avatar_color,
                                                   'role', m.role, 'joined_at', ms(m.joined_at)) order by m.joined_at), '[]')
      from league_members m join profiles p on p.id = m.user_id where m.league_id = l.id),
    'winners', (
      select coalesce(jsonb_agg(jsonb_build_object('season_id', r.season_id, 'starts_at', ms(s.starts_at), 'username', p.username,
                                                   'avatar_color', p.avatar_color, 'net_profit', r.net_profit) order by s.starts_at desc), '[]')
      from league_season_results r join weekly_seasons s on s.id = r.season_id join profiles p on p.id = r.user_id
      where r.league_id = l.id and r.rank = 1))
  from leagues l where l.id = p_id;
$$;

create or replace function my_notifications() returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(x.j order by x.id desc), '[]') from (
    select n.id, jsonb_build_object('id', n.id, 'kind', n.kind, 'title', n.title, 'body', n.body, 'data', n.data,
                                    'read', n.read_at is not null, 'at', ms(n.created_at)) as j
    from notifications n where n.user_id = auth.uid() order by n.id desc limit 80) x;
$$;

create or replace function my_friends() returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'user_id', p.id, 'username', p.username, 'avatar_color', p.avatar_color, 'status', f.status,
    'incoming', f.friend_id = auth.uid() and f.status = 'pending') order by f.status desc, p.username), '[]')
  from friendships f join profiles p on p.id = case when f.user_id = auth.uid() then f.friend_id else f.user_id end
  where auth.uid() in (f.user_id, f.friend_id);
$$;

create or replace function get_profile(p_user uuid default null) returns jsonb language sql stable as $$
  select jsonb_build_object(
    'id', p.id, 'username', p.username, 'avatar_color', p.avatar_color, 'created_at', ms(p.created_at),
    'achievements', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'key', a.key, 'name', a.name, 'description', a.description, 'icon', a.icon,
        'times', (select count(*) from user_achievements u where u.user_id = p.id and u.achievement_key = a.key)) order by a.sort), '[]')
      from achievements a),
    'career', (
      select jsonb_build_object('seasons', count(*), 'net_profit', coalesce(sum(net_profit), 0), 'best_rank', min(rank),
                                'predictions', coalesce(sum(predictions), 0), 'won', coalesce(sum(won), 0))
      from season_results r where r.user_id = p.id))
  from profiles p where p.id = coalesce(p_user, auth.uid());
$$;

create or replace function list_bookmakers() returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', b.id, 'key', b.key, 'name', b.name, 'region', b.region) order by b.name), '[]')
  from bookmakers b where exists (select 1 from odds_snapshots o where o.bookmaker_id = b.id and o.is_latest);
$$;

-- What the app needs to say how fresh, and from where, its data is.
create or replace function data_status() returns jsonb language sql stable as $$
  select jsonb_build_object(
    'jobs', (select coalesce(jsonb_agg(jsonb_build_object('job', job, 'provider', provider, 'last_ok_at', ms(last_ok_at),
                                                          'last_error_at', ms(last_error_at), 'last_error', last_error)), '[]')
               from data_freshness),
    'odds_providers', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'website', website)), '[]')
                         from odds_providers where active),
    'stale_minutes', cfg('odds_stale_minutes', '90'),
    -- 'test' only in local databases filled by supabase/tests/dev-seed.mjs; the app then shows a TEST DATA banner.
    'environment', cfg('environment', '"production"'),
    'fixtures', (select count(*) from fixtures where kickoff_at > now()),
    'priced_fixtures', (select count(distinct fm.fixture_id) from fixture_markets fm join fixtures f on f.id = fm.fixture_id where f.kickoff_at > now()));
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'ms(timestamptz)', 'team_json(bigint)', 'fixture_json(fixtures)', 'list_fixtures(timestamptz, timestamptz, bigint)',
    'list_competitions()', 'team_form(bigint, timestamptz, int)', 'get_fixture(bigint)', 'get_fixture_markets(bigint)',
    'get_player(bigint)', 'my_predictions(text, int)', 'my_wallet()', 'my_seasons()', 'league_json(leagues)',
    'my_leagues()', 'public_leagues(text)', 'get_league(uuid)', 'my_notifications()', 'my_friends()',
    'get_profile(uuid)', 'list_bookmakers()', 'data_status()'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
end $$;
