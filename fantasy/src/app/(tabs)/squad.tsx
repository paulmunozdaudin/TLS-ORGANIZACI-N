import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { formatCountdown, Pitch, PlayerRow, RatingBadge, useNow, type PitchSlot } from '@/components/game';
import { Button, Card, Chip, Empty, Icon, Pill, Row, Screen, SectionTitle, Segmented, Sheet, Txt } from '@/components/ui';
import { PLAYERS_BY_ID } from '@/data/demo/catalog';
import { autoLineup, emptyLineup, pruneLineup, startersByPosition, validateLineup } from '@/domain/lineup';
import { FORMATION_IDS, FORMATIONS } from '@/domain/rules';
import { POSITIONS, type FormationId, type Lineup, type Position } from '@/domain/types';
import { RULES } from '@/state/game';
import { useActiveLeague } from '@/state/hooks';
import { actions, attempt } from '@/state/store';
import { color, font, money, positionColor, positionLabel, space } from '@/theme/tokens';

export default function Squad() {
  const { league, team } = useActiveLeague();
  const now = useNow();
  const [tab, setTab] = useState<'lineup' | 'squad'>('lineup');
  const [slot, setSlot] = useState<PitchSlot | null>(null);

  // The draft mirrors the saved lineup and resets whenever that changes
  // (another league, a sale, a successful save).
  const savedKey = team ? `${team.leagueId}:${JSON.stringify(team.lineup)}:${team.squad.length}` : '';
  const [draft, setDraft] = useState<Lineup>(() => (team ? pruneLineup(team.lineup, team.squad) : emptyLineup()));
  const [syncedKey, setSyncedKey] = useState(savedKey);
  if (syncedKey !== savedKey) {
    setSyncedKey(savedKey);
    setDraft(team ? pruneLineup(team.lineup, team.squad) : emptyLineup());
  }

  if (!league || !team || league.status === 'lobby') {
    return (
      <Screen tabbed header={<Txt v="h1">Squad</Txt>}>
        <Card>
          <Empty
            icon="shirt"
            title={league ? 'Your squad starts at kick-off' : 'No squad yet'}
            body={league ? `Once ${league.name} starts you get €${RULES.startingBudget}M to build a team.` : 'Join or create a league to build a squad.'}
            action={league ? 'Open league' : 'Find a league'}
            onAction={() => router.push(league ? `/league/${league.id}` : '/leagues')}
          />
        </Card>
      </Screen>
    );
  }

  const locked = league.status !== 'active' || now >= league.deadline;
  const owned = team.squad.map((e) => PLAYERS_BY_ID[e.playerId]).sort((a, b) => b.rating - a.rating);
  const bench = owned.filter((p) => !draft.starters.includes(p.id)).map((p) => p.id);
  const full: Lineup = { ...draft, bench: bench.slice(0, RULES.benchSize) };
  const check = validateLineup(full, team.squad, PLAYERS_BY_ID);
  const shape = FORMATIONS[draft.formation];
  const byPos = startersByPosition(draft, PLAYERS_BY_ID);
  const lines = Object.fromEntries(
    POSITIONS.map((pos) => [pos, Array.from({ length: shape[pos] }, (_, i) => byPos[pos][i] ?? null)])
  ) as Record<Position, (string | null)[]>;
  const dirty =
    JSON.stringify([draft.formation, draft.starters, draft.captainId]) !==
    JSON.stringify([team.lineup.formation, team.lineup.starters, team.lineup.captainId]);

  const setFormation = (formation: FormationId) => {
    const next = FORMATIONS[formation];
    const starters = POSITIONS.flatMap((pos) => byPos[pos].slice(0, next[pos]));
    setDraft({ ...draft, formation, starters, captainId: draft.captainId && starters.includes(draft.captainId) ? draft.captainId : null });
  };
  const place = (playerId: string) => {
    if (!slot) return;
    const starters = slot.playerId
      ? draft.starters.map((id) => (id === slot.playerId ? playerId : id))
      : [...draft.starters, playerId];
    setDraft({ ...draft, starters, captainId: draft.captainId === slot.playerId ? null : draft.captainId });
    setSlot(null);
  };
  const candidates = slot ? owned.filter((p) => p.position === slot.position && !draft.starters.includes(p.id)) : [];
  const slotPlayer = slot?.playerId ? PLAYERS_BY_ID[slot.playerId] : null;

  return (
    <Screen
      tabbed
      header={
        <View style={{ gap: space.md }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View>
              <Txt v="h1">Squad</Txt>
              <Txt v="small" c={color.muted}>
                {league.name} · {league.status === 'finished' ? 'season over' : `matchday ${league.matchday}`}
              </Txt>
            </View>
            <Pill
              label={locked ? 'LOCKED' : `LOCKS IN ${formatCountdown(league.deadline - now).toUpperCase()}`}
              tone={locked ? 'danger' : 'warn'}
              icon={locked ? 'lock-closed' : 'time'}
            />
          </Row>
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: 'lineup', label: 'Lineup' },
              { value: 'squad', label: `Squad ${team.squad.length}/${RULES.squadSize}` },
            ]}
          />
        </View>
      }>
      {tab === 'lineup' ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
            {FORMATION_IDS.map((f) => (
              <Chip key={f} label={f} active={draft.formation === f} onPress={() => !locked && setFormation(f)} />
            ))}
          </ScrollView>

          <Pitch
            lines={lines}
            captainId={draft.captainId}
            caption={(id) => ({ text: money(PLAYERS_BY_ID[id].price), tint: color.text })}
            onPress={locked ? undefined : setSlot}
          />

          {locked ? (
            <Card>
              <Row gap={space.sm}>
                <Icon name="lock-closed" size={16} c={color.danger} />
                <Txt v="small" c={color.muted} style={{ flex: 1 }}>
                  {league.status === 'finished'
                    ? 'This season is over. The lineup is shown as you left it.'
                    : 'The deadline has passed. This lineup plays the matchday; you can edit again once it is scored.'}
                </Txt>
              </Row>
            </Card>
          ) : !check.valid ? (
            <Card style={{ borderColor: `${color.warn}55` }}>
              {check.errors.slice(0, 3).map((e) => (
                <Row key={e} gap={space.sm}>
                  <Icon name="alert-circle" size={16} c={color.warn} />
                  <Txt v="small" c={color.warn} style={{ flex: 1 }}>{e}</Txt>
                </Row>
              ))}
              {team.squad.length < 11 ? (
                <Button label="Go to the market" small kind="secondary" onPress={() => router.push('/market')} />
              ) : null}
            </Card>
          ) : null}

          {!locked ? (
            <Row>
              <Button
                label="Auto-pick"
                icon="sparkles"
                kind="secondary"
                onPress={() => setDraft(autoLineup(team.squad, PLAYERS_BY_ID, draft.formation, RULES))}
                style={{ flex: 1 }}
              />
              <Button
                label={dirty ? 'Save lineup' : 'Saved'}
                icon={dirty ? 'checkmark' : 'checkmark-done'}
                disabled={!dirty || !check.valid}
                onPress={() => attempt(actions.saveLineup(league.id, full), 'Lineup saved.')}
                style={{ flex: 1 }}
              />
            </Row>
          ) : null}

          <SectionTitle title={`Bench · ${bench.length}`} />
          <Card pad={space.md} style={{ gap: 0 }}>
            {bench.length ? (
              bench.map((id, i) => (
                <View key={id} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: color.line }}>
                  <PlayerRow player={PLAYERS_BY_ID[id]} right={<RatingBadge rating={PLAYERS_BY_ID[id].rating} />} />
                </View>
              ))
            ) : (
              <Txt c={color.muted} style={{ padding: space.sm }}>Nobody on the bench. Substitutes come on automatically when a starter does not play.</Txt>
            )}
          </Card>
        </>
      ) : team.squad.length ? (
        POSITIONS.map((pos) => {
          const group = owned.filter((p) => p.position === pos);
          return (
            <View key={pos} style={{ gap: space.sm }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Row gap={space.sm}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: positionColor[pos] }} />
                  <Txt v="caption" c={color.muted}>{positionLabel[pos]}s</Txt>
                </Row>
                <Txt v="caption" c={color.faint}>{group.length}/{RULES.squadLimits[pos]}</Txt>
              </Row>
              <Card pad={space.md} style={{ gap: 0 }}>
                {group.length ? (
                  group.map((p, i) => (
                    <View key={p.id} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: color.line }}>
                      <PlayerRow
                        player={p}
                        right={
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ fontFamily: font.display, fontSize: 15, color: color.text }}>
                              {money(team.squad.find((e) => e.playerId === p.id)?.paid ?? 0)}
                            </Text>
                            <Txt v="small" c={color.faint}>paid</Txt>
                          </View>
                        }
                      />
                    </View>
                  ))
                ) : (
                  <Txt c={color.muted} style={{ padding: space.sm }}>No {positionLabel[pos].toLowerCase()}s yet.</Txt>
                )}
              </Card>
            </View>
          );
        })
      ) : (
        <Card>
          <Empty icon="shirt" title="Your squad is empty" body={`You have ${money(team.budget)} to spend. Bid on players in the transfer market.`} action="Open the market" onAction={() => router.push('/market')} />
        </Card>
      )}

      <Sheet visible={Boolean(slot)} onClose={() => setSlot(null)} title={slot ? `${slotPlayer ? 'Change' : 'Pick a'} ${positionLabel[slot.position].toLowerCase()}` : undefined}>
        {slotPlayer ? (
          <Row>
            <Button
              label={draft.captainId === slotPlayer.id ? 'Captain ✓' : 'Make captain'}
              icon="star"
              small
              kind="secondary"
              disabled={draft.captainId === slotPlayer.id}
              onPress={() => {
                setDraft({ ...draft, captainId: slotPlayer.id });
                setSlot(null);
              }}
              style={{ flex: 1 }}
            />
            <Button
              label="Move to bench"
              icon="arrow-down"
              small
              kind="ghost"
              onPress={() => {
                setDraft({ ...draft, starters: draft.starters.filter((id) => id !== slotPlayer.id), captainId: draft.captainId === slotPlayer.id ? null : draft.captainId });
                setSlot(null);
              }}
              style={{ flex: 1 }}
            />
          </Row>
        ) : null}
        <ScrollView style={{ maxHeight: 320 }}>
          {candidates.length ? (
            candidates.map((p) => <PlayerRow key={p.id} player={p} onPress={() => place(p.id)} right={<RatingBadge rating={p.rating} />} />)
          ) : (
            <Txt c={color.muted}>
              No other {slot ? positionLabel[slot.position].toLowerCase() : 'player'} available on your bench.
            </Txt>
          )}
        </ScrollView>
      </Sheet>
    </Screen>
  );
}
