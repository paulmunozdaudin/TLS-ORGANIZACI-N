/**
 * The Odds API v4 — bookmaker prices for match markets and player props.
 *
 * Docs: https://the-odds-api.com/liveapi/guides/v4/ (read 2026-11-16).
 * Auth: `x-api-key` request header (server-side secret THE_ODDS_API_KEY).
 * Cost: bulk odds = markets × regions; event odds = markets returned × regions.
 *
 * Market keys, response shape and the absence of a "suspended" flag are taken
 * from the provider's documentation. The client has not yet been run against
 * the live API from this repository (no key was available), so unknown market
 * keys and outcomes that cannot be mapped with certainty are skipped and
 * counted, never guessed.
 */
import { arr, buildUrl, int, num, obj, ProviderError, str, type FetchLike, type RequestMeter } from './http.ts';

export const THE_ODDS_API = 'the-odds-api';
const BASE = 'https://api.the-odds-api.com/v4';

/** Featured markets, available on the bulk `/sports/{sport}/odds` endpoint. For soccer `h2h` includes the draw. */
export const FEATURED_MARKETS = ['h2h', 'totals'];
export const FEATURED_CANONICAL = ['match_result', 'total_goals'];

/** Additional markets: only on `/sports/{sport}/events/{id}/odds`. */
export const EVENT_MATCH_MARKETS = ['btts', 'draw_no_bet', 'double_chance', 'h2h_3_way_h1', 'alternate_totals', 'team_totals', 'alternate_team_totals'];
/**
 * The complete list of soccer player props in the provider's docs. Documented
 * coverage: EPL, Ligue 1, Bundesliga, Serie A, La Liga and MLS, mostly US
 * bookmakers. Champions League and Europa League props are not documented.
 */
export const EVENT_PLAYER_MARKETS = [
  'player_goal_scorer_anytime',
  'player_first_goal_scorer',
  'player_last_goal_scorer',
  'player_assists',
  'player_assists_alternate',
  'player_shots',
  'player_shots_alternate',
  'player_shots_on_target',
  'player_shots_on_target_alternate',
  'player_to_receive_card',
  'player_to_receive_red_card',
];
export const EVENT_CANONICAL = [
  'btts', 'draw_no_bet', 'double_chance', 'half_time_result', 'total_goals', 'team_total_goals',
  'player_anytime_scorer', 'player_first_scorer', 'player_last_scorer', 'player_assist', 'player_2plus_assists',
  'player_shots', 'player_shots_on_target', 'player_card', 'player_red_card',
];

export interface OddsApiClient {
  meter: RequestMeter;
  get(path: string, params?: Record<string, string | number | undefined>): Promise<unknown>;
}

export function createTheOddsApi(apiKey: string, fetchImpl: FetchLike = fetch as unknown as FetchLike): OddsApiClient {
  const meter: RequestMeter = { requests: 0, remaining: null };
  return {
    meter,
    async get(path, params = {}) {
      if (!apiKey) throw new ProviderError(THE_ODDS_API, 'THE_ODDS_API_KEY is not configured');
      meter.requests++;
      let res;
      try {
        res = await fetchImpl(buildUrl(BASE, path, params), { headers: { 'x-api-key': apiKey } });
      } catch (e) {
        throw new ProviderError(THE_ODDS_API, `network error on ${path}: ${(e as Error).message}`, undefined, true);
      }
      const remaining = int(res.headers.get('x-requests-remaining'));
      if (remaining !== null) meter.remaining = remaining;
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new ProviderError(THE_ODDS_API, `HTTP ${res.status} on ${path} ${body.slice(0, 200)}`, res.status, res.status === 429 || res.status >= 500);
      }
      return res.json();
    },
  };
}

export const oddsParams = (markets: string[], regions: string) => ({
  regions,
  markets: markets.join(','),
  oddsFormat: 'decimal',
  dateFormat: 'iso',
});

/* ------------------------------------------------------------- normalising */

/** A price before it is matched to our fixture and player ids. */
export interface RawQuote {
  event_external_id: string;
  market_key: string;
  line: number | null;
  side: 'home' | 'away' | null;
  selection_key: string;
  /** Player name exactly as the bookmaker feed spells it (player markets only). */
  player_name: string | null;
  bookmaker_key: string;
  bookmaker_name: string;
  decimal_odds: number;
  provider_updated_at: string | null;
  source_ref: string;
}

export interface RawEvent {
  external_id: string;
  sport_key: string | null;
  home: string;
  away: string;
  commence_at: string;
  quotes: RawQuote[];
  /** Outcomes we refused to map, by provider market key. */
  skipped: Record<string, number>;
}

type Mapped = { market_key: string; selection_key: string; line: number | null; side: 'home' | 'away' | null; player_name: string | null };

const same = (a: string | null, b: string) => a !== null && a.trim().toLowerCase() === b.trim().toLowerCase();
const yesNo = (name: string | null) => (same(name, 'Yes') ? 'yes' : same(name, 'No') ? 'no' : null);
const overUnder = (name: string | null) => (same(name, 'Over') ? 'over' : same(name, 'Under') ? 'under' : null);

/** Maps one provider outcome to a selection of our registry, or null if it is not certain. */
function mapOutcome(market: string, o: Record<string, any>, home: string, away: string): Mapped | null {
  const name = str(o.name);
  const description = str(o.description);
  const point = num(o.point);
  const teamKey = (n: string | null) => (same(n, home) ? 'home' : same(n, away) ? 'away' : same(n, 'Draw') ? 'draw' : null);
  const base = { line: null, side: null, player_name: null } as const;

  switch (market) {
    case 'h2h': {
      const key = teamKey(name);
      return key ? { ...base, market_key: 'match_result', selection_key: key } : null;
    }
    // Only the explicit three-way first-half market; `h2h_h1` is not mapped
    // because the docs do not say whether it carries a draw outcome.
    case 'h2h_3_way_h1': {
      const key = teamKey(name);
      return key ? { ...base, market_key: 'half_time_result', selection_key: key } : null;
    }
    case 'draw_no_bet': {
      const key = teamKey(name);
      return key && key !== 'draw' ? { ...base, market_key: 'draw_no_bet', selection_key: key } : null;
    }
    case 'double_chance': {
      const n = (name ?? '').toLowerCase();
      const has = { home: n.includes(home.toLowerCase()), away: n.includes(away.toLowerCase()), draw: /\bdraw\b/.test(n) };
      const key = has.home && has.draw && !has.away ? 'home_draw' : has.home && has.away && !has.draw ? 'home_away' : has.away && has.draw && !has.home ? 'draw_away' : null;
      return key ? { ...base, market_key: 'double_chance', selection_key: key } : null;
    }
    case 'btts': {
      const key = yesNo(name);
      return key ? { ...base, market_key: 'btts', selection_key: key } : null;
    }
    case 'totals':
    case 'alternate_totals': {
      const key = overUnder(name);
      return key && point !== null ? { ...base, market_key: 'total_goals', selection_key: key, line: point } : null;
    }
    case 'team_totals':
    case 'alternate_team_totals': {
      const key = overUnder(name);
      const side = teamKey(description);
      return key && point !== null && (side === 'home' || side === 'away')
        ? { market_key: 'team_total_goals', selection_key: key, line: point, side, player_name: null }
        : null;
    }
  }

  /* Player props: `description` carries the player, `name` is Yes / Over / Under. */
  if (!description) return null;
  const yes = { ...base, selection_key: 'yes', player_name: description };
  const isYes = same(name, 'Yes');
  switch (market) {
    case 'player_goal_scorer_anytime':
      return isYes ? { ...yes, market_key: 'player_anytime_scorer' } : null;
    case 'player_first_goal_scorer':
      return isYes ? { ...yes, market_key: 'player_first_scorer' } : null;
    case 'player_last_goal_scorer':
      return isYes ? { ...yes, market_key: 'player_last_scorer' } : null;
    case 'player_to_receive_card':
      return isYes ? { ...yes, market_key: 'player_card' } : null;
    case 'player_to_receive_red_card':
      return isYes ? { ...yes, market_key: 'player_red_card' } : null;
    case 'player_assists':
    case 'player_assists_alternate': {
      // "Over 0.5 assists" is the same event as "to assist"; 1.5 as "2 or more".
      if (isYes) return { ...yes, market_key: 'player_assist' };
      if (!same(name, 'Over')) return null;
      if (point === 0.5) return { ...yes, market_key: 'player_assist' };
      if (point === 1.5) return { ...yes, market_key: 'player_2plus_assists' };
      return null;
    }
    case 'player_shots':
    case 'player_shots_alternate':
    case 'player_shots_on_target':
    case 'player_shots_on_target_alternate': {
      // Alternate markets are milestones ("2+") expressed as Over 1.5.
      const key = overUnder(name);
      return key && point !== null
        ? { market_key: market.replace('_alternate', ''), selection_key: key, line: point, side: null, player_name: description }
        : null;
    }
  }
  return null;
}

/** One event object from `/sports/{sport}/odds` or `/events/{id}/odds`. */
export function normalizeOddsEvent(raw: unknown): RawEvent | null {
  const e = obj(raw);
  const id = str(e.id);
  const home = str(e.home_team);
  const away = str(e.away_team);
  const commence = str(e.commence_time);
  if (!id || !home || !away || !commence) return null;

  const quotes: RawQuote[] = [];
  const skipped: Record<string, number> = {};
  for (const b of arr(e.bookmakers)) {
    const bookKey = str(b.key);
    if (!bookKey) continue;
    for (const m of arr(b.markets)) {
      const marketKey = str(m.key);
      if (!marketKey) continue;
      for (const o of arr(m.outcomes)) {
        const price = num(o.price);
        const mapped = price !== null && price > 1 ? mapOutcome(marketKey, o, home, away) : null;
        if (!mapped) {
          skipped[marketKey] = (skipped[marketKey] ?? 0) + 1;
          continue;
        }
        quotes.push({
          event_external_id: id,
          ...mapped,
          bookmaker_key: bookKey,
          bookmaker_name: str(b.title) ?? bookKey,
          decimal_odds: price as number,
          // Market-level timestamp; the bookmaker-level one is deprecated.
          provider_updated_at: str(m.last_update) ?? str(b.last_update),
          source_ref: `${THE_ODDS_API}:${id}:${marketKey}`,
        });
      }
    }
  }
  return { external_id: id, sport_key: str(e.sport_key), home, away, commence_at: commence, quotes, skipped };
}
