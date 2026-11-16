import type { Quote } from './types.ts';

/**
 * Odds aggregation. Every number here is derived from provider quotes; when
 * there are no usable quotes the answer is `null`, never a substitute price.
 *
 * Arithmetic is done on integer thousandths so results match Postgres
 * `numeric` exactly (the database is the authority when a prediction is placed).
 */

export const DEFAULT_STALE_MINUTES = 180;

export const toMilli = (decimal: number) => Math.round(decimal * 1000);

export interface PriceSummary {
  /** Highest price among fresh, unsuspended quotes. */
  best: { decimal: number; bookmakerKey: string } | null;
  /** Mean of fresh, unsuspended quotes, rounded to 2 decimals. */
  average: number | null;
  /** Bookmakers with a fresh, unsuspended quote. */
  count: number;
  /** Bookmakers quoting at all, including stale and suspended ones. */
  total: number;
  suspended: number;
  stale: number;
  /** Most recent bookmaker update among all quotes (ms epoch). */
  lastUpdate: number | null;
}

export const isFresh = (q: Quote, now: number, staleMs: number) => !q.suspended && now - q.updatedAt <= staleMs && q.decimal > 1;

export function summarize(quotes: Quote[], now: number, staleMinutes = DEFAULT_STALE_MINUTES): PriceSummary {
  const staleMs = staleMinutes * 60_000;
  const fresh = quotes.filter((q) => isFresh(q, now, staleMs));
  let best: PriceSummary['best'] = null;
  for (const q of fresh) {
    if (!best || q.decimal > best.decimal || (q.decimal === best.decimal && q.bookmakerKey < best.bookmakerKey)) {
      best = { decimal: q.decimal, bookmakerKey: q.bookmakerKey };
    }
  }
  const sum = fresh.reduce((s, q) => s + toMilli(q.decimal), 0);
  const n = fresh.length;
  return {
    best,
    // round-half-up of sum/(10n) hundredths, in integers
    average: n ? Math.floor((2 * sum + 10 * n) / (20 * n)) / 100 : null,
    count: n,
    total: quotes.length,
    suspended: quotes.filter((q) => q.suspended).length,
    stale: quotes.filter((q) => !q.suspended && now - q.updatedAt > staleMs).length,
    lastUpdate: quotes.length ? Math.max(...quotes.map((q) => q.updatedAt)) : null,
  };
}

export type ReferenceMode = { type: 'consensus' } | { type: 'best' } | { type: 'bookmaker'; bookmakerKey: string };

export interface ReferencePrice {
  decimal: number;
  mode: ReferenceMode['type'];
  /** Set when the price is one bookmaker's quote (best / bookmaker modes). */
  bookmakerKey: string | null;
  /** Number of bookmakers behind the price. */
  basis: number;
}

/**
 * The price a prediction would be locked at for a user's chosen reference.
 * Returns null when that reference has no fresh price: the selection is then
 * unavailable for that user rather than quietly priced from somewhere else.
 */
export function referencePrice(
  quotes: Quote[],
  mode: ReferenceMode,
  now: number,
  staleMinutes = DEFAULT_STALE_MINUTES
): ReferencePrice | null {
  const s = summarize(quotes, now, staleMinutes);
  if (mode.type === 'consensus') {
    return s.average != null ? { decimal: s.average, mode: 'consensus', bookmakerKey: null, basis: s.count } : null;
  }
  if (mode.type === 'best') {
    return s.best ? { decimal: s.best.decimal, mode: 'best', bookmakerKey: s.best.bookmakerKey, basis: s.count } : null;
  }
  const q = quotes.find((x) => x.bookmakerKey === mode.bookmakerKey);
  return q && isFresh(q, now, staleMinutes * 60_000)
    ? { decimal: q.decimal, mode: 'bookmaker', bookmakerKey: q.bookmakerKey, basis: 1 }
    : null;
}

/** Probability implied by a decimal price, bookmaker margin included. */
export const impliedProbability = (decimal: number) => (decimal > 1 ? 1 / decimal : 0);

/** Bookmaker margin of a complete market (sum of implied probabilities minus 1). */
export const overround = (decimals: number[]) => decimals.reduce((s, d) => s + impliedProbability(d), 0) - 1;

/**
 * Margin-free probabilities for a complete market (proportional method).
 * Only meaningful when `decimals` covers every outcome of one market.
 */
export function fairProbabilities(decimals: number[]): number[] {
  const raw = decimals.map(impliedProbability);
  const total = raw.reduce((s, p) => s + p, 0);
  return total > 0 ? raw.map((p) => p / total) : raw;
}
