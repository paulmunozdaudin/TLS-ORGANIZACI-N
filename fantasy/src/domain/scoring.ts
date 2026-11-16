import type { ScoringRules } from './rules';
import type { Lineup, Player, Position, StatLine } from './types';

export interface ScoreItem {
  label: string;
  points: number;
}

export interface PlayerScore {
  playerId: string;
  played: boolean;
  points: number;
  items: ScoreItem[];
}

/** Fantasy points for one footballer's stat line. Pure and deterministic. */
export function scorePlayer(
  position: Position,
  stat: StatLine | undefined,
  rules: ScoringRules
): PlayerScore {
  const playerId = stat?.playerId ?? '';
  if (!stat || stat.minutes <= 0) return { playerId, played: false, points: 0, items: [] };

  const items: ScoreItem[] = [];
  const add = (label: string, points: number) => {
    if (points !== 0) items.push({ label, points });
  };

  add('Appearance', rules.appearance);
  if (stat.minutes >= 60) add('60+ minutes', rules.sixtyMinutes);
  if (stat.goals) add(`${stat.goals} goal${stat.goals > 1 ? 's' : ''}`, stat.goals * rules.goal[position]);
  if (stat.assists) add(`${stat.assists} assist${stat.assists > 1 ? 's' : ''}`, stat.assists * rules.assist);
  if (stat.cleanSheet && stat.minutes >= rules.cleanSheetMinutes) {
    add('Clean sheet', rules.cleanSheet[position]);
  }
  if (position === 'GK' && rules.savesPerPoint > 0) {
    add(`${stat.saves} saves`, Math.floor(stat.saves / rules.savesPerPoint));
  }
  if (stat.penaltiesSaved) add('Penalty saved', stat.penaltiesSaved * rules.penaltySaved);
  if (stat.penaltiesMissed) add('Penalty missed', stat.penaltiesMissed * rules.penaltyMissed);
  if (rules.concededStep > 0) {
    add(
      `${stat.goalsConceded} conceded`,
      Math.floor(stat.goalsConceded / rules.concededStep) * rules.conceded[position]
    );
  }
  if (stat.yellowCards) add('Yellow card', stat.yellowCards * rules.yellowCard);
  if (stat.redCards) add('Red card', stat.redCards * rules.redCard);
  if (stat.ownGoals) add('Own goal', stat.ownGoals * rules.ownGoal);

  return { playerId, played: true, points: items.reduce((s, i) => s + i.points, 0), items };
}

export interface LineupSlotScore {
  playerId: string;
  /** Player who actually scored for this slot (differs when substituted). */
  countedPlayerId: string | null;
  substituted: boolean;
  isCaptain: boolean;
  points: number;
  items: ScoreItem[];
}

export interface TeamScore {
  slots: LineupSlotScore[];
  totalPoints: number;
  fantasyGoals: number;
}

export function pointsToGoals(points: number, rules: ScoringRules): number {
  const { baseline, step, max } = rules.goalConversion;
  if (step <= 0) return 0;
  return Math.max(0, Math.min(max, Math.floor((points - baseline) / step)));
}

/**
 * Scores a whole lineup for one matchday.
 * - A starter who did not play is replaced by the first unused bench player
 *   of the same position who did play.
 * - The captain's points are multiplied; if the captain did not play the
 *   bonus is lost (it does not transfer to the substitute).
 * Calling it twice with the same inputs yields the same output (idempotent).
 */
export function scoreTeam(
  lineup: Lineup,
  players: Record<string, Player>,
  stats: Record<string, StatLine>,
  rules: ScoringRules
): TeamScore {
  const usedBench = new Set<string>();
  const slots: LineupSlotScore[] = lineup.starters.map((playerId) => {
    const player = players[playerId];
    const isCaptain = lineup.captainId === playerId;
    if (!player) {
      return { playerId, countedPlayerId: null, substituted: false, isCaptain, points: 0, items: [] };
    }
    const own = scorePlayer(player.position, stats[playerId], rules);
    if (own.played) {
      const mult = isCaptain ? rules.captainMultiplier : 1;
      const items = isCaptain
        ? [...own.items, { label: `Captain ×${mult}`, points: own.points * (mult - 1) }]
        : own.items;
      return {
        playerId,
        countedPlayerId: playerId,
        substituted: false,
        isCaptain,
        points: own.points * mult,
        items,
      };
    }
    const subId = lineup.bench.find((id) => {
      const sub = players[id];
      return (
        sub && !usedBench.has(id) && sub.position === player.position && (stats[id]?.minutes ?? 0) > 0
      );
    });
    if (!subId) {
      return { playerId, countedPlayerId: null, substituted: false, isCaptain, points: 0, items: [] };
    }
    usedBench.add(subId);
    const sub = scorePlayer(player.position, stats[subId], rules);
    return {
      playerId,
      countedPlayerId: subId,
      substituted: true,
      isCaptain,
      points: sub.points,
      items: sub.items,
    };
  });

  const totalPoints = slots.reduce((s, slot) => s + slot.points, 0);
  return { slots, totalPoints, fantasyGoals: pointsToGoals(totalPoints, rules) };
}
