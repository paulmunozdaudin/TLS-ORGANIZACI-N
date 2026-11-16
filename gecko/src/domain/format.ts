import type { ActivityType, Commitment, GoalMetric } from './types';

const nf = (digits: number) =>
  new Intl.NumberFormat('es-ES', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const nf0 = nf(0);
const nf1 = nf(1);
const nf2 = nf(2);
const nfGoal = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 });

export const formatInt = (n: number) => nf0.format(Math.round(n));

/** Kilómetros con dos decimales, truncados (como Strava: nunca se redondea hacia arriba un objetivo). */
export function formatKm(meters: number, digits: 1 | 2 = 2): string {
  const f = 10 ** digits;
  const km = Math.floor((meters / 1000) * f + 1e-9) / f;
  return (digits === 2 ? nf2 : nf1).format(km);
}

export function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Ritmo en min/km. Devuelve "–:––" si no hay datos suficientes o el valor no es razonable. */
export function formatPace(distanceM: number, timeSec: number): string {
  if (distanceM < 5 || timeSec <= 0) return '–:––';
  const secPerKm = timeSec / (distanceM / 1000);
  if (secPerKm > 3600) return '–:––';
  const m = Math.floor(secPerKm / 60);
  const s = Math.floor(secPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatSpeedKmh(distanceM: number, timeSec: number): string {
  if (timeSec <= 0) return '0,0';
  return nf1.format((distanceM / timeSec) * 3.6);
}

export function formatMoney(cents: number): string {
  return `${cents % 100 === 0 ? nf0.format(cents / 100) : nf2.format(cents / 100)} €`;
}

export function formatTimeLeft(ms: number): string {
  if (ms <= 0) return 'Finalizado';
  const min = Math.floor(ms / 60_000);
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  if (d > 0) return `${d} d ${h} h`;
  if (h > 0) return `${h} h ${m} min`;
  if (m > 0) return `${m} min`;
  return 'Menos de 1 min';
}

export function formatDeadline(ts: number, now: number): string {
  const d = new Date(ts);
  const time = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const startOfDay = (t: number) => new Date(t).setHours(0, 0, 0, 0);
  const diffDays = Math.round((startOfDay(ts) - startOfDay(now)) / 86_400_000);
  if (diffDays === 0) return `Hoy, ${time}`;
  if (diffDays === 1) return `Mañana, ${time}`;
  if (diffDays === -1) return `Ayer, ${time}`;
  return `${d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}, ${time}`;
}

export function formatRelative(ts: number, now: number): string {
  const min = Math.floor((now - ts) / 60_000);
  if (min < 1) return 'Ahora';
  if (min < 60) return `Hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Ayer';
  if (d < 7) return `Hace ${d} días`;
  return new Date(ts).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export const ACTIVITY_LABEL: Record<ActivityType, string> = {
  run: 'Running',
  walk: 'Walking',
  ride: 'Cycling',
};

export const ACTIVITY_VERB: Record<ActivityType, string> = {
  run: 'Correr',
  walk: 'Caminar',
  ride: 'Pedalear',
};

export function formatGoalValue(metric: GoalMetric, value: number): string {
  switch (metric) {
    case 'distance':
      return `${nfGoal.format(Math.floor(value / 10 + 1e-9) / 100)} km`;
    case 'steps':
      return `${formatInt(value)} pasos`;
    case 'sessions':
      return `${formatInt(value)} ${value === 1 ? 'entreno' : 'entrenos'}`;
  }
}

export function commitmentTitle(c: Pick<Commitment, 'activityType' | 'metric' | 'target'>): string {
  if (c.metric === 'sessions') return `${formatGoalValue('sessions', c.target)} de ${ACTIVITY_LABEL[c.activityType].toLowerCase()}`;
  return `${ACTIVITY_VERB[c.activityType]} ${formatGoalValue(c.metric, c.target)}`;
}
