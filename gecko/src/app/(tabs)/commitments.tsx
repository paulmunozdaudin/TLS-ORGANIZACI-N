import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { EmptyState, Segmented, Stat } from '@/components/cards/common';
import { CommitmentCard } from '@/components/cards/CommitmentCard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { formatMoney } from '@/domain/format';
import { useNow } from '@/hooks/useNow';
import { useAppStore } from '@/store/useAppStore';
import { colors, radius, space } from '@/theme/tokens';

type Tab = 'open' | 'history';

export default function Commitments() {
  const now = useNow();
  const [tab, setTab] = useState<Tab>('open');
  const commitments = useAppStore((s) => s.commitments);
  const activities = useAppStore((s) => s.activities);
  const wallet = useAppStore((s) => s.wallet);

  const open = commitments
    .filter((c) => c.status === 'active' || c.status === 'pending_verification')
    .sort((a, b) => a.deadline - b.deadline);
  const history = commitments.filter((c) => c.status === 'completed' || c.status === 'failed');
  const list = tab === 'open' ? open : history;

  return (
    <Screen tabbed>
      <View style={styles.header}>
        <T variant="display">Retos</T>
        <View style={styles.sim}>
          <T style={styles.simText}>Simulación</T>
        </View>
      </View>

      <Card tone="high" style={{ gap: space.lg }}>
        <View style={{ gap: 2 }}>
          <T variant="label">En juego ahora</T>
          <T variant="statLg" color={wallet.heldCents > 0 ? colors.lime : colors.text}>{formatMoney(wallet.heldCents)}</T>
        </View>
        <View style={styles.row}>
          <Stat label="Disponible" value={formatMoney(wallet.availableCents)} />
          <Stat label="Retos abiertos" value={String(open.length)} />
        </View>
        <Button label="Crear compromiso" icon="plus" onPress={() => router.push('/commitment/new')} />
      </Card>

      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { key: 'open', label: `Activos (${open.length})` },
          { key: 'history', label: `Historial (${history.length})` },
        ]}
      />

      <View style={{ gap: space.md }}>
        {list.length === 0 ? (
          tab === 'open' ? (
            <EmptyState title="Sin retos activos" body="Elige una actividad, un objetivo y cuánto te juegas. Gecko hace el resto." />
          ) : (
            <EmptyState title="Aún no hay historial" body="Aquí verás los retos que cumplas y los que se te escapen." />
          )
        ) : (
          list.map((c) => <CommitmentCard key={c.id} commitment={c} activities={activities} now={now} />)
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sim: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  simText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', color: colors.textMuted },
  row: { flexDirection: 'row', gap: space.md },
});
