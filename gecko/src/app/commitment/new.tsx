import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ActivityBadge } from '@/components/cards/common';
import { Button, tap } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { STAKE_LIMITS } from '@/domain/commitments';
import { ACTIVITY_LABEL, commitmentTitle, formatDeadline, formatGoalValue, formatMoney, formatTimeLeft } from '@/domain/format';
import type { ActivityType, GoalMetric } from '@/domain/types';
import { useAppStore } from '@/store/useAppStore';
import { colors, radius, space } from '@/theme/tokens';

const STEPS = ['Actividad', 'Objetivo', 'Dinero', 'Fecha límite', 'Confirmar'] as const;

const METRICS: Record<ActivityType, GoalMetric[]> = {
  run: ['distance', 'sessions', 'steps'],
  walk: ['steps', 'distance', 'sessions'],
  ride: ['distance', 'sessions'],
};
const METRIC_LABEL: Record<GoalMetric, string> = { distance: 'Distancia', steps: 'Pasos', sessions: 'Entrenos' };

const PRESETS: Record<ActivityType, Record<GoalMetric, number[]>> = {
  run: { distance: [3_000, 5_000, 10_000, 21_100], steps: [5_000, 8_000, 12_000], sessions: [2, 3, 5] },
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
    { label: 'Hoy 20:00', ts: at(0, 20, 0) },
    { label: 'Hoy 23:59', ts: at(0, 23, 59) },
    { label: 'Mañana', ts: at(1, 23, 59) },
    { label: '3 días', ts: at(3, 23, 59) },
    { label: '7 días', ts: at(7, 23, 59) },
  ].filter((o) => o.ts - now > 30 * 60_000);
}

const isType = (v: unknown): v is ActivityType => v === 'run' || v === 'walk' || v === 'ride';
const isMetric = (v: unknown): v is GoalMetric => v === 'distance' || v === 'steps' || v === 'sessions';

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={() => {
        tap();
        onPress();
      }}
      style={[styles.chip, active && styles.chipActive]}
    >
      <T style={[styles.chipText, active && { color: colors.onLime }]}>{label}</T>
    </Pressable>
  );
}

function Stepper({ value, onMinus, onPlus }: { value: string; onMinus: () => void; onPlus: () => void }) {
  return (
    <View style={styles.stepper}>
      <Pressable accessibilityRole="button" accessibilityLabel="Menos" onPress={onMinus} style={styles.stepBtn}>
        <Icon name="minus" size={22} />
      </Pressable>
      <T variant="statLg" style={styles.stepValue} center numberOfLines={1} adjustsFontSizeToFit>{value}</T>
      <Pressable accessibilityRole="button" accessibilityLabel="Más" onPress={onPlus} style={styles.stepBtn}>
        <Icon name="plus" size={22} />
      </Pressable>
    </View>
  );
}

export default function NewCommitment() {
  const params = useLocalSearchParams<{ type?: string; metric?: string; target?: string; stake?: string; hours?: string }>();
  const wallet = useAppStore((s) => s.wallet);
  const createCommitment = useAppStore((s) => s.createCommitment);

  const [now] = useState(() => Date.now());
  const options = useMemo(() => deadlineOptions(now), [now]);

  const initialType = isType(params.type) ? params.type : 'run';
  const initialMetric = isMetric(params.metric) && METRICS[initialType].includes(params.metric) ? params.metric : METRICS[initialType][0];
  const initialDeadline = () => {
    const hours = Number(params.hours);
    if (hours > 0) {
      const wanted = now + hours * HOUR;
      return options.reduce((best, o) => (Math.abs(o.ts - wanted) < Math.abs(best.ts - wanted) ? o : best)).ts;
    }
    return (options.find((o) => o.label === 'Hoy 23:59') ?? options[0]).ts;
  };

  const [step, setStep] = useState(isType(params.type) && params.target ? 4 : isType(params.type) ? 1 : 0);
  const [type, setType] = useState<ActivityType>(initialType);
  const [metric, setMetric] = useState<GoalMetric>(initialMetric);
  const [target, setTarget] = useState(Number(params.target) > 0 ? Number(params.target) : PRESETS[initialType][initialMetric][1]);
  const [stake, setStake] = useState(Number(params.stake) > 0 ? Number(params.stake) : 1_000);
  const [deadline, setDeadline] = useState(initialDeadline);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const insufficient = stake > wallet.availableCents;
  const deadlineValid = deadline - Date.now() > 10 * 60_000;

  const chooseType = (t: ActivityType) => {
    setType(t);
    const m = METRICS[t].includes(metric) ? metric : METRICS[t][0];
    setMetric(m);
    setTarget(PRESETS[t][m][1]);
  };
  const chooseMetric = (m: GoalMetric) => {
    setMetric(m);
    setTarget(PRESETS[type][m][1]);
  };
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

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

  const canContinue = step === 2 ? !insufficient : step === 3 ? deadlineValid : true;

  return (
    <Screen
      footer={
        <View style={{ gap: space.sm }}>
          {error ? <T variant="caption" color={colors.danger} center>{error}</T> : null}
          {step < 4 ? (
            <Button label="Continuar" onPress={() => setStep(step + 1)} disabled={!canContinue} />
          ) : (
            <Button
              label={`Comprometer ${formatMoney(stake)}`}
              icon="lock"
              onPress={confirm}
              loading={busy}
              disabled={insufficient || !deadlineValid}
            />
          )}
        </View>
      }
    >
      <View style={styles.nav}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={step === 0 ? 'Cerrar' : 'Atrás'}
          hitSlop={12}
          onPress={() => (step === 0 ? router.back() : setStep(step - 1))}
          style={styles.navBtn}
        >
          <Icon name={step === 0 ? 'x' : 'chevronLeft'} size={20} />
        </Pressable>
        <View style={styles.dots}>
          {STEPS.map((s, i) => (
            <View key={s} style={[styles.dot, i <= step && styles.dotActive]} />
          ))}
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={{ gap: 4 }}>
        <T variant="label" color={colors.lime}>Paso {step + 1} de {STEPS.length}</T>
        <T variant="display">
          {['¿Qué vas a hacer?', '¿Hasta dónde?', '¿Cuánto te juegas?', '¿Para cuándo?', 'Tu compromiso'][step]}
        </T>
      </View>

      {step === 0 ? (
        <View style={{ gap: space.md }}>
          {(['run', 'walk', 'ride'] as ActivityType[]).map((t) => (
            <Pressable
              key={t}
              accessibilityRole="radio"
              accessibilityState={{ selected: t === type }}
              accessibilityLabel={ACTIVITY_LABEL[t]}
              onPress={() => {
                tap();
                chooseType(t);
              }}
              style={[styles.option, t === type && styles.optionActive]}
            >
              <ActivityBadge type={t} size={48} active={t === type} />
              <T variant="heading" style={styles.flex}>{ACTIVITY_LABEL[t]}</T>
              {t === type ? <Icon name="check" size={20} color={colors.lime} strokeWidth={3} /> : null}
            </Pressable>
          ))}
        </View>
      ) : null}

      {step === 1 ? (
        <View style={{ gap: space.xl }}>
          <View style={styles.chips}>
            {METRICS[type].map((m) => (
              <Chip key={m} label={METRIC_LABEL[m]} active={m === metric} onPress={() => chooseMetric(m)} />
            ))}
          </View>
          <Stepper
            value={formatGoalValue(metric, target)}
            onMinus={() => setTarget(clamp(target - STEP_SIZE[metric], STEP_SIZE[metric], GOAL_MAX[metric]))}
            onPlus={() => setTarget(clamp(target + STEP_SIZE[metric], STEP_SIZE[metric], GOAL_MAX[metric]))}
          />
          <View style={styles.chips}>
            {PRESETS[type][metric].map((p) => (
              <Chip key={p} label={formatGoalValue(metric, p)} active={p === target} onPress={() => setTarget(p)} />
            ))}
          </View>
          <T variant="caption">
            {metric === 'distance'
              ? 'Puedes repartir la distancia en varias actividades antes de la fecha límite.'
              : metric === 'steps'
                ? 'Cuentan los pasos registrados durante tus actividades con Gecko.'
                : 'Cada entreno debe durar al menos 10 minutos para contar.'}
          </T>
        </View>
      ) : null}

      {step === 2 ? (
        <View style={{ gap: space.xl }}>
          <Stepper
            value={formatMoney(stake)}
            onMinus={() => setStake(clamp(stake - 100, STAKE_LIMITS.minCents, STAKE_LIMITS.maxCents))}
            onPlus={() => setStake(clamp(stake + 100, STAKE_LIMITS.minCents, STAKE_LIMITS.maxCents))}
          />
          <View style={styles.chips}>
            {STAKE_PRESETS.map((p) => (
              <Chip key={p} label={formatMoney(p)} active={p === stake} onPress={() => setStake(p)} />
            ))}
          </View>
          <Card style={styles.rowBetween}>
            <View style={styles.row}>
              <Icon name="wallet" size={18} color={colors.textMuted} />
              <T variant="caption">Saldo disponible (simulado)</T>
            </View>
            <T variant="heading" color={insufficient ? colors.danger : colors.text}>{formatMoney(wallet.availableCents)}</T>
          </Card>
          {insufficient ? <T variant="caption" color={colors.danger}>No tienes saldo suficiente para comprometer este importe.</T> : null}
          <T variant="caption">
            Si cumples, recuperas el 100 %. Si no llegas antes de la fecha límite, pierdes el importe comprometido.
          </T>
        </View>
      ) : null}

      {step === 3 ? (
        <View style={{ gap: space.xl }}>
          <View style={styles.chips}>
            {options.map((o) => (
              <Chip key={o.label} label={o.label} active={o.ts === deadline} onPress={() => setDeadline(o.ts)} />
            ))}
          </View>
          <Stepper
            value={formatDeadline(deadline, now)}
            onMinus={() => setDeadline(Math.max(deadline - HOUR, now + HOUR))}
            onPlus={() => setDeadline(Math.min(deadline + HOUR, now + 30 * 24 * HOUR))}
          />
          <T variant="caption" center>
            {deadlineValid ? `Tendrás ${formatTimeLeft(deadline - now).toLowerCase()} para conseguirlo.` : 'Elige una fecha límite futura.'}
          </T>
        </View>
      ) : null}

      {step === 4 ? (
        <View style={{ gap: space.lg }}>
          <Card tone="high" style={{ gap: space.lg }}>
            <View style={styles.row}>
              <ActivityBadge type={type} active />
              <T variant="title" style={styles.flex}>{commitmentTitle({ activityType: type, metric, target })}</T>
            </View>
            {[
              { label: 'Actividad', value: ACTIVITY_LABEL[type], to: 0 },
              { label: 'Objetivo', value: formatGoalValue(metric, target), to: 1 },
              { label: 'Dinero comprometido', value: formatMoney(stake), to: 2 },
              { label: 'Fecha límite', value: formatDeadline(deadline, now), to: 3 },
            ].map((r) => (
              <Pressable key={r.label} accessibilityRole="button" accessibilityLabel={`Editar ${r.label}`} onPress={() => setStep(r.to)} style={styles.summaryRow}>
                <T variant="caption">{r.label}</T>
                <View style={styles.row}>
                  <T variant="heading">{r.value}</T>
                  <Icon name="chevronRight" size={16} color={colors.textDim} />
                </View>
              </Pressable>
            ))}
          </Card>
          <View style={styles.notice}>
            <Icon name="shield" size={18} color={colors.lime} />
            <T variant="caption" style={styles.flex}>
              Modo simulación: se retienen {formatMoney(stake)} de tu saldo ficticio. No se cobra dinero real. Solo cuentan actividades verificadas por GPS.
            </T>
          </View>
          {insufficient ? <T variant="caption" color={colors.danger}>Saldo insuficiente: ajusta el importe.</T> : null}
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
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 22, height: 4, borderRadius: 2, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.lime },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionActive: { borderColor: colors.lime, backgroundColor: colors.surfaceHigh },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    paddingHorizontal: 16,
    height: 42,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  chipActive: { backgroundColor: colors.lime, borderColor: colors.lime },
  chipText: { fontSize: 14, fontWeight: '800' },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  stepValue: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  notice: {
    flexDirection: 'row',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.limeSoft,
  },
});
