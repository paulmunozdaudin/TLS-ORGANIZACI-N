-- MATCH.IQ schema.
-- Football reference data and odds are written only by server-side ingest
-- functions; game state (wallets, predictions) only by the RPCs in the next
-- migration. Clients never insert, update or delete these tables directly.

create extension if not exists pgcrypto;
create extension if not exists citext;

/* ------------------------------------------------------------------ config */

create table app_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

/* ------------------------------------------------------- football reference */

create table competitions (
  id bigint generated always as identity primary key,
  provider text not null,
  external_id text not null,
  name text not null,
  country text,
  kind text,
  logo_url text,
  season int,
  -- key of this competition at the odds provider (set by an operator, not by sync)
  odds_sport_key text,
  priority int not null default 100,
  enabled boolean not null default true,
  coverage jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  unique (provider, external_id)
);

create table teams (
  id bigint generated always as identity primary key,
  provider text not null,
  external_id text not null,
  name text not null,
  short_name text,
  code text,
  country text,
  logo_url text,
  venue text,
  updated_at timestamptz not null default now(),
  unique (provider, external_id)
);

-- Alternative spellings used by other providers, for cross-provider matching.
create table team_aliases (
  team_id bigint not null references teams on delete cascade,
  alias text not null,
  source text not null default 'manual',
  primary key (team_id, alias)
);

create table standings (
  competition_id bigint not null references competitions on delete cascade,
  season int not null,
  team_id bigint not null references teams on delete cascade,
  position int,
  played int, won int, drawn int, lost int,
  goals_for int, goals_against int, points int,
  form text,
  home jsonb not null default '{}',
  away jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (competition_id, season, team_id)
);

create table players (
  id bigint generated always as identity primary key,
  provider text not null,
  external_id text not null,
  name text not null,
  full_name text,
  photo_url text,
  nationality text,
  position text,
  shirt_number int,
  team_id bigint references teams on delete set null,
  updated_at timestamptz not null default now(),
  unique (provider, external_id)
);
create index players_team_idx on players (team_id);

create table player_season_stats (
  player_id bigint not null references players on delete cascade,
  competition_id bigint not null references competitions on delete cascade,
  season int not null,
  appearances int, starts int, minutes int,
  goals int, assists int, yellow_cards int, red_cards int,
  shots int, shots_on_target int,
  updated_at timestamptz not null default now(),
  primary key (player_id, competition_id, season)
);

create table fixtures (
  id bigint generated always as identity primary key,
  provider text not null,
  external_id text not null,
  competition_id bigint not null references competitions,
  season int,
  round text,
  home_team_id bigint not null references teams,
  away_team_id bigint not null references teams,
  kickoff_at timestamptz not null,
  venue text,
  status text not null default 'scheduled'
    check (status in ('scheduled','live','finished','postponed','cancelled','abandoned','awarded','suspended','unknown')),
  status_raw text,
  elapsed int,
  -- current / final score as shown on the scoreboard
  home_goals int, away_goals int,
  -- regulation-time scores used for settlement
  ht_home int, ht_away int, ft_home int, ft_away int,
  went_to_extra_time boolean not null default false,
  events_final boolean not null default false,
  player_stats_final boolean not null default false,
  lineups_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (provider, external_id),
  check (home_team_id <> away_team_id)
);
create index fixtures_kickoff_idx on fixtures (kickoff_at);
create index fixtures_competition_idx on fixtures (competition_id, kickoff_at);
create index fixtures_status_idx on fixtures (status) where status in ('live','postponed','suspended');
create index fixtures_teams_idx on fixtures (home_team_id, away_team_id);

create table fixture_events (
  id bigint generated always as identity primary key,
  fixture_id bigint not null references fixtures on delete cascade,
  seq int not null,
  minute int,
  extra_minute int,
  period text not null default 'regular' check (period in ('regular','extra','shootout')),
  team_id bigint references teams,
  player_id bigint references players,
  -- assist for goals; the second player for substitutions
  related_player_id bigint references players,
  kind text not null check (kind in
    ('goal','own_goal','penalty_goal','missed_penalty','yellow','second_yellow','red','substitution','var','other')),
  detail text,
  unique (fixture_id, seq)
);

create table lineups (
  fixture_id bigint not null references fixtures on delete cascade,
  team_id bigint not null references teams,
  player_id bigint not null references players,
  is_starter boolean not null,
  position text,
  shirt_number int,
  formation text,
  primary key (fixture_id, player_id)
);

create table player_statistics (
  fixture_id bigint not null references fixtures on delete cascade,
  player_id bigint not null references players,
  team_id bigint not null references teams,
  minutes int,
  started boolean not null default false,
  goals int, assists int,
  shots int, shots_on_target int,
  yellow_cards int, red_cards int,
  fouls_committed int, tackles int, saves int,
  rating numeric(4,2),
  updated_at timestamptz not null default now(),
  primary key (fixture_id, player_id)
);
create index player_statistics_player_idx on player_statistics (player_id);

create table fixture_statistics (
  fixture_id bigint not null references fixtures on delete cascade,
  team_id bigint not null references teams,
  possession numeric(5,2),
  shots int, shots_on_target int, corners int, fouls int,
  yellow_cards int, red_cards int, offsides int,
  raw jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (fixture_id, team_id)
);

create table injuries (
  id bigint generated always as identity primary key,
  provider text not null,
  player_id bigint not null references players on delete cascade,
  team_id bigint references teams,
  fixture_id bigint references fixtures on delete cascade,
  kind text,
  reason text,
  reported_at timestamptz not null default now(),
  unique nulls not distinct (player_id, fixture_id)
);

/* -------------------------------------------------------------------- odds */

create table odds_providers (
  id text primary key,
  name text not null,
  website text,
  terms_url text,
  active boolean not null default true
);

create table bookmakers (
  id bigint generated always as identity primary key,
  key text not null unique,
  name text not null,
  region text
);

-- Which fixture an odds provider's event id refers to.
create table provider_events (
  provider_id text not null references odds_providers,
  external_id text not null,
  fixture_id bigint not null references fixtures on delete cascade,
  match_score numeric(4,3),
  matched_at timestamptz not null default now(),
  primary key (provider_id, external_id)
);
create index provider_events_fixture_idx on provider_events (fixture_id);

-- Market registry. Rows mirror supabase/functions/_shared/core/markets.ts.
create table markets (
  key text primary key,
  name text not null,
  grp text not null,
  scope text not null check (scope in ('match','player')),
  has_line boolean not null default false,
  needs text[] not null default '{}',
  enabled boolean not null default true,
  sort int not null default 0
);

-- A market offered on a fixture. Created only when a provider sends prices.
create table fixture_markets (
  id bigint generated always as identity primary key,
  fixture_id bigint not null references fixtures on delete cascade,
  market_key text not null references markets,
  line numeric(5,2),
  side text check (side in ('home','away')),
  status text not null default 'open' check (status in ('open','suspended','closed')),
  created_at timestamptz not null default now(),
  unique nulls not distinct (fixture_id, market_key, line, side)
);

create table market_selections (
  id bigint generated always as identity primary key,
  fixture_market_id bigint not null references fixture_markets on delete cascade,
  key text not null,
  player_id bigint references players,
  label text not null,
  result text check (result in ('won','lost','void')),
  result_reason text,
  settled_at timestamptz,
  unique nulls not distinct (fixture_market_id, key, player_id)
);
create index market_selections_player_idx on market_selections (player_id) where player_id is not null;

-- Append-only price history. A new row is written only when a bookmaker's
-- price or suspension changes; `last_seen_at` moves on every confirmation.
-- The Odds API has no "suspended" flag: a suspended market stops updating
-- and is dropped from responses after about 15 minutes, which is what
-- `withdrawn_at` and the bookmaker-age check in `current_quotes` capture.
create table odds_snapshots (
  id bigint generated always as identity primary key,
  selection_id bigint not null references market_selections on delete cascade,
  bookmaker_id bigint not null references bookmakers,
  provider_id text not null references odds_providers,
  decimal_odds numeric(8,3) not null check (decimal_odds > 1),
  suspended boolean not null default false,
  provider_updated_at timestamptz,
  fetched_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  -- set when a later, complete fetch of the same market no longer contains this quote
  withdrawn_at timestamptz,
  source_ref text,
  is_latest boolean not null default true
);
create unique index odds_snapshots_latest_idx on odds_snapshots (selection_id, bookmaker_id) where is_latest;
create index odds_snapshots_history_idx on odds_snapshots (selection_id, bookmaker_id, fetched_at desc);

/* ------------------------------------------------------------------- users */

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  username citext not null unique check (username ~ '^[a-zA-Z0-9_.]{3,18}$'),
  avatar_color text not null default '#B6F542',
  reference_mode text not null default 'consensus' check (reference_mode in ('consensus','best','bookmaker')),
  reference_bookmaker_id bigint references bookmakers,
  adult_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  check (reference_mode <> 'bookmaker' or reference_bookmaker_id is not null)
);

create table friendships (
  user_id uuid not null references profiles on delete cascade,
  friend_id uuid not null references profiles on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);
create index friendships_friend_idx on friendships (friend_id);

/* ------------------------------------------------------- seasons & wallets */

create table weekly_seasons (
  id bigint generated always as identity primary key,
  starts_at timestamptz not null unique,
  ends_at timestamptz not null,
  status text not null default 'active' check (status in ('active','closed')),
  closed_at timestamptz,
  check (ends_at > starts_at)
);

create table virtual_wallets (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles on delete cascade,
  season_id bigint not null references weekly_seasons,
  granted int not null,
  balance int not null,
  open_stakes int not null default 0 check (open_stakes >= 0),
  total_staked int not null default 0,
  total_returned int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, season_id)
);

create table predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  season_id bigint not null references weekly_seasons,
  wallet_id bigint not null references virtual_wallets,
  fixture_id bigint not null references fixtures,
  selection_id bigint not null references market_selections,
  -- denormalised description, frozen at submission
  market_key text not null,
  line numeric(5,2),
  player_id bigint references players,
  selection_label text not null,
  stake int not null check (stake > 0),
  -- the price is frozen here and never changes afterwards
  locked_odds numeric(8,3) not null check (locked_odds > 1),
  odds_mode text not null check (odds_mode in ('consensus','best','bookmaker')),
  bookmaker_id bigint references bookmakers,
  odds_snapshot_id bigint references odds_snapshots,
  price_detail jsonb not null,
  potential_return int not null,
  status text not null default 'open' check (status in ('open','won','lost','void')),
  payout int,
  placed_at timestamptz not null default now(),
  locks_at timestamptz not null,
  settled_at timestamptz,
  settlement_reason text,
  client_request_id uuid not null,
  unique (user_id, client_request_id)
);
create index predictions_user_idx on predictions (user_id, placed_at desc);
create index predictions_selection_open_idx on predictions (selection_id) where status = 'open';
create index predictions_fixture_idx on predictions (fixture_id);
create index predictions_season_idx on predictions (season_id, user_id);

-- Every coin movement. Balances are always explainable from this table.
create table wallet_ledger (
  id bigint generated always as identity primary key,
  wallet_id bigint not null references virtual_wallets on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  season_id bigint not null references weekly_seasons,
  kind text not null check (kind in ('season_grant','stake','payout','refund','correction')),
  amount int not null,
  balance_after int not null,
  prediction_id uuid references predictions,
  created_at timestamptz not null default now()
);
create index wallet_ledger_wallet_idx on wallet_ledger (wallet_id, id desc);
-- One stake and one settlement entry per prediction: the idempotency guard.
create unique index wallet_ledger_stake_once on wallet_ledger (prediction_id) where kind = 'stake';
create unique index wallet_ledger_settle_once on wallet_ledger (prediction_id) where kind in ('payout','refund');
create unique index wallet_ledger_grant_once on wallet_ledger (wallet_id) where kind = 'season_grant';

-- Audit trail of prediction state changes.
create table prediction_transactions (
  id bigint generated always as identity primary key,
  prediction_id uuid not null references predictions on delete cascade,
  action text not null check (action in ('placed','settled','resettled','voided')),
  from_status text,
  to_status text not null,
  payout int,
  detail jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index prediction_transactions_idx on prediction_transactions (prediction_id, id);

create table season_results (
  season_id bigint not null references weekly_seasons,
  user_id uuid not null references profiles on delete cascade,
  rank int not null,
  final_balance int not null,
  net_profit int not null,
  total_staked int not null,
  total_returned int not null,
  predictions int not null,
  won int not null,
  primary key (season_id, user_id)
);
create index season_results_user_idx on season_results (user_id, season_id desc);

/* ------------------------------------------------------------------ leagues */

create table leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 28),
  code text not null unique,
  is_public boolean not null default false,
  owner_id uuid not null references profiles,
  max_members int not null default 50 check (max_members between 2 and 500),
  created_at timestamptz not null default now()
);

create table league_members (
  league_id uuid not null references leagues on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  primary key (league_id, user_id)
);
create index league_members_user_idx on league_members (user_id);

create table invitations (
  token text primary key,
  league_id uuid not null references leagues on delete cascade,
  created_by uuid not null references profiles,
  max_uses int,
  uses int not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table league_season_results (
  league_id uuid not null references leagues on delete cascade,
  season_id bigint not null references weekly_seasons,
  user_id uuid not null references profiles on delete cascade,
  rank int not null,
  net_profit int not null,
  primary key (league_id, season_id, user_id)
);

/* ------------------------------------------ achievements & notifications */

create table achievements (
  key text primary key,
  name text not null,
  description text not null,
  icon text not null,
  sort int not null default 0
);

create table user_achievements (
  user_id uuid not null references profiles on delete cascade,
  achievement_key text not null references achievements,
  season_id bigint references weekly_seasons,
  earned_at timestamptz not null default now(),
  unique nulls not distinct (user_id, achievement_key, season_id)
);

create table notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles on delete cascade,
  kind text not null,
  title text not null,
  body text not null,
  data jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on notifications (user_id, id desc);

/* --------------------------------------------------------- sync & auditing */

create table data_sync_logs (
  id bigint generated always as identity primary key,
  job text not null,
  provider text not null,
  status text not null default 'running' check (status in ('running','ok','error')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  items int,
  requests int,
  error text,
  meta jsonb not null default '{}'
);
create index data_sync_logs_job_idx on data_sync_logs (job, provider, id desc);

create table audit_log (
  id bigint generated always as identity primary key,
  actor uuid,
  action text not null,
  entity text not null,
  entity_id text,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_log_entity_idx on audit_log (entity, entity_id);
