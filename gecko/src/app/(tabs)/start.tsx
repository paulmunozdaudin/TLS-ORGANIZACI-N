import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ActivityBadge } from '@/components/cards/common';
import { Gecko } from '@/components/mascot/Gecko';
import { Button, tap } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { ProgressBar } from '@/components/ui/Progress';
import { Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { commitmentProgress } from '@/domain/commitments';
import { ACTIVITY_LABEL, commitmentTitle, formatMoney, formatTimeLeft } from '@/domain/format';
import type { ActivityType } from '@/domain/types';
import { useNow } from '@/hooks/useNow';
import { useTracking } from '@/services/tracking/useTracking';
import { useAppStore } from '@/store/useAppStore';
import { colors, radius, space } from '@/theme/tokens';

const TYPES: { type: ActivityType; hint: string }[] = [
  { type: 'run', hint: 'Ritmo, distancia y pasos' },
  { type: 'walk', hint: 'Distancia y pasos' },
  { type: 'ride', hint: 'Velocidad y distancia' },
];

export default function Start() {
  const now = useNow();
  const [type, setType] = useState<ActivityType>('run');
  const commitments = useAppStore((s) => s.commitments);
  const activities = useAppStore((s) => s.activities);
  const recording = useTracking((s) => s.status !== 'idle');
  const recordingType = useTracking((s) => s.type);

  // El reto activo de este tipo que antes vence es el que se muestra como objetivo.
  const target = commitments
    .filter((c) => c.status === 'active' && c.activityType === type)
    .sort((a, b) => a.deadline - b.deadline)[0];

  if (recording) {
    return (
      <Screen tabbed scroll={false} contentStyle={styles.center}>
        <Gecko mood="motivated" size={170} />
        <T variant="title" center>{ACTIVITY_LABEL[recordingType]} en curso</T>
        <T variant="caption" center>Tu actividad se sigue grabando.</T>
        <Button label="Volver a la actividad" icon="bolt" onPress={() => router.push('/activity/live')} style={styles.wide} />
      </Screen>
    );
  }

  return (
    <Screen tabbed>
      <View style={{ gap: 4 }}>
        <T variant="display">Empezar</T>
        <T variant="caption">Elige una actividad. Gecko registra tu ruta por GPS.</T>
      </View>

      <View style={styles.types} accessibilityRole="radiogroup">
        {TYPES.map((t) => {
          const active = t.type === type;
          return (
            <Pressable
              key={t.type}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={ACTIVITY_LABEL[t.type]}
              onPress={() => {
                tap();
                setType(t.type);
              }}
              style={[styles.type, active && styles.typeActive]}
            >
              <ActivityBadge type={t.type} size={48} active={active} />
              <View style={styles.flex}>
                <T variant="heading">{ACTIVITY_LABEL[t.type]}</T>
                <T variant="caption">{t.hint}</T>
              </View>
              <View style={[styles.radio, active && styles.radioActive]}>
                {active ? <Icon name="check" size={14} color={colors.onLime} strokeWidth={3} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      {target ? (
        <Card tone="high" style={{ gap: space.md }}>
          <T variant="label" color={colors.lime}>Cuenta para tu reto</T>
          <View style={styles.rowBetween}>
            <T variant="heading" style={styles.flex}>{commitmentTitle(target)}</T>
            <T variant="stat" color={colors.lime}>{formatMoney(target.stakeCents)}</T>
          </View>
          <ProgressBar ratio={commitmentProgress(target, activities).ratio} />
          <T variant="caption">Quedan {formatTimeLeft(target.deadline - now).toLowerCase()}</T>
        </Card>
      ) : (
        <Card style={styles.rowBetween}>
          <View style={styles.flex}>
            <T variant="heading">Actividad libre</T>
            <T variant="caption">No tienes un reto activo de {ACTIVITY_LABEL[type].toLowerCase()}.</T>
          </View>
          <Button
            label="Crear reto"
            variant="secondary"
            size="md"
            onPress={() => router.push({ pathname: '/commitment/new', params: { type } })}
          />
        </Card>
      )}

      <Button
        label={`Empezar ${ACTIVITY_LABEL[type]}`}
        icon="play"
        onPress={() =>
          router.push({ pathname: '/activity/live', params: { type, commitmentId: target?.id ?? '' } })
        }
      />
      <T variant="caption" center>
        Mantén Gecko abierto durante la actividad: el GPS se registra en primer plano.
      </T>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', gap: space.md },
  wide: { alignSelf: 'stretch', marginTop: space.lg },
  types: { gap: space.md },
  type: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  typeActive: { borderColor: colors.lime, backgroundColor: colors.surfaceHigh },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { backgroundColor: colors.lime, borderColor: colors.lime },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
});
