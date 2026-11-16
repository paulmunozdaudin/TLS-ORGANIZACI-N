import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { commitmentProgress } from '@/domain/commitments';
import {
  ACTIVITY_LABEL,
  commitmentTitle,
  formatGoalValue,
  formatMoney,
  formatMoneyFull,
  formatProgress,
  formatTimeLeft,
} from '@/domain/format';
import type { Activity, Commitment, CommitmentStatus } from '@/domain/types';
import { colors, space } from '@/theme/tokens';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { ProgressBar } from '../ui/Progress';
import { T } from '../ui/T';
import { ACTIVITY_ICON, StatusPill } from './common';

interface Props {
  commitment: Commitment;
  activities: Activity[];
  now: number;
}

const MONEY_WORD: Record<CommitmentStatus, string> = {
  active: 'comprometidos',
  pending_verification: 'retenidos',
  completed: 'devueltos',
  failed: 'perdidos',
};

export function CommitmentCard({ commitment: c, activities, now }: Props) {
  const p = commitmentProgress(c, activities);
  const open = c.status === 'active' || c.status === 'pending_verification';
  const accent = c.status === 'failed' ? colors.danger : colors.lime;

  return (
    <Card
      accessibilityLabel={`${commitmentTitle(c)}, ${formatMoney(c.stakeCents)} ${MONEY_WORD[c.status]}`}
      onPress={() => router.push({ pathname: '/commitment/[id]', params: { id: c.id } })}
      style={styles.card}
    >
      <View style={styles.top}>
        <Icon name={ACTIVITY_ICON[c.activityType]} size={24} color={accent} />
        <T style={styles.type}>{ACTIVITY_LABEL[c.activityType]}</T>
        <StatusPill status={c.status} />
      </View>
      <View>
        <T variant="statLg">{formatGoalValue(c.metric, c.target).toUpperCase()}</T>
        <T style={styles.money}>
          {formatMoneyFull(c.stakeCents)} {MONEY_WORD[c.status]}
          {open ? ` · quedan ${formatTimeLeft(c.deadline - now).toLowerCase()}` : ''}
        </T>
      </View>
      <View style={styles.progress}>
        <View style={styles.flex}>
          <ProgressBar ratio={p.ratio} pendingRatio={p.pendingValue / c.target} color={accent} height={10} />
        </View>
        <T style={styles.progressText}>{formatProgress(c.metric, p.value, c.target)}</T>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: space.md },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  type: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.textMuted },
  money: { fontSize: 14, color: colors.text, marginTop: 2 },
  progress: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  progressText: { fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
