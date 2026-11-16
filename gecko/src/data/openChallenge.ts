import { router } from 'expo-router';

import type { ChallengeTemplate } from './community';

/** Abre el asistente de compromiso con los valores del reto precargados. */
export function openChallenge(c: ChallengeTemplate) {
  router.push({
    pathname: '/commitment/new',
    params: {
      type: c.activityType,
      metric: c.metric,
      target: String(c.target),
      stake: String(c.stakeCents),
      hours: String(c.hours),
    },
  });
}
