import { FORMATIONS, type GameRules } from './rules';
import type { FormationId, Lineup, Player, Position, SquadEntry } from './types';
import { POSITIONS } from './types';

export const emptyLineup = (formation: FormationId = '4-4-2'): Lineup => ({
  formation,
  starters: [],
  bench: [],
  captainId: null,
});

export interface LineupCheck {
  valid: boolean;
  errors: string[];
}

/** Server-grade validation of a lineup against the squad and formation. */
export function validateLineup(
  lineup: Lineup,
  squad: SquadEntry[],
  players: Record<string, Player>
): LineupCheck {
  const errors: string[] = [];
  const shape = FORMATIONS[lineup.formation];
  if (!shape) return { valid: false, errors: ['Unknown formation.'] };

  const owned = new Set(squad.map((s) => s.playerId));
  const all = [...lineup.starters, ...lineup.bench];
  if (new Set(all).size !== all.length) errors.push('A player appears twice in the lineup.');
  if (all.some((id) => !owned.has(id))) errors.push('The lineup contains a player you do not own.');

  if (lineup.starters.length !== 11) {
    errors.push(`Pick 11 starters (${lineup.starters.length}/11).`);
  }
  const counts: Record<Position, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  for (const id of lineup.starters) {
    const p = players[id];
    if (p) counts[p.position] += 1;
  }
  for (const pos of POSITIONS) {
    if (counts[pos] !== shape[pos]) {
      errors.push(`${lineup.formation} needs ${shape[pos]} ${pos} (you have ${counts[pos]}).`);
    }
  }
  if (!lineup.captainId) errors.push('Choose a captain.');
  else if (!lineup.starters.includes(lineup.captainId)) errors.push('The captain must be a starter.');

  return { valid: errors.length === 0, errors };
}

/** Starters grouped by pitch line, in the order they were picked. */
export function startersByPosition(
  lineup: Lineup,
  players: Record<string, Player>
): Record<Position, string[]> {
  const out: Record<Position, string[]> = { GK: [], DEF: [], MID: [], FWD: [] };
  for (const id of lineup.starters) {
    const p = players[id];
    if (p) out[p.position].push(id);
  }
  return out;
}

/**
 * Builds the best lineup available for a formation: highest-rated players
 * start, the rest go to the bench (ordered by rating), best starter captains.
 * Slots that cannot be filled are simply left empty.
 */
export function autoLineup(
  squad: SquadEntry[],
  players: Record<string, Player>,
  formation: FormationId,
  rules: GameRules
): Lineup {
  const shape = FORMATIONS[formation];
  const owned = squad
    .map((s) => players[s.playerId])
    .filter((p): p is Player => Boolean(p))
    .sort((a, b) => b.rating - a.rating);
  const starters: string[] = [];
  for (const pos of POSITIONS) {
    starters.push(
      ...owned
        .filter((p) => p.position === pos)
        .slice(0, shape[pos])
        .map((p) => p.id)
    );
  }
  const bench = owned
    .filter((p) => !starters.includes(p.id))
    .slice(0, rules.benchSize)
    .map((p) => p.id);
  const captainId = owned.find((p) => starters.includes(p.id))?.id ?? null;
  return { formation, starters, bench, captainId };
}

/** Drops players that left the squad and keeps the lineup internally consistent. */
export function pruneLineup(lineup: Lineup, squad: SquadEntry[]): Lineup {
  const owned = new Set(squad.map((s) => s.playerId));
  const starters = lineup.starters.filter((id) => owned.has(id));
  return {
    formation: lineup.formation,
    starters,
    bench: lineup.bench.filter((id) => owned.has(id)),
    captainId: lineup.captainId && starters.includes(lineup.captainId) ? lineup.captainId : null,
  };
}

export const isLocked = (deadline: number, now: number) => now >= deadline;
