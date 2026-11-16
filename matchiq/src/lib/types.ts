/** Shapes returned by the read API (supabase/migrations/…_client_api.sql). Times are ms epochs. */

export interface Team {
  id: number;
  name: string;
  short_name: string | null;
  code: string | null;
  logo_url: string | null;
}

export interface Fixture {
  id: number;
  kickoff_at: number;
  status: 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled' | 'abandoned' | 'awarded' | 'suspended' | 'unknown';
  status_raw: string | null;
  elapsed: number | null;
  home_goals: number | null;
  away_goals: number | null;
  ht_home: number | null;
  ht_away: number | null;
  venue: string | null;
  round: string | null;
  updated_at: number;
  competition: { id: number; name: string; country: string | null; logo_url: string | null; priority: number };
  home: Team;
  away: Team;
}

export interface ResultPrice {
  selection_id: number;
  avg: number | null;
  best: number | null;
  count: number;
}

export interface FixtureListItem extends Fixture {
  markets: number;
  result_prices: Record<'home' | 'draw' | 'away', ResultPrice> | null;
}

export interface QuoteRow {
  bookmaker_id: number;
  bookmakerKey: string;
  bookmaker: string;
  decimal: number;
  suspended: boolean;
  /** The bookmaker pulled this price from its feed. */
  withdrawn: boolean;
  /** Server verdict: current enough to predict on. */
  fresh: boolean;
  /** When the feed last confirmed this price. */
  updatedAt: number;
  /** When the bookmaker last changed it, if the provider says. */
  bookmaker_updated_at: number | null;
  provider: string;
}

export interface PlayerRef {
  id: number;
  name: string;
  photo_url: string | null;
  position: string | null;
  team_id: number | null;
  shirt_number: number | null;
}

export interface Selection {
  id: number;
  key: string;
  label: string;
  result: 'won' | 'lost' | 'void' | null;
  player: PlayerRef | null;
  quotes: QuoteRow[];
}

export interface Market {
  id: number;
  market_key: string;
  name: string;
  group: string;
  scope: 'match' | 'player';
  sort: number;
  line: number | null;
  side: 'home' | 'away' | null;
  status: string;
  selections: Selection[];
}

export interface StandingRow {
  team_id: number;
  position: number | null;
  played: number | null;
  won: number | null;
  drawn: number | null;
  lost: number | null;
  goals_for: number | null;
  goals_against: number | null;
  points: number | null;
  form: string | null;
  home: { played?: number; goals_for?: number; goals_against?: number; won?: number; drawn?: number; lost?: number };
  away: { played?: number; goals_for?: number; goals_against?: number; won?: number; drawn?: number; lost?: number };
  updated_at: number;
}

export interface FormRow {
  fixture_id: number;
  kickoff_at: number;
  home: boolean;
  opponent: string;
  goals_for: number;
  goals_against: number;
}

export interface FixtureDetail extends Fixture {
  events_final: boolean;
  player_stats_final: boolean;
  lineups_at: number | null;
  standings: StandingRow[];
  league_averages: { home_goals: number | null; away_goals: number | null } | null;
  form: { home: FormRow[]; away: FormRow[] };
  head_to_head: { fixture_id: number; kickoff_at: number; home: Team; away: Team; ft_home: number; ft_away: number }[];
  injuries: { player: string; player_id: number; team_id: number | null; kind: string | null; reason: string | null; reported_at: number }[];
  lineups: { team_id: number; player_id: number; name: string; photo_url: string | null; is_starter: boolean; position: string | null; shirt_number: number | null; formation: string | null }[];
  events: { seq: number; minute: number | null; extra_minute: number | null; kind: string; team_id: number | null; player: string | null; related_player: string | null; detail: string | null }[];
  team_stats: { team_id: number; possession: number | null; shots: number | null; shots_on_target: number | null; corners: number | null; fouls: number | null; yellow_cards: number | null; red_cards: number | null; offsides: number | null; updated_at: number }[];
  my_predictions: { id: string; selection_id: number; market_key: string; label: string; stake: number; locked_odds: number; status: PredictionStatus; payout: number | null; potential_return: number }[];
}

export type PredictionStatus = 'open' | 'won' | 'lost' | 'void';

export interface Prediction {
  id: string;
  fixture: Fixture;
  market_key: string;
  market: string;
  label: string;
  line: number | null;
  player: string | null;
  stake: number;
  locked_odds: number;
  odds_mode: 'consensus' | 'best' | 'bookmaker';
  bookmaker: string | null;
  basis: number | null;
  potential_return: number;
  status: PredictionStatus;
  payout: number | null;
  placed_at: number;
  settled_at: number | null;
  reason: string | null;
  season_id: number;
}

export interface WalletView {
  wallet: { id: number; season_id: number; granted: number; balance: number; open_stakes: number; total_staked: number; total_returned: number };
  season: { id: number; starts_at: number; ends_at: number };
  counts: { open: number; won: number; lost: number; void: number };
  ledger: { id: number; kind: 'season_grant' | 'stake' | 'payout' | 'refund' | 'correction'; amount: number; balance_after: number; at: number; label: string | null; prediction_id: string | null }[];
}

export interface Profile {
  id: string;
  username: string;
  avatar_color: string;
  reference_mode: 'consensus' | 'best' | 'bookmaker';
  reference_bookmaker_id: number | null;
  adult_confirmed_at: string | null;
}

export interface RankRow {
  rank: number;
  user_id: string;
  username: string;
  avatar_color: string;
  net_profit: number;
  staked: number;
  predictions: number;
  won: number;
  is_me: boolean;
}

export interface League {
  id: string;
  name: string;
  is_public: boolean;
  owner_id: string;
  max_members: number;
  code: string | null;
  members: number;
  is_member: boolean;
  is_owner: boolean;
}

export interface LeagueDetail extends League {
  member_list: { user_id: string; username: string; avatar_color: string; role: string; joined_at: number }[];
  winners: { season_id: number; starts_at: number; username: string; avatar_color: string; net_profit: number }[];
}

export interface DataStatus {
  jobs: { job: string; provider: string; last_ok_at: number | null; last_error_at: number | null; last_error: string | null }[];
  odds_providers: { id: string; name: string; website: string | null }[];
  stale_minutes: number;
  environment: string;
  fixtures: number;
  priced_fixtures: number;
}

export interface NotificationRow {
  id: number;
  kind: string;
  title: string;
  body: string;
  data: { fixture_id?: number; league_id?: string; prediction_id?: string; user_id?: string };
  read: boolean;
  at: number;
}
