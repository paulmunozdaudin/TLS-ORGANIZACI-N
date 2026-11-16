import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { RankingTable } from '@/components/Ranking';
import { QueryState } from '@/components/status';
import { Card, Empty, Screen, Segmented, Txt } from '@/components/ui';
import { useQuery } from '@/lib/api';
import type { RankRow } from '@/lib/types';
import { color, space } from '@/theme/tokens';

type Scope = 'season' | 'friends' | 'alltime';

export default function Rankings() {
  const [scope, setScope] = useState<Scope>('season');
  const { data, loading, error, reload } = useQuery<RankRow[]>('get_rankings', { p_scope: scope }, 60_000);
  const me = data?.find((r) => r.is_me);
  const others = (data ?? []).filter((r) => !r.is_me).length;
  return (
    <Screen
      tabbed
      header={
        <View style={{ gap: space.md }}>
          <Txt v="h1">Rankings</Txt>
          <Segmented value={scope} onChange={setScope} options={[{ value: 'season', label: 'This week' }, { value: 'friends', label: 'Friends' }, { value: 'alltime', label: 'All time' }]} />
        </View>
      }>
      {data ? (
        <>
          {me ? (
            <Card tone="accent">
              <Txt v="caption" c={color.accent}>Your position</Txt>
              <Txt v="h1">#{me.rank}<Txt c={color.muted}>  of {data.length}</Txt></Txt>
            </Card>
          ) : null}
          {scope === 'friends' && !others ? (
            <Card>
              <Empty icon="people" title="No friends yet" body="Add friends by username to see how your week compares." action="Find friends" onAction={() => router.push('/friends')} />
            </Card>
          ) : data.length ? (
            <Card>
              <RankingTable rows={data} />
            </Card>
          ) : (
            <Card>
              <Empty icon="podium" title="Nobody on the board yet" body="Rankings fill up as predictions are placed." />
            </Card>
          )}
          <Txt v="small" c={color.faint}>
            {scope === 'alltime'
              ? 'All time adds up finished weeks plus the current one.'
              : 'Profit counts coins won minus coins staked, with open predictions at their stake. Weeks run Monday to Sunday, Madrid time.'}
          </Txt>
        </>
      ) : (
        <QueryState loading={loading} error={error} onRetry={reload} />
      )}
    </Screen>
  );
}
