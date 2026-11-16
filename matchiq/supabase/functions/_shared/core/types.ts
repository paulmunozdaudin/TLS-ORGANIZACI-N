/**
 * MATCH.IQ core domain. Dependency-free TypeScript that runs unchanged in
 * Supabase Edge Functions (Deno), in the Expo app and under Jest.
 * Relative imports carry the `.ts` extension because Deno requires it.
 */

export type FixtureStatus =
  | 'scheduled'
  | 'live'
  | 'finished'
  | 'postponed'
  | 'cancelled'
  | 'abandoned'
  | 'awarded'
  | 'suspended'
  | 'unknown';

export type Side = 'home' | 'away';
export type Outcome = 'won' | 'lost' | 'void';
export type Period = 'regular' | 'extra' | 'shootout';

export interface GoalEvent {
  /** Order of the event inside the match, ascending. */
  seq: number;
  minute: number;
  /** Side credited on the scoreboard (for an own goal: the side that benefits). */
  side: Side;
  /** Internal player id of the scorer; null when the provider did not identify one. */
  playerId: string | null;
  assistId: string | null;
  ownGoal: boolean;
  penalty: boolean;
  period: Period;
}

export interface CardEvent {
  seq: number;
  minute: number;
  playerId: string | null;
  card: 'yellow' | 'second_yellow' | 'red';
  period: Period;
}

export interface PlayerMatchStats {
  playerId: string;
  side: Side;
  /** Minutes played as reported by the provider. null = not reported. */
  minutes: number | null;
  started: boolean;
  /** 0 for starters, the substitution minute for substitutes, null if never on the pitch. */
  enteredMinute: number | null;
  shots: number | null;
  shotsOnTarget: number | null;
  foulsCommitted: number | null;
  tackles: number | null;
  saves: number | null;
}

/** Everything settlement is allowed to look at. Built from provider data only. */
export interface FixtureFacts {
  status: FixtureStatus;
  kickoffAt: number;
  /** Regulation-time scores (90 minutes plus stoppage). */
  htHome: number | null;
  htAway: number | null;
  ftHome: number | null;
  ftAway: number | null;
  wentToExtraTime: boolean;
  /** True once the provider has published events for the finished match. */
  eventsFinal: boolean;
  /** True once the provider has published per-player statistics. */
  playerStatsFinal: boolean;
  goals: GoalEvent[];
  cards: CardEvent[];
  players: Record<string, PlayerMatchStats>;
}

export interface SelectionRef {
  marketKey: string;
  /** Over/under line, e.g. 2.5. null for markets without one. */
  line: number | null;
  /** Team the market is about (team totals). */
  side: Side | null;
  /** Selection inside the market: home, draw, over, yes, 2-1, home_draw… */
  key: string;
  /** Internal player id for player markets. */
  playerId: string | null;
}

/** One bookmaker price for one selection, exactly as received from a provider. */
export interface Quote {
  bookmakerKey: string;
  decimal: number;
  suspended: boolean;
  /** When the bookmaker last updated the price (ms epoch), per the provider. */
  updatedAt: number;
}
