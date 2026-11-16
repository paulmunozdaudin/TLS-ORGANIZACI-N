/**
 * API-Football (API-Sports) v3 — fixtures, teams, squads, standings, events,
 * lineups and statistics.
 *
 * Docs: https://www.api-football.com/documentation-v3
 * Auth: header `x-apisports-key` (server-side secret API_FOOTBALL_KEY).
 *
 * STATUS: written against the documented v3 response shapes. It has not yet
 * been run against the live API from this repository (no key was available),
 * so every normaliser tolerates missing fields and the client fails loudly on
 * an unexpected envelope instead of ingesting something half-understood.
 */
import type { FixtureStatus } from '../core/types.ts';
import { arr, buildUrl, int, num, obj, ProviderError, str, type FetchLike, type RequestMeter } from './http.ts';

export const API_FOOTBALL = 'api-football';
const BASE = 'https://v3.football.api-sports.io';
const MEDIA = 'https://media.api-sports.io/football';

export interface ApiFootballClient {
  meter: RequestMeter;
  get(path: string, params?: Record<string, string | number | undefined>): Promise<{ response: unknown[]; paging: { current: number; total: number } }>;
}

export function createApiFootball(apiKey: string, fetchImpl: FetchLike = fetch as unknown as FetchLike): ApiFootballClient {
  const meter: RequestMeter = { requests: 0, remaining: null };
  return {
    meter,
    async get(path, params = {}) {
      if (!apiKey) throw new ProviderError(API_FOOTBALL, 'API_FOOTBALL_KEY is not configured');
      meter.requests++;
      let res;
      try {
        res = await fetchImpl(buildUrl(BASE, path, params), { headers: { 'x-apisports-key': apiKey } });
      } catch (e) {
        throw new ProviderError(API_FOOTBALL, `network error on ${path}: ${(e as Error).message}`, undefined, true);
      }
      const remaining = int(res.headers.get('x-ratelimit-requests-remaining'));
      if (remaining !== null) meter.remaining = remaining;
      if (!res.ok) {
        throw new ProviderError(API_FOOTBALL, `HTTP ${res.status} on ${path}`, res.status, res.status === 429 || res.status >= 500);
      }
      const body = obj(await res.json());
      // The API answers 200 with an `errors` object for bad keys, plan limits and bad parameters.
      const errors = body.errors;
      const messages = Array.isArray(errors) ? errors : Object.values(obj(errors));
      if (messages.length) {
        const text = messages.map(String).join('; ');
        throw new ProviderError(API_FOOTBALL, `${path}: ${text}`, res.status, /rate ?limit|too many/i.test(text));
      }
      if (!Array.isArray(body.response)) throw new ProviderError(API_FOOTBALL, `${path}: unexpected response envelope`);
      const paging = obj(body.paging);
      return { response: body.response, paging: { current: int(paging.current) ?? 1, total: int(paging.total) ?? 1 } };
    },
  };
}

/* ---------------------------------------------------------------- statuses */

const STATUS: Record<string, FixtureStatus> = {
  TBD: 'scheduled', NS: 'scheduled',
  '1H': 'live', HT: 'live', '2H': 'live', ET: 'live', BT: 'live', P: 'live', LIVE: 'live', INT: 'live',
  SUSP: 'suspended',
  FT: 'finished', AET: 'finished', PEN: 'finished',
  PST: 'postponed', CANC: 'cancelled', ABD: 'abandoned', AWD: 'awarded', WO: 'awarded',
};
export const mapStatus = (short: unknown): FixtureStatus => STATUS[String(short ?? '')] ?? 'unknown';

/* ------------------------------------------------------------- normalisers */

export interface NormTeam {
  external_id: string;
  name: string;
  short_name?: string | null;
  code?: string | null;
  country?: string | null;
  logo_url?: string | null;
  venue?: string | null;
}

export interface NormFixture {
  external_id: string;
  competition_external_id: string;
  season: number | null;
  round: string | null;
  home_external_id: string;
  away_external_id: string;
  kickoff_at: string;
  venue: string | null;
  status: FixtureStatus;
  status_raw: string | null;
  elapsed: number | null;
  home_goals: number | null;
  away_goals: number | null;
  ht_home: number | null;
  ht_away: number | null;
  ft_home: number | null;
  ft_away: number | null;
  went_to_extra_time: boolean;
}

/** One item of `GET /fixtures`. Returns null when the essentials are missing. */
export function normalizeFixture(raw: unknown): { fixture: NormFixture; teams: NormTeam[] } | null {
  const r = obj(raw);
  const fx = obj(r.fixture);
  const league = obj(r.league);
  const home = obj(obj(r.teams).home);
  const away = obj(obj(r.teams).away);
  const score = obj(r.score);
  const id = str(fx.id);
  if (!id || !str(league.id) || !str(home.id) || !str(away.id) || !str(fx.date)) return null;

  const short = str(obj(fx.status).short);
  const status = mapStatus(short);
  const extra = obj(score.extratime);
  const wentToExtraTime = short === 'AET' || short === 'PEN' || short === 'ET' || short === 'P' || int(extra.home) !== null;
  const finished = status === 'finished';
  // `score.fulltime` is the regulation-time score; `goals` includes extra time.
  const full = obj(score.fulltime);
  const half = obj(score.halftime);
  return {
    fixture: {
      external_id: id,
      competition_external_id: str(league.id)!,
      season: int(league.season),
      round: str(league.round),
      home_external_id: str(home.id)!,
      away_external_id: str(away.id)!,
      kickoff_at: str(fx.date)!,
      venue: str(obj(fx.venue).name),
      status,
      status_raw: short,
      elapsed: int(obj(fx.status).elapsed),
      home_goals: int(obj(r.goals).home),
      away_goals: int(obj(r.goals).away),
      ht_home: int(half.home),
      ht_away: int(half.away),
      ft_home: finished ? int(full.home) : null,
      ft_away: finished ? int(full.away) : null,
      went_to_extra_time: wentToExtraTime,
    },
    teams: [home, away].map((t) => ({ external_id: str(t.id)!, name: str(t.name) ?? `Team ${t.id}`, logo_url: str(t.logo) })),
  };
}

/** `GET /teams?league=&season=` */
export function normalizeTeam(raw: unknown): NormTeam | null {
  const t = obj(obj(raw).team);
  const v = obj(obj(raw).venue);
  if (!str(t.id) || !str(t.name)) return null;
  return { external_id: str(t.id)!, name: str(t.name)!, code: str(t.code), country: str(t.country), logo_url: str(t.logo), venue: str(v.name) };
}

/** `GET /standings?league=&season=` → rows of the first (overall) table. */
export function normalizeStandings(response: unknown[], leagueId: string) {
  const league = obj(obj(response[0]).league);
  const table = arr<unknown[]>(league.standings)[0] ?? [];
  const split = (x: unknown) => {
    const s = obj(x);
    return { played: int(s.played), won: int(s.win), drawn: int(s.draw), lost: int(s.lose), goals_for: int(obj(s.goals).for), goals_against: int(obj(s.goals).against) };
  };
  return arr(table)
    .map((row) => {
      const r = obj(row);
      const all = split(r.all);
      return {
        competition_external_id: leagueId,
        team_external_id: str(obj(r.team).id),
        season: int(league.season),
        position: int(r.rank),
        ...all,
        points: int(r.points),
        form: str(r.form),
        home: split(r.home),
        away: split(r.away),
      };
    })
    .filter((r) => r.team_external_id);
}

/** `GET /players/squads?team=` */
export function normalizeSquad(response: unknown[], teamId: string) {
  return arr(obj(response[0]).players)
    .map((p) => ({
      external_id: str(p.id),
      name: str(p.name),
      team_external_id: teamId,
      position: str(p.position),
      shirt_number: int(p.number),
      photo_url: str(p.photo) ?? (p.id ? `${MEDIA}/players/${p.id}.png` : null),
    }))
    .filter((p) => p.external_id && p.name);
}

/** `GET /players?league=&season=&page=` → profile details and season totals. */
export function normalizeSeasonPlayers(response: unknown[], leagueId: string, season: number) {
  const players: Record<string, unknown>[] = [];
  const stats: Record<string, unknown>[] = [];
  for (const raw of response) {
    const p = obj(obj(raw).player);
    const id = str(p.id);
    if (!id || !str(p.name)) continue;
    const full = [str(p.firstname), str(p.lastname)].filter(Boolean).join(' ');
    const rows = arr(obj(raw).statistics).filter((s) => str(obj(s.league).id) === leagueId);
    const last = rows[rows.length - 1];
    players.push({
      external_id: id,
      name: str(p.name),
      full_name: full || null,
      nationality: str(p.nationality),
      photo_url: str(p.photo),
      team_external_id: last ? str(obj(last.team).id) : undefined,
      position: last ? str(obj(last.games).position) : undefined,
    });
    if (!rows.length) continue;
    const sum = (pick: (s: Record<string, any>) => unknown) => rows.reduce((t, s) => t + (int(pick(s)) ?? 0), 0);
    stats.push({
      player_external_id: id,
      competition_external_id: leagueId,
      season,
      appearances: sum((s) => obj(s.games).appearences),
      starts: sum((s) => obj(s.games).lineups),
      minutes: sum((s) => obj(s.games).minutes),
      goals: sum((s) => obj(s.goals).total),
      assists: sum((s) => obj(s.goals).assists),
      yellow_cards: sum((s) => obj(s.cards).yellow),
      red_cards: sum((s) => obj(s.cards).red) + sum((s) => obj(s.cards).yellowred),
      shots: sum((s) => obj(s.shots).total),
      shots_on_target: sum((s) => obj(s.shots).on),
    });
  }
  return { players, stats };
}

export type EventKind = 'goal' | 'own_goal' | 'penalty_goal' | 'missed_penalty' | 'yellow' | 'second_yellow' | 'red' | 'substitution' | 'var' | 'other';

function eventKind(type: string, detail: string): EventKind {
  const t = type.toLowerCase();
  const d = detail.toLowerCase();
  if (t === 'goal') {
    if (d.includes('missed')) return 'missed_penalty';
    if (d.includes('own')) return 'own_goal';
    if (d.includes('penalty')) return 'penalty_goal';
    return 'goal';
  }
  if (t === 'card') {
    if (d.includes('second')) return 'second_yellow';
    if (d.includes('red')) return 'red';
    return 'yellow';
  }
  if (t === 'subst') return 'substitution';
  if (t === 'var') return 'var';
  return 'other';
}

/**
 * `GET /fixtures/events?fixture=`.
 * `teamOfPlayer` (from lineups / player statistics) pins every event to the
 * player's own team. That matters for own goals, which the database credits
 * to the opposite side, whatever convention the feed uses for its `team` field.
 */
export function normalizeEvents(response: unknown[], teamOfPlayer: Record<string, string> = {}) {
  return response.map((raw, i) => {
    const e = obj(raw);
    const time = obj(e.time);
    const minute = int(time.elapsed);
    const comments = (str(e.comments) ?? '').toLowerCase();
    const playerId = str(obj(e.player).id);
    return {
      seq: i + 1,
      minute,
      extra_minute: int(time.extra),
      period: comments.includes('shootout') ? 'shootout' : minute !== null && minute > 90 ? 'extra' : 'regular',
      team_external_id: (playerId && teamOfPlayer[playerId]) || str(obj(e.team).id),
      player_external_id: playerId,
      related_player_external_id: str(obj(e.assist).id),
      kind: eventKind(str(e.type) ?? '', str(e.detail) ?? ''),
      detail: [str(e.detail), str(e.comments)].filter(Boolean).join(' · ') || null,
      player_name: str(obj(e.player).name),
      related_player_name: str(obj(e.assist).name),
    };
  });
}

/** `GET /fixtures/lineups?fixture=` */
export function normalizeLineups(response: unknown[]) {
  const out: Record<string, unknown>[] = [];
  for (const raw of response) {
    const t = obj(raw);
    const teamId = str(obj(t.team).id);
    if (!teamId) continue;
    const push = (list: unknown, starter: boolean) => {
      for (const item of arr(list)) {
        const p = obj(item.player);
        if (!str(p.id)) continue;
        out.push({
          team_external_id: teamId,
          player_external_id: str(p.id),
          player_name: str(p.name),
          is_starter: starter,
          position: str(p.pos),
          shirt_number: int(p.number),
          formation: str(t.formation),
        });
      }
    };
    push(t.startXI, true);
    push(t.substitutes, false);
  }
  return out;
}

/** `GET /fixtures/players?fixture=` → one row per player who was in the squad. */
export function normalizePlayerStats(response: unknown[]) {
  const out: Record<string, unknown>[] = [];
  for (const raw of response) {
    const teamId = str(obj(obj(raw).team).id);
    if (!teamId) continue;
    for (const item of arr(obj(raw).players)) {
      const p = obj(item.player);
      const s = obj(arr(item.statistics)[0]);
      if (!str(p.id)) continue;
      const games = obj(s.games);
      const cards = obj(s.cards);
      out.push({
        team_external_id: teamId,
        player_external_id: str(p.id),
        player_name: str(p.name),
        minutes: int(games.minutes),
        started: games.substitute === false,
        goals: int(obj(s.goals).total),
        assists: int(obj(s.goals).assists),
        saves: int(obj(s.goals).saves),
        shots: int(obj(s.shots).total),
        shots_on_target: int(obj(s.shots).on),
        yellow_cards: int(cards.yellow),
        red_cards: int(cards.red),
        fouls_committed: int(obj(s.fouls).committed),
        tackles: int(obj(s.tackles).total),
        rating: num(games.rating),
      });
    }
  }
  return out;
}

const TEAM_STAT: Record<string, string> = {
  'ball possession': 'possession',
  'total shots': 'shots',
  'shots on goal': 'shots_on_target',
  'corner kicks': 'corners',
  fouls: 'fouls',
  'yellow cards': 'yellow_cards',
  'red cards': 'red_cards',
  offsides: 'offsides',
};

/** `GET /fixtures/statistics?fixture=` */
export function normalizeTeamStats(response: unknown[]) {
  return response
    .map((raw) => {
      const row: Record<string, unknown> = { team_external_id: str(obj(obj(raw).team).id), raw: {} };
      for (const s of arr(obj(raw).statistics)) {
        const type = str(s.type);
        if (!type) continue;
        (row.raw as Record<string, unknown>)[type] = s.value ?? null;
        const field = TEAM_STAT[type.toLowerCase()];
        if (field) row[field] = field === 'possession' ? num(String(s.value ?? '').replace('%', '')) : int(s.value);
      }
      return row;
    })
    .filter((r) => r.team_external_id);
}

/** `GET /injuries?fixture=` */
export function normalizeInjuries(response: unknown[]) {
  return response
    .map((raw) => {
      const p = obj(obj(raw).player);
      return {
        player_external_id: str(p.id),
        player_name: str(p.name),
        team_external_id: str(obj(obj(raw).team).id),
        fixture_external_id: str(obj(obj(raw).fixture).id),
        kind: str(p.type),
        reason: str(p.reason),
      };
    })
    .filter((r) => r.player_external_id);
}

export const teamLogo = (externalId: string) => `${MEDIA}/teams/${externalId}.png`;
