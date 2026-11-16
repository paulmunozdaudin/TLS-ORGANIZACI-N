/**
 * Core domain types. This folder is dependency-free TypeScript so the exact
 * same rules can run on the client (demo mode, optimistic previews) and inside
 * Supabase Edge Functions (authoritative results).
 *
 * Money is always an integer number of millions of euros.
 */

export type Position = 'GK' | 'DEF' | 'MID' | 'FWD';
export const POSITIONS: Position[] = ['GK', 'DEF', 'MID', 'FWD'];

export interface Club {
  id: string;
  name: string;
  short: string;
  colors: [string, string];
  strength: number;
}

export interface Player {
  id: string;
  name: string;
  clubId: string;
  position: Position;
  /** Reference market price, in €M. Bids may not go below it. */
  price: number;
  rating: number;
}

/** Raw real-world performance of one footballer in one matchday. */
export interface StatLine {
  playerId: string;
  matchday: number;
  minutes: number;
  goals: number;
  assists: number;
  cleanSheet: boolean;
  saves: number;
  goalsConceded: number;
  yellowCards: number;
  redCards: number;
  ownGoals: number;
  penaltiesSaved: number;
  penaltiesMissed: number;
}

export interface Manager {
  id: string;
  username: string;
  color: string;
  isBot: boolean;
}

export type FormationId = '4-4-2' | '4-3-3' | '3-5-2' | '3-4-3' | '5-3-2' | '4-5-1';

export interface Lineup {
  formation: FormationId;
  /** Exactly 11 player ids once complete. */
  starters: string[];
  /** Ordered: earlier bench players are substituted in first. */
  bench: string[];
  captainId: string | null;
}

export interface SquadEntry {
  playerId: string;
  paid: number;
}

export interface Team {
  leagueId: string;
  managerId: string;
  budget: number;
  squad: SquadEntry[];
  lineup: Lineup;
}

export type BidStatus = 'open' | 'won' | 'lost' | 'void';

export interface Bid {
  id: string;
  leagueId: string;
  managerId: string;
  playerId: string;
  amount: number;
  round: number;
  placedAt: number;
  status: BidStatus;
}

export interface MatchResult {
  homePoints: number;
  awayPoints: number;
  homeGoals: number;
  awayGoals: number;
}

export interface Fixture {
  id: string;
  leagueId: string;
  matchday: number;
  homeId: string;
  awayId: string;
  result: MatchResult | null;
}

export type LeagueStatus = 'lobby' | 'active' | 'finished';

export interface League {
  id: string;
  name: string;
  code: string;
  size: number;
  isPublic: boolean;
  ownerId: string;
  memberIds: string[];
  status: LeagueStatus;
  /** Next matchday to be played (1-based). */
  matchday: number;
  totalMatchdays: number;
  marketRound: number;
  /** Epoch ms after which lineups for `matchday` are locked. */
  deadline: number;
  createdAt: number;
}

export interface Standing {
  managerId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  fantasyPoints: number;
  points: number;
  form: ('W' | 'D' | 'L')[];
}

export type Result<T = void> = { ok: true; value: T } | { ok: false; error: string };
export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const fail = <T = never>(error: string): Result<T> => ({ ok: false, error });
