import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ACTIVITY_LABEL, formatDuration, formatKm, formatPace, formatRelative, formatSpeedKmh } from '@/domain/format';
import type { Activity } from '@/domain/types';
import { colors, space } from '@/theme/tokens';
import { Icon } from '../ui/Icon';
import { T } from '../ui/T';
import { ActivityBadge, VerificationTag } from './common';

export function paceLabel(a: Pick<Activity, 'type' | 'movingTimeSec'>, distanceM: number): string {
  return a.type === 'ride'
    ? `${formatSpeedKmh(distanceM, a.movingTimeSec)} km/h`
    : `${formatPace(distanceM, a.movingTimeSec)} /km`;
}

export function ActivityRow({ activity: a, now }: { activity: Activity; now: number }) {
  const d = a.verification.verifiedDistanceM;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${ACTIVITY_LABEL[a.type]}, ${formatKm(d)} kilómetros`}
      onPress={() => router.push({ pathname: '/activity/[id]', params: { id: a.id } })}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
    >
      <ActivityBadge type={a.type} size={40} />
      <View style={styles.flex}>
        <T variant="heading">{ACTIVITY_LABEL[a.type]} · {formatKm(d)} km</T>
        <T variant="caption">
          {formatDuration(a.movingTimeSec)} · {paceLabel(a, d)} · {formatRelative(a.startedAt, now)}
        </T>
      </View>
      {a.verification.status !== 'verified' ? <VerificationTag status={a.verification.status} /> : null}
      <Icon name="chevronRight" size={18} color={colors.textDim} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  flex: { flex: 1, gap: 2 },
});
