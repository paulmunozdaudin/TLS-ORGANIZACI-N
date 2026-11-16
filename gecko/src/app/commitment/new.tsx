import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ACTIVITY_ICON } from '@/components/cards/common';
import { Button, tap } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { STAKE_LIMITS } from '@/domain/commitments';
import { ACTIVITY_LABEL, formatGoalValue, formatMoney } from '@/domain/format';
import type { ActivityType, GoalMetric } from '@/domain/types';
import { useAppStore } from '@/store/useAppStore';
import { colors, radius, space } from '@/theme/tokens';

const METRICS: Record<ActivityType, GoalMetric[]> = {
  run: ['distance', 'sessions', 'steps'],
  walk: ['steps', 'distance', 'sessions'],
  ride: ['distance', 'sessions'],
};
const METRIC_LABEL: Record<GoalMetric, string> = { distance: 'Distancia', steps: 'Pasos', sessions: 'Entrenos' };

const PRESETS: Record<ActivityType, Record<GoalMetric, number[]>> = {
  run: { distance: [5_000, 10_000, 15_000, 20_000], steps: [5_000, 8_000, 12_000], sessions: [2, 3, 5] },
  walk: { distance: [2_000, 5_000, 10_000], steps: [5_000, 10_000, 15_000], sessions: [3, 5, 7] },
  ride: { distance: [10_000, 20_000, 40_000, 80_000], steps: [], sessions: [2, 3, 5] },
};
const STEP_SIZE: Record<GoalMetric, number> = { distance: 500, steps: 1_000, sessions: 1 };
const GOAL_MAX: Record<GoalMetric, number> = { distance: 300_000, steps: 100_000, sessions: 30 };
const STAKE_PRESETS = [500, 1_000, 2_000, 5_000];
const HOUR = 3_600_000;

function deadlineOptions(now: number) {
  const at = (days: number, h: number, m: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    d.setHours(h, m, 0, 0);
    return d.getTime();
  };
  return [
    { label: 'Hoy, antes de las 20:00', ts: at(0, 20, 0) },
    { label: 'Hoy, antes de medianoche', ts: at(0, 23, 59) },
    { label: 'Mañana, antes de medianoche', ts: at(1, 23, 59) },
    { label: 'En 3 días', ts: at(3, 23, 59) },
    { label: 'En 7 días', ts: at(7, 23, 59) },
  ].filter((o) => o.ts - now > 30 * 60_000);
}

const isType = (v: unknown): v is ActivityType => v === 'run' || v === 'walk' || v === 'ride';
const isMetric = (v: unknown): v is GoalMetric => v === 'distance' || v === 'steps' || v === 'sessions';
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={() => {
        tap();
        onPress();
      }}
      style={[styles.chip, active && styles.chipActive]}
    >
      <T style={[styles.chipText, active && { color: colors.onLime }]} numberOfLines={1}>{label}</T>
    </Pressable>
  );
}

export default function NewCommitment() {
  const params = useLocalSearchParams<{ type?: string; metric?: string; target?: string; stake?: string; hours?: string }>();
  const wallet = useAppStore((s) => s.wallet);
  const createCommitment = useAppStore((s) => s.createCommitment);

  const [now] = useState(() => Date.now());
  const options = useMemo(() => deadlineOptions(now), [now]);

  const initialType = isType(params.type) ? params.type : 'run';
  const initialMetric =
    isMetric(params.metric) && METRICS[initialType].includes(params.metric) ? params.metric : METRICS[initialType][0];

  const [type, setType] = useState<ActivityType>(initialType);
  const [metric, setMetric] = useState<GoalMetric>(initialMetric);
  const [target, setTarget] = useState(
    Number(params.target) > 0 ? Number(params.target) : PRESETS[initialType][initialMetric][1],
  );
  const [stake, setStake] = useState(Number(params.stake) > 0 ? Number(params.stake) : 1_000);
  const [deadline, setDeadline] = useState(() => {
    const hours = Number(params.hours);
    if (hours > 0) {
      const wanted = now + hours * HOUR;
      return options.reduce((best, o) => (Math.abs(o.ts - wanted) < Math.abs(best.ts - wanted) ? o : best)).ts;
    }
    return options[0].ts;
  });
  const [pickingDeadline, setPickingDeadline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const insufficient = stake > wallet.availableCents;
  const deadlineLabel = options.find((o) => o.ts === deadline)?.label ?? options[0].label;

  const chooseType = (t: ActivityType) => {
    const m = METRICS[t].includes(metric) ? metric : METRICS[t][0];
    setType(t);
    setMetric(m);
    setTarget(PRESETS[t][m][1]);
  };
  const chooseMetric = (m: GoalMetric) => {
    setMetric(m);
    setTarget(PRESETS[type][m][1]);
  };
  const bump = (dir: 1 | -1) =>
    setTarget(clamp(target + dir * STEP_SIZE[metric], STEP_SIZE[metric], GOAL_MAX[metric]));

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const c = await createCommitment({ activityType: type, metric, target, stakeCents: stake, deadline });
      router.replace({ pathname: '/commitment/[id]', params: { id: c.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear el compromiso');
      setBusy(false);
    }
  };

  return (
    <Screen
      footer={
        <View style={{ gap: space.sm }}>
          {error ? <T variant="caption" color={colors.danger} center>{error}</T> : null}
          <Button label={`Comprometer ${formatMoney(stake)}`} onPress={confirm} loading={busy} disabled={insufficient} />
        </View>
      }
    >
      <View style={styles.nav}>
        <Pressable accessibilityRole="button" accessibilityLabel="Atrás" hitSlop={12} onPress={() => router.back()} style={styles.navBtn}>
          <Icon name="chevronLeft" size={24} />
        </Pressable>
        <T variant="heading">Nuevo compromiso</T>
        <View style={styles.navBtn} />
      </View>

      <View style={styles.section}>
        <T variant="title">¿Qué quieres hacer?</T>
        <View style={styles.tiles} accessibilityRole="radiogroup">
          {(['run', 'walk', 'ride'] as ActivityType[]).map((t) => {
            const active = t === type;
            return (
              <Pressable
                key={t}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={ACTIVITY_LABEL[t]}
                onPress={() => {
                  tap();
                  chooseType(t);
                }}
                style={[styles.tile, active && styles.tileActive]}
              >
                <Icon name={ACTIVITY_ICON[t]} size={30} color={active ? colors.lime : colors.text} />
                <T style={styles.tileText}>{ACTIVITY_LABEL[t]}</T>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.rowBetween}>
          <T variant="title">Objetivo</T>
          <View style={styles.metrics}>
            {METRICS[type].map((m) => (
              <Pressable
                key={m}
                accessibilityRole="button"
                accessibilityLabel={METRIC_LABEL[m]}
                accessibilityState={{ selected: m === metric }}
                hitSlop={8}
                onPress={() => chooseMetric(m)}
              >
                <T style={[styles.metric, m === metric && { color: colors.lime }]}>{METRIC_LABEL[m]}</T>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={styles.box}>
          <View style={styles.stepper}>
            <Pressable accessibilityRole="button" accessibilityLabel="Menos" onPress={() => bump(-1)} style={styles.stepBtn}>
              <Icon name="minus" size={22} />
            </Pressable>
            <T variant="statLg" style={styles.flex} center numberOfLines={1} adjustsFontSizeToFit>
              {formatGoalValue(metric, target).toUpperCase()}
            </T>
            <Pressable accessibilityRole="button" accessibilityLabel="Más" onPress={() => bump(1)} style={styles.stepBtn}>
              <Icon name="plus" size={22} />
            </Pressable>
          </View>
          <View style={styles.chips}>
            {PRESETS[type][metric].map((p) => (
              <Chip key={p} label={formatGoalValue(metric, p).toUpperCase()} active={p === target} onPress={() => setTarget(p)} />
            ))}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <T variant="title">¿Cuánto comprometes?</T>
        <View style={styles.chips}>
          {STAKE_PRESETS.map((p) => (
            <Chip key={p} label={formatMoney(p)} active={p === stake} onPress={() => setStake(p)} />
          ))}
        </View>
        <View style={styles.custom}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Bajar importe"
            onPress={() => setStake(clamp(stake - 100, STAKE_LIMITS.minCents, STAKE_LIMITS.maxCents))}
            style={styles.stepBtnSm}
          >
            <Icon name="minus" size={18} />
          </Pressable>
          <T variant="caption" style={styles.flex} center>
            {STAKE_PRESETS.includes(stake) ? 'Otro importe' : `Importe: ${formatMoney(stake)}`} · saldo {formatMoney(wallet.availableCents)}
          </T>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Subir importe"
            onPress={() => setStake(clamp(stake + 100, STAKE_LIMITS.minCents, STAKE_LIMITS.maxCents))}
            style={styles.stepBtnSm}
          >
            <Icon name="plus" size={18} />
          </Pressable>
        </View>
        {insufficient ? <T variant="caption" color={colors.danger}>No tienes saldo suficiente para este importe.</T> : null}
      </View>

      <View style={styles.section}>
        <T variant="title">Fecha límite</T>
        <View style={styles.box}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Fecha límite: ${deadlineLabel}`}
            accessibilityState={{ expanded: pickingDeadline }}
            onPress={() => setPickingDeadline(!pickingDeadline)}
            style={styles.select}
          >
            <Icon name="calendar" size={22} />
            <T style={styles.selectText}>{deadlineLabel}</T>
            <Icon name="chevronDown" size={20} />
          </Pressable>
          {pickingDeadline
            ? options
                .filter((o) => o.ts !== deadline)
                .map((o) => (
                  <Pressable
                    key={o.label}
                    accessibilityRole="button"
                    accessibilityLabel={o.label}
                    onPress={() => {
                      setDeadline(o.ts);
                      setPickingDeadline(false);
                    }}
                    style={styles.option}
                  >
                    <T style={styles.optionText}>{o.label}</T>
                  </Pressable>
                ))
            : null}
        </View>
      </View>

      <View style={styles.info}>
        <Icon name="info" size={22} color={colors.textMuted} />
        <T style={styles.infoText}>
          Recuperas tu dinero si completas el objetivo. Si no, lo pierdes. Modo simulación: no se cobra dinero real.
        </T>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  section: { gap: space.md },
  rowBetween: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.md },
  tiles: { flexDirection: 'row', gap: space.md },
  tile: {
    flex: 1,
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceHigh,
  },
  tileActive: { borderColor: colors.lime, backgroundColor: colors.limeSoft },
  tileText: { fontSize: 15, fontWeight: '700' },
  metrics: { flexDirection: 'row', gap: space.md },
  metric: { fontSize: 13, fontWeight: '700', color: colors.textDim },
  box: {
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.xs },
  stepBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.borderStrong,
  },
  stepBtnSm: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHigh,
  },
  chips: { flexDirection: 'row', gap: space.sm },
  chip: {
    flex: 1,
    height: 46,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.lime, borderColor: colors.lime },
  chipText: { fontSize: 15, fontWeight: '800' },
  custom: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  select: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 36 },
  selectText: { flex: 1, fontSize: 16, fontWeight: '600' },
  option: { paddingVertical: space.md, borderTopWidth: 1, borderTopColor: colors.border },
  optionText: { fontSize: 15, color: colors.textMuted },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  infoText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.textMuted },
});
