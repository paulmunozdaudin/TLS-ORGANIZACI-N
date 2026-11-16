import { router } from 'expo-router';
import { View } from 'react-native';

import { LeagueCard } from '@/components/game';
import { Button, Card, DemoNote, Empty, Row, Screen, SectionTitle, Txt } from '@/components/ui';
import { leagueStandings, publicLobbies } from '@/state/game';
import { useActiveLeague } from '@/state/hooks';
import { actions, attempt } from '@/state/store';
import { color, space } from '@/theme/tokens';

export default function Leagues() {
  const { s, leagues } = useActiveLeague();
  const lobbies = publicLobbies(s);
  const open = (id: string) => {
    actions.setActiveLeague(id);
    router.push(`/league/${id}`);
  };
  return (
    <Screen tabbed header={<Txt v="h1">Leagues</Txt>}>
      <Row>
        <Button label="Create" icon="add" onPress={() => router.push('/league/create')} style={{ flex: 1 }} />
        <Button label="Join with code" icon="key-outline" kind="secondary" onPress={() => router.push('/league/join')} style={{ flex: 1 }} />
      </Row>

      <SectionTitle title="Your leagues" />
      {leagues.length ? (
        leagues.map((l) => (
          <LeagueCard
            key={l.id}
            league={l}
            rank={l.status === 'lobby' ? undefined : leagueStandings(s, l).findIndex((r) => r.managerId === s.meId) + 1}
            onPress={() => open(l.id)}
          />
        ))
      ) : (
        <Card>
          <Empty icon="trophy" title="You are not in a league" body="Create one for your friends, or join with an invitation code." />
        </Card>
      )}

      <SectionTitle title="Public leagues" />
      <DemoNote text="Demo mode · public leagues here are filled with bot managers" />
      {lobbies.length ? (
        lobbies.map((l) => (
          <Card key={l.id}>
            <Row>
              <View style={{ flex: 1, gap: 3 }}>
                <Txt v="h3">{l.name}</Txt>
                <Txt v="small" c={color.muted}>
                  {l.memberIds.length}/{l.size} managers · {l.size - l.memberIds.length} seat{l.size - l.memberIds.length > 1 ? 's' : ''} left
                </Txt>
              </View>
              <Button
                label="Join"
                small
                kind="secondary"
                onPress={() => {
                  if (attempt(actions.joinLeague(l.code), `You joined ${l.name}.`)) router.push(`/league/${l.id}`);
                }}
              />
            </Row>
          </Card>
        ))
      ) : (
        <Txt c={color.muted} style={{ paddingVertical: space.md }}>No public league has an open seat right now.</Txt>
      )}
    </Screen>
  );
}
