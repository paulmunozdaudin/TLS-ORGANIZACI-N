import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ActivityRow } from '@/components/cards/ActivityRow';
import { ActivityBadge, EmptyState, SectionHeader, Stat } from '@/components/cards/common';
import { CommitmentCard } from '@/components/cards/CommitmentCard';
import { Gecko } from '@/components/mascot/Gecko';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { CHALLENGES } from '@/data/community';
import { openChallenge } from '@/data/openChallenge';
import { formatInt, formatKm, formatMoney } from '@/domain/format';
import { computeStats, dayKey, geckoMood, type GeckoMood } from '@/domain/gamification';
import { useNow } from '@/hooks/useNow';
import { useTodaySteps } from '@/hooks/useTodaySteps';
import { useAppStore } from '@/store/useAppStore';
import { colors, radius, space } from '@/theme/tokens';

const MOOD_LINE: Record<GeckoMood, string> = {
  neutral: '¿Listo para un nuevo reto?',
  motivated: 'Tienes dinero en juego. Sal a recuperarlo.',
  happy: '¡Reto cumplido! Has recuperado tu dinero.',
  proud: 'Estás en racha. No la rompas ahora.',
  disappointed: 'Esta vez no salió. La revancha empieza hoy.',
};

const WEEK_MS = 7 * 86_400_000;

function Tile({ icon, color, value, unit }: { icon: IconName; color: string; value: string; unit: string }) {
  return (
    <Card style={styles.tile}>
      <Icon name={icon} size={26} color={color} />
      <T variant="stat" numberOfLines={1} adjustsFontSizeToFit>{value}</T>
      <T variant="caption">{unit}</T>
    </Card>
  );
}

export default function Home() {
  const now = useNow();
  const user = useAppStore((s) => s.user);
  const activities = useAppStore((s) => s.activities);
  const commitments = useAppStore((s) => s.commitments);
  const { steps } = useTodaySteps(now);

  const stats = computeStats(activities, commitments, now);
  const mood = geckoMood(activities, commitments, now);
  const open = commitments
    .filter((c) => c.status === 'active' || c.status === 'pending_verification')
    .sort((a, b) => a.deadline - b.deadline);

  const verified = activities.filter((a) => a.verification.status === 'verified');
  const today = verified.filter((a) => dayKey(a.startedAt) === dayKey(now));
  const week = verified.filter((a) => now - a.startedAt < WEEK_MS);
  const sum = (list: typeof verified, f: (a: (typeof verified)[number]) => number) => list.reduce((s, a) => s + f(a), 0);

  return (
    <Screen tabbed>
      <View style={styles.header}>
        <T style={styles.wordmark}>GECKO</T>
        <View style={styles.chip} accessible accessibilityLabel={`Racha de ${stats.streak} días`}>
          <Icon name="flame" size={16} color={stats.streak > 0 ? colors.lime : colors.textDim} />
          <T style={styles.chipText}>{stats.streak}</T>
        </View>
      </View>

      <View>
        <View style={styles.hero}>
          <View style={styles.heroText}>
            <T variant="display">¡Hola, {user?.name}!</T>
            <T style={styles.heroLine}>{MOOD_LINE[mood]}</T>
            <T variant="label" color={colors.lime}>Nivel {stats.level.level} · {stats.rank.name}</T>
          </View>
          <View style={styles.heroGecko}>
            <Gecko mood={mood} size={210} />
          </View>
        </View>
        <Button label="Crear compromiso" icon="plus" onPress={() => router.push('/commitment/new')} />
      </View>

      <View style={styles.section}>
        <SectionHeader
          title={open.length > 1 ? 'Tus retos activos' : 'Tu reto activo'}
          action={open.length > 0 ? 'Ver todos' : undefined}
          onAction={() => router.push('/commitments')}
        />
        {open.length === 0 ? (
          <EmptyState title="Nada en juego todavía" body="Crea tu primer compromiso y dale a Gecko un motivo para animarte." />
        ) : (
          open.slice(0, 3).map((c) => <CommitmentCard key={c.id} commitment={c} activities={activities} now={now} />)
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader title="Esta semana" />
        <View style={styles.tiles}>
          <Tile icon="run" color={colors.lime} value={formatKm(sum(week, (a) => a.verification.verifiedDistanceM), 1)} unit="km" />
          <Tile icon="steps" color={colors.lime} value={formatInt(sum(week, (a) => a.steps ?? 0))} unit="pasos" />
          <Tile icon="flame" color="#FF8A3D" value={formatInt(sum(week, (a) => a.calories))} unit="kcal" />
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Hoy" />
        <Card style={styles.row}>
          <Stat label="Pasos" value={formatInt(steps)} />
          <View style={styles.divider} />
          <Stat label="Distancia" value={formatKm(sum(today, (a) => a.verification.verifiedDistanceM))} unit="km" />
          <View style={styles.divider} />
          <Stat label="A salvo" value={formatMoney(stats.savedCents)} />
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Actividad reciente"
          action={activities.length > 3 ? 'Historial' : undefined}
          onAction={() => router.push('/profile')}
        />
        {activities.length === 0 ? (
          <EmptyState title="Aún no hay actividades" body="Pulsa el botón central para registrar tu primera carrera, paseo o salida en bici." />
        ) : (
          <Card style={{ paddingVertical: space.sm }}>
            {activities.slice(0, 3).map((a) => (
              <ActivityRow key={a.id} activity={a} now={now} />
            ))}
          </Card>
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader title="Retos recomendados" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.carousel}>
          {CHALLENGES.map((c) => (
            <Pressable
              key={c.id}
              accessibilityRole="button"
              accessibilityLabel={`Reto ${c.title}`}
              onPress={() => openChallenge(c)}
              style={({ pressed }) => [styles.challenge, pressed && { opacity: 0.8 }]}
            >
              <ActivityBadge type={c.activityType} size={38} />
              <View style={{ gap: 2 }}>
                <T variant="heading">{c.title}</T>
                <T variant="caption" numberOfLines={2}>{c.tagline}</T>
              </View>
              <View style={styles.challengeFoot}>
                <T variant="stat" color={colors.lime}>{formatMoney(c.stakeCents)}</T>
                <T variant="caption">{formatInt(c.participants)} dentro</T>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wordmark: { fontSize: 26, fontWeight: '900', letterSpacing: 1.5 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { fontWeight: '900', fontSize: 15, fontVariant: ['tabular-nums'] },
  hero: { flexDirection: 'row', alignItems: 'flex-end', minHeight: 200 },
  heroText: { flex: 1, gap: 8, paddingBottom: space.xl },
  heroLine: { fontSize: 17, lineHeight: 23, color: colors.textMuted },
  // La mascota asoma por detrás del botón, como si se apoyara en él.
  heroGecko: { marginBottom: -10, marginRight: -4 },
  section: { gap: space.md },
  tiles: { flexDirection: 'row', gap: space.md },
  tile: { flex: 1, alignItems: 'center', gap: 4, paddingHorizontal: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  divider: { width: 1, height: 32, backgroundColor: colors.border },
  bleed: { marginHorizontal: -space.xl },
  carousel: { paddingHorizontal: space.xl, gap: space.md },
  challenge: {
    width: 190,
    gap: space.md,
    justifyContent: 'space-between',
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  challengeFoot: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
});
