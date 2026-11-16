import { formatDay, formatStamp } from '@core/season.ts';
import { summarizeWallet } from '@core/wallet.ts';
import { Text, View } from 'react-native';

import { countdown, useNow } from '@/components/match';
import { QueryState } from '@/components/status';
import { Card, Icon, NavHeader, Notice, Row, Screen, SectionTitle, Stat, Txt, type IconName } from '@/components/ui';
import { useQuery } from '@/lib/api';
import type { WalletView } from '@/lib/types';
import { coins, color, font, signed, space } from '@/theme/tokens';

interface SeasonRow {
  season_id: number;
  starts_at: number;
  ends_at: number;
  rank: number;
  net_profit: number;
  final_balance: number;
  predictions: number;
  won: number;
  players: number;
}

const KIND: Record<WalletView['ledger'][number]['kind'], [string, IconName]> = {
  season_grant: ['Weekly coins', 'gift'],
  stake: ['Stake', 'arrow-up-circle'],
  payout: ['Winnings', 'arrow-down-circle'],
  refund: ['Stake returned', 'refresh-circle'],
  correction: ['Result correction', 'construct'],
};

export default function Wallet() {
  const { data, loading, error, reload } = useQuery<WalletView>('my_wallet');
  const seasons = useQuery<SeasonRow[]>('my_seasons');
  const now = useNow();
  if (!data) {
    return (
      <Screen header={<NavHeader title="Wallet" />}>
        <QueryState loading={loading} error={error} onRetry={reload} />
      </Screen>
    );
  }
  const w = summarizeWallet({ balance: data.wallet.balance, openStakes: data.wallet.open_stakes, totalStaked: data.wallet.total_staked, totalReturned: data.wallet.total_returned });
  return (
    <Screen header={<NavHeader title="Wallet" subtitle={`Week of ${formatDay(data.season.starts_at)}`} />}>
      <Card tone="accent">
        <Txt v="caption" c={color.accent}>Available</Txt>
        <Text style={{ fontFamily: font.displayHeavy, fontSize: 48, lineHeight: 52, letterSpacing: -1.5, color: color.text }}>{coins(w.balance)}</Text>
        <Row>
          <Stat value={coins(w.openStakes)} label="In play" />
          <Stat value={coins(w.equity)} label="Total value" />
          <Stat value={countdown(data.season.ends_at - now)} label="Week ends" />
        </Row>
      </Card>
      <Card>
        <Row>
          <Stat value={coins(w.totalStaked)} label="Staked" />
          <Stat value={coins(w.totalReturned)} label="Returned" />
          <Stat value={signed(w.netProfit)} label="Profit / loss" tint={w.netProfit > 0 ? color.accent : w.netProfit < 0 ? color.danger : color.text} />
          <Stat value={w.roi == null ? '–' : `${(w.roi * 100).toFixed(0)}%`} label="Return" />
        </Row>
        <Row>
          <Stat value={data.counts.open} label="Open" />
          <Stat value={data.counts.won} label="Won" tint={color.accent} />
          <Stat value={data.counts.lost} label="Lost" />
          <Stat value={data.counts.void} label="Void" />
        </Row>
      </Card>
      <Notice
        tone="muted"
        icon="shield-checkmark"
        text={`Coins are game points. Everyone gets ${coins(data.wallet.granted)} each Monday at 00:00 Madrid time. They cannot be bought, sold, transferred, withdrawn or exchanged for anything, and there are no cash prizes.`}
      />

      <SectionTitle title="This week's movements" />
      <Card pad={space.md} style={{ gap: 0 }}>
        {data.ledger.map((l, i) => {
          const [label, icon] = KIND[l.kind];
          return (
            <Row key={l.id} style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: color.line }}>
              <Icon name={icon} size={20} c={l.amount >= 0 ? color.accent : color.muted} />
              <View style={{ flex: 1 }}>
                <Txt v="bodyBold" style={{ fontSize: 14 }} numberOfLines={1}>{l.label ? `${label} · ${l.label}` : label}</Txt>
                <Txt v="small" c={color.faint}>{formatStamp(l.at)} · balance {coins(l.balance_after)}</Txt>
              </View>
              <Txt v="num" c={l.amount >= 0 ? color.accent : color.text} style={{ fontSize: 15 }}>{signed(l.amount)}</Txt>
            </Row>
          );
        })}
      </Card>

      <SectionTitle title="Previous weeks" />
      {seasons.data?.length ? (
        <Card pad={space.md} style={{ gap: 0 }}>
          {seasons.data.map((s, i) => (
            <Row key={s.season_id} style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: color.line }}>
              <View style={{ flex: 1 }}>
                <Txt v="bodyBold" style={{ fontSize: 14 }}>Week of {formatDay(s.starts_at)}</Txt>
                <Txt v="small" c={color.muted}>#{s.rank} of {s.players} · {s.won}/{s.predictions} correct</Txt>
              </View>
              <Txt v="num" c={s.net_profit > 0 ? color.accent : s.net_profit < 0 ? color.danger : color.text} style={{ fontSize: 15 }}>{signed(s.net_profit)}</Txt>
            </Row>
          ))}
        </Card>
      ) : (
        <Txt c={color.muted}>{seasons.data ? 'Your finished weeks will be kept here.' : 'Loading…'}</Txt>
      )}
    </Screen>
  );
}
