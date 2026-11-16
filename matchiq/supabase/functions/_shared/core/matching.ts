/**
 * Cross-provider identity matching. The fixtures provider and the odds
 * provider do not share ids, so events are joined on kick-off time plus team
 * names, and player props on player names inside the two squads.
 *
 * The rule throughout: an uncertain match is no match. Unmatched odds are
 * dropped and counted in the sync log; they are never attached to a guess.
 */

const NOISE = new Set([
  'fc', 'cf', 'afc', 'sc', 'ac', 'as', 'ss', 'ssc', 'cd', 'ud', 'rc', 'rcd', 'sd', 'ca', 'club', 'de', 'del', 'la', 'the',
  'fk', 'sk', 'bk', 'if', 'sv', 'vfb', 'vfl', 'tsg', 'fsv', 'bsc', 'calcio', 'futbol', 'football', 'balompie',
]);

/** Lowercase, strip accents and punctuation, collapse whitespace. */
export function normalizeText(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/ø/g, 'o')
    .replace(/ß/g, 'ss')
    .replace(/æ/g, 'ae')
    .replace(/đ/g, 'd')
    .replace(/ł/g, 'l')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Team name reduced to its distinctive tokens: "FC Bayern München" → "bayern munchen". */
export function normalizeTeam(raw: string): string {
  const tokens = normalizeText(raw).split(' ').filter(Boolean);
  const kept = tokens.filter((t) => !NOISE.has(t) && !/^\d{2,4}$/.test(t));
  return (kept.length ? kept : tokens).join(' ');
}

function tokenSimilarity(a: string, b: string): number {
  const ta = new Set(a.split(' '));
  const tb = new Set(b.split(' '));
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return shared / Math.max(ta.size, tb.size);
}

/** 1 for identical normalised names, otherwise token overlap or containment. */
export function teamSimilarity(a: string, b: string): number {
  const x = normalizeTeam(a);
  const y = normalizeTeam(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.length >= 4 && y.length >= 4 && (x.includes(y) || y.includes(x))) return 0.9;
  return tokenSimilarity(x, y);
}

export interface FixtureCandidate {
  id: string;
  kickoffAt: number;
  /** Official name plus any stored aliases. */
  homeNames: string[];
  awayNames: string[];
}

export interface ProviderEvent {
  home: string;
  away: string;
  commenceAt: number;
}

export const MATCH_THRESHOLD = 0.6;
const best = (name: string, names: string[]) => Math.max(0, ...names.map((n) => teamSimilarity(name, n)));

/**
 * Finds the fixture an odds event refers to. Both teams must clear the
 * threshold inside the kick-off window, and the winner must be unambiguous.
 */
export function matchEvent(
  event: ProviderEvent,
  fixtures: FixtureCandidate[],
  toleranceMs = 3 * 3_600_000
): { id: string; score: number } | null {
  const scored = fixtures
    .filter((f) => Math.abs(f.kickoffAt - event.commenceAt) <= toleranceMs)
    .map((f) => {
      const h = best(event.home, f.homeNames);
      const a = best(event.away, f.awayNames);
      return { id: f.id, score: Math.min(h, a) };
    })
    .filter((x) => x.score >= MATCH_THRESHOLD)
    .sort((x, y) => y.score - x.score);
  if (!scored.length) return null;
  if (scored.length > 1 && scored[1].score === scored[0].score) return null;
  return scored[0];
}

export interface SquadPlayer {
  id: string;
  /** Display name plus any full-name variants the provider gives. */
  names: string[];
}

const initialAndSurname = (n: string) => {
  const t = normalizeText(n).split(' ').filter(Boolean);
  return t.length >= 2 ? `${t[0][0]} ${t[t.length - 1]}` : null;
};
const surname = (n: string) => normalizeText(n).split(' ').filter(Boolean).pop() ?? '';

/**
 * Resolves a bookmaker's player name to one squad member.
 * Tries, in order: exact full name, first initial + surname ("K. Mbappé"),
 * unique surname. Any tie at a level returns null.
 */
export function matchPlayer(name: string, squad: SquadPlayer[]): string | null {
  const target = normalizeText(name);
  if (!target) return null;
  const unique = (ids: string[]) => {
    const set = [...new Set(ids)];
    return set.length === 1 ? set[0] : null;
  };

  const exact = squad.filter((p) => p.names.some((n) => normalizeText(n) === target)).map((p) => p.id);
  if (exact.length) return unique(exact);

  const key = initialAndSurname(name);
  if (key) {
    const hits = squad.filter((p) => p.names.some((n) => initialAndSurname(n) === key)).map((p) => p.id);
    if (hits.length) return unique(hits);
  }

  const last = surname(name);
  if (last.length >= 3) {
    const hits = squad.filter((p) => p.names.some((n) => surname(n) === last)).map((p) => p.id);
    if (hits.length) return unique(hits);
    // Single-name players ("Vinicius Junior" quoted as "Vinicius Jr", "Rodri").
    const tokens = new Set(target.split(' ').filter((t) => t.length >= 4));
    const loose = squad
      .filter((p) => p.names.some((n) => normalizeText(n).split(' ').some((t) => tokens.has(t))))
      .map((p) => p.id);
    if (loose.length) return unique(loose);
  }
  return null;
}
