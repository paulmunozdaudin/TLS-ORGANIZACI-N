import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { commitmentProgress } from '@/domain/commitments';
import { commitmentTitle, formatGoalValue, formatMoney, formatTimeLeft } from '@/domain/format';
import type { Activity, Commitment } from '@/domain/types';
import { colors, space } from '@/theme/tokens';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { ProgressBar } from '../ui/Progress';
import { T } from '../ui/T';
import { ActivityBadge, StatusPill } from './common';

interface Props {
  commitment: Commitment;
  activities: Activity[];
  now: number;
}

export function CommitmentCard({ commitment: c, activities, now }: Props) {
  const p = commitmentProgress(c, activities);
  const open = c.status === 'active' || c.status === 'pending_verification';
  const barColor = c.status === 'failed' ? colors.danger : colors.lime;

  return (
    <Card
      accessibilityLabel={`${commitmentTitle(c)}, ${formatMoney(c.stakeCents)} comprometidos`}
      onPress={() => router.push({ pathname: '/commitment/[id]', params: { id: c.id } })}
      style={styles.card}
    >
      <View style={styles.top}>
        <ActivityBadge type={c.activityType} />
        <View style={styles.flex}>
          <T variant="heading" numberOfLines={1}>{commitmentTitle(c)}</T>
          <View style={styles.meta}>
            <Icon name="clock" size={13} color={colors.textMuted} />
            <T variant="caption">
              {open ? `Quedan ${formatTimeLeft(c.deadline - now).toLowerCase()}` : formatTimeLeft(0)}
            </T>
          </View>
        </View>
        <View style={styles.stake}>
          <T variant="stat" color={c.status === 'failed' ? colors.danger : colors.lime}>{formatMoney(c.stakeCents)}</T>
          <StatusPill status={c.status} />
        </View>
      </View>
      <ProgressBar ratio={p.ratio} pendingRatio={p.pendingValue / c.target} color={barColor} />
      <T variant="caption">
        {formatGoalValue(c.metric, Math.min(p.value, c.target))} de {formatGoalValue(c.metric, c.target)} ·{' '}
        {Math.floor(p.ratio * 100)} %
      </T>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.md },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  flex: { flex: 1, gap: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  stake: { alignItems: 'flex-end', gap: 4 },
});
