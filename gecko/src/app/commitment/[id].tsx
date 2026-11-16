import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ActivityRow } from '@/components/cards/ActivityRow';
import { SectionHeader, Stat, StatusPill } from '@/components/cards/common';
import { Gecko } from '@/components/mascot/Gecko';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { ProgressRing } from '@/components/ui/Progress';
import { Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { activitiesFor, commitmentProgress } from '@/domain/commitments';
import { commitmentTitle, formatDeadline, formatGoalValue, formatMoney, formatTimeLeft } from '@/domain/format';
import type { GeckoMood } from '@/domain/gamification';
import type { CommitmentStatus } from '@/domain/types';
import { useNow } from '@/hooks/useNow';
import { useTracking } from '@/services/tracking/useTracking';
import { useAppStore } from '@/store/useAppStore';
import { colors, space } from '@/theme/tokens';

const COPY: Record<CommitmentStatus, { mood: GeckoMood; text: string }> = {
  active: { mood: 'motivated', text: 'Tu dinero está retenido. Cumple el objetivo antes de la fecha límite para recuperarlo.' },
  completed: { mood: 'happy', text: 'Objetivo cumplido y verificado. Has recuperado tu dinero.' },
  failed: { mood: 'disappointed', text: 'No se alcanzó el objetivo a tiempo. Se ha aplicado la penalización.' },
  pending_verification: {
    mood: 'neutral',
    text: 'Has llegado al objetivo, pero alguna actividad está en revisión. Tu dinero sigue retenido hasta que se verifique; la revisión manual llegará con el backend.',
  },
};

export default function CommitmentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const now = useNow(1000 * 15);
  const commitment = useAppStore((s) => s.commitments.find((c) => c.id === id));
  const activities = useAppStore((s) => s.activities);
  const recording = useTracking((s) => s.status !== 'idle');

  if (!commitment) {
    return (
      <Screen scroll={false} contentStyle={{ justifyContent: 'center', gap: space.lg }}>
        <T variant="title" center>Compromiso no encontrado</T>
        <Button label="Volver" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const c = commitment;
  const p = commitmentProgress(c, activities);
  const linked = activitiesFor(c, activities);
  const copy = COPY[c.status];
  const ringColor = c.status === 'failed' ? colors.danger : c.status === 'pending_verification' ? colors.warning : colors.lime;

  return (
    <Screen
      footer={
        c.status === 'active' ? (
          <Button
            label={recording ? 'Volver a la actividad' : 'Empezar reto'}
            icon="play"
            onPress={() =>
              router.push({ pathname: '/activity/live', params: { type: c.activityType, commitmentId: c.id } })
            }
          />
        ) : undefined
      }
    >
      <View style={styles.nav}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Atrás"
          hitSlop={12}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/commitments'))}
          style={styles.navBtn}
        >
          <Icon name="chevronLeft" size={20} />
        </Pressable>
        <StatusPill status={c.status} />
      </View>

      <T variant="display">{commitmentTitle(c)}</T>

      <View style={styles.ringWrap}>
        <ProgressRing ratio={p.ratio} size={220} stroke={14} color={ringColor}>
          <T variant="label">{c.status === 'failed' ? 'Perdido' : c.status === 'completed' ? 'Recuperado' : 'En juego'}</T>
          <T variant="statLg" color={ringColor} style={{ fontSize: 52, lineHeight: 58 }}>{formatMoney(c.stakeCents)}</T>
          <T variant="caption">{Math.floor(p.ratio * 100)} % completado</T>
        </ProgressRing>
      </View>

      <Card style={styles.row}>
        <Stat label="Progreso" value={formatGoalValue(c.metric, Math.min(p.value, c.target))} />
        <Stat label="Objetivo" value={formatGoalValue(c.metric, c.target)} />
      </Card>
      <Card style={styles.row}>
        <Stat
          label="Tiempo restante"
          value={c.status === 'active' || c.status === 'pending_verification' ? formatTimeLeft(c.deadline - now) : '—'}
        />
        <Stat label="Fecha límite" value={formatDeadline(c.deadline, now)} />
      </Card>

      <Card tone="high" style={styles.message}>
        <Gecko mood={copy.mood} size={104} animated={false} />
        <T variant="caption" style={styles.flex}>{copy.text}</T>
      </Card>

      {linked.length > 0 ? (
        <View style={{ gap: space.sm }}>
          <SectionHeader title="Actividades de este reto" />
          <Card style={{ paddingVertical: space.sm }}>
            {linked.map((a) => (
              <ActivityRow key={a.id} activity={a} now={now} />
            ))}
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  ringWrap: { alignItems: 'center' },
  row: { flexDirection: 'row', gap: space.md },
  message: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
