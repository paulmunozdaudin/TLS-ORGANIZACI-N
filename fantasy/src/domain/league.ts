import type { GameRules } from './rules';
import type { Fixture, Standing } from './types';

/**
 * Double round-robin (home and away) using the circle method.
 * Requires an even number of managers, which league sizes guarantee.
 */
export function buildSchedule(leagueId: string, managerIds: string[]): Fixture[] {
  const n = managerIds.length;
  if (n < 2 || n % 2 !== 0) return [];
  const ring = [...managerIds];
  const firstLeg: [string, string][][] = [];
  for (let round = 0; round < n - 1; round++) {
    const pairs: [string, string][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = ring[i];
      const b = ring[n - 1 - i];
      pairs.push(round % 2 === 0 ? [a, b] : [b, a]);
    }
    firstLeg.push(pairs);
    ring.splice(1, 0, ring.pop() as string);
  }
  const rounds = [...firstLeg, ...firstLeg.map((r) => r.map(([h, a]) => [a, h] as [string, string]))];
  return rounds.flatMap((pairs, r) =>
    pairs.map(([homeId, awayId], i) => ({
      id: `${leagueId}-md${r + 1}-${i + 1}`,
      leagueId,
      matchday: r + 1,
      homeId,
      awayId,
      result: null,
    }))
  );
}

/** Standings are always derived from results, never stored as a counter. */
export function computeStandings(
  managerIds: string[],
  fixtures: Fixture[],
  rules: GameRules
): Standing[] {
  const table = new Map<string, Standing>(
    managerIds.map((id) => [
      id,
      {
        managerId: id,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        fantasyPoints: 0,
        points: 0,
        form: [],
      },
    ])
  );
  const played = fixtures.filter((f) => f.result).sort((a, b) => a.matchday - b.matchday);
  for (const f of played) {
    const r = f.result!;
    const sides: [string, number, number, number][] = [
      [f.homeId, r.homeGoals, r.awayGoals, r.homePoints],
      [f.awayId, r.awayGoals, r.homeGoals, r.awayPoints],
    ];
    for (const [id, gf, ga, fp] of sides) {
      const row = table.get(id);
      if (!row) continue;
      row.played += 1;
      row.goalsFor += gf;
      row.goalsAgainst += ga;
      row.fantasyPoints += fp;
      if (gf > ga) {
        row.won += 1;
        row.points += rules.winPoints;
        row.form.push('W');
      } else if (gf === ga) {
        row.drawn += 1;
        row.points += rules.drawPoints;
        row.form.push('D');
      } else {
        row.lost += 1;
        row.form.push('L');
      }
    }
  }
  return [...table.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst) ||
      b.goalsFor - a.goalsFor ||
      b.fantasyPoints - a.fantasyPoints ||
      a.managerId.localeCompare(b.managerId)
  );
}

export interface HeadToHead {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
}

export function headToHead(fixtures: Fixture[], me: string, rival: string): HeadToHead {
  const out: HeadToHead = { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 };
  for (const f of fixtures) {
    if (!f.result) continue;
    const home = f.homeId === me && f.awayId === rival;
    const away = f.awayId === me && f.homeId === rival;
    if (!home && !away) continue;
    const gf = home ? f.result.homeGoals : f.result.awayGoals;
    const ga = home ? f.result.awayGoals : f.result.homeGoals;
    out.played += 1;
    out.goalsFor += gf;
    out.goalsAgainst += ga;
    if (gf > ga) out.wins += 1;
    else if (gf === ga) out.draws += 1;
    else out.losses += 1;
  }
  return out;
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function makeInviteCode(random: () => number, length = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  return code;
}
