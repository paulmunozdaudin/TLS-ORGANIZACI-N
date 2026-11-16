import type { Activity, Commitment, CommitmentProgress, CommitmentStatus } from './types';

/** Una sesión cuenta para objetivos de "N entrenamientos" si dura al menos 10 minutos. */
export const MIN_SESSION_SEC = 10 * 60;

export const STAKE_LIMITS = { minCents: 100, maxCents: 10_000 };

function contribution(c: Commitment, a: Activity): number {
  switch (c.metric) {
    case 'distance':
      return a.verification.verifiedDistanceM;
    case 'steps':
      return a.steps ?? 0;
    case 'sessions':
      return a.movingTimeSec >= MIN_SESSION_SEC ? 1 : 0;
  }
}

/** Actividades que computan para un compromiso: mismo tipo y dentro de su ventana temporal. */
export function activitiesFor(c: Commitment, activities: Activity[]): Activity[] {
  return activities.filter(
    (a) => a.type === c.activityType && a.startedAt >= c.createdAt && a.endedAt <= c.deadline,
  );
}

export function commitmentProgress(c: Commitment, activities: Activity[]): CommitmentProgress {
  let value = 0;
  let pendingValue = 0;
  for (const a of activitiesFor(c, activities)) {
    if (a.verification.status === 'verified') value += contribution(c, a);
    else if (a.verification.status === 'suspicious') pendingValue += contribution(c, a);
  }
  return { value, pendingValue, ratio: Math.min(1, value / c.target) };
}

/**
 * Estado que le corresponde a un compromiso en el instante `now`.
 * - Cumplido con actividades verificadas → completed.
 * - Solo se alcanzaría contando actividades sospechosas → pending_verification
 *   (el dinero sigue retenido hasta la revisión; nunca se penaliza ni se libera a ciegas).
 * - Vencido sin alcanzarlo → failed.
 */
export function resolveStatus(c: Commitment, activities: Activity[], now: number): CommitmentStatus {
  if (c.status === 'completed' || c.status === 'failed') return c.status;
  const p = commitmentProgress(c, activities);
  if (p.value >= c.target) return 'completed';
  if (p.value + p.pendingValue >= c.target) return 'pending_verification';
  if (now >= c.deadline) return 'failed';
  return 'active';
}
