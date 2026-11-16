import { useState } from 'react';
import { View } from 'react-native';

import { Avatar, Button, Card, DemoNote, Empty, Field, NavHeader, Row, Screen, SectionTitle, Txt } from '@/components/ui';
import { headToHead } from '@/domain/league';
import { APP_NAME } from '@/lib/backend';
import { shareText } from '@/lib/share';
import { myLeagues } from '@/state/game';
import { actions, attempt, useGameState } from '@/state/store';
import { color, space } from '@/theme/tokens';

export default function Friends() {
  const s = useGameState();
  const [query, setQuery] = useState('');
  const me = s.meId ?? '';
  const mates = new Set(myLeagues(s).flatMap((l) => l.memberIds));
  const others = Object.values(s.managers)
    .filter((m) => m.id !== me && !s.friends.includes(m.id))
    .filter((m) => (query.trim() ? m.username.toLowerCase().includes(query.trim().toLowerCase()) : mates.has(m.id)));
  const record = (id: string) => headToHead(s.fixtures, me, id);

  return (
    <Screen header={<NavHeader title="Friends" />}>
      <Card tone="accent">
        <Txt v="h3">Leagues are better with people you know</Txt>
        <Txt v="small" c={color.muted}>Send the app to a friend, then invite them to a league with your code.</Txt>
        <Button label="Invite a friend" icon="share-outline" onPress={() => shareText(`Come play ${APP_NAME} with me: fantasy football in private leagues, one rival every matchday.`)} />
      </Card>

      <SectionTitle title={`Your friends · ${s.friends.length}`} />
      {s.friends.length ? (
        <Card pad={space.md} style={{ gap: 0 }}>
          {s.friends.map((id, i) => {
            const r = record(id);
            return (
              <Row key={id} style={{ paddingVertical: space.md, borderTopWidth: i ? 1 : 0, borderTopColor: color.line }}>
                <Avatar manager={s.managers[id]} />
                <View style={{ flex: 1 }}>
                  <Txt v="bodyBold">{s.managers[id].username}</Txt>
                  <Txt v="small" c={color.muted}>
                    {r.played ? `Head-to-head ${r.wins}W ${r.draws}D ${r.losses}L` : 'You have not played each other yet'}
                  </Txt>
                </View>
                <Button label="Remove" small kind="ghost" onPress={() => attempt(actions.toggleFriend(id))} />
              </Row>
            );
          })}
        </Card>
      ) : (
        <Card>
          <Empty icon="people" title="No friends yet" body="Add managers you play against, or invite someone new." />
        </Card>
      )}

      <SectionTitle title={query.trim() ? 'Search results' : 'Managers from your leagues'} />
      <Field placeholder="Search by manager name" icon="search" value={query} onChangeText={setQuery} autoCapitalize="none" autoCorrect={false} />
      <DemoNote text="Demo mode · every other manager is a bot" />
      {others.length ? (
        <Card pad={space.md} style={{ gap: 0 }}>
          {others.map((m, i) => (
            <Row key={m.id} style={{ paddingVertical: space.md, borderTopWidth: i ? 1 : 0, borderTopColor: color.line }}>
              <Avatar manager={m} />
              <Txt v="bodyBold" style={{ flex: 1 }}>{m.username}</Txt>
              <Button label="Add" icon="person-add" small kind="secondary" onPress={() => attempt(actions.toggleFriend(m.id), `${m.username} added.`)} />
            </Row>
          ))}
        </Card>
      ) : (
        <Txt c={color.muted}>{query.trim() ? 'No manager with that name.' : 'Everyone from your leagues is already a friend.'}</Txt>
      )}
    </Screen>
  );
}
