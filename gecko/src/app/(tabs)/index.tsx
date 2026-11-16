import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ActivityRow } from '@/components/cards/ActivityRow';
import { ActivityBadge, EmptyState, SectionHeader, Stat } from '@/components/cards/common';
import { CommitmentCard } from '@/components/cards/CommitmentCard';
import { lastSevenDays, WeekChart } from '@/components/cards/WeekChart';
import { Gecko } from '@/components/mascot/Gecko';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
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

function greeting(now: number): string {
  const h = new Date(now).getHours();
  if (h < 6) return 'Buenas noches';
  if (h < 13) return 'Buenos días';
  if (h < 21) return 'Buenas tardes';
  return 'Buenas noches';
}

const MOOD_LINE: Record<GeckoMood, { title: string; body: string }> = {
  neutral: { title: '¿Qué te juegas hoy?', body: 'Ponle precio a tu palabra y sal a cumplirla.' },
  motivated: { title: 'Tienes algo en juego.', body: 'Tu reto está activo. Sal y recupera lo tuyo.' },
  happy: { title: '¡Reto cumplido!', body: 'Has recuperado tu dinero. Así se hace.' },
  proud: { title: 'Estás en racha.', body: 'Días seguidos cumpliendo. No la rompas ahora.' },
  disappointed: { title: 'Esta vez no salió.', body: 'El último reto se escapó. La revancha empieza hoy.' },
};

export default function Home() {
  const now = useNow();
  const user = useAppStore((s) => s.user);
  const activities = useAppStore((s) => s.activities);
  const commitments = useAppStore((s) => s.commitments);
  const { steps } = useTodaySteps(now);

  const stats = computeStats(activities, commitments, now);
  const mood = geckoMood(activities, commitments, now);
  const line = MOOD_LINE[mood];
  const open = commitments.filter((c) => c.status === 'active' || c.status === 'pending_verification');
  const today = activities.filter((a) => dayKey(a.startedAt) === dayKey(now) && a.verification.status === 'verified');
  const todayKm = today.reduce((s, a) => s + a.verification.verifiedDistanceM, 0);
  const todayKcal = today.reduce((s, a) => s + a.calories, 0);
  const week = lastSevenDays(activities, now);
  const weekM = week.reduce((s, d) => s + d.distanceM, 0);
  const activeDays = week.filter((d) => d.distanceM > 0).length;

  return (
    <Screen tabbed>
      <View style={styles.header}>
        <View style={styles.flex}>
          <T variant="caption">{greeting(now)},</T>
          <T variant="title">{user?.name}</T>
        </View>
        <View style={styles.chip} accessibilityLabel={`Racha de ${stats.streak} días`}>
          <Icon name="flame" size={16} color={stats.streak > 0 ? colors.lime : colors.textDim} />
          <T style={styles.chipText}>{stats.streak}</T>
        </View>
      </View>

      <Card tone="high" style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.heroText}>
            <T variant="label" color={colors.lime}>Nivel {stats.level.level} · {stats.rank.name}</T>
            <T variant="title">{line.title}</T>
            <T variant="caption">{line.body}</T>
          </View>
          <Gecko mood={mood} size={124} />
        </View>
        <Button label="Crear compromiso" icon="plus" onPress={() => router.push('/commitment/new')} />
      </Card>

      <View style={styles.section}>
        <SectionHeader title="Hoy" />
        <Card style={styles.row}>
          <Stat label="Pasos" value={formatInt(steps)} />
          <View style={styles.divider} />
          <Stat label="Distancia" value={formatKm(todayKm)} unit="km" />
          <View style={styles.divider} />
          <Stat label="Calorías" value={formatInt(todayKcal)} unit="kcal" />
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Retos activos"
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
        <Card style={{ gap: space.lg }}>
          <View style={styles.row}>
            <Stat label="Distancia" value={formatKm(weekM, 1)} unit="km" />
            <Stat label="Días activos" value={`${activeDays}/7`} />
            <Stat label="A salvo" value={formatMoney(stats.savedCents)} />
          </View>
          <WeekChart activities={activities} now={now} />
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.bleed}
          contentContainerStyle={styles.carousel}
        >
          {CHALLENGES.map((c) => (
            <Card key={c.id} onPress={() => openChallenge(c)} style={styles.challenge} accessibilityLabel={`Reto ${c.title}`}>
              <ActivityBadge type={c.activityType} size={38} />
              <View style={{ gap: 2 }}>
                <T variant="heading">{c.title}</T>
                <T variant="caption" numberOfLines={2}>{c.tagline}</T>
              </View>
              <View style={styles.challengeFoot}>
                <T variant="stat" color={colors.lime}>{formatMoney(c.stakeCents)}</T>
                <T variant="caption">{formatInt(c.participants)} dentro</T>
              </View>
            </Card>
          ))}
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
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
  hero: { gap: space.lg },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  heroText: { flex: 1, gap: 6 },
  section: { gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  divider: { width: 1, height: 32, backgroundColor: colors.border },
  bleed: { marginHorizontal: -space.xl },
  carousel: { paddingHorizontal: space.xl, gap: space.md },
  challenge: { width: 190, gap: space.md, justifyContent: 'space-between' },
  challengeFoot: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
});
