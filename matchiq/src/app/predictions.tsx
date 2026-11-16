import { formatDay, formatStamp, formatTime } from '@core/season.ts';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { PredictionStatusPill } from '@/components/match';
import { QueryState } from '@/components/status';
import { Card, Empty, NavHeader, Row, Screen, Segmented, Stat, Txt } from '@/components/ui';
import { useQuery } from '@/lib/api';
import type { Prediction } from '@/lib/types';
import { coins, color, odds, signed, space } from '@/theme/tokens';

const SOURCE = { consensus: 'market average', best: 'best price', bookmaker: 'bookmaker' } as const;

export default function Predictions() {
  const [status, setStatus] = useState<'open' | 'settled'>('open');
  const { data, loading, error, reload } = useQuery<Prediction[]>('my_predictions', { p_status: status, p_limit: 200 });
  const settled = (data ?? []).filter((p) => p.status === 'won' || p.status === 'lost');
  const staked = settled.reduce((s, p) => s + p.stake, 0);
  const returned = settled.reduce((s, p) => s + (p.payout ?? 0), 0);
  return (
    <Screen
      header={
        <View style={{ gap: space.md }}>
          <NavHeader title="My predictions" />
          <Segmented value={status} onChange={setStatus} options={[{ value: 'open', label: 'In play' }, { value: 'settled', label: 'Settled' }]} />
        </View>
      }>
      {status === 'settled' && settled.length ? (
        <Card>
          <Row>
            <Stat value={settled.length} label="Settled" />
            <Stat value={`${Math.round((settled.filter((p) => p.status === 'won').length / settled.length) * 100)}%`} label="Correct" />
            <Stat value={signed(returned - staked)} label="Profit" tint={returned >= staked ? color.accent : color.danger} />
            <Stat value={staked ? `${(((returned - staked) / staked) * 100).toFixed(0)}%` : '–'} label="Return" />
          </Row>
        </Card>
      ) : null}
      {data ? (
        data.length ? (
          data.map((p) => (
            <Card key={p.id} onPress={() => router.push(`/match/${p.fixture.id}`)} pad={space.md}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt v="caption" c={color.muted} numberOfLines={1} style={{ flex: 1 }}>
                  {p.fixture.home.name} v {p.fixture.away.name} · {formatDay(p.fixture.kickoff_at)} {formatTime(p.fixture.kickoff_at)}
                </Txt>
                <PredictionStatusPill status={p.status} />
              </Row>
              <Txt v="h3">{p.player ? `${p.player} · ${p.market}${p.line != null ? ` · ${p.label}` : ''}` : `${p.market}: ${p.label}`}</Txt>
              <Row>
                <Stat value={coins(p.stake)} label="Stake" />
                <Stat value={odds(p.locked_odds)} label="Locked odds" tint={color.accent} />
                <Stat value={coins(p.status === 'open' ? p.potential_return : p.payout ?? 0)} label={p.status === 'open' ? 'If correct' : 'Returned'} />
              </Row>
              <Txt v="small" c={color.faint}>
                Placed {formatStamp(p.placed_at)} at the {p.bookmaker ?? SOURCE[p.odds_mode]}
                {p.odds_mode === 'consensus' && p.basis ? ` of ${p.basis} bookmaker${p.basis === 1 ? '' : 's'}` : ''}.
                {p.reason ? ` Settled: ${p.reason}.` : ''}
              </Txt>
            </Card>
          ))
        ) : (
          <Card>
            <Empty
              icon="receipt"
              title={status === 'open' ? 'Nothing in play' : 'No settled predictions yet'}
              body={status === 'open' ? 'Predictions you place appear here until the match is settled.' : 'Results land here once official match data is in.'}
              action={status === 'open' ? 'Browse matches' : undefined}
              onAction={() => router.push('/matches')}
            />
          </Card>
        )
      ) : (
        <QueryState loading={loading} error={error} onRetry={reload} />
      )}
    </Screen>
  );
}
