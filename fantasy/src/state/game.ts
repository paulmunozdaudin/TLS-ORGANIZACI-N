/**
 * Local game repository used in DEMO MODE.
 *
 * Every action is a pure function `(state, args, ctx) => Result<GameState>`
 * that delegates the rules to `src/domain`. In production these same actions
 * become Supabase RPCs / Edge Functions (see docs/ARCHITECTURE.md); the UI
 * calls them through the store and never computes budgets, auction outcomes
 * or scores on its own.
 */
import { BOT_NAMES, MANAGER_COLORS, PLAYERS, PLAYERS_BY_ID } from '@/data/demo/catalog';
import { demoGameweekStats } from '@/data/demo/simulate';
import { buildSchedule, computeStandings, makeInviteCode } from '@/domain/league';
import { autoLineup, emptyLineup, isLocked, pruneLineup, validateLineup } from '@/domain/lineup';
import { resolveRound, sellRefund, squadCount, validateBid } from '@/domain/market';
import { DEFAULT_RULES, FORMATION_IDS, type GameRules } from '@/domain/rules';
import { scoreTeam, type TeamScore } from '@/domain/scoring';
import {
  fail,
  ok,
  POSITIONS,
  type Bid,
  type Fixture,
  type League,
  type Lineup,
  type Manager,
  type Result,
  type Team,
} from '@/domain/types';

export interface ChatMessage {
  id: string;
  leagueId: string;
  managerId: string;
  text: string;
  at: number;
  reactions: Record<string, string[]>;
}

export type NoticeKind = 'bid' | 'match' | 'league' | 'social';
export interface Notice {
  id: string;
  at: number;
  kind: NoticeKind;
  title: string;
  body: string;
  read: boolean;
  href?: string;
}

export interface Settings {
  notifyResults: boolean;
  notifyMarket: boolean;
  notifyChat: boolean;
  haptics: boolean;
}

export interface GameState {
  version: 1;
  onboardingSeen: boolean;
  meId: string | null;
  activeLeagueId: string | null;
  managers: Record<string, Manager>;
  leagues: Record<string, League>;
  teams: Team[];
  fixtures: Fixture[];
  bids: Bid[];
  /** Lineups frozen at kick-off, keyed `${leagueId}:${matchday}:${managerId}`. */
  snapshots: Record<string, Lineup>;
  messages: ChatMessage[];
  notices: Notice[];
  friends: string[];
  settings: Settings;
  seq: number;
}

export interface Ctx {
  now: number;
  rand: () => number;
}

export const RULES: GameRules = DEFAULT_RULES;
const DAY = 24 * 60 * 60 * 1000;
const DEADLINE_WINDOW = 2 * DAY;
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const nextId = (s: GameState, prefix: string) => `${prefix}${++s.seq}`;

export const snapshotKey = (leagueId: string, matchday: number, managerId: string) =>
  `${leagueId}:${matchday}:${managerId}`;

export function findTeam(s: GameState, leagueId: string, managerId: string | null) {
  return s.teams.find((t) => t.leagueId === leagueId && t.managerId === managerId);
}

function notify(s: GameState, ctx: Ctx, kind: NoticeKind, title: string, body: string, href?: string) {
  s.notices.unshift({ id: nextId(s, 'n'), at: ctx.now, kind, title, body, read: false, href });
  s.notices = s.notices.slice(0, 60);
}

function newLeague(
  s: GameState,
  ctx: Ctx,
  input: { name: string; size: number; isPublic: boolean; ownerId: string }
): League {
  let code = makeInviteCode(ctx.rand);
  while (Object.values(s.leagues).some((l) => l.code === code)) code = makeInviteCode(ctx.rand);
  const league: League = {
    id: nextId(s, 'l'),
    name: input.name,
    code,
    size: input.size,
    isPublic: input.isPublic,
    ownerId: input.ownerId,
    memberIds: [input.ownerId],
    status: 'lobby',
    matchday: 1,
    totalMatchdays: (input.size - 1) * 2,
    marketRound: 1,
    deadline: 0,
    createdAt: ctx.now,
  };
  s.leagues[league.id] = league;
  return league;
}

function kickOff(s: GameState, league: League, ctx: Ctx) {
  league.status = 'active';
  league.matchday = 1;
  league.marketRound = 1;
  league.deadline = ctx.now + DEADLINE_WINDOW;
  s.fixtures.push(...buildSchedule(league.id, league.memberIds));
  for (const managerId of league.memberIds) {
    s.teams.push({
      leagueId: league.id,
      managerId,
      budget: RULES.startingBudget,
      squad: [],
      lineup: emptyLineup(),
    });
  }
}

export function initialState(ctx: Ctx): GameState {
  const s: GameState = {
    version: 1,
    onboardingSeen: false,
    meId: null,
    activeLeagueId: null,
    managers: {},
    leagues: {},
    teams: [],
    fixtures: [],
    bids: [],
    snapshots: {},
    messages: [],
    notices: [],
    friends: [],
    settings: { notifyResults: true, notifyMarket: true, notifyChat: false, haptics: true },
    seq: 0,
  };
  BOT_NAMES.forEach((username, i) => {
    const id = `bot${i + 1}`;
    s.managers[id] = { id, username, color: MANAGER_COLORS[(i + 1) % MANAGER_COLORS.length], isBot: true };
  });
  // Two open public leagues (bots only) the user can join in demo mode.
  const open: [string, number, string[]][] = [
    ['Open Trials', 4, ['bot6', 'bot7', 'bot8']],
    ['Weekend Warriors', 8, ['bot9', 'bot10', 'bot11', 'bot12', 'bot13', 'bot14']],
  ];
  for (const [name, size, members] of open) {
    const league = newLeague(s, ctx, { name, size, isPublic: true, ownerId: members[0] });
    league.memberIds = [...members];
  }
  return s;
}

/* ------------------------------------------------------------------ session */

export function completeOnboarding(state: GameState): Result<GameState> {
  const s = clone(state);
  s.onboardingSeen = true;
  return ok(s);
}

export function validateUsername(raw: string): Result<string> {
  const username = raw.trim();
  if (username.length < 3) return fail('Usernames need at least 3 characters.');
  if (username.length > 18) return fail('Usernames can have at most 18 characters.');
  if (!/^[a-zA-Z0-9_.]+$/.test(username)) return fail('Use letters, numbers, dots or underscores only.');
  return ok(username);
}

/** Starts a demo session and builds a ready-to-explore starter league. */
export function startDemoSession(state: GameState, rawName: string, ctx: Ctx): Result<GameState> {
  const name = validateUsername(rawName);
  if (!name.ok) return name;
  if (Object.values(state.managers).some((m) => m.username.toLowerCase() === name.value.toLowerCase())) {
    return fail('That username is taken.');
  }
  let s = clone(state);
  const me: Manager = { id: 'me', username: name.value, color: MANAGER_COLORS[0], isBot: false };
  s.managers[me.id] = me;
  s.meId = me.id;
  s.onboardingSeen = true;

  const league = newLeague(s, ctx, { name: 'Sunday Legends', size: 6, isPublic: false, ownerId: me.id });
  league.memberIds = [me.id, 'bot1', 'bot2', 'bot3', 'bot4', 'bot5'];
  kickOff(s, league, ctx);
  s.activeLeagueId = league.id;
  s.friends = ['bot1', 'bot2'];

  // Draft squads for everyone (including you, this once) and play 3 matchdays.
  for (let round = 0; round < 8; round++) {
    const next = closeMarketRound(s, league.id, ctx, [me.id]);
    if (next.ok) s = next.value;
  }
  // Leave you three open slots and their money back, so the market is worth a visit.
  const mine = findTeam(s, league.id, me.id)!;
  const spare = mine.squad
    .filter((e) => !mine.lineup.starters.includes(e.playerId) && PLAYERS_BY_ID[e.playerId].position !== 'GK')
    .sort((a, b) => PLAYERS_BY_ID[b.playerId].rating - PLAYERS_BY_ID[a.playerId].rating)
    .slice(0, 3);
  mine.squad = mine.squad.filter((e) => !spare.includes(e));
  mine.budget += spare.reduce((sum, e) => sum + e.paid, 0);
  mine.lineup = pruneLineup(mine.lineup, mine.squad);
  s.bids = s.bids.filter((b) => !(b.managerId === me.id && spare.some((e) => e.playerId === b.playerId)));
  for (let md = 0; md < 3; md++) {
    const next = playMatchday(s, league.id, ctx);
    if (next.ok) s = next.value;
  }
  s.messages = s.messages.filter((m) => m.leagueId !== league.id);
  const lines: [string, string][] = [
    ['bot1', 'Auction done. Somebody overpaid for a goalkeeper and it was not me.'],
    ['bot3', 'Three matchdays in and the table already hurts to look at.'],
    ['bot2', `Welcome ${me.username}. Check your lineup before the deadline 👀`],
  ];
  lines.forEach(([managerId, text], i) => {
    s.messages.push({
      id: nextId(s, 'm'),
      leagueId: league.id,
      managerId,
      text,
      at: ctx.now - (lines.length - i) * 17 * 60 * 1000,
      reactions: i === 0 ? { '😂': ['bot2', 'bot4'] } : {},
    });
  });
  s.notices = [];
  notify(
    s,
    ctx,
    'league',
    'Welcome to Sunday Legends',
    'A demo league with a drafted squad and three played matchdays. Create your own league to start from zero.',
    `/league/${league.id}`
  );
  return ok(s);
}

export function updateProfile(
  state: GameState,
  input: { username: string; color: string }
): Result<GameState> {
  if (!state.meId) return fail('You are not signed in.');
  const name = validateUsername(input.username);
  if (!name.ok) return name;
  const clash = Object.values(state.managers).some(
    (m) => m.id !== state.meId && m.username.toLowerCase() === name.value.toLowerCase()
  );
  if (clash) return fail('That username is taken.');
  const s = clone(state);
  s.managers[state.meId].username = name.value;
  s.managers[state.meId].color = input.color;
  return ok(s);
}

export function updateSettings(state: GameState, patch: Partial<Settings>): Result<GameState> {
  const s = clone(state);
  s.settings = { ...s.settings, ...patch };
  return ok(s);
}

/* ------------------------------------------------------------------ leagues */

export function createLeague(
  state: GameState,
  input: { name: string; size: number; isPublic: boolean },
  ctx: Ctx
): Result<GameState> {
  if (!state.meId) return fail('You are not signed in.');
  const name = input.name.trim();
  if (name.length < 3) return fail('League names need at least 3 characters.');
  if (name.length > 28) return fail('League names can have at most 28 characters.');
  if (!RULES.leagueSizes.includes(input.size)) return fail('Choose a league size of 2, 4, 6, 8 or 10.');
  const s = clone(state);
  const league = newLeague(s, ctx, { ...input, name, ownerId: state.meId });
  s.activeLeagueId = league.id;
  return ok(s);
}

export function joinLeague(state: GameState, rawCode: string, ctx: Ctx): Result<GameState> {
  if (!state.meId) return fail('You are not signed in.');
  const code = rawCode.trim().toUpperCase();
  if (code.length !== 6) return fail('Invitation codes have 6 characters.');
  const found = Object.values(state.leagues).find((l) => l.code === code);
  if (!found) return fail('No league matches that code. Check it with the league owner.');
  if (found.memberIds.includes(state.meId)) return fail('You are already in this league.');
  if (found.status !== 'lobby') return fail('This league has already started.');
  if (found.memberIds.length >= found.size) return fail('This league is full.');
  const s = clone(state);
  const league = s.leagues[found.id];
  league.memberIds.push(state.meId);
  s.activeLeagueId = league.id;
  // Bot-owned public leagues kick off as soon as the last seat is taken.
  if (league.memberIds.length === league.size && s.managers[league.ownerId]?.isBot) {
    kickOff(s, league, ctx);
    notify(s, ctx, 'league', `${league.name} is live`, 'The league is full. The transfer market is open.', `/league/${league.id}`);
  }
  return ok(s);
}

/** Demo-only helper: fills empty seats with bot managers. */
export function fillWithBots(state: GameState, leagueId: string): Result<GameState> {
  const found = state.leagues[leagueId];
  if (!found) return fail('League not found.');
  if (found.ownerId !== state.meId) return fail('Only the league owner can do this.');
  if (found.status !== 'lobby') return fail('This league has already started.');
  const s = clone(state);
  const league = s.leagues[leagueId];
  const bots = Object.values(s.managers).filter((m) => m.isBot && !league.memberIds.includes(m.id));
  while (league.memberIds.length < league.size && bots.length) {
    league.memberIds.push(bots.shift()!.id);
  }
  return ok(s);
}

export function startLeague(state: GameState, leagueId: string, ctx: Ctx): Result<GameState> {
  const found = state.leagues[leagueId];
  if (!found) return fail('League not found.');
  if (found.ownerId !== state.meId) return fail('Only the league owner can start the league.');
  if (found.status !== 'lobby') return fail('This league has already started.');
  if (found.memberIds.length !== found.size) {
    return fail(`The league needs ${found.size} managers to start (${found.memberIds.length}/${found.size}).`);
  }
  const s = clone(state);
  kickOff(s, s.leagues[leagueId], ctx);
  notify(s, ctx, 'league', `${found.name} is live`, 'Everyone has €500M. The transfer market is open.', `/league/${leagueId}`);
  return ok(s);
}

export function setActiveLeague(state: GameState, leagueId: string): Result<GameState> {
  if (!state.leagues[leagueId]?.memberIds.includes(state.meId ?? '')) return fail('You are not in this league.');
  const s = clone(state);
  s.activeLeagueId = leagueId;
  return ok(s);
}

/* ------------------------------------------------------------------- market */

export function ownedIds(state: GameState, leagueId: string): Set<string> {
  return new Set(
    state.teams.filter((t) => t.leagueId === leagueId).flatMap((t) => t.squad.map((x) => x.playerId))
  );
}

const openBidsOf = (s: GameState, leagueId: string) =>
  s.bids.filter((b) => b.leagueId === leagueId && b.status === 'open');

export function placeBid(
  state: GameState,
  input: { leagueId: string; playerId: string; amount: number },
  ctx: Ctx
): Result<GameState> {
  const league = state.leagues[input.leagueId];
  const team = findTeam(state, input.leagueId, state.meId);
  if (!league || !team) return fail('You are not in this league.');
  if (league.status !== 'active') return fail('The transfer market is closed for this league.');
  const openBids = openBidsOf(state, league.id);
  const check = validateBid({
    team,
    player: PLAYERS_BY_ID[input.playerId],
    amount: input.amount,
    openBids,
    ownedIds: ownedIds(state, league.id),
    players: PLAYERS_BY_ID,
    rules: RULES,
  });
  if (!check.ok) return check;
  const s = clone(state);
  // One open bid per manager and player: a new bid replaces the previous one.
  s.bids = s.bids.filter(
    (b) => !(b.status === 'open' && b.leagueId === league.id && b.managerId === team.managerId && b.playerId === input.playerId)
  );
  s.bids.push({
    id: nextId(s, 'b'),
    leagueId: league.id,
    managerId: team.managerId,
    playerId: input.playerId,
    amount: input.amount,
    round: league.marketRound,
    placedAt: ctx.now,
    status: 'open',
  });
  return ok(s);
}

export function cancelBid(state: GameState, bidId: string): Result<GameState> {
  const bid = state.bids.find((b) => b.id === bidId);
  if (!bid || bid.managerId !== state.meId) return fail('Bid not found.');
  if (bid.status !== 'open') return fail('This bid has already been settled.');
  const s = clone(state);
  s.bids = s.bids.filter((b) => b.id !== bidId);
  return ok(s);
}

/** Bots bid for the positions they still need, never beyond their budget. */
function botBids(s: GameState, league: League, managerIds: string[], ctx: Ctx): Bid[] {
  const taken = ownedIds(s, league.id);
  const out: Bid[] = [];
  for (const managerId of managerIds) {
    const team = findTeam(s, league.id, managerId);
    if (!team) continue;
    const needs = POSITIONS.flatMap((pos) =>
      Array.from({ length: RULES.squadLimits[pos] - squadCount(team, PLAYERS_BY_ID, pos) }, () => pos)
    );
    let left = team.budget;
    let slots = needs.length;
    const wanted = new Set<string>();
    for (const pos of needs.sort(() => ctx.rand() - 0.5).slice(0, 7)) {
      const reserve = (slots - 1) * 4;
      const target = Math.max(4, ((left - reserve) / slots) * (0.55 + ctx.rand() * 1.1));
      const pool = PLAYERS.filter(
        (p) => p.position === pos && !taken.has(p.id) && !wanted.has(p.id) && p.price <= Math.min(target, left - reserve)
      ).sort((a, b) => b.rating - a.rating);
      const pick = pool[Math.floor(ctx.rand() * Math.min(4, pool.length))];
      if (!pick) continue;
      const amount = Math.min(left - reserve, pick.price + Math.floor(ctx.rand() * pick.price * 0.3));
      wanted.add(pick.id);
      left -= amount;
      slots -= 1;
      out.push({
        id: nextId(s, 'b'),
        leagueId: league.id,
        managerId,
        playerId: pick.id,
        amount,
        round: league.marketRound,
        placedAt: ctx.now + out.length,
        status: 'open',
      });
    }
  }
  return out;
}

/**
 * Closes the current blind-auction round. On the real backend this runs on a
 * schedule inside a single database transaction; in demo mode the user
 * triggers it. `autoDraftFor` lets the starter league draft for a human.
 */
export function closeMarketRound(
  state: GameState,
  leagueId: string,
  ctx: Ctx,
  autoDraftFor: string[] = []
): Result<GameState> {
  if (state.leagues[leagueId]?.status !== 'active') return fail('The transfer market is closed for this league.');
  const s = clone(state);
  const league = s.leagues[leagueId];
  const autoIds = league.memberIds.filter((id) => s.managers[id]?.isBot || autoDraftFor.includes(id));
  s.bids.push(...botBids(s, league, autoIds, ctx));

  const leagueTeams = s.teams.filter((t) => t.leagueId === leagueId);
  const outcome = resolveRound(openBidsOf(s, leagueId), leagueTeams, PLAYERS_BY_ID, RULES);
  const settled = new Map(outcome.bids.map((b) => [b.id, b]));
  s.bids = s.bids.map((b) => settled.get(b.id) ?? b);
  s.teams = s.teams.map(
    (t) => (t.leagueId === leagueId ? outcome.teams.find((o) => o.managerId === t.managerId) : undefined) ?? t
  );
  for (const team of s.teams.filter((t) => t.leagueId === leagueId)) {
    if (autoIds.includes(team.managerId)) {
      const formation = FORMATION_IDS[league.memberIds.indexOf(team.managerId) % FORMATION_IDS.length];
      team.lineup = autoLineup(team.squad, PLAYERS_BY_ID, formation, RULES);
    }
  }
  for (const bid of outcome.bids.filter((b) => b.managerId === s.meId && !autoDraftFor.includes(b.managerId))) {
    const player = PLAYERS_BY_ID[bid.playerId];
    if (bid.status === 'won') {
      notify(s, ctx, 'bid', `You signed ${player.name}`, `Your €${bid.amount}M bid won the auction.`, `/player/${player.id}`);
    } else {
      const winner = outcome.signings.find((x) => x.playerId === bid.playerId);
      notify(
        s,
        ctx,
        'bid',
        `You missed out on ${player.name}`,
        winner
          ? `${s.managers[winner.managerId].username} won with €${winner.amount}M. Your €${bid.amount}M was returned.`
          : `Your €${bid.amount}M bid could not be completed and was returned.`,
        `/player/${player.id}`
      );
    }
  }
  league.marketRound += 1;
  return ok(s);
}

export function sellPlayer(state: GameState, leagueId: string, playerId: string): Result<GameState> {
  const found = findTeam(state, leagueId, state.meId);
  if (!found) return fail('You are not in this league.');
  if (state.leagues[leagueId].status !== 'active') return fail('The transfer market is closed for this league.');
  const entry = found.squad.find((x) => x.playerId === playerId);
  if (!entry) return fail('This player is not in your squad.');
  const s = clone(state);
  const team = findTeam(s, leagueId, s.meId)!;
  team.squad = team.squad.filter((x) => x.playerId !== playerId);
  team.budget += sellRefund(entry.paid, RULES);
  team.lineup = pruneLineup(team.lineup, team.squad);
  return ok(s);
}

/* ------------------------------------------------------------------ lineups */

export function saveLineup(state: GameState, leagueId: string, lineup: Lineup, ctx: Ctx): Result<GameState> {
  const league = state.leagues[leagueId];
  const found = findTeam(state, leagueId, state.meId);
  if (!league || !found) return fail('You are not in this league.');
  if (league.status !== 'active') return fail('This league is not in play.');
  if (isLocked(league.deadline, ctx.now)) return fail('The deadline has passed. Lineups are locked for this matchday.');
  const check = validateLineup(lineup, found.squad, PLAYERS_BY_ID);
  if (!check.valid) return fail(check.errors[0]);
  const s = clone(state);
  findTeam(s, leagueId, s.meId)!.lineup = {
    formation: lineup.formation,
    starters: [...lineup.starters],
    bench: lineup.bench.slice(0, RULES.benchSize),
    captainId: lineup.captainId,
  };
  return ok(s);
}

/* ----------------------------------------------------------------- matchday */

/**
 * Scores the current matchday for a league. Lineups are frozen first, then
 * every head-to-head is computed from the frozen lineups, so re-reading a
 * past match always reproduces the same result.
 */
export function playMatchday(state: GameState, leagueId: string, ctx: Ctx): Result<GameState> {
  const found = state.leagues[leagueId];
  if (!found) return fail('League not found.');
  if (found.status !== 'active') return fail('This league is not in play.');
  const s = clone(state);
  const league = s.leagues[leagueId];
  const md = league.matchday;
  const stats = demoGameweekStats(md);

  for (const team of s.teams.filter((t) => t.leagueId === leagueId)) {
    s.snapshots[snapshotKey(leagueId, md, team.managerId)] = pruneLineup(team.lineup, team.squad);
  }
  for (const fx of s.fixtures.filter((f) => f.leagueId === leagueId && f.matchday === md && !f.result)) {
    const home = scoreTeam(s.snapshots[snapshotKey(leagueId, md, fx.homeId)], PLAYERS_BY_ID, stats, RULES.scoring);
    const away = scoreTeam(s.snapshots[snapshotKey(leagueId, md, fx.awayId)], PLAYERS_BY_ID, stats, RULES.scoring);
    fx.result = {
      homePoints: home.totalPoints,
      awayPoints: away.totalPoints,
      homeGoals: home.fantasyGoals,
      awayGoals: away.fantasyGoals,
    };
    if (s.meId && (fx.homeId === s.meId || fx.awayId === s.meId)) {
      const mine = fx.homeId === s.meId;
      const gf = mine ? home.fantasyGoals : away.fantasyGoals;
      const ga = mine ? away.fantasyGoals : home.fantasyGoals;
      const rivalId = mine ? fx.awayId : fx.homeId;
      const rival = s.managers[rivalId].username;
      const verdict = gf > ga ? 'You beat' : gf === ga ? 'You drew with' : 'You lost to';
      notify(s, ctx, 'match', `Matchday ${md}: ${gf}–${ga}`, `${verdict} ${rival} in ${league.name}.`, `/match/${fx.id}`);
      if (s.managers[rivalId].isBot && gf !== ga) {
        s.messages.push({
          id: nextId(s, 'm'),
          leagueId,
          managerId: rivalId,
          text: gf > ga ? `${gf}–${ga}. Fine. Rematch soon.` : `${ga}–${gf} 😎 better luck next matchday`,
          at: ctx.now,
          reactions: {},
        });
      }
    }
  }
  league.matchday = md + 1;
  league.deadline = ctx.now + DEADLINE_WINDOW;
  if (league.matchday > league.totalMatchdays) league.status = 'finished';
  return ok(s);
}

export interface MatchDetail {
  fixture: Fixture;
  home: TeamScore | null;
  away: TeamScore | null;
  homeLineup: Lineup | null;
  awayLineup: Lineup | null;
}

/** Recomputes a match from its frozen lineups (played) or current lineups (upcoming). */
export function matchDetail(state: GameState, fixtureId: string): MatchDetail | null {
  const fixture = state.fixtures.find((f) => f.id === fixtureId);
  if (!fixture) return null;
  const side = (managerId: string) => {
    if (!fixture.result) {
      return { lineup: findTeam(state, fixture.leagueId, managerId)?.lineup ?? null, score: null };
    }
    const lineup = state.snapshots[snapshotKey(fixture.leagueId, fixture.matchday, managerId)] ?? null;
    return {
      lineup,
      score: lineup ? scoreTeam(lineup, PLAYERS_BY_ID, demoGameweekStats(fixture.matchday), RULES.scoring) : null,
    };
  };
  const home = side(fixture.homeId);
  const away = side(fixture.awayId);
  return { fixture, home: home.score, away: away.score, homeLineup: home.lineup, awayLineup: away.lineup };
}

/* ------------------------------------------------------------------- social */

export function sendMessage(state: GameState, leagueId: string, raw: string, ctx: Ctx): Result<GameState> {
  if (!state.meId || !state.leagues[leagueId]?.memberIds.includes(state.meId)) {
    return fail('You are not in this league.');
  }
  const text = raw.trim();
  if (!text) return fail('Write a message first.');
  if (text.length > 280) return fail('Messages can have at most 280 characters.');
  const s = clone(state);
  s.messages.push({ id: nextId(s, 'm'), leagueId, managerId: state.meId, text, at: ctx.now, reactions: {} });
  return ok(s);
}

export function toggleReaction(state: GameState, messageId: string, emoji: string): Result<GameState> {
  if (!state.meId) return fail('You are not signed in.');
  const s = clone(state);
  const msg = s.messages.find((m) => m.id === messageId);
  if (!msg) return fail('Message not found.');
  const who = msg.reactions[emoji] ?? [];
  msg.reactions[emoji] = who.includes(state.meId) ? who.filter((id) => id !== state.meId) : [...who, state.meId];
  if (!msg.reactions[emoji].length) delete msg.reactions[emoji];
  return ok(s);
}

export function toggleFriend(state: GameState, managerId: string): Result<GameState> {
  if (!state.managers[managerId] || managerId === state.meId) return fail('Manager not found.');
  const s = clone(state);
  s.friends = s.friends.includes(managerId) ? s.friends.filter((id) => id !== managerId) : [...s.friends, managerId];
  return ok(s);
}

export function markNoticesRead(state: GameState): Result<GameState> {
  const s = clone(state);
  s.notices.forEach((n) => (n.read = true));
  return ok(s);
}

/* ---------------------------------------------------------------- selectors */

export const myLeagues = (s: GameState) =>
  Object.values(s.leagues)
    .filter((l) => s.meId && l.memberIds.includes(s.meId))
    .sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id));

export const publicLobbies = (s: GameState) =>
  Object.values(s.leagues).filter(
    (l) => l.isPublic && l.status === 'lobby' && !l.memberIds.includes(s.meId ?? '') && l.memberIds.length < l.size
  );

export const leagueFixtures = (s: GameState, leagueId: string) => s.fixtures.filter((f) => f.leagueId === leagueId);

export const leagueStandings = (s: GameState, league: League) =>
  computeStandings(league.memberIds, leagueFixtures(s, league.id), RULES);

export function myFixture(s: GameState, league: League, matchday: number) {
  return s.fixtures.find(
    (f) => f.leagueId === league.id && f.matchday === matchday && (f.homeId === s.meId || f.awayId === s.meId)
  );
}

export interface CareerStats {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  bestPoints: number;
}

export function careerStats(s: GameState, managerId: string): CareerStats {
  const out: CareerStats = { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, bestPoints: 0 };
  for (const f of s.fixtures) {
    if (!f.result || (f.homeId !== managerId && f.awayId !== managerId)) continue;
    const home = f.homeId === managerId;
    const gf = home ? f.result.homeGoals : f.result.awayGoals;
    const ga = home ? f.result.awayGoals : f.result.homeGoals;
    out.played += 1;
    out.goalsFor += gf;
    out.bestPoints = Math.max(out.bestPoints, home ? f.result.homePoints : f.result.awayPoints);
    if (gf > ga) out.wins += 1;
    else if (gf === ga) out.draws += 1;
    else out.losses += 1;
  }
  return out;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

export function achievements(s: GameState, managerId: string): Achievement[] {
  const career = careerStats(s, managerId);
  const teams = s.teams.filter((t) => t.managerId === managerId);
  const leagues = Object.values(s.leagues).filter((l) => l.memberIds.includes(managerId));
  const topOfTable = leagues.some((l) => {
    const table = leagueStandings(s, l);
    return table[0]?.managerId === managerId && table[0].played > 0;
  });
  const streak = leagues.some((l) => leagueStandings(s, l).find((r) => r.managerId === managerId)?.form.join('').includes('WWW'));
  const goalFest = s.fixtures.some(
    (f) => f.result && ((f.homeId === managerId && f.result.homeGoals >= 4) || (f.awayId === managerId && f.result.awayGoals >= 4))
  );
  return [
    { id: 'signing', title: 'First signing', description: 'Win your first auction.', icon: 'pricetag', unlocked: teams.some((t) => t.squad.length > 0) },
    { id: 'squad', title: 'Full house', description: `Complete a squad of ${RULES.squadSize}.`, icon: 'people', unlocked: teams.some((t) => t.squad.length >= RULES.squadSize) },
    { id: 'win', title: 'Off the mark', description: 'Win a head-to-head.', icon: 'trophy', unlocked: career.wins > 0 },
    { id: 'streak', title: 'On fire', description: 'Win three matchdays in a row.', icon: 'flame', unlocked: streak },
    { id: 'goals', title: 'Goal fest', description: 'Score 4+ fantasy goals in one match.', icon: 'football', unlocked: goalFest },
    { id: 'top', title: 'Top of the table', description: 'Lead a league.', icon: 'podium', unlocked: topOfTable },
    { id: 'founder', title: 'Founder', description: 'Create your own league.', icon: 'flag', unlocked: leagues.some((l) => l.ownerId === managerId) },
    { id: 'social', title: 'Good company', description: 'Add a friend.', icon: 'heart', unlocked: managerId === s.meId && s.friends.length > 0 },
  ];
}
