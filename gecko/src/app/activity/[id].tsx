import { router, useLocalSearchParams } from 'expo-router';
import { Share, StyleSheet, View } from 'react-native';

import { paceLabel } from '@/components/cards/ActivityRow';
import { ActivityBadge, Stat, StatusPill, VerificationTag } from '@/components/cards/common';
import { RouteMap } from '@/components/map/RouteMap';
import { Gecko } from '@/components/mascot/Gecko';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { ACTIVITY_LABEL, commitmentTitle, formatDuration, formatInt, formatKm, formatMoney } from '@/domain/format';
import { activityXp, type GeckoMood } from '@/domain/gamification';
import { useAppStore } from '@/store/useAppStore';
import { colors, radius, space } from '@/theme/tokens';

const VERIFICATION_COPY = {
  verified: 'Ruta, tiempos y velocidad coherentes. Esta actividad cuenta para tus retos.',
  suspicious: 'Hay datos que no encajan. No cuenta para tus retos hasta que se revise.',
  rejected: 'Esta actividad no supera la verificación y no cuenta para tus retos.',
} as const;

export default function ActivitySummary() {
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const activity = useAppStore((s) => s.activities.find((a) => a.id === id));
  const commitment = useAppStore((s) => s.commitments.find((c) => c.id === activity?.commitmentId));

  if (!activity) {
    return (
      <Screen scroll={false} contentStyle={styles.missing}>
        <T variant="title" center>Actividad no encontrada</T>
        <Button label="Volver" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const v = activity.verification;
  const d = v.verifiedDistanceM;
  const xp = activityXp(activity);
  const mood: GeckoMood =
    commitment?.status === 'completed' ? 'happy' : v.status === 'verified' ? 'proud' : 'disappointed';
  const headline =
    commitment?.status === 'completed'
      ? '¡Reto cumplido!'
      : v.status === 'verified'
        ? 'Buen trabajo.'
        : v.status === 'suspicious'
          ? 'Actividad en revisión'
          : 'Actividad no válida';
  const date = new Date(activity.startedAt).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

  const share = () => {
    Share.share({
      message: `${ACTIVITY_LABEL[activity.type]} · ${formatKm(d)} km en ${formatDuration(activity.movingTimeSec)} (${paceLabel(activity, d)}) con Gecko. Bet on yourself.`,
    }).catch(() => {});
  };

  return (
    <Screen
      footer={
        <View style={styles.footer}>
          <Button label="Compartir" variant="secondary" icon="share" onPress={share} style={styles.flex} />
          <Button
            label="Listo"
            onPress={() => (fresh ? router.replace('/') : router.back())}
            style={styles.flex}
          />
        </View>
      }
    >
      {fresh ? (
        <View style={styles.hero}>
          <Gecko mood={mood} size={150} />
          <T variant="display" center>{headline}</T>
        </View>
      ) : null}

      <View style={styles.head}>
        <ActivityBadge type={activity.type} />
        <View style={styles.flex}>
          <T variant="title">{ACTIVITY_LABEL[activity.type]}</T>
          <T variant="caption">{date}</T>
        </View>
        <VerificationTag status={v.status} />
      </View>

      <View style={styles.distance}>
        <T variant="hero">{formatKm(d)}</T>
        <T variant="label">Kilómetros verificados</T>
      </View>

      <Card style={styles.grid}>
        <View style={styles.row}>
          <Stat label="Tiempo" value={formatDuration(activity.movingTimeSec)} />
          <Stat label={activity.type === 'ride' ? 'Velocidad media' : 'Ritmo medio'} value={paceLabel(activity, d)} />
        </View>
        <View style={styles.row}>
          <Stat label="Calorías" value={formatInt(activity.calories)} unit="kcal" />
          <Stat label="Pasos" value={activity.steps != null ? formatInt(activity.steps) : '—'} />
        </View>
      </Card>

      {activity.route.length > 1 ? (
        <View style={styles.map}>
          <RouteMap points={activity.route} />
        </View>
      ) : null}

      {commitment ? (
        <Card
          tone="high"
          style={{ gap: space.sm }}
          onPress={() => router.push({ pathname: '/commitment/[id]', params: { id: commitment.id } })}
        >
          <View style={styles.rowBetween}>
            <T variant="label">Compromiso</T>
            <StatusPill status={commitment.status} />
          </View>
          <View style={styles.rowBetween}>
            <T variant="heading" style={styles.flex}>{commitmentTitle(commitment)}</T>
            <T variant="stat" color={commitment.status === 'failed' ? colors.danger : colors.lime}>
              {formatMoney(commitment.stakeCents)}
            </T>
          </View>
          {commitment.status === 'completed' ? (
            <T variant="caption">Has recuperado tu dinero.</T>
          ) : commitment.status === 'active' ? (
            <T variant="caption">Sigue en juego. Aún no has llegado al objetivo.</T>
          ) : null}
        </Card>
      ) : null}

      <Card style={{ gap: space.sm }}>
        <View style={styles.rowBetween}>
          <T variant="label">Verificación</T>
          <T variant="caption">Confianza {v.score}/100</T>
        </View>
        <T>{VERIFICATION_COPY[v.status]}</T>
        {v.flags.map((f) => (
          <View key={f.code} style={styles.flag}>
            <Icon name="alert" size={16} color={f.severity === 'block' ? colors.danger : colors.warning} />
            <T variant="caption" style={styles.flex}>{f.message}</T>
          </View>
        ))}
      </Card>

      {xp > 0 ? (
        <View style={styles.xp}>
          <Icon name="bolt" size={18} color={colors.lime} filled />
          <T variant="heading" color={colors.lime}>+{xp} XP</T>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  missing: { justifyContent: 'center', gap: space.lg },
  footer: { flexDirection: 'row', gap: space.md },
  hero: { alignItems: 'center', gap: space.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  distance: { alignItems: 'center', gap: 6 },
  grid: { gap: space.lg },
  row: { flexDirection: 'row', gap: space.md },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  map: { height: 240, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  flag: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  xp: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
});
