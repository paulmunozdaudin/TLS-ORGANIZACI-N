import { StyleSheet, View } from 'react-native';

import { dayKey } from '@/domain/gamification';
import type { Activity } from '@/domain/types';
import { colors } from '@/theme/tokens';
import { T } from '../ui/T';

const DAY_MS = 86_400_000;
const LETTERS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

export function lastSevenDays(activities: Activity[], now: number) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const ts = now - (6 - i) * DAY_MS;
    return { key: dayKey(ts), letter: LETTERS[new Date(ts).getDay()], distanceM: 0, isToday: i === 6 };
  });
  for (const a of activities) {
    if (a.verification.status !== 'verified') continue;
    const day = days.find((d) => d.key === dayKey(a.startedAt));
    if (day) day.distanceM += a.verification.verifiedDistanceM;
  }
  return days;
}

/** Distancia verificada de los últimos 7 días. */
export function WeekChart({ activities, now }: { activities: Activity[]; now: number }) {
  const days = lastSevenDays(activities, now);
  const max = Math.max(...days.map((d) => d.distanceM), 1);
  return (
    <View style={styles.chart}>
      {days.map((d) => (
        <View key={d.key} style={styles.col}>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.bar,
                {
                  height: `${Math.max((d.distanceM / max) * 100, d.distanceM > 0 ? 8 : 0)}%`,
                  backgroundColor: d.isToday ? colors.lime : colors.limeDeep,
                },
              ]}
            />
          </View>
          <T style={[styles.letter, d.isToday && { color: colors.text }]}>{d.letter}</T>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { flexDirection: 'row', gap: 8, height: 96 },
  col: { flex: 1, alignItems: 'center', gap: 6 },
  barTrack: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    backgroundColor: colors.surfaceHigh,
    borderRadius: 6,
    overflow: 'hidden',
  },
  bar: { width: '100%', borderRadius: 6 },
  letter: { fontSize: 11, fontWeight: '700', color: colors.textDim },
});
