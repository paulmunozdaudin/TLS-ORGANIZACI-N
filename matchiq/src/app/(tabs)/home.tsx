import { summarizeWallet } from '@core/wallet.ts';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { countdown, FixtureCard, PredictionStatusPill, useNow } from '@/components/match';
import { DataBanner, QueryState } from '@/components/status';
import { Avatar, Button, Card, Empty, Icon, IconButton, Row, Screen, SectionTitle, Stat, Txt } from '@/components/ui';
import { useQuery } from '@/lib/api';
import { useSession } from '@/lib/session';
import type { FixtureListItem, NotificationRow, Prediction, WalletView } from '@/lib/types';
import { coins, color, font, odds, signed, space } from '@/theme/tokens';

export default function Home() {
  const { profile } = useSession();
  const now = useNow();
  // Window is fixed per mount so the query key stays stable between renders.
  const [openedAt] = useState(() => Date.now());
  const window = useMemo(() => ({ p_from: new Date(openedAt - 3 * 3600e3).toISOString(), p_to: new Date(openedAt + 10 * 86400e3).toISOString() }), [openedAt]);
  const fixtures = useQuery<FixtureListItem[]>('list_fixtures', window, 60_000);
  const wallet = useQuery<WalletView>('my_wallet');
  const open = useQuery<Prediction[]>('my_predictions', { p_status: 'open', p_limit: 3 });
  const notes = useQuery<NotificationRow[]>('my_notifications');
  const unread = notes.data?.filter((n) => !n.read).length ?? 0;
  const w = wallet.data ? summarizeWallet({ balance: wallet.data.wallet.balance, openStakes: wallet.data.wallet.open_stakes, totalStaked: wallet.data.wallet.total_staked, totalReturned: wallet.data.wallet.total_returned }) : null;
  const upcoming = (fixtures.data ?? []).filter((f) => f.status === 'scheduled' || f.status === 'live').sort((a, b) => a.kickoff_at - b.kickoff_at);

  return (
    <Screen
      tabbed
      header={
        <Row>
          <Avatar person={profile} size={44} ring />
          <View style={{ flex: 1 }}>
            <Txt v="small" c={color.muted}>The game behind the game</Txt>
            <Txt v="h2" numberOfLines={1}>{profile?.username ?? '…'}</Txt>
          </View>
          <IconButton icon="notifications-outline" label="Notifications" badge={unread} onPress={() => router.push('/notifications')} />
        </Row>
      }>
      <DataBanner />

      <Card tone="accent" onPress={() => router.push('/wallet')}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt v="caption" c={color.accent}>This week&apos;s bankroll</Txt>
          {wallet.data ? (
            <Row gap={6}>
              <Icon name="time" size={13} c={color.muted} />
              <Txt v="small" c={color.muted}>Ends in {countdown(wallet.data.season.ends_at - now)}</Txt>
            </Row>
          ) : null}
        </Row>
        {w ? (
          <>
            <Row style={{ alignItems: 'flex-end' }} gap={space.sm}>
              <Text style={{ fontFamily: font.displayHeavy, fontSize: 44, lineHeight: 48, letterSpacing: -1.5, color: color.text }}>{coins(w.balance)}</Text>
              <Txt c={color.muted} style={{ marginBottom: 6 }}>coins available</Txt>
            </Row>
            <Row>
              <Stat value={coins(w.openStakes)} label="In play" />
              <Stat value={signed(w.netProfit)} label="Settled P/L" tint={w.netProfit > 0 ? color.accent : w.netProfit < 0 ? color.danger : color.text} />
              <Stat value={w.roi == null ? '–' : `${(w.roi * 100).toFixed(0)}%`} label="Return" />
            </Row>
          </>
        ) : (
          <QueryState loading={wallet.loading} error={wallet.error} onRetry={wallet.reload} rows={1} />
        )}
      </Card>

      <SectionTitle title="Next matches" action="All matches" onAction={() => router.push('/matches')} />
      {upcoming.length ? (
        upcoming.slice(0, 5).map((f) => <FixtureCard key={f.id} fixture={f} showDay />)
      ) : fixtures.data ? (
        <Card>
          <Empty icon="football" title="No upcoming matches" body="The fixtures feed has nothing scheduled in the next ten days, or has not synchronised yet." />
        </Card>
      ) : (
        <QueryState loading={fixtures.loading} error={fixtures.error} onRetry={fixtures.reload} />
      )}

      <SectionTitle title="Your open predictions" action="History" onAction={() => router.push('/predictions')} />
      {open.data?.length ? (
        <Card pad={space.md} style={{ gap: 0 }}>
          {open.data.map((p, i) => (
            <Row key={p.id} style={{ paddingVertical: space.md, borderTopWidth: i ? 1 : 0, borderTopColor: color.line }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt v="bodyBold" numberOfLines={1}>{p.player ? `${p.player} · ${p.market}` : p.label}</Txt>
                <Txt v="small" c={color.muted} numberOfLines={1}>{p.fixture.home.name} v {p.fixture.away.name}</Txt>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 2 }}>
                <Txt v="num" style={{ fontSize: 15 }}>{coins(p.stake)} @ {odds(p.locked_odds)}</Txt>
                <PredictionStatusPill status={p.status} />
              </View>
            </Row>
          ))}
        </Card>
      ) : open.data ? (
        <Card>
          <Txt c={color.muted}>Nothing in play. Pick a match and back your read of it.</Txt>
        </Card>
      ) : (
        <QueryState loading={open.loading} error={open.error} onRetry={open.reload} rows={1} />
      )}

      <Card onPress={() => router.push('/leagues')}>
        <Row>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: color.accentDim, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="people" size={20} c={color.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt v="h3">Play against friends</Txt>
            <Txt v="small" c={color.muted}>Create a private league and share the code.</Txt>
          </View>
          <Icon name="chevron-forward" c={color.muted} />
        </Row>
      </Card>
      <Button label="How coins work" kind="ghost" small onPress={() => router.push('/wallet')} />
    </Screen>
  );
}
