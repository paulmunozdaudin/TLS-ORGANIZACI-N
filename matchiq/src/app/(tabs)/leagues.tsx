import { router } from 'expo-router';
import { View } from 'react-native';

import { QueryState } from '@/components/status';
import { Button, Card, Empty, Icon, Pill, Row, Screen, SectionTitle, Txt } from '@/components/ui';
import { ApiError, call, invalidate, useQuery } from '@/lib/api';
import { toast } from '@/lib/feedback';
import type { League } from '@/lib/types';
import { color } from '@/theme/tokens';

function LeagueRow({ league, action }: { league: League; action?: () => void }) {
  return (
    <Card onPress={action ? undefined : () => router.push(`/league/${league.id}`)}>
      <Row>
        <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: color.accentDim, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={league.is_public ? 'earth' : 'lock-closed'} size={20} c={color.accent} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Txt v="h3" numberOfLines={1}>{league.name}</Txt>
          <Txt v="small" c={color.muted}>{league.members} member{league.members === 1 ? '' : 's'} · {league.is_public ? 'Public' : 'Private'}</Txt>
        </View>
        {action ? <Button label="Join" small kind="secondary" onPress={action} /> : league.is_owner ? <Pill label="OWNER" tone="accent" /> : <Icon name="chevron-forward" c={color.faint} />}
      </Row>
    </Card>
  );
}

export default function Leagues() {
  const mine = useQuery<League[]>('my_leagues');
  const open = useQuery<League[]>('public_leagues', { p_search: null });
  const join = async (league: League) => {
    try {
      // Public leagues are joined by id through their code, which only the server knows for non-members.
      await call('join_public_league', { p_league_id: league.id });
      toast(`You joined ${league.name}.`);
      invalidate('my_leagues', 'public_leagues');
      router.push(`/league/${league.id}`);
    } catch (e) {
      toast((e as ApiError).message, 'error');
    }
  };
  return (
    <Screen tabbed header={<Txt v="h1">Leagues</Txt>}>
      <Row>
        <Button label="Create" icon="add" onPress={() => router.push('/league/create')} style={{ flex: 1 }} />
        <Button label="Join with code" icon="key-outline" kind="secondary" onPress={() => router.push('/league/join')} style={{ flex: 1 }} />
      </Row>
      <SectionTitle title="Your leagues" />
      {mine.data ? (
        mine.data.length ? (
          mine.data.map((l) => <LeagueRow key={l.id} league={l} />)
        ) : (
          <Card>
            <Empty icon="people" title="You are not in a league" body="Create one for your friends or join with an invitation code. Everyone plays the same week with the same 1,000 coins." />
          </Card>
        )
      ) : (
        <QueryState loading={mine.loading} error={mine.error} onRetry={mine.reload} rows={2} />
      )}
      <SectionTitle title="Public leagues" />
      {open.data ? (
        open.data.length ? (
          open.data.map((l) => <LeagueRow key={l.id} league={l} action={() => join(l)} />)
        ) : (
          <Txt c={color.muted}>No public league to join right now. Start one.</Txt>
        )
      ) : (
        <QueryState loading={open.loading} error={open.error} onRetry={open.reload} rows={1} />
      )}
    </Screen>
  );
}
