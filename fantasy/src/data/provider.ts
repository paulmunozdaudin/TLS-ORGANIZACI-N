import type { Club, Player, StatLine } from '@/domain/types';

import { CLUBS, PLAYERS } from './demo/catalog';
import { demoGameweekStats } from './demo/simulate';

/**
 * Football data provider abstraction. The app and the scoring engine only
 * ever talk to this interface; API-Football, Sportmonks or any other feed is
 * plugged in behind it (server-side, in an Edge Function — API keys never
 * ship in the mobile bundle).
 */
export interface FootballDataProvider {
  readonly id: string;
  /** False for demo data. The UI must label non-real data clearly. */
  readonly isReal: boolean;
  /** Human-readable freshness note shown wherever stats appear. */
  readonly freshness: string;
  getClubs(): Promise<Club[]>;
  getPlayers(): Promise<Player[]>;
  getGameweekStats(gameweek: number): Promise<Record<string, StatLine>>;
}

export const demoProvider: FootballDataProvider = {
  id: 'demo',
  isReal: false,
  freshness: 'Demo data · fictional players, simulated stats',
  getClubs: async () => CLUBS,
  getPlayers: async () => PLAYERS,
  getGameweekStats: async (gameweek) => demoGameweekStats(gameweek),
};

/** Swapped for the real provider client in Phase 5. */
export const footballData: FootballDataProvider = demoProvider;
