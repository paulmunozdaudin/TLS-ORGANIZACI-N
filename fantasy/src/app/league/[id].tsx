import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { FixtureRow, StandingsTable, timeAgo, useNow } from '@/components/game';
import { Avatar, Button, Card, Chip, Confirm, DemoNote, Empty, Field, Icon, IconButton, NavHeader, Pill, Row, Screen, SectionTitle, Segmented, Txt } from '@/components/ui';
import { copyCode, shareInvite, shareText } from '@/lib/share';
import { leagueFixtures, leagueStandings } from '@/state/game';
import { actions, attempt, useGameState } from '@/state/store';
import { color, font, radius, space } from '@/theme/tokens';

const REACTIONS = ['🔥', '😂', '👏', '😬'];

export default function LeagueScreen() {
  const s = useGameState();
  const { id } = useLocalSearchParams<{ id: string }>();
  const league = s.leagues[id === 'active' ? s.activeLeagueId ?? '' : id];
  const now = useNow();
  const [tab, setTab] = useState<'table' | 'fixtures' | 'chat'>('table');
  const [matchday, setMatchday] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [reactTo, setReactTo] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<'play' | 'start' | null>(null);

  if (!league) {
    return (
      <Screen header={<NavHeader title="League" />}>
        <Empty icon="help-circle" title="League not found" body="It may have been removed, or the link is wrong." action="Back to leagues" onAction={() => router.replace('/leagues')} />
      </Screen>
    );
  }
  const member = league.memberIds.includes(s.meId ?? '');
  const owner = league.ownerId === s.meId;
  const seats = Array.from({ length: league.size }, (_, i) => league.memberIds[i] ?? null);

  if (league.status === 'lobby') {
    const full = league.memberIds.length === league.size;
    return (
      <Screen header={<NavHeader title={league.name} subtitle="Waiting for managers" right={<IconButton icon="share-outline" label="Share invitation" onPress={() => shareInvite(league)} />} />}>
        <Card tone="accent" style={{ alignItems: 'center' }}>
          <Txt v="caption" c={color.muted}>Invitation code</Txt>
          <Row gap={6}>
            {league.code.split('').map((ch, i) => (
              <View key={i} style={{ width: 42, height: 54, borderRadius: radius.sm, backgroundColor: color.bg, borderWidth: 1, borderColor: color.lineStrong, alignItems: 'center', justifyContent: 'center' }}>
                <Txt v="h1" c={color.accent}>{ch}</Txt>
              </View>
            ))}
          </Row>
          <Row style={{ alignSelf: 'stretch' }}>
            <Button label="Copy" icon="copy-outline" kind="secondary" onPress={() => copyCode(league.code)} style={{ flex: 1 }} />
            <Button label="Invite" icon="share-outline" onPress={() => shareInvite(league)} style={{ flex: 1 }} />
          </Row>
        </Card>

        <SectionTitle title={`Managers · ${league.memberIds.length}/${league.size}`} />
        <Card pad={space.md} style={{ gap: 0 }}>
          {seats.map((mid, i) => (
            <Row key={i} style={{ paddingVertical: space.md, borderTopWidth: i ? 1 : 0, borderTopColor: color.line }}>
              {mid ? <Avatar manager={s.managers[mid]} size={36} /> : <View style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', borderColor: color.lineStrong }} />}
              <Txt v="bodyBold" c={mid ? color.text : color.faint} style={{ flex: 1 }}>
                {mid ? s.managers[mid].username : 'Open seat'}
              </Txt>
              {mid === league.ownerId ? <Pill label="OWNER" tone="accent" /> : mid && s.managers[mid].isBot ? <Pill label="BOT" /> : null}
            </Row>
          ))}
        </Card>

        {owner ? (
          <>
            {!full ? (
              <Card>
                <Txt v="h3">Playing alone for now?</Txt>
                <Txt v="small" c={color.muted}>Fill the empty seats with bot managers to try the full game loop.</Txt>
                <Button label="Fill empty seats with bots" icon="hardware-chip-outline" kind="secondary" onPress={() => attempt(actions.fillWithBots(league.id), 'Bot managers joined.')} />
                <DemoNote text="Demo control · not part of the live product" />
              </Card>
            ) : null}
            <Button label={full ? 'Start league' : `Waiting for ${league.size - league.memberIds.length} more`} icon="flag" disabled={!full} onPress={() => setConfirm('start')} />
          </>
        ) : (
          <Txt c={color.muted} center>The owner starts the league once every seat is taken.</Txt>
        )}
        <Confirm
          visible={confirm === 'start'}
          title="Start the league?"
          body={`All ${league.size} managers receive their budget, the fixture list is drawn and the transfer market opens. Nobody else can join afterwards.`}
          confirmLabel="Start"
          onClose={() => setConfirm(null)}
          onConfirm={() => attempt(actions.startLeague(league.id), `${league.name} is live.`)}
        />
      </Screen>
    );
  }

  const standings = leagueStandings(s, league);
  const fixtures = leagueFixtures(s, league.id);
  const shownMd = matchday ?? Math.min(league.matchday, league.totalMatchdays);
  const messages = s.messages.filter((m) => m.leagueId === league.id).sort((a, b) => a.at - b.at);
  const finished = league.status === 'finished';
  const shareTable = () =>
    shareText(
      `${league.name} — table after matchday ${league.matchday - 1}\n` +
        standings.map((r, i) => `${i + 1}. ${s.managers[r.managerId].username} · ${r.points} pts`).join('\n')
    );

  return (
    <Screen
      header={
        <View style={{ gap: space.md }}>
          <NavHeader
            title={league.name}
            subtitle={finished ? 'Season finished' : `Matchday ${league.matchday} of ${league.totalMatchdays}`}
            right={<IconButton icon="share-outline" label="Share table" onPress={shareTable} />}
          />
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: 'table', label: 'Table' },
              { value: 'fixtures', label: 'Fixtures' },
              { value: 'chat', label: 'Chat', badge: messages.length || undefined },
            ]}
          />
        </View>
      }>
      {tab === 'table' ? (
        <>
          {finished ? (
            <Card tone="accent">
              <Row>
                <Icon name="trophy" size={28} c={color.accent} />
                <View style={{ flex: 1 }}>
                  <Txt v="caption" c={color.muted}>Champion</Txt>
                  <Txt v="h2">{s.managers[standings[0].managerId].username}</Txt>
                </View>
              </Row>
            </Card>
          ) : null}
          <Card>
            <StandingsTable rows={standings} managers={s.managers} meId={s.meId} />
          </Card>
          <Txt v="small" c={color.faint}>P played · GD fantasy goal difference · Pts league points (3 for a win, 1 for a draw)</Txt>
          {member && !finished ? (
            <Card>
              <Txt v="h3">Play matchday {league.matchday}</Txt>
              <Txt v="small" c={color.muted}>
                On the live service matchdays are scored from real fixtures. In demo mode you trigger a simulated round:
                lineups are frozen, stats are generated for the fictional players and every head-to-head is scored.
              </Txt>
              <Button label={`Simulate matchday ${league.matchday}`} icon="play" kind="secondary" onPress={() => setConfirm('play')} />
              <DemoNote text="Demo control · simulated statistics, not real football" />
            </Card>
          ) : null}
        </>
      ) : tab === 'fixtures' ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
            {Array.from({ length: league.totalMatchdays }, (_, i) => i + 1).map((md) => (
              <Chip key={md} label={`MD ${md}`} active={md === shownMd} onPress={() => setMatchday(md)} />
            ))}
          </ScrollView>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt v="caption" c={color.muted}>Matchday {shownMd}</Txt>
            <Pill label={shownMd < league.matchday ? 'PLAYED' : shownMd === league.matchday ? 'NEXT' : 'UPCOMING'} tone={shownMd < league.matchday ? 'muted' : shownMd === league.matchday ? 'accent' : 'info'} />
          </Row>
          <Card pad={space.md} style={{ gap: 0 }}>
            {fixtures.filter((f) => f.matchday === shownMd).map((f, i) => (
              <View key={f.id} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: color.line }}>
                <FixtureRow fixture={f} managers={s.managers} meId={s.meId} />
              </View>
            ))}
          </Card>
        </>
      ) : (
        <>
          {messages.length ? (
            messages.map((m) => {
              const mine = m.managerId === s.meId;
              const author = s.managers[m.managerId];
              return (
                <View key={m.id} style={{ alignItems: mine ? 'flex-end' : 'flex-start', gap: 4 }}>
                  <Row gap={space.sm} style={{ alignItems: 'flex-end', flexDirection: mine ? 'row-reverse' : 'row' }}>
                    {!mine ? <Avatar manager={author} size={30} /> : null}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="React to message"
                      onPress={() => setReactTo(reactTo === m.id ? null : m.id)}
                      style={{ maxWidth: '82%', backgroundColor: mine ? color.accent : color.surface, borderRadius: 18, borderBottomRightRadius: mine ? 6 : 18, borderBottomLeftRadius: mine ? 18 : 6, paddingHorizontal: space.md + 2, paddingVertical: space.sm + 2, gap: 2 }}>
                      {!mine ? <Txt v="caption" c={author.color}>{author.username}</Txt> : null}
                      <Txt c={mine ? color.onAccent : color.text}>{m.text}</Txt>
                    </Pressable>
                  </Row>
                  <Row gap={6} style={{ marginLeft: mine ? 0 : 38 }}>
                    {Object.entries(m.reactions).map(([emoji, who]) => (
                      <Pressable key={emoji} onPress={() => actions.toggleReaction(m.id, emoji)} style={{ flexDirection: 'row', gap: 4, alignItems: 'center', backgroundColor: who.includes(s.meId ?? '') ? color.accentDim : color.surface, borderRadius: radius.pill, paddingHorizontal: 8, height: 26, borderWidth: 1, borderColor: color.line }}>
                        <Text style={{ fontSize: 13 }}>{emoji}</Text>
                        <Text style={{ fontFamily: font.bodyBold, fontSize: 11, color: color.muted }}>{who.length}</Text>
                      </Pressable>
                    ))}
                    {reactTo === m.id
                      ? REACTIONS.map((emoji) => (
                          <Pressable key={emoji} accessibilityLabel={`React ${emoji}`} onPress={() => { actions.toggleReaction(m.id, emoji); setReactTo(null); }} style={{ width: 32, height: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surfaceHi, borderRadius: radius.pill }}>
                            <Text style={{ fontSize: 14 }}>{emoji}</Text>
                          </Pressable>
                        ))
                      : null}
                    <Txt v="small" c={color.faint}>{timeAgo(m.at, now)}</Txt>
                  </Row>
                </View>
              );
            })
          ) : (
            <Empty icon="chatbubbles" title="Quiet in here" body="Say something before the matchday does it for you." />
          )}
          {member ? (
            <Row style={{ alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Field placeholder="Message the league" value={text} onChangeText={setText} maxLength={280} returnKeyType="send"
                  onSubmitEditing={() => { if (text.trim() && attempt(actions.sendMessage(league.id, text))) setText(''); }} />
              </View>
              <View style={{ marginTop: 4 }}>
                <IconButton icon="send" label="Send message" active onPress={() => { if (text.trim() && attempt(actions.sendMessage(league.id, text))) setText(''); }} />
              </View>
            </Row>
          ) : null}
          <Txt v="small" c={color.faint} center>Tap a message to react. In demo mode only bots answer, and only after matchdays.</Txt>
        </>
      )}

      <Confirm
        visible={confirm === 'play'}
        title={`Simulate matchday ${league.matchday}?`}
        body="Lineups are frozen as they are right now, including yours. The result is final and updates the table."
        confirmLabel="Simulate"
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          const mine = fixtures.find((f) => f.matchday === league.matchday && (f.homeId === s.meId || f.awayId === s.meId));
          if (attempt(actions.playMatchday(league.id), 'Matchday scored.') && mine) router.push(`/match/${mine.id}`);
        }}
      />
    </Screen>
  );
}
