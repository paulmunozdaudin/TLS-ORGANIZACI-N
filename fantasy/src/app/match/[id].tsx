import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { formatCountdown, Pitch, PlayerRow, useNow } from '@/components/game';
import { Avatar, Button, Card, DemoNote, Empty, Icon, IconButton, NavHeader, Pill, Row, Screen, SectionTitle, Segmented, Stat, Txt } from '@/components/ui';
import { PLAYERS_BY_ID } from '@/data/demo/catalog';
import { footballData } from '@/data/provider';
import { headToHead } from '@/domain/league';
import { startersByPosition } from '@/domain/lineup';
import { FORMATIONS } from '@/domain/rules';
import { POSITIONS, type Position } from '@/domain/types';
import { shareText } from '@/lib/share';
import { leagueFixtures, matchDetail } from '@/state/game';
import { useGameState } from '@/state/store';
import { color, font, space } from '@/theme/tokens';

export default function MatchScreen() {
  const s = useGameState();
  const { id } = useLocalSearchParams<{ id: string }>();
  const now = useNow();
  const detail = matchDetail(s, id);
  const [side, setSide] = useState<'home' | 'away'>(detail?.fixture.awayId === s.meId ? 'away' : 'home');
  const [open, setOpen] = useState<string | null>(null);

  if (!detail) {
    return (
      <Screen header={<NavHeader title="Match" />}>
        <Empty icon="help-circle" title="Match not found" body="This fixture does not exist any more." action="Back home" onAction={() => router.replace('/home')} />
      </Screen>
    );
  }
  const { fixture } = detail;
  const league = s.leagues[fixture.leagueId];
  const home = s.managers[fixture.homeId];
  const away = s.managers[fixture.awayId];
  const played = Boolean(fixture.result);
  const lineup = side === 'home' ? detail.homeLineup : detail.awayLineup;
  const score = side === 'home' ? detail.home : detail.away;
  const slotOf = (playerId: string) => score?.slots.find((x) => x.playerId === playerId);

  const shape = lineup ? FORMATIONS[lineup.formation] : null;
  const byPos = lineup ? startersByPosition(lineup, PLAYERS_BY_ID) : null;
  const lines = shape && byPos
    ? (Object.fromEntries(POSITIONS.map((p) => [p, Array.from({ length: shape[p] }, (_, i) => byPos[p][i] ?? null)])) as Record<Position, (string | null)[]>)
    : null;

  const meIn = fixture.homeId === s.meId || fixture.awayId === s.meId;
  const rivalId = fixture.homeId === s.meId ? fixture.awayId : fixture.homeId;
  const h2h = meIn && s.meId ? headToHead(leagueFixtures(s, league.id), s.meId, rivalId) : null;
  const current = fixture.matchday === league.matchday && league.status === 'active';

  return (
    <Screen
      header={
        <NavHeader
          title={`Matchday ${fixture.matchday}`}
          subtitle={league.name}
          right={
            played ? (
              <IconButton
                icon="share-outline"
                label="Share result"
                onPress={() => shareText(`${league.name} · matchday ${fixture.matchday}\n${home.username} ${fixture.result!.homeGoals} – ${fixture.result!.awayGoals} ${away.username}`)}
              />
            ) : undefined
          }
        />
      }>
      <View style={{ borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: color.line }}>
        <LinearGradient colors={['#16301A', color.surface]} style={{ padding: space.xl, gap: space.lg, alignItems: 'center' }}>
          <Pill
            label={played ? 'FULL TIME' : current ? (now >= league.deadline ? 'LINEUPS LOCKED' : `KICK-OFF IN ${formatCountdown(league.deadline - now).toUpperCase()}`) : 'UPCOMING'}
            tone={played ? 'muted' : 'accent'}
          />
          <Row style={{ alignSelf: 'stretch', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, alignItems: 'center', gap: space.sm }}>
              <Avatar manager={home} size={60} ring />
              <Txt v="bodyBold" numberOfLines={1}>{home.username}</Txt>
            </View>
            {played ? (
              <Text style={{ fontFamily: font.displayHeavy, fontSize: 52, letterSpacing: -2, color: color.text }}>
                {fixture.result!.homeGoals}
                <Text style={{ color: color.faint }}> – </Text>
                {fixture.result!.awayGoals}
              </Text>
            ) : (
              <Txt v="h1" c={color.faint}>VS</Txt>
            )}
            <View style={{ flex: 1, alignItems: 'center', gap: space.sm }}>
              <Avatar manager={away} size={60} ring />
              <Txt v="bodyBold" numberOfLines={1}>{away.username}</Txt>
            </View>
          </Row>
          {played ? (
            <Row style={{ alignSelf: 'stretch', justifyContent: 'space-between' }}>
              <Txt v="small" c={color.muted} style={{ flex: 1, textAlign: 'center' }}>{fixture.result!.homePoints} fantasy pts</Txt>
              <View style={{ width: 80 }} />
              <Txt v="small" c={color.muted} style={{ flex: 1, textAlign: 'center' }}>{fixture.result!.awayPoints} fantasy pts</Txt>
            </Row>
          ) : null}
        </LinearGradient>
      </View>

      <DemoNote text={played ? `Final · ${footballData.freshness}. Not live football.` : `${footballData.freshness}. Scores appear once the matchday is played.`} />

      <Segmented value={side} onChange={setSide} options={[{ value: 'home', label: home.username }, { value: 'away', label: away.username }]} />

      {lines && lineup && lineup.starters.length ? (
        <>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt v="caption" c={color.muted}>{lineup.formation}{played ? '' : ' · current lineup, may change before the deadline'}</Txt>
            {score ? <Txt v="caption" c={color.accent}>{score.totalPoints} pts → {score.fantasyGoals} goal{score.fantasyGoals === 1 ? '' : 's'}</Txt> : null}
          </Row>
          <Pitch
            lines={lines}
            captainId={lineup.captainId}
            selectedId={open}
            onPress={played ? (slot) => setOpen(slot.playerId === open ? null : slot.playerId) : undefined}
            caption={(pid) => {
              const sl = slotOf(pid);
              if (!sl) return null;
              return sl.countedPlayerId ? { text: `${sl.points > 0 ? '+' : ''}${sl.points}${sl.substituted ? ' ⇄' : ''}`, tint: sl.points < 0 ? color.danger : color.accent } : { text: 'DNP', tint: color.faint };
            }}
          />
          {played && score ? (
            <>
              <SectionTitle title="Player performances" />
              <Card pad={space.md} style={{ gap: 0 }}>
                {score.slots.map((sl, i) => {
                  const starter = PLAYERS_BY_ID[sl.playerId];
                  const counted = sl.countedPlayerId ? PLAYERS_BY_ID[sl.countedPlayerId] : null;
                  const expanded = open === sl.playerId;
                  return (
                    <View key={sl.playerId} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: color.line }}>
                      <PlayerRow
                        player={counted ?? starter}
                        subtitle={sl.substituted ? `On for ${starter.name}` : !counted ? 'Did not play · no substitute' : sl.isCaptain ? 'Captain' : undefined}
                        onPress={() => setOpen(expanded ? null : sl.playerId)}
                        right={
                          <Row gap={space.sm}>
                            {sl.substituted ? <Icon name="swap-vertical" size={16} c={color.info} /> : null}
                            <Text style={{ fontFamily: font.display, fontSize: 17, color: !counted ? color.faint : sl.points < 0 ? color.danger : color.accent, minWidth: 30, textAlign: 'right' }}>
                              {counted ? sl.points : '–'}
                            </Text>
                          </Row>
                        }
                      />
                      {expanded && sl.items.length ? (
                        <View style={{ paddingBottom: space.md, paddingLeft: 42, gap: 4 }}>
                          {sl.items.map((it) => (
                            <Row key={it.label} style={{ justifyContent: 'space-between' }}>
                              <Txt v="small" c={color.muted}>{it.label}</Txt>
                              <Txt v="small" c={it.points < 0 ? color.danger : color.text}>{it.points > 0 ? '+' : ''}{it.points}</Txt>
                            </Row>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </Card>
              <Txt v="small" c={color.faint}>Tap a player for the points breakdown. Fantasy goals: 1 for every 8 points above 26.</Txt>
            </>
          ) : null}
        </>
      ) : (
        <Card>
          <Empty icon="shirt" title="No lineup yet" body={`${(side === 'home' ? home : away).username} has not picked a starting eleven.`} />
        </Card>
      )}

      {h2h ? (
        <>
          <SectionTitle title={`Rivalry · you vs ${s.managers[rivalId].username}`} />
          <Card>
            {h2h.played ? (
              <Row>
                <Stat value={h2h.wins} label="Won" tint={color.accent} />
                <Stat value={h2h.draws} label="Drawn" />
                <Stat value={h2h.losses} label="Lost" tint={color.danger} />
                <Stat value={`${h2h.goalsFor}:${h2h.goalsAgainst}`} label="Goals" />
              </Row>
            ) : (
              <Txt c={color.muted}>First meeting. Make it count.</Txt>
            )}
          </Card>
        </>
      ) : null}

      {!played && meIn && current ? <Button label="Edit my lineup" icon="shirt" onPress={() => router.push('/squad')} /> : null}
    </Screen>
  );
}
