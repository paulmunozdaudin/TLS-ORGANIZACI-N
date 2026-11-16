import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { BidSheet } from '@/components/BidSheet';
import { RatingBadge } from '@/components/game';
import { Button, Card, Confirm, Crest, DemoNote, Empty, Glow, NavHeader, Pill, PosTag, Row, Screen, SectionTitle, Stat, Txt } from '@/components/ui';
import { CLUBS_BY_ID, PLAYERS_BY_ID } from '@/data/demo/catalog';
import { demoGameweekStats } from '@/data/demo/simulate';
import { sellRefund } from '@/domain/market';
import { scorePlayer } from '@/domain/scoring';
import { RULES } from '@/state/game';
import { useActiveLeague } from '@/state/hooks';
import { actions, attempt } from '@/state/store';
import { color, money, positionLabel, space } from '@/theme/tokens';

export default function PlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { s, league, team, myBids, available } = useActiveLeague();
  const [bidding, setBidding] = useState(false);
  const [selling, setSelling] = useState(false);
  const player = PLAYERS_BY_ID[id];

  if (!player) {
    return (
      <Screen header={<NavHeader title="Player" />}>
        <Empty icon="help-circle" title="Player not found" body="This player is not in the catalogue." action="Back to the market" onAction={() => router.replace('/market')} />
      </Screen>
    );
  }
  const club = CLUBS_BY_ID[player.clubId];
  const ownerTeam = league ? s.teams.find((t) => t.leagueId === league.id && t.squad.some((e) => e.playerId === player.id)) : undefined;
  const mine = ownerTeam?.managerId === s.meId;
  const paid = ownerTeam?.squad.find((e) => e.playerId === player.id)?.paid ?? 0;
  const bid = myBids.find((b) => b.playerId === player.id);
  const marketOpen = league?.status === 'active';

  // Gameweeks already played in the active league (or the first three when browsing without one).
  const upTo = league && league.status !== 'lobby' ? league.matchday - 1 : 0;
  const weeks = Array.from({ length: upTo }, (_, i) => i + 1).map((gw) => {
    const stat = demoGameweekStats(gw)[player.id];
    return { gw, stat, score: scorePlayer(player.position, stat, RULES.scoring) };
  });
  const totals = weeks.reduce(
    (t, w) => ({ apps: t.apps + (w.score.played ? 1 : 0), goals: t.goals + (w.stat?.goals ?? 0), assists: t.assists + (w.stat?.assists ?? 0), points: t.points + w.score.points }),
    { apps: 0, goals: 0, assists: 0, points: 0 }
  );

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <Glow tint={club.colors[0]} height={300} />
      <Screen
        header={<NavHeader />}
        footer={
          !league || !team ? undefined : mine ? (
            <Button label={`Sell for ${money(sellRefund(paid, RULES))}`} icon="cash-outline" kind="danger" disabled={!marketOpen} onPress={() => setSelling(true)} />
          ) : ownerTeam ? (
            <Button label={`Owned by ${s.managers[ownerTeam.managerId].username}`} kind="secondary" disabled />
          ) : (
            <Button label={bid ? `Update bid · ${money(bid.amount)}` : `Bid from ${money(player.price)}`} icon="hammer" disabled={!marketOpen} onPress={() => setBidding(true)} />
          )
        }>
        <Row gap={space.lg}>
          <Crest club={club} size={64} />
          <View style={{ flex: 1, gap: 6 }}>
            <Txt v="h1">{player.name}</Txt>
            <Row gap={space.sm}>
              <PosTag position={player.position} />
              <Txt v="small" c={color.muted}>{positionLabel[player.position]} · {club.name}</Txt>
            </Row>
          </View>
          <RatingBadge rating={player.rating} />
        </Row>

        <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
          {mine ? <Pill label={`IN YOUR SQUAD · PAID ${money(paid)}`} tone="accent" icon="checkmark-circle" /> : null}
          {!mine && ownerTeam ? <Pill label={`OWNED BY ${s.managers[ownerTeam.managerId].username.toUpperCase()}`} /> : null}
          {!ownerTeam && league ? <Pill label="FREE AGENT" tone="info" /> : null}
          {bid ? <Pill label={`YOUR BID ${money(bid.amount)}`} tone="warn" icon="hammer" /> : null}
        </Row>

        <Card>
          <Row>
            <Stat value={money(player.price)} label="Price" tint={color.accent} />
            <Stat value={totals.points} label="Fantasy pts" />
            <Stat value={totals.goals} label="Goals" />
            <Stat value={totals.assists} label="Assists" />
          </Row>
        </Card>

        <SectionTitle title="Gameweek log" />
        <DemoNote />
        {weeks.length ? (
          <Card pad={space.md} style={{ gap: 0 }}>
            <Row style={{ paddingBottom: space.sm }}>
              <Txt v="caption" c={color.faint} style={{ flex: 1 }}>Gameweek</Txt>
              {['Min', 'G', 'A', 'Pts'].map((h) => (
                <Txt key={h} v="caption" c={color.faint} style={{ width: 38, textAlign: 'right' }}>{h}</Txt>
              ))}
            </Row>
            {weeks.map(({ gw, stat, score }) => (
              <Row key={gw} style={{ paddingVertical: 10, borderTopWidth: 1, borderTopColor: color.line }}>
                <Row gap={space.sm} style={{ flex: 1 }}>
                  <Txt v="bodyBold">GW {gw}</Txt>
                  {stat?.yellowCards ? <View style={{ width: 9, height: 12, borderRadius: 2, backgroundColor: color.warn }} /> : null}
                  {stat?.redCards ? <View style={{ width: 9, height: 12, borderRadius: 2, backgroundColor: color.danger }} /> : null}
                  {stat?.cleanSheet && score.played && player.position !== 'FWD' ? <Txt v="small" c={color.info}>CS</Txt> : null}
                </Row>
                <Txt v="small" c={color.muted} style={{ width: 38, textAlign: 'right' }}>{`${stat?.minutes ?? 0}′`}</Txt>
                <Txt v="small" c={color.muted} style={{ width: 38, textAlign: 'right' }}>{stat?.goals ?? 0}</Txt>
                <Txt v="small" c={color.muted} style={{ width: 38, textAlign: 'right' }}>{stat?.assists ?? 0}</Txt>
                <Txt v="num" c={score.points < 0 ? color.danger : score.played ? color.accent : color.faint} style={{ width: 38, textAlign: 'right', fontSize: 15 }}>
                  {score.played ? score.points : '–'}
                </Txt>
              </Row>
            ))}
          </Card>
        ) : (
          <Txt c={color.muted}>No gameweek has been played in this league yet.</Txt>
        )}
        <Txt v="small" c={color.faint}>
          Deeper analytics (form trends, per-90 numbers, price history) are planned for the optional membership.
        </Txt>
      </Screen>

      {league ? (
        <BidSheet player={bidding ? player : null} league={league} available={available + (bid?.amount ?? 0)} currentBid={bid?.amount} onClose={() => setBidding(false)} />
      ) : null}
      <Confirm
        visible={selling}
        danger
        title={`Sell ${player.name}?`}
        body={`You paid ${money(paid)} and get ${money(sellRefund(paid, RULES))} back (${Math.round(RULES.sellRefundRate * 100)}%). The player returns to the market as a free agent and leaves your lineup.`}
        confirmLabel="Sell"
        onClose={() => setSelling(false)}
        onConfirm={() => league && attempt(actions.sellPlayer(league.id, player.id), `${player.name} sold.`)}
      />
    </View>
  );
}
