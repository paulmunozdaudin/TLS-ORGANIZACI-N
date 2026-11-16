/**
 * DEMO SIMULATION — produces invented stat lines for the fictional catalog.
 * Deterministic per gameweek, so every league sees the same "real-world"
 * performances, exactly like a real data feed would behave.
 */
import { buildSchedule } from '@/domain/league';
import type { Player, Position, StatLine } from '@/domain/types';

import { CLUBS, CLUBS_BY_ID, mulberry32, PLAYERS } from './catalog';

const cache = new Map<number, Record<string, StatLine>>();
const clubFixtures = buildSchedule(
  'demo',
  CLUBS.map((c) => c.id)
);
const CLUB_ROUNDS = (CLUBS.length - 1) * 2;

function poisson(lambda: number, rand: () => number) {
  const limit = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rand();
  } while (p > limit);
  return k - 1;
}

function pickWeighted<T>(items: T[], weight: (t: T) => number, rand: () => number): T | undefined {
  const total = items.reduce((s, i) => s + weight(i), 0);
  if (total <= 0) return undefined;
  let r = rand() * total;
  for (const item of items) {
    r -= weight(item);
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

const GOAL_W: Record<Position, number> = { GK: 0, DEF: 1, MID: 3, FWD: 6 };
const ASSIST_W: Record<Position, number> = { GK: 0.1, DEF: 1.5, MID: 4, FWD: 3 };
const STARTERS: Record<Position, number> = { GK: 1, DEF: 4, MID: 4, FWD: 2 };

export function demoGameweekStats(gameweek: number): Record<string, StatLine> {
  const hit = cache.get(gameweek);
  if (hit) return hit;
  const rand = mulberry32(9000 + gameweek * 7919);
  const stats: Record<string, StatLine> = {};
  const round = ((gameweek - 1) % CLUB_ROUNDS) + 1;

  const onPitch = (clubId: string): Player[] => {
    const squad = PLAYERS.filter((p) => p.clubId === clubId);
    const playing: Player[] = [];
    for (const pos of Object.keys(STARTERS) as Position[]) {
      const ranked = squad
        .filter((p) => p.position === pos)
        .map((p) => ({ p, form: p.rating + rand() * 9 }))
        .sort((a, b) => b.form - a.form);
      ranked.forEach(({ p }, i) => {
        const starts = i < STARTERS[pos];
        const comesOn = !starts && pos !== 'GK' && i === STARTERS[pos] && rand() < 0.7;
        const minutes = starts ? (rand() < 0.22 && pos !== 'GK' ? 60 + Math.floor(rand() * 25) : 90) : comesOn ? 12 + Math.floor(rand() * 22) : 0;
        stats[p.id] = {
          playerId: p.id, matchday: gameweek, minutes, goals: 0, assists: 0, cleanSheet: false,
          saves: 0, goalsConceded: 0, yellowCards: 0, redCards: 0, ownGoals: 0,
          penaltiesSaved: 0, penaltiesMissed: 0,
        };
        if (minutes > 0) playing.push(p);
      });
    }
    return playing;
  };

  for (const fx of clubFixtures.filter((f) => f.matchday === round)) {
    const sides = [fx.homeId, fx.awayId].map((id) => ({ id, playing: onPitch(id), goals: 0 }));
    sides.forEach((side, i) => {
      const opp = sides[1 - i];
      const ratio = CLUBS_BY_ID[side.id].strength / CLUBS_BY_ID[opp.id].strength;
      const scored = poisson(1.3 * Math.pow(ratio, 2.2) + (i === 0 ? 0.15 : 0), rand);
      for (let g = 0; g < scored; g++) {
        if (rand() < 0.02) {
          const culprit = pickWeighted(opp.playing, (p) => (p.position === 'DEF' ? 1 : 0), rand);
          if (culprit) stats[culprit.id].ownGoals += 1;
        } else {
          const scorer = pickWeighted(side.playing, (p) => GOAL_W[p.position] * (p.rating - 50) * stats[p.id].minutes, rand);
          if (!scorer) continue;
          stats[scorer.id].goals += 1;
          if (rand() < 0.72) {
            const helper = pickWeighted(side.playing, (p) => (p.id === scorer.id ? 0 : ASSIST_W[p.position] * (p.rating - 50)), rand);
            if (helper) stats[helper.id].assists += 1;
          }
        }
      }
      side.goals = scored;
    });
    sides.forEach((side, i) => {
      const conceded = sides[1 - i].goals;
      for (const p of side.playing) {
        const s = stats[p.id];
        s.goalsConceded = conceded;
        s.cleanSheet = conceded === 0;
        if (p.position === 'GK') s.saves = poisson(2.6, rand) + (conceded === 0 ? 1 : 0);
        if (rand() < 0.1) s.yellowCards = 1;
        if (rand() < 0.008) {
          s.redCards = 1;
          s.minutes = Math.min(s.minutes, 30 + Math.floor(rand() * 45));
        }
      }
    });
  }
  cache.set(gameweek, stats);
  return stats;
}
