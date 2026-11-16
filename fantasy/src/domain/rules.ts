import type { FormationId, Position } from './types';

/**
 * Every tunable game rule lives here. Nothing in the engine hardcodes a
 * number: a league (or a premium "custom league" later) can ship its own
 * `GameRules` object.
 */
export interface ScoringRules {
  appearance: number;
  sixtyMinutes: number;
  goal: Record<Position, number>;
  assist: number;
  cleanSheet: Record<Position, number>;
  /** Minutes required to be eligible for a clean sheet. */
  cleanSheetMinutes: number;
  savesPerPoint: number;
  penaltySaved: number;
  penaltyMissed: number;
  /** Points per `concededStep` goals conceded (usually negative). */
  conceded: Record<Position, number>;
  concededStep: number;
  yellowCard: number;
  redCard: number;
  ownGoal: number;
  captainMultiplier: number;
  /** Team points -> fantasy goals: floor((points - baseline) / step), min 0. */
  goalConversion: { baseline: number; step: number; max: number };
}

export interface GameRules {
  startingBudget: number;
  squadSize: number;
  squadLimits: Record<Position, number>;
  benchSize: number;
  sellRefundRate: number;
  winPoints: number;
  drawPoints: number;
  leagueSizes: number[];
  scoring: ScoringRules;
}

export const DEFAULT_RULES: GameRules = {
  startingBudget: 500,
  squadSize: 18,
  squadLimits: { GK: 2, DEF: 6, MID: 6, FWD: 4 },
  benchSize: 7,
  sellRefundRate: 0.9,
  winPoints: 3,
  drawPoints: 1,
  leagueSizes: [2, 4, 6, 8, 10],
  scoring: {
    appearance: 1,
    sixtyMinutes: 1,
    goal: { GK: 10, DEF: 6, MID: 5, FWD: 4 },
    assist: 3,
    cleanSheet: { GK: 4, DEF: 4, MID: 1, FWD: 0 },
    cleanSheetMinutes: 60,
    savesPerPoint: 3,
    penaltySaved: 5,
    penaltyMissed: -2,
    conceded: { GK: -1, DEF: -1, MID: 0, FWD: 0 },
    concededStep: 2,
    yellowCard: -1,
    redCard: -3,
    ownGoal: -2,
    captainMultiplier: 2,
    goalConversion: { baseline: 26, step: 8, max: 9 },
  },
};

export const FORMATIONS: Record<FormationId, Record<Position, number>> = {
  '4-4-2': { GK: 1, DEF: 4, MID: 4, FWD: 2 },
  '4-3-3': { GK: 1, DEF: 4, MID: 3, FWD: 3 },
  '3-5-2': { GK: 1, DEF: 3, MID: 5, FWD: 2 },
  '3-4-3': { GK: 1, DEF: 3, MID: 4, FWD: 3 },
  '5-3-2': { GK: 1, DEF: 5, MID: 3, FWD: 2 },
  '4-5-1': { GK: 1, DEF: 4, MID: 5, FWD: 1 },
};
export const FORMATION_IDS = Object.keys(FORMATIONS) as FormationId[];
