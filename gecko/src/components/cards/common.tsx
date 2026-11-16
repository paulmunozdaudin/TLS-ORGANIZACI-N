import { Pressable, StyleSheet, View } from 'react-native';

import type { ActivityType, CommitmentStatus, VerificationStatus } from '@/domain/types';
import { colors, radius, space } from '@/theme/tokens';
import { Icon, type IconName } from '../ui/Icon';
import { T } from '../ui/T';

export const ACTIVITY_ICON: Record<ActivityType, IconName> = { run: 'run', walk: 'walk', ride: 'ride' };

export function ActivityBadge({ type, size = 44, active }: { type: ActivityType; size?: number; active?: boolean }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: active ? colors.lime : colors.limeSoft,
      }}
    >
      <Icon name={ACTIVITY_ICON[type]} size={size * 0.5} color={active ? colors.onLime : colors.lime} />
    </View>
  );
}

const STATUS: Record<CommitmentStatus, { label: string; fg: string; bg: string }> = {
  active: { label: 'En curso', fg: colors.lime, bg: colors.limeSoft },
  completed: { label: 'Cumplido', fg: colors.onLime, bg: colors.lime },
  failed: { label: 'Fallido', fg: colors.danger, bg: colors.dangerSoft },
  pending_verification: { label: 'En verificación', fg: colors.warning, bg: colors.warningSoft },
};

export function StatusPill({ status }: { status: CommitmentStatus }) {
  const s = STATUS[status];
  return (
    <View style={[styles.pill, { backgroundColor: s.bg }]}>
      <T style={[styles.pillText, { color: s.fg }]}>{s.label}</T>
    </View>
  );
}

const VERIFICATION: Record<VerificationStatus, { label: string; color: string; icon: IconName }> = {
  verified: { label: 'Verificada', color: colors.lime, icon: 'shield' },
  suspicious: { label: 'En revisión', color: colors.warning, icon: 'alert' },
  rejected: { label: 'No válida', color: colors.danger, icon: 'x' },
};

export function VerificationTag({ status }: { status: VerificationStatus }) {
  const v = VERIFICATION[status];
  return (
    <View style={styles.tag}>
      <Icon name={v.icon} size={14} color={v.color} strokeWidth={2.4} />
      <T style={[styles.tagText, { color: v.color }]}>{v.label}</T>
    </View>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.section}>
      <T variant="heading">{title}</T>
      {action && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={12}>
          <T style={styles.sectionAction}>{action}</T>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Stat({ label, value, unit, align = 'left' }: { label: string; value: string; unit?: string; align?: 'left' | 'center' }) {
  return (
    <View style={{ flex: 1, alignItems: align === 'center' ? 'center' : 'flex-start', gap: 2 }}>
      <View style={styles.statRow}>
        <T variant="stat">{value}</T>
        {unit ? <T style={styles.unit}>{unit}</T> : null}
      </View>
      <T variant="label">{label}</T>
    </View>
  );
}

export function Segmented<K extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: K; label: string }[];
  value: K;
  onChange: (key: K) => void;
}) {
  return (
    <View style={styles.segmented} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.key)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <T style={[styles.segmentText, active && { color: colors.onLime }]}>{o.label}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Avatar({ name, color = colors.lime, size = 40 }: { name: string; color?: string; size?: number }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <T style={{ color: colors.onLime, fontWeight: '900', fontSize: size * 0.38 }}>{initials}</T>
    </View>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.empty}>
      <T variant="heading" center>{title}</T>
      <T variant="caption" center>{body}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill },
  pillText: { fontSize: 12, fontWeight: '700' },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tagText: { fontSize: 12, fontWeight: '700' },
  section: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionAction: { color: colors.lime, fontSize: 13, fontWeight: '700' },
  statRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  unit: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segment: { flex: 1, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  segmentActive: { backgroundColor: colors.lime },
  segmentText: { fontSize: 13, fontWeight: '800', color: colors.textMuted },
  empty: {
    padding: space.xxl,
    gap: space.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
});
