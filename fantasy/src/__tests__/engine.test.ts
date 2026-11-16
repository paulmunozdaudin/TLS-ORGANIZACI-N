import { mulberry32, PLAYERS, PLAYERS_BY_ID } from '@/data/demo/catalog';
import { buildSchedule, computeStandings, headToHead } from '@/domain/league';
import { autoLineup, validateLineup } from '@/domain/lineup';
import { resolveRound, validateBid } from '@/domain/market';
import { DEFAULT_RULES } from '@/domain/rules';
import { pointsToGoals, scorePlayer, scoreTeam } from '@/domain/scoring';
import type { Bid, Player, StatLine, Team } from '@/domain/types';
import * as game from '@/state/game';

const R = DEFAULT_RULES;
const stat = (playerId: string, patch: Partial<StatLine> = {}): StatLine => ({
  playerId, matchday: 1, minutes: 90, goals: 0, assists: 0, cleanSheet: false, saves: 0,
  goalsConceded: 0, yellowCards: 0, redCards: 0, ownGoals: 0, penaltiesSaved: 0, penaltiesMissed: 0, ...patch,
});
const mk = (id: string, position: Player['position'], price = 10, rating = 70): Player => ({
  id, name: id, clubId: 'c1', position, price, rating,
});
const team = (managerId: string, budget = 500, squad: Team['squad'] = []): Team => ({
  leagueId: 'L', managerId, budget, squad, lineup: { formation: '4-4-2', starters: [], bench: [], captainId: null },
});
const bid = (id: string, managerId: string, playerId: string, amount: number, placedAt = 0): Bid => ({
  id, leagueId: 'L', managerId, playerId, amount, round: 1, placedAt, status: 'open',
});

describe('scoring', () => {
  it('scores by position using the configured rules', () => {
    expect(scorePlayer('FWD', stat('a', { goals: 2, assists: 1 }), R.scoring).points).toBe(1 + 1 + 8 + 3);
    expect(scorePlayer('DEF', stat('a', { goals: 1, cleanSheet: true }), R.scoring).points).toBe(1 + 1 + 6 + 4);
    expect(scorePlayer('GK', stat('a', { saves: 7, goalsConceded: 3, yellowCards: 1 }), R.scoring).points).toBe(1 + 1 + 2 - 1 - 1);
    expect(scorePlayer('MID', stat('a', { redCards: 1, ownGoals: 1, minutes: 40 }), R.scoring).points).toBe(1 - 3 - 2);
  });
  it('gives nothing to players who did not play, and no clean sheet under 60 minutes', () => {
    expect(scorePlayer('FWD', stat('a', { minutes: 0, goals: 1 }), R.scoring).points).toBe(0);
    expect(scorePlayer('DEF', stat('a', { minutes: 30, cleanSheet: true }), R.scoring).points).toBe(1);
  });
  it('honours custom rules instead of hardcoded values', () => {
    const custom = { ...R.scoring, assist: 10 };
    expect(scorePlayer('MID', stat('a', { assists: 1 }), custom).points).toBe(12);
  });
  it('doubles the captain, substitutes absentees like-for-like and is idempotent', () => {
    const players = { g: mk('g', 'GK'), f1: mk('f1', 'FWD'), f2: mk('f2', 'FWD'), f3: mk('f3', 'FWD'), m: mk('m', 'MID') };
    const lineup = { formation: '4-4-2' as const, starters: ['g', 'f1', 'f2'], bench: ['m', 'f3'], captainId: 'f1' };
    const stats = { g: stat('g'), f1: stat('f1', { goals: 1 }), f2: stat('f2', { minutes: 0 }), f3: stat('f3', { assists: 1 }), m: stat('m', { goals: 3 }) };
    const a = scoreTeam(lineup, players, stats, R.scoring);
    expect(a.slots[1].points).toBe(12);
    expect(a.slots[2]).toMatchObject({ substituted: true, countedPlayerId: 'f3', points: 5 });
    expect(a.totalPoints).toBe(2 + 12 + 5);
    expect(scoreTeam(lineup, players, stats, R.scoring)).toEqual(a);
  });
  it('converts points to fantasy goals with a floor and a cap', () => {
    expect(pointsToGoals(10, R.scoring)).toBe(0);
    expect(pointsToGoals(26 + 8 * 2 + 3, R.scoring)).toBe(2);
    expect(pointsToGoals(999, R.scoring)).toBe(R.scoring.goalConversion.max);
  });
});

describe('transfer market', () => {
  const players = { a: mk('a', 'FWD', 20), b: mk('b', 'FWD', 30), c: mk('c', 'MID', 10) };
  const base = { players, rules: R, ownedIds: new Set<string>() };
  it('rejects bids below the price, above the budget or for owned players', () => {
    expect(validateBid({ ...base, team: team('x'), player: players.a, amount: 19, openBids: [] }).ok).toBe(false);
    expect(validateBid({ ...base, team: team('x', 25), player: players.b, amount: 30, openBids: [] }).ok).toBe(false);
    expect(validateBid({ ...base, team: team('x'), player: players.a, amount: 20, openBids: [], ownedIds: new Set(['a']) }).ok).toBe(false);
    expect(validateBid({ ...base, team: team('x'), player: players.a, amount: 20, openBids: [] }).ok).toBe(true);
  });
  it('counts money committed to other open bids', () => {
    const open = [bid('1', 'x', 'b', 40)];
    expect(validateBid({ ...base, team: team('x', 50), player: players.a, amount: 20, openBids: open }).ok).toBe(false);
    // Raising an existing bid frees its own amount first.
    expect(validateBid({ ...base, team: team('x', 50), player: players.b, amount: 50, openBids: open }).ok).toBe(true);
  });
  it('highest bid wins, ties go to the earliest bid', () => {
    const out = resolveRound(
      [bid('1', 'x', 'a', 30, 5), bid('2', 'y', 'a', 40, 9), bid('3', 'x', 'c', 12, 2), bid('4', 'y', 'c', 12, 1)],
      [team('x'), team('y')], players, R
    );
    expect(out.bids.map((b) => b.status)).toEqual(['lost', 'won', 'lost', 'won']);
    expect(out.teams.find((t) => t.managerId === 'y')!.budget).toBe(500 - 40 - 12);
  });
  it('never lets concurrent wins overspend a budget or sell a player twice', () => {
    const out = resolveRound(
      [bid('1', 'x', 'a', 60), bid('2', 'x', 'b', 50), bid('3', 'y', 'b', 45), bid('4', 'y', 'a', 20)],
      [team('x', 100), team('y', 100)], players, R
    );
    const x = out.teams.find((t) => t.managerId === 'x')!;
    expect(x.budget).toBe(40);
    expect(out.bids.find((b) => b.id === '2')!.status).toBe('void');
    expect(out.bids.find((b) => b.id === '3')!.status).toBe('won');
    const sold = out.teams.flatMap((t) => t.squad.map((s) => s.playerId));
    expect(new Set(sold).size).toBe(sold.length);
    expect(out.teams.every((t) => t.budget >= 0)).toBe(true);
    // Idempotent: settling again changes nothing.
    expect(resolveRound(out.bids, out.teams, players, R).signings).toHaveLength(0);
  });
});

describe('league', () => {
  it.each([2, 4, 6, 8, 10])('builds a double round-robin for %i managers', (n) => {
    const ids = Array.from({ length: n }, (_, i) => `m${i}`);
    const fx = buildSchedule('L', ids);
    expect(fx).toHaveLength(n * (n - 1));
    for (let md = 1; md <= (n - 1) * 2; md++) {
      const round = fx.filter((f) => f.matchday === md);
      expect(new Set(round.flatMap((f) => [f.homeId, f.awayId])).size).toBe(n);
    }
    expect(new Set(fx.map((f) => `${f.homeId}>${f.awayId}`)).size).toBe(fx.length);
  });
  it('derives standings and head-to-head from results', () => {
    const fx = buildSchedule('L', ['a', 'b']);
    fx[0].result = { homeGoals: 2, awayGoals: 1, homePoints: 50, awayPoints: 40 };
    fx[1].result = { homeGoals: 1, awayGoals: 1, homePoints: 35, awayPoints: 36 };
    const table = computeStandings(['a', 'b'], fx, R);
    expect(table[0]).toMatchObject({ managerId: fx[0].homeId, points: 4, won: 1, drawn: 1, form: ['W', 'D'] });
    expect(headToHead(fx, fx[0].awayId, fx[0].homeId)).toMatchObject({ played: 2, wins: 0, draws: 1, losses: 1 });
  });
});

describe('demo game flow', () => {
  const ctx = () => ({ now: 1_800_000_000_000, rand: mulberry32(7) });
  const start = () => {
    const r = game.startDemoSession(game.initialState(ctx()), 'tester', ctx());
    if (!r.ok) throw new Error(r.error);
    return r.value;
  };
  it('seeds a consistent starter league', () => {
    const s = start();
    const league = game.myLeagues(s)[0];
    const teams = s.teams.filter((t) => t.leagueId === league.id);
    expect(teams).toHaveLength(6);
    const owned = teams.flatMap((t) => t.squad.map((x) => x.playerId));
    expect(new Set(owned).size).toBe(owned.length);
    for (const t of teams) {
      expect(t.budget).toBeGreaterThanOrEqual(0);
      expect(t.budget + t.squad.reduce((sum, x) => sum + x.paid, 0)).toBe(R.startingBudget);
      expect(t.squad.length).toBe(t.managerId === 'me' ? R.squadSize - 3 : R.squadSize);
      expect(validateLineup(t.lineup, t.squad, PLAYERS_BY_ID).valid).toBe(true);
    }
    expect(league.matchday).toBe(4);
    expect(game.leagueStandings(s, league).reduce((n, r) => n + r.played, 0)).toBe(18);
  });
  it('enforces the lineup deadline and ownership', () => {
    const s = start();
    const league = game.myLeagues(s)[0];
    const mine = game.findTeam(s, league.id, 'me')!;
    const lineup = autoLineup(mine.squad, PLAYERS_BY_ID, '4-3-3', R);
    expect(game.saveLineup(s, league.id, lineup, ctx()).ok).toBe(true);
    expect(game.saveLineup(s, league.id, lineup, { ...ctx(), now: league.deadline }).ok).toBe(false);
    const stranger = PLAYERS.find((p) => p.position === 'FWD' && !mine.squad.some((x) => x.playerId === p.id))!;
    const fwd = lineup.starters.find((id) => PLAYERS_BY_ID[id].position === 'FWD')!;
    const forged = { ...lineup, starters: lineup.starters.map((id) => (id === fwd ? stranger.id : id)), captainId: lineup.starters[0] };
    expect(game.saveLineup(s, league.id, forged, ctx()).ok).toBe(false);
  });
  it('sells with the configured refund, then lets the user bid and win', () => {
    let s = start();
    const league = game.myLeagues(s)[0];
    const before = game.findTeam(s, league.id, 'me')!;
    const entry = before.squad[before.squad.length - 1];
    const sold = game.sellPlayer(s, league.id, entry.playerId);
    if (!sold.ok) throw new Error(sold.error);
    s = sold.value;
    const after = game.findTeam(s, league.id, 'me')!;
    expect(after.budget).toBe(before.budget + Math.floor(entry.paid * R.sellRefundRate));
    expect(game.placeBid(s, { leagueId: league.id, playerId: before.squad[0].playerId, amount: 500 }, ctx()).ok).toBe(false);
    expect(game.placeBid(s, { leagueId: league.id, playerId: entry.playerId, amount: after.budget + 1 }, ctx()).ok).toBe(false);
    const placed = game.placeBid(s, { leagueId: league.id, playerId: entry.playerId, amount: after.budget }, ctx());
    if (!placed.ok) throw new Error(placed.error);
    const closed = game.closeMarketRound(placed.value, league.id, ctx());
    if (!closed.ok) throw new Error(closed.error);
    const final = game.findTeam(closed.value, league.id, 'me')!;
    expect(final.squad.some((x) => x.playerId === entry.playerId)).toBe(true);
    expect(final.budget).toBe(0);
  });
  it('replays a finished match identically from its frozen lineups', () => {
    const s = start();
    const fx = s.fixtures.find((f) => f.result)!;
    const detail = game.matchDetail(s, fx.id)!;
    expect(detail.home!.fantasyGoals).toBe(fx.result!.homeGoals);
    expect(detail.away!.totalPoints).toBe(fx.result!.awayPoints);
  });
  it('runs a user-created league from lobby to kick-off', () => {
    let s = start();
    const step = (r: ReturnType<typeof game.startLeague>) => {
      if (!r.ok) throw new Error(r.error);
      s = r.value;
    };
    step(game.createLeague(s, { name: 'Office Cup', size: 4, isPublic: false }, ctx()));
    const id = s.activeLeagueId!;
    expect(game.startLeague(s, id, ctx()).ok).toBe(false);
    step(game.fillWithBots(s, id));
    step(game.startLeague(s, id, ctx()));
    expect(s.fixtures.filter((f) => f.leagueId === id)).toHaveLength(12);
    expect(game.findTeam(s, id, 'me')!.budget).toBe(500);
    expect(game.joinLeague(s, 'ZZZZZZ', ctx()).ok).toBe(false);
  });
});
