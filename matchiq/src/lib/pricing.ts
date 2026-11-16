import { referencePrice, summarize, type PriceSummary, type ReferenceMode } from '@core/odds.ts';

import type { Profile, QuoteRow } from './types';

export interface DisplayPrice {
  decimal: number;
  /** Where the number comes from, e.g. "Average of 4 bookmakers". */
  source: string;
  summary: PriceSummary;
}

/**
 * The price a prediction would lock at for this user, computed with the same
 * rule the server applies. Null means there is no usable price right now.
 */
export function priceFor(all: QuoteRow[], profile: Profile | null, staleMinutes: number, now = Date.now()): DisplayPrice | null {
  // The server decides which quotes are current (`fresh`); the age check here
  // only covers the time since this screen last refreshed.
  const quotes = all.map((q) => ({ ...q, suspended: !q.fresh }));
  const summary = { ...summarize(quotes, now, staleMinutes), total: all.length };
  const mode = profile?.reference_mode ?? 'consensus';
  let ref: ReferenceMode = { type: 'consensus' };
  if (mode === 'best') ref = { type: 'best' };
  if (mode === 'bookmaker') {
    const mine = quotes.find((q) => q.bookmaker_id === profile?.reference_bookmaker_id);
    if (!mine) return null;
    ref = { type: 'bookmaker', bookmakerKey: mine.bookmakerKey };
  }
  const price = referencePrice(quotes, ref, now, staleMinutes);
  if (!price) return null;
  const name = (key: string | null) => quotes.find((q) => q.bookmakerKey === key)?.bookmaker ?? key ?? '';
  const source =
    price.mode === 'consensus'
      ? `Average of ${price.basis} bookmaker${price.basis === 1 ? '' : 's'}`
      : price.mode === 'best'
        ? `Best price · ${name(price.bookmakerKey)}`
        : name(price.bookmakerKey);
  return { decimal: price.decimal, source, summary };
}

export const REFERENCE_LABEL = { consensus: 'Market average', best: 'Best available price', bookmaker: 'One bookmaker' } as const;
