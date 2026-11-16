import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BidSheet } from '@/components/BidSheet';
import { BudgetBar, Divider, PlayerRow } from '@/components/game';
import { Button, Card, Chip, Confirm, DemoNote, Empty, Field, Pill, Row, Screen, Segmented, Sheet, Txt } from '@/components/ui';
import { CLUBS, PLAYERS, PLAYERS_BY_ID } from '@/data/demo/catalog';
import { POSITIONS, type Player, type Position } from '@/domain/types';
import { RULES } from '@/state/game';
import { useActiveLeague } from '@/state/hooks';
import { actions, attempt } from '@/state/store';
import { color, font, MAX_WIDTH, money, space, TAB_BAR_SPACE } from '@/theme/tokens';

type Sort = 'rating' | 'cheap' | 'pricey';
const SORTS: { value: Sort; label: string }[] = [
  { value: 'rating', label: 'Top rated' },
  { value: 'pricey', label: 'Price ↓' },
  { value: 'cheap', label: 'Price ↑' },
];

export default function Market() {
  const { s, league, team, myBids, committed, available } = useActiveLeague();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'players' | 'bids'>('players');
  const [query, setQuery] = useState('');
  const [position, setPosition] = useState<Position | 'ALL'>('ALL');
  const [clubId, setClubId] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>('rating');
  const [affordable, setAffordable] = useState(false);
  const [freeOnly, setFreeOnly] = useState(true);
  const [clubSheet, setClubSheet] = useState(false);
  const [bidOn, setBidOn] = useState<Player | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);

  const owners = useMemo(() => {
    const map = new Map<string, string>();
    if (league) {
      for (const t of s.teams.filter((x) => x.leagueId === league.id)) {
        for (const e of t.squad) map.set(e.playerId, t.managerId);
      }
    }
    return map;
  }, [s.teams, league]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PLAYERS.filter(
      (p) =>
        (position === 'ALL' || p.position === position) &&
        (!clubId || p.clubId === clubId) &&
        (!q || p.name.toLowerCase().includes(q)) &&
        (!affordable || p.price <= available) &&
        (!freeOnly || !owners.has(p.id))
    ).sort((a, b) => (sort === 'rating' ? b.rating - a.rating || b.price - a.price : sort === 'cheap' ? a.price - b.price : b.price - a.price));
  }, [query, position, clubId, sort, affordable, freeOnly, available, owners]);

  if (!league || !team || league.status !== 'active') {
    return (
      <Screen tabbed header={<Txt v="h1">Market</Txt>}>
        <Card>
          <Empty
            icon="swap-horizontal"
            title={!league ? 'Join a league first' : league.status === 'lobby' ? 'The market opens at kick-off' : 'This season is over'}
            body={
              !league
                ? 'The transfer market belongs to a league. Create or join one to start bidding.'
                : league.status === 'lobby'
                  ? `Bidding starts as soon as ${league.name} is full and the owner starts it.`
                  : 'Transfers are closed for finished leagues.'
            }
            action={league ? 'Open league' : 'Find a league'}
            onAction={() => router.push(league ? `/league/${league.id}` : '/leagues')}
          />
        </Card>
      </Screen>
    );
  }

  const bidFor = (id: string) => myBids.find((b) => b.playerId === id);
  const settled = s.bids
    .filter((b) => b.leagueId === league.id && b.managerId === s.meId && b.status !== 'open' && b.round === league.marketRound - 1)
    .slice(-8);
  const clubName = clubId ? CLUBS.find((c) => c.id === clubId)?.name : null;

  const header = (
    <View style={{ gap: space.lg, paddingBottom: space.sm }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View>
          <Txt v="h1">Market</Txt>
          <Txt v="small" c={color.muted}>{league.name} · bidding round {league.marketRound}</Txt>
        </View>
        <Pill label={`${team.squad.length}/${RULES.squadSize} SQUAD`} tone={team.squad.length >= RULES.squadSize ? 'accent' : 'muted'} icon="shirt" />
      </Row>
      <Card>
        <BudgetBar budget={team.budget} committed={committed} total={RULES.startingBudget} />
      </Card>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'players', label: 'Players' },
          { value: 'bids', label: 'My bids', badge: myBids.length },
        ]}
      />
      {tab === 'players' ? (
        <>
          <Field placeholder="Search players" icon="search" value={query} onChangeText={setQuery} autoCorrect={false} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
            {(['ALL', ...POSITIONS] as const).map((p) => (
              <Chip key={p} label={p === 'ALL' ? 'All' : p} active={position === p} onPress={() => setPosition(p)} />
            ))}
            <Chip label={clubName ?? 'Club'} icon="shield" active={Boolean(clubId)} onPress={() => setClubSheet(true)} />
            <Chip label="Free agents" active={freeOnly} onPress={() => setFreeOnly(!freeOnly)} />
            <Chip label="In budget" active={affordable} onPress={() => setAffordable(!affordable)} />
          </ScrollView>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt v="caption" c={color.muted}>{results.length} players</Txt>
            <Row gap={space.md}>
              {SORTS.map((o) => (
                <Txt key={o.value} v="small" c={sort === o.value ? color.accent : color.faint} onPress={() => setSort(o.value)}>
                  {o.label}
                </Txt>
              ))}
            </Row>
          </Row>
        </>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: color.bg, paddingTop: insets.top }}>
      <FlatList
        data={tab === 'players' ? results : []}
        keyExtractor={(p) => p.id}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        initialNumToRender={14}
        ItemSeparatorComponent={Divider}
        ListHeaderComponent={header}
        style={{ width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' }}
        contentContainerStyle={{ paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: TAB_BAR_SPACE + insets.bottom }}
        renderItem={({ item }) => {
          const owner = owners.get(item.id);
          const bid = bidFor(item.id);
          return (
            <PlayerRow
              player={item}
              right={
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={{ fontFamily: font.display, fontSize: 15, color: owner ? color.faint : color.text }}>{money(item.price)}</Text>
                  {owner ? (
                    <Txt v="small" c={owner === s.meId ? color.accent : color.faint}>{owner === s.meId ? 'Yours' : s.managers[owner].username}</Txt>
                  ) : bid ? (
                    <Pill label={`BID ${money(bid.amount)}`} tone="warn" />
                  ) : (
                    <Txt v="small" c={color.accent} onPress={() => setBidOn(item)}>Bid</Txt>
                  )}
                </View>
              }
            />
          );
        }}
        ListEmptyComponent={
          tab === 'players' ? (
            <Empty icon="search" title="No players match" body="Try another position, club or search term." action="Clear filters" onAction={() => { setQuery(''); setPosition('ALL'); setClubId(null); setAffordable(false); }} />
          ) : undefined
        }
        ListFooterComponent={
          tab === 'bids' ? (
            <View style={{ gap: space.lg }}>
              {myBids.length ? (
                <Card pad={space.md} style={{ gap: 0 }}>
                  {myBids.map((b, i) => (
                    <View key={b.id} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: color.line }}>
                      <PlayerRow
                        player={PLAYERS_BY_ID[b.playerId]}
                        onPress={() => setBidOn(PLAYERS_BY_ID[b.playerId])}
                        right={
                          <View style={{ alignItems: 'flex-end', gap: 4 }}>
                            <Text style={{ fontFamily: font.display, fontSize: 15, color: color.warn }}>{money(b.amount)}</Text>
                            <Txt v="small" c={color.danger} onPress={() => attempt(actions.cancelBid(b.id), 'Bid withdrawn.')}>Withdraw</Txt>
                          </View>
                        }
                      />
                    </View>
                  ))}
                </Card>
              ) : (
                <Card>
                  <Empty icon="hammer" title="No open bids" body="Find a player and place a blind bid. Your money is only spent if you win." action="Browse players" onAction={() => setTab('players')} />
                </Card>
              )}

              <Card>
                <Txt v="h3">Close bidding round {league.marketRound}</Txt>
                <Txt v="small" c={color.muted}>
                  On the live service rounds close automatically on a schedule. In demo mode you close them yourself: bot
                  managers place their bids, then every auction is settled at once.
                </Txt>
                <Button label="Close round and settle bids" icon="flash" kind="secondary" onPress={() => setConfirmClose(true)} />
                <DemoNote text="Demo control · not part of the live product" />
              </Card>

              {settled.length ? (
                <>
                  <Txt v="caption" c={color.muted}>Round {league.marketRound - 1} results</Txt>
                  <Card pad={space.md} style={{ gap: 0 }}>
                    {settled.map((b, i) => (
                      <View key={b.id} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: color.line }}>
                        <PlayerRow
                          player={PLAYERS_BY_ID[b.playerId]}
                          right={<Pill label={b.status === 'won' ? `WON ${money(b.amount)}` : 'OUTBID'} tone={b.status === 'won' ? 'accent' : 'danger'} />}
                        />
                      </View>
                    ))}
                  </Card>
                </>
              ) : null}
            </View>
          ) : undefined
        }
      />

      <BidSheet
        player={bidOn}
        league={league}
        available={available + (bidOn ? bidFor(bidOn.id)?.amount ?? 0 : 0)}
        currentBid={bidOn ? bidFor(bidOn.id)?.amount : undefined}
        onClose={() => setBidOn(null)}
      />
      <Sheet visible={clubSheet} onClose={() => setClubSheet(false)} title="Filter by club">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          <Chip label="All clubs" active={!clubId} onPress={() => { setClubId(null); setClubSheet(false); }} />
          {CLUBS.map((c) => (
            <Chip key={c.id} label={c.name} active={clubId === c.id} onPress={() => { setClubId(c.id); setClubSheet(false); }} />
          ))}
        </View>
      </Sheet>
      <Confirm
        visible={confirmClose}
        title={`Close round ${league.marketRound}?`}
        body={`${myBids.length ? `Your ${myBids.length} open bid${myBids.length > 1 ? 's' : ''} will be settled against the other managers.` : 'You have no open bids, so only the other managers will sign players.'} This cannot be undone.`}
        confirmLabel="Close round"
        onClose={() => setConfirmClose(false)}
        onConfirm={() => attempt(actions.closeMarketRound(league.id), 'Round settled. Check your notifications.')}
      />
    </View>
  );
}
