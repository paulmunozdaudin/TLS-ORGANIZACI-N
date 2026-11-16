import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { CLUBS_BY_ID, PLAYERS_BY_ID } from '@/data/demo/catalog';
import type { Fixture, League, Manager, Player, Position, Standing } from '@/domain/types';
import { buzz } from '@/state/store';
import { color, font, money, positionColor, radius, space } from '@/theme/tokens';

import { Avatar, Card, Crest, Icon, Pill, PosTag, Row, Txt } from './ui';

export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function formatCountdown(ms: number) {
  if (ms <= 0) return 'Locked';
  const mins = Math.floor(ms / 60000);
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function timeAgo(at: number, now: number) {
  const mins = Math.max(0, Math.floor((now - at) / 60000));
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h`;
  return `${Math.floor(mins / 1440)}d`;
}

export const lastName = (p: Player) => p.name.split(' ').slice(1).join(' ') || p.name;

/* -------------------------------------------------------------- player rows */

export function PlayerRow({
  player,
  right,
  subtitle,
  onPress,
}: {
  player: Player;
  right?: ReactNode;
  subtitle?: string;
  onPress?: () => void;
}) {
  const club = CLUBS_BY_ID[player.clubId];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        buzz();
        (onPress ?? (() => router.push(`/player/${player.id}`)))();
      }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        paddingVertical: space.md,
        opacity: pressed ? 0.7 : 1,
      })}>
      <Crest club={club} size={30} />
      <View style={{ flex: 1, gap: 3 }}>
        <Txt v="bodyBold" numberOfLines={1}>{player.name}</Txt>
        <Row gap={space.sm}>
          <PosTag position={player.position} />
          <Txt v="small" c={color.muted} numberOfLines={1} style={{ flexShrink: 1 }}>
            {subtitle ?? club.name}
          </Txt>
        </Row>
      </View>
      {right}
    </Pressable>
  );
}

export function RatingBadge({ rating }: { rating: number }) {
  const tint = rating >= 85 ? color.accent : rating >= 75 ? color.info : color.muted;
  return (
    <View style={{ width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: `${tint}66`, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: font.display, fontSize: 15, color: tint }}>{rating}</Text>
    </View>
  );
}

export function Divider() {
  return <View style={{ height: 1, backgroundColor: color.line }} />;
}

/* -------------------------------------------------------------------- pitch */

export interface PitchSlot {
  position: Position;
  playerId: string | null;
}

const LINES: Position[] = ['FWD', 'MID', 'DEF', 'GK'];

export function Pitch({
  lines,
  captainId,
  selectedId,
  caption,
  onPress,
  compact,
}: {
  lines: Record<Position, (string | null)[]>;
  captainId?: string | null;
  selectedId?: string | null;
  caption?: (playerId: string) => { text: string; tint?: string } | null;
  onPress?: (slot: PitchSlot) => void;
  compact?: boolean;
}) {
  const token = compact ? 34 : 44;
  return (
    <View style={{ borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: color.line }}>
      <LinearGradient colors={['#123627', color.pitch, '#0A2018']} style={{ paddingVertical: compact ? space.md : space.xl, gap: compact ? space.md : space.xl }}>
        <View pointerEvents="none" style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, backgroundColor: color.pitchLine }} />
        <View pointerEvents="none" style={{ position: 'absolute', top: '50%', left: '50%', width: 96, height: 96, marginLeft: -48, marginTop: -48, borderRadius: 48, borderWidth: 1, borderColor: color.pitchLine }} />
        <View pointerEvents="none" style={{ position: 'absolute', bottom: -1, left: '26%', right: '26%', height: 54, borderWidth: 1, borderColor: color.pitchLine }} />
        <View pointerEvents="none" style={{ position: 'absolute', top: -1, left: '26%', right: '26%', height: 54, borderWidth: 1, borderColor: color.pitchLine }} />
        {LINES.map((pos) => (
          <View key={pos} style={{ flexDirection: 'row', justifyContent: 'space-evenly', paddingHorizontal: space.xs }}>
            {lines[pos].map((id, i) => {
              const player = id ? PLAYERS_BY_ID[id] : null;
              const club = player ? CLUBS_BY_ID[player.clubId] : null;
              const cap = id && caption ? caption(id) : null;
              const selected = Boolean(id) && id === selectedId;
              return (
                <Pressable
                  key={`${pos}-${i}`}
                  disabled={!onPress}
                  accessibilityRole="button"
                  accessibilityLabel={player ? `${player.name}, ${pos}` : `Empty ${pos} slot`}
                  onPress={() => {
                    buzz();
                    onPress?.({ position: pos, playerId: id });
                  }}
                  style={{ alignItems: 'center', width: compact ? 58 : 68, gap: 4 }}>
                  <View
                    style={{
                      width: token,
                      height: token,
                      borderRadius: token / 2,
                      backgroundColor: club ? club.colors[0] : 'rgba(255,255,255,0.05)',
                      borderWidth: selected ? 3 : club ? 2 : 1.5,
                      borderStyle: club ? 'solid' : 'dashed',
                      borderColor: selected ? color.accent : club ? club.colors[1] : 'rgba(255,255,255,0.28)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    {player ? (
                      <Text style={{ fontFamily: font.display, fontSize: compact ? 11 : 13, color: club!.colors[1] }}>{player.rating}</Text>
                    ) : (
                      <Icon name="add" size={18} c="rgba(255,255,255,0.5)" />
                    )}
                    {id && id === captainId ? (
                      <View style={{ position: 'absolute', top: -5, right: -7, width: 18, height: 18, borderRadius: 9, backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontFamily: font.displayHeavy, fontSize: 10, color: color.onAccent }}>C</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text numberOfLines={1} style={{ fontFamily: font.bodyBold, fontSize: compact ? 10 : 11, color: player ? color.text : color.muted, maxWidth: '100%' }}>
                    {player ? lastName(player) : pos}
                  </Text>
                  {cap ? (
                    <View style={{ backgroundColor: 'rgba(0,0,0,0.38)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }}>
                      <Text style={{ fontFamily: font.bodyBold, fontSize: 10, color: cap.tint ?? color.accent }}>{cap.text}</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </LinearGradient>
    </View>
  );
}

/* ---------------------------------------------------------- league widgets */

const FORM_TINT = { W: color.accent, D: color.muted, L: color.danger } as const;

export function FormDots({ form }: { form: Standing['form'] }) {
  return (
    <Row gap={3}>
      {form.slice(-5).map((r, i) => (
        <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: FORM_TINT[r] }} />
      ))}
    </Row>
  );
}

export function StandingsTable({
  rows,
  managers,
  meId,
  limit,
}: {
  rows: Standing[];
  managers: Record<string, Manager>;
  meId: string | null;
  limit?: number;
}) {
  const shown = limit ? rows.slice(0, limit) : rows;
  const cell = { width: 28, textAlign: 'center' } as const;
  return (
    <View>
      <Row gap={space.sm} style={{ paddingBottom: space.sm }}>
        <Txt v="caption" c={color.faint} style={{ width: 20 }}>#</Txt>
        <Txt v="caption" c={color.faint} style={{ flex: 1 }}>Manager</Txt>
        <Txt v="caption" c={color.faint} style={cell}>P</Txt>
        <Txt v="caption" c={color.faint} style={cell}>GD</Txt>
        <Txt v="caption" c={color.faint} style={cell}>Pts</Txt>
      </Row>
      {shown.map((row, i) => {
        const mine = row.managerId === meId;
        const gd = row.goalsFor - row.goalsAgainst;
        return (
          <Row
            key={row.managerId}
            gap={space.sm}
            style={{
              paddingVertical: 10,
              borderTopWidth: 1,
              borderTopColor: color.line,
              backgroundColor: mine ? color.accentDim : 'transparent',
              marginHorizontal: -space.lg,
              paddingHorizontal: space.lg,
            }}>
            <Txt v="num" c={i === 0 ? color.accent : color.muted} style={{ width: 20, fontSize: 14 }}>{i + 1}</Txt>
            <Row gap={space.sm} style={{ flex: 1 }}>
              <Avatar manager={managers[row.managerId]} size={28} />
              <View style={{ flexShrink: 1, gap: 3 }}>
                <Txt v="bodyBold" numberOfLines={1} style={{ fontSize: 14 }}>
                  {managers[row.managerId]?.username}
                  {mine ? ' · you' : ''}
                </Txt>
                <FormDots form={row.form} />
              </View>
            </Row>
            <Txt v="small" c={color.muted} style={cell}>{row.played}</Txt>
            <Txt v="small" c={color.muted} style={cell}>{gd > 0 ? `+${gd}` : gd}</Txt>
            <Txt v="num" style={[cell, { fontSize: 15 }]}>{row.points}</Txt>
          </Row>
        );
      })}
    </View>
  );
}

export function FixtureRow({
  fixture,
  managers,
  meId,
}: {
  fixture: Fixture;
  managers: Record<string, Manager>;
  meId: string | null;
}) {
  const home = managers[fixture.homeId];
  const away = managers[fixture.awayId];
  const mine = fixture.homeId === meId || fixture.awayId === meId;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        buzz();
        router.push(`/match/${fixture.id}`);
      }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.sm,
        paddingVertical: space.md,
        opacity: pressed ? 0.7 : 1,
      })}>
      <Row gap={space.sm} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Txt v="bodyBold" numberOfLines={1} style={{ flexShrink: 1, fontSize: 14 }} c={fixture.homeId === meId ? color.accent : color.text}>
          {home?.username}
        </Txt>
        <Avatar manager={home} size={28} />
      </Row>
      <View style={{ minWidth: 62, height: 30, borderRadius: 10, backgroundColor: mine ? color.accentDim : color.surfaceHi, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 }}>
        {fixture.result ? (
          <Text style={{ fontFamily: font.display, fontSize: 15, color: color.text }}>
            {fixture.result.homeGoals} – {fixture.result.awayGoals}
          </Text>
        ) : (
          <Text style={{ fontFamily: font.bodyBold, fontSize: 11, color: color.muted }}>VS</Text>
        )}
      </View>
      <Row gap={space.sm} style={{ flex: 1 }}>
        <Avatar manager={away} size={28} />
        <Txt v="bodyBold" numberOfLines={1} style={{ flexShrink: 1, fontSize: 14 }} c={fixture.awayId === meId ? color.accent : color.text}>
          {away?.username}
        </Txt>
      </Row>
    </Pressable>
  );
}

export function LeagueCard({ league, rank, onPress }: { league: League; rank?: number; onPress: () => void }) {
  return (
    <Card onPress={onPress}>
      <Row>
        <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: color.accentDim, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={league.isPublic ? 'earth' : 'shield-half'} size={22} c={color.accent} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Txt v="h3" numberOfLines={1}>{league.name}</Txt>
          <Txt v="small" c={color.muted}>
            {league.memberIds.length}/{league.size} managers · {league.isPublic ? 'Public' : 'Private'}
          </Txt>
        </View>
        {league.status === 'lobby' ? (
          <Pill label="LOBBY" tone="warn" />
        ) : league.status === 'finished' ? (
          <Pill label="FINISHED" />
        ) : rank ? (
          <View style={{ alignItems: 'flex-end' }}>
            <Txt v="h2" c={rank === 1 ? color.accent : color.text}>#{rank}</Txt>
            <Txt v="caption" c={color.muted}>MD {Math.min(league.matchday, league.totalMatchdays)}/{league.totalMatchdays}</Txt>
          </View>
        ) : null}
      </Row>
    </Card>
  );
}

export function BudgetBar({ budget, committed = 0, total }: { budget: number; committed?: number; total: number }) {
  const spent = total - budget;
  return (
    <View style={{ gap: space.sm }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View>
          <Txt v="caption" c={color.muted}>Available budget</Txt>
          <Txt v="h1" c={color.accent}>{money(budget - committed)}</Txt>
        </View>
        <Txt v="small" c={color.muted} style={{ textAlign: 'right' }}>
          {money(spent)} spent{committed ? `\n${money(committed)} in open bids` : ''}
        </Txt>
      </Row>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: color.surfaceHi, flexDirection: 'row', overflow: 'hidden' }}>
        <View style={{ flex: Math.max(spent, 0.001), backgroundColor: color.faint }} />
        <View style={{ flex: Math.max(committed, 0.001), backgroundColor: color.warn }} />
        <View style={{ flex: Math.max(budget - committed, 0.001), backgroundColor: color.accent }} />
      </View>
    </View>
  );
}

export { positionColor };
