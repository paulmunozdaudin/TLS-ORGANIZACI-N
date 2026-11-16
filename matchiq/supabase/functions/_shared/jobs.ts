/**
 * Sync and settlement jobs. Each job: fetch from a provider → normalise →
 * hand the batch to an idempotent SQL function. Every run is recorded in
 * `data_sync_logs` with request counts and the error, if any, so the app can
 * show how fresh its data is.
 *
 * The jobs only need `rpc`, so the same code runs in an Edge Function
 * (supabase-js) and in the database tests (node-postgres).
 */
import { selectionLabel } from './core/markets.ts';
import { matchEvent, matchPlayer, type FixtureCandidate, type SquadPlayer } from './core/matching.ts';
import { DEFAULT_SETTLEMENT_RULES, settleSelection, type SettlementRules } from './core/settlement.ts';
import type { FixtureFacts, Side } from './core/types.ts';
import {
  API_FOOTBALL,
  normalizeEvents,
  normalizeFixture,
  normalizeInjuries,
  normalizeLineups,
  normalizePlayerStats,
  normalizeSeasonPlayers,
  normalizeSquad,
  normalizeStandings,
  normalizeTeam,
  normalizeTeamStats,
  type ApiFootballClient,
  type NormTeam,
} from './providers/apiFootball.ts';
import { arr, int, obj, str } from './providers/http.ts';
import {
  EVENT_CANONICAL,
  EVENT_MATCH_MARKETS,
  EVENT_PLAYER_MARKETS,
  FEATURED_CANONICAL,
  FEATURED_MARKETS,
  normalizeOddsEvent,
  oddsParams,
  THE_ODDS_API,
  type OddsApiClient,
  type RawQuote,
} from './providers/theOddsApi.ts';

export interface Db {
  /** Calls a Postgres function with named arguments and returns its value. */
  rpc<T = unknown>(fn: string, args?: Record<string, unknown>): Promise<T>;
}

export interface JobContext {
  db: Db;
  football: ApiFootballClient;
  odds: OddsApiClient;
  now?: () => number;
  /** Id of the running data_sync_logs row; set by runJob. */
  syncId?: number;
}

export interface JobResult {
  items: number;
  meta: Record<string, unknown>;
}

interface CompetitionConfig {
  provider: string;
  external_id: string;
  name: string;
  odds_sport_key?: string;
}

const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const chunk = <T>(list: T[], size: number) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size));
const dedupe = <T extends { external_id: string }>(list: T[]) => [...new Map(list.map((x) => [x.external_id, x])).values()];

/** Wraps a job with start/finish logging. A failure is recorded, then rethrown. */
export async function runJob(
  ctx: JobContext,
  job: string,
  provider: string,
  fn: () => Promise<JobResult>
): Promise<JobResult & { ok: boolean; error?: string }> {
  const before = ctx.football.meter.requests + ctx.odds.meter.requests;
  const id = await ctx.db.rpc<number>('sync_start', { p_job: job, p_provider: provider });
  ctx.syncId = id;
  const requests = () => ctx.football.meter.requests + ctx.odds.meter.requests - before;
  try {
    const result = await fn();
    const quota = { football_remaining: ctx.football.meter.remaining, odds_remaining: ctx.odds.meter.remaining };
    await ctx.db.rpc('sync_finish', { p_id: id, p_status: 'ok', p_items: result.items, p_requests: requests(), p_error: null, p_meta: { ...result.meta, ...quota } });
    return { ...result, ok: true };
  } catch (e) {
    const message = (e as Error).message ?? String(e);
    await ctx.db.rpc('sync_finish', { p_id: id, p_status: 'error', p_items: 0, p_requests: requests(), p_error: message.slice(0, 500), p_meta: {} });
    return { items: 0, meta: {}, ok: false, error: message };
  }
}

async function competitions(ctx: JobContext): Promise<CompetitionConfig[]> {
  const list = await ctx.db.rpc<CompetitionConfig[]>('cfg', { p_key: 'competitions', p_default: [] });
  return arr<CompetitionConfig>(list).filter((c) => c.provider === API_FOOTBALL);
}

/** Current season year of a league, from `GET /leagues?id=&current=true`. */
async function currentSeason(ctx: JobContext, leagueId: string) {
  const { response } = await ctx.football.get('/leagues', { id: leagueId, current: 'true' });
  const item = obj(response[0]);
  const league = obj(item.league);
  const season = arr(item.seasons).find((s) => s.current === true) ?? arr(item.seasons).pop();
  if (!str(league.id) || !season) return null;
  return {
    season: int(season.year) as number,
    competition: {
      external_id: str(league.id) as string,
      name: str(league.name) ?? leagueId,
      kind: str(league.type),
      logo_url: str(league.logo),
      country: str(obj(item.country).name),
      season: int(season.year),
      coverage: obj(season.coverage),
    },
  };
}

/* ---------------------------------------------------------------- fixtures */

/** Upcoming fixtures (and their teams) for every configured competition. */
export async function syncFixtures(ctx: JobContext, days = 14): Promise<JobResult> {
  const now = (ctx.now ?? Date.now)();
  let fixtures = 0;
  const missing: string[] = [];
  for (const c of await competitions(ctx)) {
    const current = await currentSeason(ctx, c.external_id);
    if (!current) {
      missing.push(c.name);
      continue;
    }
    const { response } = await ctx.football.get('/fixtures', {
      league: c.external_id,
      season: current.season,
      from: day(now - 86_400_000),
      to: day(now + days * 86_400_000),
    });
    const rows = response.map(normalizeFixture).filter((x) => x !== null);
    const teams = dedupe(rows.flatMap((r) => r.teams));
    await ctx.db.rpc('ingest_reference', { p: { provider: API_FOOTBALL, competitions: [current.competition], teams } });
    const out = await ctx.db.rpc<{ fixtures: number }>('ingest_fixtures', { p: { provider: API_FOOTBALL, fixtures: rows.map((r) => r.fixture) } });
    fixtures += out.fixtures;
  }
  await ctx.db.rpc('apply_competition_config');
  return { items: fixtures, meta: { competitions_not_found: missing } };
}

/** Teams, standings, squads and (optionally) season statistics. Daily. */
export async function syncReference(ctx: JobContext, opts: { seasonStats?: boolean } = {}): Promise<JobResult> {
  let players = 0;
  let teamsCount = 0;
  for (const c of await competitions(ctx)) {
    const current = await currentSeason(ctx, c.external_id);
    if (!current) continue;
    const teamRes = await ctx.football.get('/teams', { league: c.external_id, season: current.season });
    const teams = teamRes.response.map(normalizeTeam).filter((t): t is NormTeam => t !== null);
    const standingRes = await ctx.football.get('/standings', { league: c.external_id, season: current.season });
    const standings = normalizeStandings(standingRes.response, c.external_id);
    await ctx.db.rpc('ingest_reference', { p: { provider: API_FOOTBALL, competitions: [current.competition], teams, standings } });
    teamsCount += teams.length;

    for (const team of teams) {
      const squad = await ctx.football.get('/players/squads', { team: team.external_id });
      const list = normalizeSquad(squad.response, team.external_id);
      await ctx.db.rpc('ingest_reference', { p: { provider: API_FOOTBALL, players: list } });
      players += list.length;
    }

    if (opts.seasonStats) {
      let page = 1;
      let total = 1;
      do {
        const res = await ctx.football.get('/players', { league: c.external_id, season: current.season, page });
        total = res.paging.total;
        const { players: profiles, stats } = normalizeSeasonPlayers(res.response, c.external_id, current.season);
        await ctx.db.rpc('ingest_reference', { p: { provider: API_FOOTBALL, players: profiles, player_season_stats: stats } });
        page++;
      } while (page <= total);
    }
  }
  await ctx.db.rpc('apply_competition_config');
  return { items: players, meta: { teams: teamsCount } };
}

/** Status and score of fixtures that have kicked off but are not final. */
export async function syncLive(ctx: JobContext): Promise<JobResult> {
  const ids = await ctx.db.rpc<string[]>('fixtures_in_play', { p_provider: API_FOOTBALL });
  let updated = 0;
  // `ids` accepts up to 20 fixtures per call.
  for (const group of chunk(arr<string>(ids), 20)) {
    const { response } = await ctx.football.get('/fixtures', { ids: group.join('-') });
    const rows = response.map(normalizeFixture).filter((x) => x !== null);
    const out = await ctx.db.rpc<{ fixtures: number }>('ingest_fixtures', { p: { provider: API_FOOTBALL, fixtures: rows.map((r) => r.fixture) } });
    updated += out.fixtures;
  }
  return { items: updated, meta: { tracked: arr(ids).length } };
}

/** Lineups before kick-off; events, statistics and player statistics after it. */
export async function syncDetails(ctx: JobContext): Promise<JobResult> {
  const list = await ctx.db.rpc<Record<string, any>[]>('fixtures_needing_details', { p_provider: API_FOOTBALL });
  let done = 0;
  for (const f of arr(list)) {
    const fixture = f.external_id as string;
    const payload: Record<string, unknown> = { provider: API_FOOTBALL, fixture_external_id: fixture };
    const named: { external_id: string | null; name: string | null; team_external_id: string | null }[] = [];
    const teamOfPlayer: Record<string, string> = {};
    const remember = (rows: Record<string, any>[]) => {
      for (const r of rows) {
        if (!r.player_external_id) continue;
        teamOfPlayer[r.player_external_id] = r.team_external_id;
        named.push({ external_id: r.player_external_id, name: r.player_name ?? null, team_external_id: r.team_external_id });
      }
    };

    const lineups = normalizeLineups((await ctx.football.get('/fixtures/lineups', { fixture })).response);
    if (lineups.length) {
      payload.lineups = lineups;
      remember(lineups);
    }
    if (f.status === 'scheduled') {
      payload.injuries = normalizeInjuries((await ctx.football.get('/injuries', { fixture })).response);
    }

    if (f.need_match_data) {
      const stats = normalizePlayerStats((await ctx.football.get('/fixtures/players', { fixture })).response);
      remember(stats);
      const events = normalizeEvents((await ctx.football.get('/fixtures/events', { fixture })).response, teamOfPlayer);
      for (const e of events) {
        named.push({ external_id: e.player_external_id, name: e.player_name, team_external_id: e.team_external_id });
        named.push({ external_id: e.related_player_external_id, name: e.related_player_name, team_external_id: e.team_external_id });
      }
      payload.events = events;
      payload.player_stats = stats;
      payload.team_stats = normalizeTeamStats((await ctx.football.get('/fixtures/statistics', { fixture })).response);
      if (f.status === 'finished') {
        // Final once the provider has published both feeds for a finished match.
        payload.events_final = true;
        payload.player_stats_final = stats.length > 0;
      }
    }
    payload.players = named.filter((p) => p.external_id && p.name);
    await ctx.db.rpc('ingest_fixture_details', { p: payload });
    done++;
  }
  return { items: done, meta: {} };
}

/* -------------------------------------------------------------------- odds */

interface UpcomingFixture {
  id: number;
  kickoff_at: number;
  odds_sport_key: string | null;
  home: { id: number; name: string; names: string[] };
  away: { id: number; name: string; names: string[] };
}

export interface OddsOptions {
  /** How far ahead to price fixtures. */
  hours?: number;
  /** Fetch per-event markets (player props and extra match markets) inside this window. */
  eventMarketsWithinHours?: number;
}

/**
 * Bookmaker prices for upcoming fixtures.
 * One bulk call per competition for the main markets; one call per fixture,
 * close to kick-off, for player props and secondary markets. Events and
 * players are joined to our ids by `core/matching`; whatever cannot be
 * matched with confidence is left out and reported in the sync log.
 */
export async function syncOdds(ctx: JobContext, opts: OddsOptions = {}): Promise<JobResult> {
  const now = (ctx.now ?? Date.now)();
  const hours = opts.hours ?? 168;
  const propsWindow = (opts.eventMarketsWithinHours ?? 48) * 3_600_000;
  const regions = str(await ctx.db.rpc('cfg', { p_key: 'odds_regions', p_default: 'eu,uk' })) ?? 'eu,uk';
  const eventRegions = str(await ctx.db.rpc('cfg', { p_key: 'odds_event_regions', p_default: 'us,uk,eu' })) ?? 'us,uk,eu';

  const upcoming = arr<UpcomingFixture>(await ctx.db.rpc('upcoming_fixtures', { p_hours: hours }));
  const bySport = new Map<string, UpcomingFixture[]>();
  for (const f of upcoming) {
    if (!f.odds_sport_key) continue;
    bySport.set(f.odds_sport_key, [...(bySport.get(f.odds_sport_key) ?? []), f]);
  }

  const report = { events_unmatched: [] as string[], players_unmatched: [] as string[], outcomes_skipped: {} as Record<string, number>, fixtures_without_odds: 0, quotes_withdrawn: 0 };
  let written = 0;

  for (const [sport, fixtures] of bySport) {
    const candidates: FixtureCandidate[] = fixtures.map((f) => ({ id: String(f.id), kickoffAt: f.kickoff_at, homeNames: f.home.names, awayNames: f.away.names }));
    const byId = new Map(fixtures.map((f) => [String(f.id), f]));
    const bulk = arr(await ctx.odds.get(`/sports/${sport}/odds`, oddsParams(FEATURED_MARKETS, regions)));

    const matchedEvents: { external_id: string; fixture_id: number; match_score: number }[] = [];
    const scopes: { fixture_id: number; market_keys: string[] }[] = [];
    const quotes: Record<string, unknown>[] = [];
    const priced = new Set<string>();

    const collect = (raws: RawQuote[], fixture: UpcomingFixture, squad: SquadPlayer[] | null) => {
      for (const q of raws) {
        let playerId: string | null = null;
        if (q.player_name) {
          playerId = squad ? matchPlayer(q.player_name, squad) : null;
          if (!playerId) {
            if (report.players_unmatched.length < 40) report.players_unmatched.push(`${q.player_name} (${fixture.home.name} v ${fixture.away.name})`);
            continue;
          }
        }
        quotes.push({
          fixture_id: fixture.id,
          market_key: q.market_key,
          line: q.line,
          side: q.side,
          selection_key: q.selection_key,
          player_id: playerId ? Number(playerId) : null,
          label: selectionLabel(q.market_key, q.selection_key, { home: fixture.home.name, away: fixture.away.name, line: q.line, side: q.side as Side | null, player: q.player_name }),
          bookmaker_key: q.bookmaker_key,
          bookmaker_name: q.bookmaker_name,
          decimal_odds: q.decimal_odds,
          suspended: false,
          provider_updated_at: q.provider_updated_at,
          source_ref: q.source_ref,
        });
      }
    };

    for (const raw of bulk) {
      const event = normalizeOddsEvent(raw);
      if (!event) continue;
      const commenceAt = Date.parse(event.commence_at);
      if (commenceAt <= now || commenceAt > now + hours * 3_600_000) continue;
      const match = matchEvent({ home: event.home, away: event.away, commenceAt }, candidates);
      if (!match) {
        report.events_unmatched.push(`${event.home} v ${event.away} @ ${event.commence_at}`);
        continue;
      }
      const fixture = byId.get(match.id) as UpcomingFixture;
      matchedEvents.push({ external_id: event.external_id, fixture_id: fixture.id, match_score: match.score });
      priced.add(match.id);
      collect(event.quotes, fixture, null);
      for (const [k, n] of Object.entries(event.skipped)) report.outcomes_skipped[k] = (report.outcomes_skipped[k] ?? 0) + n;

      const scope = { fixture_id: fixture.id, market_keys: [...FEATURED_CANONICAL] };
      scopes.push(scope);

      if (fixture.kickoff_at - now <= propsWindow) {
        const detail = normalizeOddsEvent(
          await ctx.odds.get(`/sports/${sport}/events/${event.external_id}/odds`, oddsParams([...EVENT_MATCH_MARKETS, ...EVENT_PLAYER_MARKETS], eventRegions))
        );
        if (detail) {
          scope.market_keys.push(...EVENT_CANONICAL);
          const squadRows = arr<Record<string, any>>(await ctx.db.rpc('squad_players', { p_team_ids: [fixture.home.id, fixture.away.id] }));
          const squad: SquadPlayer[] = squadRows.map((p) => ({ id: String(p.id), names: arr<string>(p.names) }));
          collect(detail.quotes, fixture, squad);
          for (const [k, n] of Object.entries(detail.skipped)) report.outcomes_skipped[k] = (report.outcomes_skipped[k] ?? 0) + n;
        }
      }
    }

    report.fixtures_without_odds += fixtures.length - priced.size;
    const batches = chunk(quotes, 500);
    if (!batches.length && matchedEvents.length) batches.push([]);
    for (const [i, batch] of batches.entries()) {
      const last = i === batches.length - 1;
      const out = await ctx.db.rpc<{ new: number; changed: number; unchanged: number; withdrawn: number }>('ingest_odds', {
        p: { provider: THE_ODDS_API, sync_id: ctx.syncId ?? null, events: i === 0 ? matchedEvents : [], quotes: batch, scopes: last ? scopes : [] },
      });
      written += out.new + out.changed + out.unchanged;
      report.quotes_withdrawn += out.withdrawn;
    }
  }
  return { items: written, meta: report };
}

/* -------------------------------------------------------------- settlement */

/** Settles every open prediction whose match has official, final data. */
export async function settlePredictions(ctx: JobContext): Promise<JobResult> {
  const now = (ctx.now ?? Date.now)();
  const rules = { ...DEFAULT_SETTLEMENT_RULES, ...obj(await ctx.db.rpc('cfg', { p_key: 'settlement_rules', p_default: {} })) } as SettlementRules;
  const fixtures = arr<number>(await ctx.db.rpc('fixtures_to_settle'));
  let settled = 0;
  let waiting = 0;
  for (const fixtureId of fixtures) {
    const facts = (await ctx.db.rpc('fixture_facts', { p_fixture_id: fixtureId })) as FixtureFacts;
    const selections = arr<Record<string, any>>(await ctx.db.rpc('open_selections', { p_fixture_id: fixtureId }));
    for (const s of selections) {
      const result = settleSelection(
        { marketKey: s.market_key, line: s.line == null ? null : Number(s.line), side: s.side ?? null, key: s.key, playerId: s.player_id ?? null },
        facts,
        rules,
        now
      );
      if (!result.outcome) {
        waiting++;
        continue;
      }
      const out = await ctx.db.rpc<{ settled: number }>('settle_selection', { p_selection_id: s.selection_id, p_result: result.outcome, p_reason: result.reason });
      settled += out.settled;
    }
  }
  return { items: settled, meta: { fixtures: fixtures.length, selections_waiting: waiting } };
}

/** Closes finished weekly seasons and opens the current one. */
export async function rollSeasons(ctx: JobContext): Promise<JobResult> {
  const out = await ctx.db.rpc<{ closed: number }>('close_due_seasons');
  return { items: out.closed, meta: {} };
}

export const JOBS = {
  fixtures: { provider: API_FOOTBALL, run: (ctx: JobContext) => syncFixtures(ctx) },
  reference: { provider: API_FOOTBALL, run: (ctx: JobContext) => syncReference(ctx) },
  'reference-stats': { provider: API_FOOTBALL, run: (ctx: JobContext) => syncReference(ctx, { seasonStats: true }) },
  live: { provider: API_FOOTBALL, run: (ctx: JobContext) => syncLive(ctx) },
  details: { provider: API_FOOTBALL, run: (ctx: JobContext) => syncDetails(ctx) },
  odds: { provider: THE_ODDS_API, run: (ctx: JobContext) => syncOdds(ctx) },
  settle: { provider: 'matchiq', run: (ctx: JobContext) => settlePredictions(ctx) },
  seasons: { provider: 'matchiq', run: (ctx: JobContext) => rollSeasons(ctx) },
} as const;
export type JobName = keyof typeof JOBS;
