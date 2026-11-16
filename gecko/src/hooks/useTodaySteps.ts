import { Pedometer } from 'expo-sensors';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { dayKey } from '@/domain/gamification';
import { useAppStore } from '@/store/useAppStore';

/**
 * Pasos de hoy.
 * - iOS: historial del podómetro del sistema (Core Motion) para todo el día.
 * - Android / web: Expo Go no da acceso al histórico, así que se muestran los pasos
 *   registrados durante las actividades. El histórico completo llegará con Health
 *   Connect en el development build (Fase 5).
 */
export function useTodaySteps(now: number): { steps: number; source: 'device' | 'activities' } {
  const activities = useAppStore((s) => s.activities);
  const [deviceSteps, setDeviceSteps] = useState<number | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let cancelled = false;
    (async () => {
      try {
        if (!(await Pedometer.isAvailableAsync())) return;
        const perm = await Pedometer.getPermissionsAsync();
        if (!perm.granted && !perm.canAskAgain) return;
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        const result = await Pedometer.getStepCountAsync(start, new Date(now));
        if (!cancelled) setDeviceSteps(result.steps);
      } catch {
        // sin acceso al podómetro: se usa el recuento de actividades
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [now]);

  if (deviceSteps != null) return { steps: deviceSteps, source: 'device' };
  const today = dayKey(now);
  const fromActivities = activities
    .filter((a) => dayKey(a.startedAt) === today)
    .reduce((sum, a) => sum + (a.steps ?? 0), 0);
  return { steps: fromActivities, source: 'activities' };
}
