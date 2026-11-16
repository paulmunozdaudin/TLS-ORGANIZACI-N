/**
 * Weekly seasons run Monday 00:00 to Sunday 23:59:59 in Europe/Madrid,
 * daylight-saving changes included. Everything is computed from the IANA
 * zone through Intl, never from a fixed UTC offset.
 */

export const APP_TIMEZONE = 'Europe/Madrid';

const partsFmt = new Map<string, Intl.DateTimeFormat>();
function zonedParts(ms: number, timeZone: string) {
  let fmt = partsFmt.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    partsFmt.set(timeZone, fmt);
  }
  const out: Record<string, number> = {};
  for (const p of fmt.formatToParts(new Date(ms))) if (p.type !== 'literal') out[p.type] = Number(p.value);
  return out as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}

/** Offset of the zone from UTC at an instant, in ms (positive east of Greenwich). */
export function zoneOffsetMs(ms: number, timeZone = APP_TIMEZONE): number {
  const p = zonedParts(ms, timeZone);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000;
}

/** UTC instant of local midnight on a calendar day in the zone. */
export function zonedMidnight(year: number, month: number, day: number, timeZone = APP_TIMEZONE): number {
  const guess = Date.UTC(year, month - 1, day);
  const first = guess - zoneOffsetMs(guess, timeZone);
  // Re-check with the offset that applies at the candidate instant (DST edges).
  return guess - zoneOffsetMs(first, timeZone);
}

export interface SeasonWindow {
  /** Monday 00:00 local, inclusive. */
  startsAt: number;
  /** The following Monday 00:00 local, exclusive. */
  endsAt: number;
}

export function seasonWindow(ms: number, timeZone = APP_TIMEZONE): SeasonWindow {
  const p = zonedParts(ms, timeZone);
  const local = new Date(Date.UTC(p.year, p.month - 1, p.day));
  const sinceMonday = (local.getUTCDay() + 6) % 7;
  const monday = new Date(local.getTime() - sinceMonday * 86_400_000);
  const next = new Date(monday.getTime() + 7 * 86_400_000);
  return {
    startsAt: zonedMidnight(monday.getUTCFullYear(), monday.getUTCMonth() + 1, monday.getUTCDate(), timeZone),
    endsAt: zonedMidnight(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate(), timeZone),
  };
}

/** Local calendar day key (YYYY-MM-DD) of an instant, for grouping fixtures by day. */
export function zonedDayKey(ms: number, timeZone = APP_TIMEZONE): string {
  const p = zonedParts(ms, timeZone);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

const display = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', { timeZone: APP_TIMEZONE, ...opts });
const timeFmt = display({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const dayFmt = display({ weekday: 'short', day: 'numeric', month: 'short' });
const stampFmt = display({ day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

/** Kick-off time in Madrid, e.g. "21:00". */
export const formatTime = (ms: number) => timeFmt.format(new Date(ms));
/** Day in Madrid, e.g. "Sat 21 Nov". */
export const formatDay = (ms: number) => dayFmt.format(new Date(ms));
/** Timestamp in Madrid, e.g. "21 Nov, 18:42". */
export const formatStamp = (ms: number) => stampFmt.format(new Date(ms));
