import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { PLAYERS_BY_ID } from '@/data/demo/catalog';
import { FixtureRow, formatCountdown, StandingsTable, timeAgo, useNow } from '@/components/game';
import { Avatar, Button, Card, Chip, DemoNote, Empty, Icon, IconButton, Pill, Row, Screen, SectionTitle, Txt } from '@/components/ui';
import { validateLineup } from '@/domain/lineup';
import { shareInvite } from '@/lib/share';
import { myFixture } from '@/state/game';
import { useActiveLeague } from '@/state/hooks';
import { actions } from '@/state/store';
import { color, radius, space } from '@/theme/tokens';

export default function Home() {
  const { s, me, leagues, league, team, standings, rank } = useActiveLeague();
  const now = useNow();
  const unread = s.notices.filter((n) => !n.read).length;
  const next = league?.status === 'active' ? myFixture(s, league, league.matchday) : undefined;
  const last = league && league.matchday > 1 ? myFixture(s, league, league.matchday - 1) : undefined;
  const rivalId = next ? (next.homeId === s.meId ? next.awayId : next.homeId) : null;
  const lineupOk = team ? validateLineup(team.lineup, team.squad, PLAYERS_BY_ID).valid : false;
  const locked = league ? now >= league.deadline : false;

  return (
    <Screen
      tabbed
      header={
        <Row>
          <Avatar manager={me} size={44} ring />
          <View style={{ flex: 1 }}>
            <Txt v="small" c={color.muted}>Good to see you</Txt>
            <Txt v="h2" numberOfLines={1}>{me?.username}</Txt>
          </View>
          <IconButton icon="notifications-outline" label="Notifications" badge={unread} onPress={() => router.push('/notifications')} />
        </Row>
      }>
      <DemoNote />

      {leagues.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          {leagues.map((l) => (
            <Chip key={l.id} label={l.name} active={l.id === league?.id} onPress={() => actions.setActiveLeague(l.id)} />
          ))}
        </ScrollView>
      ) : null}

      {!league ? (
        <Card>
          <Empty
            icon="trophy"
            title="No league yet"
            body="Create a private league for your friends or join one with an invitation code."
            action="Create a league"
            onAction={() => router.push('/league/create')}
          />
          <Button label="Join with a code" kind="ghost" onPress={() => router.push('/league/join')} />
        </Card>
      ) : league.status === 'lobby' ? (
        <Card tone="accent" onPress={() => router.push(`/league/${league.id}`)}>
          <Pill label="LOBBY" tone="warn" />
          <Txt v="h2">{league.name} is filling up</Txt>
          <Txt c={color.muted}>
            {league.memberIds.length} of {league.size} managers have joined. Share code {league.code} to fill the league.
          </Txt>
          <Button label="Invite friends" icon="share-outline" onPress={() => shareInvite(league)} />
        </Card>
      ) : league.status === 'finished' ? (
        <Card tone="accent" onPress={() => router.push(`/league/${league.id}`)}>
          <Pill label="SEASON OVER" tone="accent" icon="trophy" />
          <Txt v="h2">You finished #{rank} in {league.name}</Txt>
          <Txt c={color.muted}>Open the league to see the final table, or start a new one.</Txt>
        </Card>
      ) : next && rivalId ? (
        <View style={{ borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(182,245,66,0.25)' }}>
          <LinearGradient colors={['#1B3A12', color.surface, color.surface]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: space.xl, gap: space.lg }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt v="caption" c={color.accent}>Matchday {league.matchday} · {league.name}</Txt>
              <Pill label={locked ? 'LOCKED' : formatCountdown(league.deadline - now)} tone={locked ? 'danger' : 'warn'} icon={locked ? 'lock-closed' : 'time'} />
            </Row>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ alignItems: 'center', gap: space.sm, flex: 1 }}>
                <Avatar manager={me} size={64} ring />
                <Txt v="bodyBold" numberOfLines={1}>{me?.username}</Txt>
              </View>
              <Txt v="h1" c={color.faint}>VS</Txt>
              <View style={{ alignItems: 'center', gap: space.sm, flex: 1 }}>
                <Avatar manager={s.managers[rivalId]} size={64} ring />
                <Txt v="bodyBold" numberOfLines={1}>{s.managers[rivalId].username}</Txt>
              </View>
            </Row>
            <Row gap={space.sm} style={{ justifyContent: 'center' }}>
              <Icon name={lineupOk ? 'checkmark-circle' : 'alert-circle'} size={16} c={lineupOk ? color.accent : color.warn} />
              <Txt v="small" c={lineupOk ? color.muted : color.warn}>
                {lineupOk ? 'Your lineup is set' : team && team.squad.length < 11 ? 'You need 11 players. Head to the market.' : 'Your lineup is incomplete'}
              </Txt>
            </Row>
            <Row>
              <Button label="Match centre" kind="secondary" onPress={() => router.push(`/match/${next.id}`)} style={{ flex: 1 }} />
              <Button label={lineupOk ? 'Edit lineup' : 'Set lineup'} onPress={() => router.push('/squad')} style={{ flex: 1 }} />
            </Row>
          </LinearGradient>
        </View>
      ) : null}

      {last?.result ? (
        <>
          <SectionTitle title={`Last result · matchday ${last.matchday}`} />
          <Card pad={space.md}>
            <FixtureRow fixture={last} managers={s.managers} meId={s.meId} />
          </Card>
        </>
      ) : null}

      {league && standings.length ? (
        <>
          <SectionTitle title="Table" action="Full league" onAction={() => router.push(`/league/${league.id}`)} />
          <Card>
            <StandingsTable rows={standings} managers={s.managers} meId={s.meId} limit={4} />
          </Card>
        </>
      ) : null}

      {league && league.status !== 'lobby' ? (
        <Card onPress={() => shareInvite(league)}>
          <Row>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: color.accentDim, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="people" size={20} c={color.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt v="h3">Bring a rival</Txt>
              <Txt v="small" c={color.muted}>Start another league and send friends your code.</Txt>
            </View>
            <Icon name="share-outline" c={color.muted} />
          </Row>
        </Card>
      ) : null}

      {s.notices.length ? (
        <>
          <SectionTitle title="Latest" action="See all" onAction={() => router.push('/notifications')} />
          <Card pad={space.md} style={{ gap: 0 }}>
            {s.notices.slice(0, 3).map((n, i) => (
              <Row key={n.id} style={{ paddingVertical: space.md, borderTopWidth: i ? 1 : 0, borderTopColor: color.line }}>
                <View style={{ flex: 1 }}>
                  <Txt v="bodyBold" numberOfLines={1} onPress={() => n.href && router.push(n.href as Href)}>{n.title}</Txt>
                  <Txt v="small" c={color.muted} numberOfLines={2}>{n.body}</Txt>
                </View>
                <Txt v="small" c={color.faint}>{timeAgo(n.at, now)}</Txt>
              </Row>
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
