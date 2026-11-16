import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';

import { paceLabel } from '@/components/cards/ActivityRow';
import { ACTIVITY_ICON, Stat, VerificationTag } from '@/components/cards/common';
import { RouteMap } from '@/components/map/RouteMap';
import { Gecko } from '@/components/mascot/Gecko';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { ACTIVITY_LABEL, commitmentTitle, formatDuration, formatInt, formatKm, formatMoneyFull } from '@/domain/format';
import { activityXp, type GeckoMood } from '@/domain/gamification';
import { useAppStore } from '@/store/useAppStore';
import { colors, radius, space } from '@/theme/tokens';

const VERIFICATION_COPY = {
  verified: 'Ruta, tiempos y velocidad coherentes. Esta actividad cuenta para tus retos.',
  suspicious: 'Hay datos que no encajan. No cuenta para tus retos hasta que se revise.',
  rejected: 'Esta actividad no supera la verificación y no cuenta para tus retos.',
} as const;

/** Destellos de celebración alrededor de la mascota. */
function Rays({ size }: { size: number }) {
  const c = size / 2;
  const rays = [-150, -128, -105, -80, -62, -40, -20, 168, 12, -168];
  return (
    <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
      {rays.map((deg, i) => {
        const a = (deg * Math.PI) / 180;
        const r1 = c * (0.74 + (i % 3) * 0.04);
        const r2 = r1 + c * (i % 2 ? 0.1 : 0.16);
        return (
          <Line
            key={deg}
            x1={c + r1 * Math.cos(a)}
            y1={c + r1 * Math.sin(a)}
            x2={c + r2 * Math.cos(a)}
            y2={c + r2 * Math.sin(a)}
            stroke={colors.lime}
            strokeWidth={i % 2 ? 4 : 6}
            strokeLinecap="round"
          />
        );
      })}
    </Svg>
  );
}

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
      ? '¡Reto completado!'
      : v.status === 'verified'
        ? 'Buen trabajo.'
        : v.status === 'suspicious'
          ? 'Actividad en revisión'
          : 'Actividad no válida';
  const outcome = {
    completed: { word: 'devueltos', line: '¡Objetivo cumplido!', color: colors.lime, bg: colors.limeSoft },
    active: { word: 'en juego', line: 'Aún no has llegado al objetivo.', color: colors.text, bg: colors.surface },
    pending_verification: { word: 'retenidos', line: 'Pendiente de verificación.', color: colors.warning, bg: colors.warningSoft },
    failed: { word: 'perdidos', line: 'No se alcanzó el objetivo a tiempo.', color: colors.danger, bg: colors.dangerSoft },
  }[commitment?.status ?? 'active'];
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
        <Button label="Listo" onPress={() => (fresh ? router.replace('/') : router.back())} />
      }
    >
      {fresh ? (
        <View style={styles.hero}>
          <View style={styles.celebration}>
            {mood === 'happy' ? <Rays size={300} /> : null}
            <Gecko mood={mood} size={250} />
          </View>
          <T style={styles.headline} center>{headline}</T>
        </View>
      ) : null}

      <Card style={styles.grid}>
        <View style={styles.head}>
          <Icon name={ACTIVITY_ICON[activity.type]} size={24} color={colors.lime} />
          <T style={styles.type}>{ACTIVITY_LABEL[activity.type]}</T>
          <VerificationTag status={v.status} />
        </View>
        <View>
          <T variant="statLg" style={styles.distance}>{formatKm(d)} KM</T>
          <T variant="caption">{date}</T>
        </View>
        <View style={styles.row}>
          <Stat label="Tiempo" value={formatDuration(activity.movingTimeSec)} align="center" />
          <View style={styles.divider} />
          <Stat
            label={activity.type === 'ride' ? 'Velocidad media' : 'Ritmo medio'}
            value={paceLabel(activity, d).split(' ')[0]}
            unit={activity.type === 'ride' ? 'km/h' : '/KM'}
            align="center"
          />
          <View style={styles.divider} />
          <Stat label="kcal" value={formatInt(activity.calories)} align="center" />
        </View>
        {activity.steps != null ? <T variant="caption" center>{formatInt(activity.steps)} pasos</T> : null}
      </Card>

      {commitment ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Ver compromiso: ${commitmentTitle(commitment)}`}
          onPress={() => router.push({ pathname: '/commitment/[id]', params: { id: commitment.id } })}
          style={[styles.outcome, { borderColor: outcome.color, backgroundColor: outcome.bg }]}
        >
          <Icon name="coins" size={30} color={outcome.color} />
          <View style={styles.flex}>
            <T style={[styles.outcomeTitle, { color: outcome.color }]}>
              {formatMoneyFull(commitment.stakeCents)} {outcome.word}
            </T>
            <T variant="caption" color={colors.text}>{outcome.line}</T>
          </View>
          {commitment.status === 'completed' ? (
            <View style={styles.check}>
              <Icon name="check" size={14} color={colors.onLime} strokeWidth={3.5} />
            </View>
          ) : (
            <Icon name="chevronRight" size={18} color={colors.textDim} />
          )}
        </Pressable>
      ) : null}

      <Button label="Compartir actividad" variant="secondary" icon="share" onPress={share} />

      {activity.route.length > 1 ? (
        <View style={styles.map}>
          <RouteMap points={activity.route} />
        </View>
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
  hero: { alignItems: 'center' },
  celebration: { width: 300, height: 262, alignItems: 'center', justifyContent: 'flex-end' },
  headline: {
    fontSize: 40,
    lineHeight: 42,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: -1,
    textTransform: 'uppercase',
    maxWidth: 300,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  type: { flex: 1, fontSize: 17, fontWeight: '600', color: colors.textMuted },
  distance: { fontSize: 46, lineHeight: 52 },
  grid: { gap: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  divider: { width: 1, height: 36, backgroundColor: colors.borderStrong },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  outcome: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  outcomeTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.4 },
  check: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  map: { height: 240, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  flag: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  xp: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
});
