import type { Activity, ActivityType, Commitment } from './types';

/* ───────────── XP y niveles ───────────── */

const XP_PER_KM: Record<ActivityType, number> = { run: 12, walk: 10, ride: 4 };
export const XP_COMMITMENT_COMPLETED = 120;
export const XP_STREAK_DAY = 15;

export function activityXp(a: Activity): number {
  if (a.verification.status !== 'verified') return 0;
  return Math.round((a.verification.verifiedDistanceM / 1000) * XP_PER_KM[a.type]);
}

/** XP acumulada necesaria para alcanzar `level` (nivel 1 = 0 XP). Curva suave: cada nivel cuesta algo más. */
export function xpForLevel(level: number): number {
  return Math.round(120 * (level - 1) ** 1.6);
}

export function levelFromXp(xp: number): { level: number; current: number; needed: number; ratio: number } {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  const base = xpForLevel(level);
  const needed = xpForLevel(level + 1) - base;
  const current = xp - base;
  return { level, current, needed, ratio: current / needed };
}

/* ───────────── Rangos Gecko (por retos completados) ───────────── */

export interface Rank {
  id: string;
  name: string;
  minCompleted: number;
}

export const RANKS: Rank[] = [
  { id: 'hatchling', name: 'Gecko Hatchling', minCompleted: 0 },
  { id: 'rookie', name: 'Gecko Rookie', minCompleted: 5 },
  { id: 'runner', name: 'Gecko Runner', minCompleted: 15 },
  { id: 'pro', name: 'Gecko Pro', minCompleted: 30 },
  { id: 'legend', name: 'Gecko Legend', minCompleted: 100 },
];

export function rankFor(completed: number): { rank: Rank; next: Rank | null } {
  let i = 0;
  while (i + 1 < RANKS.length && RANKS[i + 1].minCompleted <= completed) i++;
  return { rank: RANKS[i], next: RANKS[i + 1] ?? null };
}

/* ───────────── Rachas ───────────── */

export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const DAY_MS = 86_400_000;

/** Días consecutivos con al menos una actividad verificada. La racha sigue viva si hoy aún no se ha entrenado. */
export function computeStreak(activities: Activity[], now: number): { current: number; best: number } {
  const days = new Set(
    activities.filter((a) => a.verification.status === 'verified').map((a) => dayKey(a.startedAt)),
  );
  if (days.size === 0) return { current: 0, best: 0 };

  let current = 0;
  let cursor = days.has(dayKey(now)) ? now : now - DAY_MS;
  while (days.has(dayKey(cursor))) {
    current++;
    cursor -= DAY_MS;
  }

  const sorted = [...days].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const gap = Math.round((Date.parse(sorted[i]) - Date.parse(sorted[i - 1])) / DAY_MS);
    run = gap === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return { current, best: Math.max(best, current) };
}

/* ───────────── Estadísticas ───────────── */

export interface Stats {
  xp: number;
  level: ReturnType<typeof levelFromXp>;
  rank: Rank;
  nextRank: Rank | null;
  streak: number;
  bestStreak: number;
  totalDistanceM: number;
  totalSteps: number;
  totalActivities: number;
  totalMovingSec: number;
  completed: number;
  failed: number;
  savedCents: number;
  lostCents: number;
  longestM: number;
}

export function computeStats(activities: Activity[], commitments: Commitment[], now: number): Stats {
  const verified = activities.filter((a) => a.verification.status === 'verified');
  const completedList = commitments.filter((c) => c.status === 'completed');
  const failedList = commitments.filter((c) => c.status === 'failed');
  const streak = computeStreak(activities, now);

  const xp =
    verified.reduce((s, a) => s + activityXp(a), 0) +
    completedList.length * XP_COMMITMENT_COMPLETED +
    streak.best * XP_STREAK_DAY;

  const { rank, next } = rankFor(completedList.length);
  return {
    xp,
    level: levelFromXp(xp),
    rank,
    nextRank: next,
    streak: streak.current,
    bestStreak: streak.best,
    totalDistanceM: verified.reduce((s, a) => s + a.verification.verifiedDistanceM, 0),
    totalSteps: verified.reduce((s, a) => s + (a.steps ?? 0), 0),
    totalActivities: verified.length,
    totalMovingSec: verified.reduce((s, a) => s + a.movingTimeSec, 0),
    completed: completedList.length,
    failed: failedList.length,
    savedCents: completedList.reduce((s, c) => s + c.stakeCents, 0),
    lostCents: failedList.reduce((s, c) => s + c.stakeCents, 0),
    longestM: verified.reduce((m, a) => Math.max(m, a.verification.verifiedDistanceM), 0),
  };
}

/* ───────────── Logros ───────────── */

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: 'flame' | 'trophy' | 'target' | 'bolt' | 'pin' | 'steps' | 'check';
  /** Progreso 0–1 hacia el desbloqueo. */
  progress: (s: Stats) => number;
}

const ratio = (v: number, target: number) => Math.min(1, v / target);

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-activity', title: 'Primer paso', description: 'Registra tu primera actividad verificada', icon: 'pin', progress: (s) => ratio(s.totalActivities, 1) },
  { id: 'first-commitment', title: 'Palabra cumplida', description: 'Completa tu primer compromiso', icon: 'check', progress: (s) => ratio(s.completed, 1) },
  { id: 'rookie', title: 'Gecko Rookie', description: 'Completa 5 compromisos', icon: 'trophy', progress: (s) => ratio(s.completed, 5) },
  { id: 'runner', title: 'Gecko Runner', description: 'Completa 15 compromisos', icon: 'trophy', progress: (s) => ratio(s.completed, 15) },
  { id: 'pro', title: 'Gecko Pro', description: 'Completa 30 compromisos', icon: 'trophy', progress: (s) => ratio(s.completed, 30) },
  { id: 'legend', title: 'Gecko Legend', description: 'Completa 100 compromisos', icon: 'trophy', progress: (s) => ratio(s.completed, 100) },
  { id: 'streak-3', title: 'En racha', description: '3 días seguidos entrenando', icon: 'flame', progress: (s) => ratio(s.bestStreak, 3) },
  { id: 'streak-7', title: 'Semana perfecta', description: '7 días seguidos entrenando', icon: 'flame', progress: (s) => ratio(s.bestStreak, 7) },
  { id: 'streak-30', title: 'Imparable', description: '30 días seguidos entrenando', icon: 'flame', progress: (s) => ratio(s.bestStreak, 30) },
  { id: 'dist-10k', title: '10K', description: 'Completa 10 km en una sola actividad', icon: 'bolt', progress: (s) => ratio(s.longestM, 10_000) },
  { id: 'dist-100', title: 'Centenario', description: 'Acumula 100 km', icon: 'target', progress: (s) => ratio(s.totalDistanceM, 100_000) },
  { id: 'steps-100k', title: '100.000 pasos', description: 'Acumula 100.000 pasos registrados', icon: 'steps', progress: (s) => ratio(s.totalSteps, 100_000) },
];

/* ───────────── Estado de ánimo de la mascota ───────────── */

export type GeckoMood = 'neutral' | 'happy' | 'motivated' | 'disappointed' | 'proud';

export function geckoMood(activities: Activity[], commitments: Commitment[], now: number): GeckoMood {
  const resolved = commitments
    .filter((c) => c.resolvedAt != null)
    .sort((a, b) => (b.resolvedAt as number) - (a.resolvedAt as number));
  const last = resolved[0];
  const recent = last && now - (last.resolvedAt as number) < DAY_MS;
  if (recent && last.status === 'failed') return 'disappointed';
  if (recent && last.status === 'completed') return 'happy';
  if (computeStreak(activities, now).current >= 3) return 'proud';
  if (commitments.some((c) => c.status === 'active')) return 'motivated';
  return 'neutral';
}

/* ───────────── Calorías ───────────── */

/** Estimación de gasto por kg y km (aprox. ACSM). Orientativa: no es un dato médico. */
const KCAL_PER_KG_KM: Record<ActivityType, number> = { run: 1.036, walk: 0.75, ride: 0.32 };

export function estimateCalories(type: ActivityType, distanceM: number, weightKg: number): number {
  return Math.round((distanceM / 1000) * weightKg * KCAL_PER_KG_KM[type]);
}
