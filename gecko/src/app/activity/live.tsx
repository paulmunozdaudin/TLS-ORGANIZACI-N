import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RouteMap } from '@/components/map/RouteMap';
import { Button, tap } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ProgressBar } from '@/components/ui/Progress';
import { T } from '@/components/ui/T';
import { commitmentProgress, MIN_SESSION_SEC } from '@/domain/commitments';
import {
  ACTIVITY_LABEL,
  commitmentTitle,
  formatDuration,
  formatGoalValue,
  formatInt,
  formatKm,
  formatMoney,
  formatPace,
  formatSpeedKmh,
} from '@/domain/format';
import { estimateCalories } from '@/domain/gamification';
import type { ActivityType } from '@/domain/types';
import { useNow } from '@/hooks/useNow';
import { movingSeconds, recentSpeed, useTracking } from '@/services/tracking/useTracking';
import { useAppStore } from '@/store/useAppStore';
import { colors, radius, space } from '@/theme/tokens';

const isType = (v: unknown): v is ActivityType => v === 'run' || v === 'walk' || v === 'ride';

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <T variant="stat">{value}</T>
      <T variant="label">{label}</T>
    </View>
  );
}

export default function Live() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ type?: string; commitmentId?: string }>();
  const now = useNow(1000);
  const t = useTracking();
  const [saving, setSaving] = useState(false);

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
      label: `${formatGoalValue(commitment.metric, Math.min(total, commitment.target))} de ${formatGoalValue(commitment.metric, commitment.target)}`,
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

  return (
    <View style={styles.root}>
      <View style={styles.map}>
        <RouteMap points={t.points} live />
        <View style={[styles.topBar, { top: insets.top + space.sm }]}>
          <View style={styles.badge}>
            <View style={[styles.dot, { backgroundColor: !t.hasFix ? colors.warning : gpsWeak ? colors.warning : colors.lime }]} />
            <T style={styles.badgeText}>
              {!t.hasFix ? 'Buscando GPS…' : gpsWeak ? 'GPS débil' : 'GPS'}
            </T>
          </View>
          <View style={styles.badge}>
            <T style={styles.badgeText}>{ACTIVITY_LABEL[t.type]}</T>
          </View>
        </View>
      </View>

      <View style={[styles.panel, { paddingBottom: insets.bottom + space.lg }]}>
        {t.status === 'paused' ? <T variant="label" color={colors.warning} center>En pausa</T> : null}

        <View style={styles.heroBlock}>
          <T variant="hero" accessibilityLabel={`${formatKm(t.distanceM)} kilómetros`}>{formatKm(t.distanceM)}</T>
          <T variant="label">Kilómetros</T>
        </View>

        <View style={styles.metrics}>
          <Metric label="Tiempo" value={formatDuration(seconds)} />
          <Metric label={isRide ? 'Km/h' : 'Ritmo'} value={current} />
          <Metric label={isRide ? 'Media' : 'Ritmo medio'} value={average} />
        </View>
        <View style={styles.metrics}>
          <Metric label="Calorías" value={formatInt(estimateCalories(t.type, t.distanceM, weightKg))} />
          <Metric label="Pasos" value={t.steps != null ? formatInt(t.steps) : '—'} />
          <Metric label="Precisión" value={t.gpsAccuracy != null ? `±${Math.round(t.gpsAccuracy)} m` : '—'} />
        </View>

        {commitment && goal ? (
          <View style={styles.goal}>
            <View style={styles.goalRow}>
              <T variant="heading" numberOfLines={1} style={styles.flex}>{commitmentTitle(commitment)}</T>
              <T variant="heading" color={colors.lime}>{formatMoney(commitment.stakeCents)}</T>
            </View>
            <ProgressBar ratio={goal.ratio} height={10} />
            <T variant="caption">{goal.label}</T>
          </View>
        ) : null}

        <View style={styles.controls}>
          {t.status === 'running' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Pausar"
              onPress={() => {
                tap();
                t.pause();
              }}
              style={styles.pause}
            >
              <Icon name="pause" size={30} color={colors.onLime} strokeWidth={3.5} />
            </Pressable>
          ) : (
            <>
              <Button label="Finalizar" variant="secondary" icon="stop" onPress={finish} loading={saving} style={styles.flex} />
              <Button label="Reanudar" icon="play" onPress={t.resume} disabled={saving} style={styles.flex} />
            </>
          )}
        </View>
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
  topBar: { position: 'absolute', left: space.lg, right: space.lg, flexDirection: 'row', justifyContent: 'space-between' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(10, 11, 10, 0.85)',
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  badgeText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.4 },
  panel: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    marginTop: -radius.xl,
    paddingTop: space.lg,
    paddingHorizontal: space.xl,
    gap: space.lg,
    borderTopWidth: 1,
    borderColor: colors.border,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  heroBlock: { alignItems: 'center', gap: 6 },
  metrics: { flexDirection: 'row' },
  metric: { flex: 1, alignItems: 'center', gap: 2 },
  goal: {
    gap: space.sm,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  controls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: space.md, minHeight: 84 },
  pause: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
