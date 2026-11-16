import { matchEvent, matchPlayer, normalizeTeam } from '@core/matching.ts';
import { brierScore, matchModel } from '@core/model.ts';
import { fairProbabilities, referencePrice, summarize } from '@core/odds.ts';
import { formatTime, seasonWindow } from '@core/season.ts';
import { settleSelection } from '@core/settlement.ts';
import type { FixtureFacts, GoalEvent, PlayerMatchStats, Quote, SelectionRef } from '@core/types.ts';
import { payoutFor, stakeError, summarizeWallet, totalReturn } from '@core/wallet.ts';

const KO = Date.UTC(2026, 10, 21, 20, 0);
const NOW = KO + 3 * 3_600_000;
const goal = (seq: number, minute: number, side: 'home' | 'away', playerId: string | null, o: Partial<GoalEvent> = {}): GoalEvent => ({
  seq, minute, side, playerId, assistId: null, ownGoal: false, penalty: false, period: 'regular', ...o,
});
const pl = (playerId: string, o: Partial<PlayerMatchStats> = {}): PlayerMatchStats => ({
  playerId, side: 'home', minutes: 90, started: true, enteredMinute: 0, shots: null, shotsOnTarget: null, foulsCommitted: null, tackles: null, saves: null, ...o,
});
const facts = (o: Partial<FixtureFacts> = {}): FixtureFacts => ({
  status: 'finished', kickoffAt: KO, htHome: 1, htAway: 0, ftHome: 2, ftAway: 1, wentToExtraTime: false,
  eventsFinal: true, playerStatsFinal: true,
  goals: [goal(1, 12, 'home', 'p9', { assistId: 'p10' }), goal(2, 55, 'away', 'a7'), goal(3, 80, 'home', 'p9')],
  cards: [{ seq: 4, minute: 60, playerId: 'p4', card: 'yellow', period: 'regular' }],
  players: { p9: pl('p9', { shots: 5, shotsOnTarget: 3 }), p10: pl('p10', { shots: 1 }), p4: pl('p4'), sub: pl('sub', { started: false, enteredMinute: 70, minutes: 20 }), bench: pl('bench', { started: false, minutes: 0, enteredMinute: null }), a7: pl('a7', { side: 'away' }) },
  ...o,
});
const sel = (marketKey: string, key: string, o: Partial<SelectionRef> = {}): SelectionRef => ({ marketKey, key, line: null, side: null, playerId: null, ...o });
const out = (s: SelectionRef, f = facts()) => settleSelection(s, f, undefined, NOW).outcome;

describe('settlement: match markets', () => {
  it('settles result, double chance, draw no bet, btts', () => {
    expect(out(sel('match_result', 'home'))).toBe('won');
    expect(out(sel('match_result', 'draw'))).toBe('lost');
    expect(out(sel('double_chance', 'draw_away'))).toBe('lost');
    expect(out(sel('double_chance', 'home_away'))).toBe('won');
    expect(out(sel('draw_no_bet', 'away'), facts({ ftHome: 1, ftAway: 1, goals: [] }))).toBe('void');
    expect(out(sel('btts', 'yes'))).toBe('won');
    expect(out(sel('btts', 'no'))).toBe('lost');
  });
  it('settles totals with pushes on whole lines', () => {
    expect(out(sel('total_goals', 'over', { line: 2.5 }))).toBe('won');
    expect(out(sel('total_goals', 'under', { line: 3.5 }))).toBe('won');
    expect(out(sel('total_goals', 'over', { line: 3 }))).toBe('void');
    expect(out(sel('team_total_goals', 'over', { line: 1.5, side: 'away' }))).toBe('lost');
  });
  it('settles score, halves and first/last team', () => {
    expect(out(sel('correct_score', '2-1'))).toBe('won');
    expect(out(sel('half_time_result', 'home'))).toBe('won');
    expect(out(sel('ht_ft', 'home_home'))).toBe('won');
    expect(out(sel('ht_ft', 'draw_home'))).toBe('lost');
    expect(out(sel('first_team_to_score', 'home'))).toBe('won');
    expect(out(sel('last_team_to_score', 'away'))).toBe('lost');
    expect(out(sel('first_team_to_score', 'none'), facts({ ftHome: 0, ftAway: 0, htHome: 0, goals: [] }))).toBe('won');
  });
  it('uses regulation time only', () => {
    const f = facts({ ftHome: 1, ftAway: 1, wentToExtraTime: true, goals: [goal(1, 12, 'home', 'p9'), goal(2, 55, 'away', 'a7'), goal(3, 105, 'home', 'p9', { period: 'extra' })] });
    expect(out(sel('match_result', 'draw'), f)).toBe('won');
    expect(out(sel('player_2plus_goals', 'yes', { playerId: 'p9' }), f)).toBe('lost');
    expect(out(sel('player_shots', 'over', { playerId: 'p9', line: 2.5 }), f)).toBe('void');
  });
});

describe('settlement: player markets', () => {
  const p = (k: string, id: string, o: Partial<SelectionRef> = {}) => sel(k, 'yes', { playerId: id, ...o });
  it('settles scorer and assist markets from goal events', () => {
    expect(out(p('player_anytime_scorer', 'p9'))).toBe('won');
    expect(out(p('player_anytime_scorer', 'p10'))).toBe('lost');
    expect(out(p('player_first_scorer', 'p9'))).toBe('won');
    expect(out(p('player_last_scorer', 'a7'))).toBe('lost');
    expect(out(p('player_2plus_goals', 'p9'))).toBe('won');
    expect(out(p('player_3plus_goals', 'p9'))).toBe('lost');
    expect(out(p('player_assist', 'p10'))).toBe('won');
    expect(out(p('player_score_or_assist', 'p10'))).toBe('won');
    expect(out(p('player_2plus_assists', 'p10'))).toBe('lost');
  });
  it('ignores own goals for scorers and skips them for first scorer', () => {
    const f = facts({ goals: [goal(1, 5, 'home', 'a7', { ownGoal: true }), goal(2, 55, 'away', 'a7'), goal(3, 80, 'home', 'p9')] });
    expect(out(p('player_first_scorer', 'a7'), f)).toBe('won');
    expect(out(p('player_2plus_goals', 'a7'), f)).toBe('lost');
    expect(out(sel('first_team_to_score', 'home'), f)).toBe('won');
  });
  it('voids players who did not play, and late substitutes for first scorer', () => {
    expect(out(p('player_anytime_scorer', 'bench'))).toBe('void');
    expect(out(p('player_anytime_scorer', 'unknown'))).toBe('void');
    expect(out(p('player_first_scorer', 'sub'))).toBe('void');
    expect(out(p('player_anytime_scorer', 'sub'))).toBe('lost');
  });
  it('settles cards and stat lines', () => {
    expect(out(p('player_card', 'p4'))).toBe('won');
    expect(out(p('player_red_card', 'p4'))).toBe('lost');
    expect(out(sel('player_shots_on_target', 'over', { playerId: 'p9', line: 2.5 }))).toBe('won');
    expect(out(sel('player_shots', 'under', { playerId: 'p10', line: 1.5 }))).toBe('won');
    expect(out(sel('player_shots', 'over', { playerId: 'p4', line: 0.5 }))).toBe('lost');
  });
});

describe('settlement: lifecycle', () => {
  it('waits for data and never guesses', () => {
    expect(out(sel('match_result', 'home'), facts({ status: 'live' }))).toBeNull();
    expect(out(sel('player_anytime_scorer', 'yes', { playerId: 'p9' }), facts({ playerStatsFinal: false }))).toBeNull();
    expect(out(sel('first_team_to_score', 'home'), facts({ goals: [goal(1, 12, 'home', 'p9')] }))).toBeNull();
    expect(out(sel('player_anytime_scorer', 'yes', { playerId: 'p9' }), facts({ goals: [goal(1, 12, 'home', null), goal(2, 55, 'away', 'a7'), goal(3, 80, 'home', 'p9')] }))).toBeNull();
  });
  it('voids cancelled, abandoned and long-postponed matches, and stale data', () => {
    expect(out(sel('match_result', 'home'), facts({ status: 'cancelled' }))).toBe('void');
    expect(out(sel('match_result', 'home'), facts({ status: 'abandoned' }))).toBe('void');
    expect(out(sel('match_result', 'home'), facts({ status: 'postponed' }))).toBeNull();
    expect(settleSelection(sel('match_result', 'home'), facts({ status: 'postponed' }), undefined, KO + 49 * 3_600_000).outcome).toBe('void');
    expect(settleSelection(sel('player_card', 'yes', { playerId: 'p4' }), facts({ playerStatsFinal: false }), undefined, KO + 73 * 3_600_000).outcome).toBe('void');
  });
  it('is deterministic', () => {
    const s = sel('player_first_scorer', 'yes', { playerId: 'p9' });
    expect(settleSelection(s, facts(), undefined, NOW)).toEqual(settleSelection(s, facts(), undefined, NOW));
  });
});

describe('odds aggregation', () => {
  const q = (bookmakerKey: string, decimal: number, o: Partial<Quote> = {}): Quote => ({ bookmakerKey, decimal, suspended: false, updatedAt: NOW - 60_000, ...o });
  const quotes = [q('a', 2.1), q('b', 2.25), q('c', 2.0), q('old', 3.0, { updatedAt: NOW - 4 * 3_600_000 }), q('susp', 5.0, { suspended: true })];
  it('reports best, average and counts from fresh quotes only', () => {
    const s = summarize(quotes, NOW);
    expect(s.best).toEqual({ decimal: 2.25, bookmakerKey: 'b' });
    expect(s.average).toBe(2.12);
    expect(s).toMatchObject({ count: 3, total: 5, suspended: 1, stale: 1 });
  });
  it('returns no price rather than a substitute', () => {
    expect(summarize([], NOW)).toMatchObject({ best: null, average: null, count: 0 });
    expect(referencePrice([q('old', 3, { updatedAt: 0 })], { type: 'consensus' }, NOW)).toBeNull();
    expect(referencePrice(quotes, { type: 'bookmaker', bookmakerKey: 'susp' }, NOW)).toBeNull();
    expect(referencePrice(quotes, { type: 'bookmaker', bookmakerKey: 'zzz' }, NOW)).toBeNull();
  });
  it('prices by the chosen reference', () => {
    expect(referencePrice(quotes, { type: 'consensus' }, NOW)).toMatchObject({ decimal: 2.12, basis: 3, bookmakerKey: null });
    expect(referencePrice(quotes, { type: 'best' }, NOW)).toMatchObject({ decimal: 2.25, bookmakerKey: 'b' });
    expect(referencePrice(quotes, { type: 'bookmaker', bookmakerKey: 'c' }, NOW)).toMatchObject({ decimal: 2.0 });
  });
  it('removes the margin proportionally', () => {
    const fair = fairProbabilities([2.0, 3.5, 4.0]);
    expect(fair.reduce((s, x) => s + x, 0)).toBeCloseTo(1, 10);
    expect(fair[0]).toBeGreaterThan(fair[1]);
  });
});

describe('wallet', () => {
  it('matches the product example and rounds to whole coins', () => {
    expect(totalReturn(100, 2.1)).toBe(210);
    expect(totalReturn(33, 1.75)).toBe(58);
    expect(totalReturn(7, 1.005)).toBe(7);
    expect(payoutFor('won', 100, 2.1)).toBe(210);
    expect(payoutFor('void', 100, 2.1)).toBe(100);
    expect(payoutFor('lost', 100, 2.1)).toBe(0);
  });
  it('validates stakes and summarises', () => {
    expect(stakeError(0, 100)).toBeTruthy();
    expect(stakeError(1.5, 100)).toBeTruthy();
    expect(stakeError(101, 100)).toBeTruthy();
    expect(stakeError(100, 100)).toBeNull();
    expect(summarizeWallet({ balance: 910, openStakes: 200, totalStaked: 300, totalReturned: 210 })).toMatchObject({ equity: 1110, netProfit: 110, roi: 1.1 });
    expect(summarizeWallet({ balance: 1000, openStakes: 0, totalStaked: 0, totalReturned: 0 }).roi).toBeNull();
  });
});

describe('weekly seasons in Europe/Madrid', () => {
  const iso = (ms: number) => new Date(ms).toISOString();
  it('runs Monday 00:00 to Monday 00:00 local, in winter and summer time', () => {
    const w = seasonWindow(Date.UTC(2026, 10, 18, 12));
    expect(iso(w.startsAt)).toBe('2026-11-15T23:00:00.000Z');
    expect(iso(w.endsAt)).toBe('2026-11-22T23:00:00.000Z');
    const s = seasonWindow(Date.UTC(2026, 6, 15, 12));
    expect(iso(s.startsAt)).toBe('2026-07-12T22:00:00.000Z');
  });
  it('handles the Sunday-night edge and DST weeks', () => {
    expect(iso(seasonWindow(Date.UTC(2026, 10, 22, 22, 59, 59)).startsAt)).toBe('2026-11-15T23:00:00.000Z');
    expect(iso(seasonWindow(Date.UTC(2026, 10, 22, 23, 0, 0)).startsAt)).toBe('2026-11-22T23:00:00.000Z');
    const spring = seasonWindow(Date.UTC(2026, 2, 27, 12));
    expect(iso(spring.startsAt)).toBe('2026-03-22T23:00:00.000Z');
    expect(iso(spring.endsAt)).toBe('2026-03-29T22:00:00.000Z');
    expect(spring.endsAt - spring.startsAt).toBe(167 * 3_600_000);
    const autumn = seasonWindow(Date.UTC(2026, 9, 23, 12));
    expect(autumn.endsAt - autumn.startsAt).toBe(169 * 3_600_000);
  });
  it('formats kick-offs in Madrid time', () => {
    expect(formatTime(Date.UTC(2026, 10, 21, 20, 0))).toBe('21:00');
    expect(formatTime(Date.UTC(2026, 6, 21, 19, 0))).toBe('21:00');
  });
});

describe('cross-provider matching', () => {
  const fixtures = [
    { id: 'f1', kickoffAt: KO, homeNames: ['Real Madrid'], awayNames: ['Barcelona'] },
    { id: 'f2', kickoffAt: KO, homeNames: ['Atletico Madrid'], awayNames: ['Real Sociedad'] },
    { id: 'f3', kickoffAt: KO + 7 * 86_400_000, homeNames: ['Barcelona'], awayNames: ['Real Madrid'] },
  ];
  it('normalises club names', () => {
    expect(normalizeTeam('FC Bayern München')).toBe('bayern munchen');
    expect(normalizeTeam('1. FC Köln')).toBe('1 koln');
    expect(normalizeTeam('Atlético de Madrid')).toBe('atletico madrid');
  });
  it('joins events on teams and kick-off, and refuses ambiguity', () => {
    expect(matchEvent({ home: 'Real Madrid CF', away: 'FC Barcelona', commenceAt: KO }, fixtures)?.id).toBe('f1');
    expect(matchEvent({ home: 'Atlético Madrid', away: 'Real Sociedad', commenceAt: KO + 600_000 }, fixtures)?.id).toBe('f2');
    expect(matchEvent({ home: 'Barcelona', away: 'Real Madrid', commenceAt: KO }, fixtures)).toBeNull();
    expect(matchEvent({ home: 'Real Madrid', away: 'Barcelona', commenceAt: KO + 2 * 86_400_000 }, fixtures)).toBeNull();
    expect(matchEvent({ home: 'Sevilla', away: 'Valencia', commenceAt: KO }, fixtures)).toBeNull();
  });
  it('resolves player names only when unique', () => {
    const squad = [
      { id: '1', names: ['K. Mbappé', 'Kylian Mbappé Lottin'] },
      { id: '2', names: ['Vinícius Júnior', 'Vinícius José Paixão de Oliveira Júnior'] },
      { id: '3', names: ['F. Valverde', 'Federico Valverde'] },
      { id: '4', names: ['L. Vázquez', 'Lucas Vázquez'] },
      { id: '5', names: ['F. Vázquez', 'Franco Vázquez'] },
    ];
    expect(matchPlayer('Kylian Mbappe', squad)).toBe('1');
    expect(matchPlayer('Vinicius Junior', squad)).toBe('2');
    expect(matchPlayer('Federico Valverde', squad)).toBe('3');
    expect(matchPlayer('Lucas Vazquez', squad)).toBe('4');
    expect(matchPlayer('Vazquez', squad)).toBeNull();
    expect(matchPlayer('Jude Bellingham', squad)).toBeNull();
  });
});

describe('statistical model', () => {
  const input = { home: { played: 10, scoredPerGame: 2.1, concededPerGame: 0.8 }, away: { played: 10, scoredPerGame: 1.0, concededPerGame: 1.6 }, leagueHomeGoals: 1.5, leagueAwayGoals: 1.2 };
  it('produces a proper probability distribution', () => {
    const mdl = matchModel(input)!;
    expect(mdl.home + mdl.draw + mdl.away).toBeCloseTo(1, 8);
    expect(mdl.home).toBeGreaterThan(mdl.away);
    expect(mdl.over(0.5)).toBeGreaterThan(mdl.over(2.5));
    expect(mdl.lambdaHome).toBeCloseTo(2.1 * (1.6 / 1.5), 8);
  });
  it('declines to estimate from thin samples', () => {
    expect(matchModel({ ...input, home: { ...input.home, played: 3 } })).toBeNull();
  });
  it('scores forecasts', () => {
    expect(brierScore([{ probs: [1, 0, 0], actual: 0 }])).toBe(0);
    expect(brierScore([{ probs: [1 / 3, 1 / 3, 1 / 3], actual: 0 }])).toBeCloseTo(2 / 3, 8);
  });
});
