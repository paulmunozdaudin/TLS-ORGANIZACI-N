import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ACTIVITY_ICON } from '@/components/cards/common';
import { RouteMap } from '@/components/map/RouteMap';
import { Button, tap } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ProgressBar } from '@/components/ui/Progress';
import { T } from '@/components/ui/T';
import { commitmentProgress, MIN_SESSION_SEC } from '@/domain/commitments';
import {
  ACTIVITY_LABEL,
  formatDuration,
  formatGoalValue,
  formatInt,
  formatKm,
  formatMoneyFull,
  formatPace,
  formatProgress,
  formatSpeedKmh,
} from '@/domain/format';
import { estimateCalories } from '@/domain/gamification';
import type { ActivityType } from '@/domain/types';
import { useNow } from '@/hooks/useNow';
import { movingSeconds, recentSpeed, useTracking } from '@/services/tracking/useTracking';
import { useAppStore } from '@/store/useAppStore';
import { colors, radius, space } from '@/theme/tokens';

const isType = (v: unknown): v is ActivityType => v === 'run' || v === 'walk' || v === 'ride';

function Metric({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <View style={styles.metric}>
      <View style={styles.metricValue}>
        <T variant="stat">{value}</T>
        {unit ? <T style={styles.metricUnit}>{unit}</T> : null}
      </View>
      <T variant="caption">{label}</T>
    </View>
  );
}

export default function Live() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ type?: string; commitmentId?: string }>();
  const now = useNow(1000);
  const t = useTracking();
  const [saving, setSaving] = useState(false);
  // Finalizar pide confirmación: un toque accidental no debe cerrar una actividad con dinero en juego.
  const [confirming, setConfirming] = useState(false);

  const saveActivity = useAppStore((s) => s.saveActivity);
  const activities = useAppStore((s) => s.activities);
  const weightKg = useAppStore((s) => s.user?.weightKg ?? 70);
  const commitment = useAppStore((s) => s.commitments.find((c) => c.id === t.commitmentId));

  // Pantalla siempre encendida mientras se graba (en web el wake lock no es fiable: se omite).
  useEffect(() => {
    if (Platform.OS === 'web') return;
    activateKeepAwakeAsync('gecko-live').catch(() => {});
    return () => {
      deactivateKeepAwake('gecko-live').catch(() => {});
    };
  }, []);

  useEffect(() => {
    const s = useTracking.getState();
    if (s.status === 'idle' && !s.error) {
      void s.start(isType(params.type) ? params.type : 'run', params.commitmentId || null);
    }
    // Solo al montar: si ya hay una grabación en curso, la pantalla se engancha a ella.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (t.status === 'idle') {
    return (
      <View style={[styles.root, styles.centered, { padding: space.xxl }]}>
        {t.error ? (
          <>
            <Icon name="alert" size={40} color={colors.warning} />
            <T variant="title" center>Sin acceso al GPS</T>
            <T variant="caption" center>{t.error}</T>
            <Button
              label="Volver"
              variant="secondary"
              onPress={() => {
                useTracking.setState({ error: null });
                router.back();
              }}
              style={styles.stretch}
            />
          </>
        ) : (
          <T variant="caption">{saving ? 'Verificando actividad…' : 'Preparando GPS…'}</T>
        )}
      </View>
    );
  }

  const seconds = movingSeconds(t, now);
  const speed = recentSpeed(t.points, t.seg, now);
  const isRide = t.type === 'ride';
  const current =
    t.status === 'paused' || speed == null || speed < 0.3
      ? isRide ? '0,0' : '–:––'
      : isRide ? formatSpeedKmh(speed * 60, 60) : formatPace(speed * 60, 60);
  const average = isRide ? formatSpeedKmh(t.distanceM, seconds) : formatPace(t.distanceM, seconds);

  // Progreso respecto al objetivo: lo ya verificado del reto + lo que llevamos en esta sesión.
  let goal: { label: string; ratio: number } | null = null;
  if (commitment) {
    const done = commitmentProgress(commitment, activities).value;
    const live =
      commitment.metric === 'distance' ? t.distanceM : commitment.metric === 'steps' ? t.steps ?? 0 : seconds >= MIN_SESSION_SEC ? 1 : 0;
    const total = done + live;
    goal = {
      label: formatProgress(commitment.metric, total, commitment.target),
      ratio: total / commitment.target,
    };
  }

  const finish = async () => {
    setSaving(true);
    const draft = t.finish();
    const activity = await saveActivity(draft);
    router.replace({ pathname: '/activity/[id]', params: { id: activity.id, fresh: '1' } });
  };

  const gpsWeak = t.gpsAccuracy != null && t.gpsAccuracy > 25;
  const gpsColor = !t.hasFix || gpsWeak ? colors.warning : colors.lime;

  return (
    <View style={styles.root}>
      <View style={styles.map}>
        <RouteMap points={t.points} live />
        <View style={[styles.topBar, { top: insets.top + space.sm }]} pointerEvents="none">
          <View style={styles.titleRow}>
            <Icon name={ACTIVITY_ICON[t.type]} size={22} color={colors.lime} />
            <T variant="heading">{ACTIVITY_LABEL[t.type]}</T>
          </View>
          {commitment ? (
            <View style={styles.stakePill}>
              <T style={styles.stakeText}>
                {formatGoalValue(commitment.metric, commitment.target).toUpperCase()} · {formatMoneyFull(commitment.stakeCents)} comprometidos
              </T>
            </View>
          ) : null}
        </View>
        <View style={[styles.gps, { top: insets.top + space.sm }]}>
          <View style={[styles.dot, { backgroundColor: gpsColor }]} />
          <T style={styles.gpsText}>{!t.hasFix ? 'Buscando GPS…' : gpsWeak ? 'GPS débil' : 'GPS'}</T>
        </View>
      </View>

      <View style={[styles.panel, { paddingBottom: insets.bottom + space.lg }]}>
        <View style={styles.heroRow} accessible accessibilityLabel={`${formatKm(t.distanceM)} kilómetros`}>
          <T variant="hero">{formatKm(t.distanceM)}</T>
          <T style={styles.heroUnit}>KM</T>
        </View>
        {t.status === 'paused' ? <T variant="label" color={colors.warning} center>En pausa</T> : null}

        <View style={styles.statsCard}>
          <View style={styles.metrics}>
            <Metric label="Tiempo" value={formatDuration(seconds)} />
            <View style={styles.divider} />
            <Metric label={isRide ? 'Km/h actual' : 'Ritmo actual'} value={current} unit={isRide ? undefined : '/KM'} />
            <View style={styles.divider} />
            <Metric label={isRide ? 'Km/h media' : 'Ritmo medio'} value={average} unit={isRide ? undefined : '/KM'} />
          </View>
          <View style={styles.subMetrics}>
            <T variant="caption">{formatInt(estimateCalories(t.type, t.distanceM, weightKg))} kcal</T>
            <T variant="caption">{t.steps != null ? `${formatInt(t.steps)} pasos` : 'Sin podómetro'}</T>
            <T variant="caption">{t.gpsAccuracy != null ? `GPS ±${Math.round(t.gpsAccuracy)} m` : 'GPS —'}</T>
          </View>
        </View>

        {commitment && goal ? (
          <View style={styles.goal}>
            <View style={styles.goalRow}>
              <T style={styles.goalLabel}>Progreso del reto</T>
              <T style={styles.goalLabel}>{goal.label}</T>
            </View>
            <ProgressBar ratio={goal.ratio} height={12} />
          </View>
        ) : null}

        {confirming ? (
          <View style={styles.controls}>
            <Button label="Seguir" variant="secondary" onPress={() => setConfirming(false)} disabled={saving} style={styles.flex} />
            <Button label="Sí, finalizar" icon="flag" onPress={finish} loading={saving} style={styles.flex} />
          </View>
        ) : (
          <View style={styles.controls}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.status === 'running' ? 'Pausar' : 'Reanudar'}
              onPress={() => {
                tap();
                if (t.status === 'running') t.pause();
                else t.resume();
              }}
              style={styles.pause}
            >
              <Icon name={t.status === 'running' ? 'pause' : 'play'} size={28} strokeWidth={3.2} filled={t.status !== 'running'} />
            </Pressable>
            <Button label="Finalizar" icon="flag" onPress={() => setConfirming(true)} style={styles.flex} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  centered: { alignItems: 'center', justifyContent: 'center', gap: space.md },
  stretch: { alignSelf: 'stretch', marginTop: space.lg },
  flex: { flex: 1 },
  map: { flex: 1, minHeight: 160 },
  topBar: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: space.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  stakePill: {
    paddingHorizontal: 16,
    height: 34,
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.limeDeep,
    backgroundColor: 'rgba(10, 11, 10, 0.85)',
  },
  stakeText: { fontSize: 13, fontWeight: '700', color: colors.lime },
  gps: { position: 'absolute', left: space.lg, flexDirection: 'row', alignItems: 'center', gap: 6, height: 26 },
  gpsText: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
  dot: { width: 8, height: 8, borderRadius: 4 },
  panel: {
    backgroundColor: colors.bg,
    paddingTop: space.md,
    paddingHorizontal: space.xl,
    gap: space.lg,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  heroRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 8 },
  heroUnit: { fontSize: 30, fontWeight: '900', letterSpacing: -0.5 },
  statsCard: {
    gap: space.md,
    paddingVertical: space.lg,
    paddingHorizontal: space.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metrics: { flexDirection: 'row', alignItems: 'center' },
  metric: { flex: 1, alignItems: 'center', gap: 2 },
  metricValue: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  metricUnit: { fontSize: 12, fontWeight: '800', color: colors.text },
  divider: { width: 1, height: 36, backgroundColor: colors.borderStrong },
  subMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  goal: { gap: space.sm },
  goalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  goalLabel: { fontSize: 15, fontWeight: '500', fontVariant: ['tabular-nums'] },
  controls: { flexDirection: 'row', alignItems: 'center', gap: space.lg, minHeight: 72 },
  pause: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
