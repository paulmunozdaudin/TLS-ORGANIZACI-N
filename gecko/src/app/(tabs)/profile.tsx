import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActivityRow } from '@/components/cards/ActivityRow';
import { EmptyState, SectionHeader, Stat } from '@/components/cards/common';
import { Gecko } from '@/components/mascot/Gecko';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { ProgressBar } from '@/components/ui/Progress';
import { Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { formatDuration, formatInt, formatKm, formatMoney } from '@/domain/format';
import { ACHIEVEMENTS, computeStats, geckoMood } from '@/domain/gamification';
import { useNow } from '@/hooks/useNow';
import { useTracking } from '@/services/tracking/useTracking';
import { useAppStore } from '@/store/useAppStore';
import { colors, radius, space } from '@/theme/tokens';

const HISTORY_PAGE = 5;

export default function Profile() {
  const now = useNow();
  const user = useAppStore((s) => s.user);
  const activities = useAppStore((s) => s.activities);
  const commitments = useAppStore((s) => s.commitments);
  const wallet = useAppStore((s) => s.wallet);
  const resetAll = useAppStore((s) => s.resetAll);
  const [shown, setShown] = useState(HISTORY_PAGE);
  const [confirmReset, setConfirmReset] = useState(false);

  const stats = computeStats(activities, commitments, now);
  const mood = geckoMood(activities, commitments, now);
  const unlocked = ACHIEVEMENTS.filter((a) => a.progress(stats) >= 1).length;

  return (
    <Screen tabbed>
      <View style={styles.head}>
        <View style={styles.avatar}>
          <Gecko mood={mood} size={84} animated={false} />
        </View>
        <View style={styles.flex}>
          <T variant="title">{user?.name}</T>
          <T variant="caption">@{user?.username}</T>
          <View style={styles.rank}>
            <Icon name="trophy" size={13} color={colors.onLime} />
            <T style={styles.rankText}>{stats.rank.name}</T>
          </View>
        </View>
      </View>

      <Card tone="high" style={{ gap: space.md }}>
        <View style={styles.rowBetween}>
          <View style={styles.levelRow}>
            <T variant="statLg">{stats.level.level}</T>
            <T variant="label">Nivel Gecko</T>
          </View>
          <View style={styles.streak}>
            <Icon name="flame" size={18} color={stats.streak > 0 ? colors.lime : colors.textDim} />
            <T variant="stat">{stats.streak}</T>
            <T variant="label">{stats.streak === 1 ? 'día' : 'días'}</T>
          </View>
        </View>
        <ProgressBar ratio={stats.level.ratio} height={10} />
        <View style={styles.rowBetween}>
          <T variant="caption">{formatInt(stats.level.current)} / {formatInt(stats.level.needed)} XP</T>
          <T variant="caption">
            {stats.nextRank
              ? `${stats.nextRank.minCompleted - stats.completed} retos para ${stats.nextRank.name}`
              : 'Rango máximo alcanzado'}
          </T>
        </View>
      </Card>

      <View style={styles.section}>
        <SectionHeader title="Estadísticas" />
        <Card style={{ gap: space.lg }}>
          <View style={styles.row}>
            <Stat label="Distancia total" value={formatKm(stats.totalDistanceM, 1)} unit="km" />
            <Stat label="Pasos" value={formatInt(stats.totalSteps)} />
          </View>
          <View style={styles.row}>
            <Stat label="Actividades" value={String(stats.totalActivities)} />
            <Stat label="Tiempo activo" value={formatDuration(stats.totalMovingSec)} />
          </View>
          <View style={styles.row}>
            <Stat label="Mejor racha" value={`${stats.bestStreak} d`} />
            <Stat label="Actividad más larga" value={formatKm(stats.longestM, 1)} unit="km" />
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Compromisos" />
        <View style={styles.row}>
          <Card style={styles.tile}>
            <T variant="statLg" color={colors.lime}>{stats.completed}</T>
            <T variant="label">Cumplidos</T>
            <T variant="caption">{formatMoney(stats.savedCents)} a salvo</T>
          </Card>
          <Card style={styles.tile}>
            <T variant="statLg" color={stats.failed > 0 ? colors.danger : colors.text}>{stats.failed}</T>
            <T variant="label">Fallidos</T>
            <T variant="caption">{formatMoney(stats.lostCents)} perdidos</T>
          </Card>
        </View>
        <Card style={styles.rowBetween}>
          <View style={styles.walletRow}>
            <Icon name="wallet" size={18} color={colors.textMuted} />
            <T variant="caption">Saldo de simulación</T>
          </View>
          <T variant="heading">
            {formatMoney(wallet.availableCents)}
            {wallet.heldCents > 0 ? <T variant="caption"> + {formatMoney(wallet.heldCents)} en juego</T> : null}
          </T>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title={`Logros · ${unlocked}/${ACHIEVEMENTS.length}`} />
        <View style={styles.achievements}>
          {ACHIEVEMENTS.map((a) => {
            const progress = a.progress(stats);
            const done = progress >= 1;
            return (
              <View
                key={a.id}
                accessible
                accessibilityLabel={`${a.title}: ${a.description}. ${done ? 'Desbloqueado' : `${Math.floor(progress * 100)} por ciento`}`}
                style={[styles.achievement, done && styles.achievementDone]}
              >
                <View style={[styles.achievementIcon, done && { backgroundColor: colors.lime }]}>
                  <Icon name={done ? a.icon : 'lock'} size={18} color={done ? colors.onLime : colors.textDim} />
                </View>
                <T style={[styles.achievementTitle, !done && { color: colors.textMuted }]} numberOfLines={1}>{a.title}</T>
                <T variant="caption" style={styles.achievementBody} numberOfLines={2}>{a.description}</T>
                {!done ? <ProgressBar ratio={progress} height={4} /> : null}
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Historial deportivo" />
        {activities.length === 0 ? (
          <EmptyState title="Sin actividades" body="Tu historial aparecerá aquí cuando registres tu primera actividad." />
        ) : (
          <Card style={{ paddingVertical: space.sm }}>
            {activities.slice(0, shown).map((a) => (
              <ActivityRow key={a.id} activity={a} now={now} />
            ))}
            {activities.length > shown ? (
              <Button label="Ver más" variant="ghost" size="md" onPress={() => setShown(shown + HISTORY_PAGE)} />
            ) : null}
          </Card>
        )}
      </View>

      <View style={styles.section}>
        {confirmReset ? (
          <Card style={{ gap: space.md }}>
            <T variant="heading">¿Borrar todos los datos?</T>
            <T variant="caption">Se eliminarán tu perfil, actividades, retos y saldo de simulación de este dispositivo. No se puede deshacer.</T>
            <View style={styles.row}>
              <Button label="Cancelar" variant="secondary" size="md" onPress={() => setConfirmReset(false)} style={styles.flex} />
              <Button
                label="Borrar todo"
                variant="danger"
                size="md"
                onPress={() => {
                  useTracking.getState().discard();
                  resetAll();
                  router.replace('/welcome');
                }}
                style={styles.flex}
              />
            </View>
          </Card>
        ) : (
          <Button label="Borrar datos locales" variant="ghost" size="md" onPress={() => setConfirmReset(true)} />
        )}
        <T variant="caption" center>Gecko 0.1.0 · Modo simulación</T>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 2,
    borderColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  rank: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    marginTop: 6,
    paddingHorizontal: 10,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: colors.lime,
  },
  rankText: { fontSize: 12, fontWeight: '900', color: colors.onLime },
  section: { gap: space.md },
  row: { flexDirection: 'row', gap: space.md },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  levelRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tile: { flex: 1, gap: 2 },
  walletRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  achievements: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  achievement: {
    flexBasis: '47%',
    flexGrow: 1,
    gap: 6,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  achievementDone: { borderColor: colors.limeDeep, backgroundColor: colors.surfaceHigh },
  achievementIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementTitle: { fontSize: 14, fontWeight: '800' },
  achievementBody: { minHeight: 36 },
});
