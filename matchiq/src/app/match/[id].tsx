import { MARKET_GROUP_LABEL, type MarketGroup } from '@core/markets.ts';
import { matchModel } from '@core/model.ts';
import { fairProbabilities } from '@core/odds.ts';
import { formatDay, formatStamp, formatTime } from '@core/season.ts';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { ago, BetSlip, countdown, marketTitle, PredictionStatusPill, PriceButton, StatusPill, useNow, type SlipTarget } from '@/components/match';
import { DataBanner, QueryState, useDataStatus } from '@/components/status';
import { Card, Chip, Empty, Icon, NavHeader, Notice, PlayerPhoto, Row, Screen, SectionTitle, Segmented, TeamBadge, Txt } from '@/components/ui';
import { useQuery } from '@/lib/api';
import { priceFor } from '@/lib/pricing';
import { useSession } from '@/lib/session';
import type { FixtureDetail, Market, Selection, StandingRow, Team, WalletView } from '@/lib/types';
import { coins, color, font, odds, space } from '@/theme/tokens';

type Tab = 'overview' | 'match' | 'players' | 'stats' | 'lineups';
const TABS: { value: Tab; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'match', label: 'Match' },
  { value: 'players', label: 'Players' },
  { value: 'stats', label: 'Statistics' },
  { value: 'lineups', label: 'Lineups' },
];
const pct = (p: number) => `${Math.round(p * 100)}%`;
const EVENT_ICON: Record<string, [string, string]> = {
  goal: ['football', color.accent], penalty_goal: ['football', color.accent], own_goal: ['football', color.danger],
  missed_penalty: ['close-circle', color.muted], yellow: ['square', color.warn], second_yellow: ['square', color.danger],
  red: ['square', color.danger], substitution: ['swap-vertical', color.info], var: ['tv', color.muted], other: ['ellipse', color.muted],
};

export default function MatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useSession();
  const now = useNow();
  const fixtureQ = useQuery<FixtureDetail | null>('get_fixture', { p_id: Number(id) }, 30_000);
  const marketsQ = useQuery<Market[]>('get_fixture_markets', { p_id: Number(id) }, 60_000);
  const walletQ = useQuery<WalletView>('my_wallet');
  const status = useDataStatus();
  const [tab, setTab] = useState<Tab>('overview');
  const [slip, setSlip] = useState<SlipTarget | null>(null);
  const [side, setSide] = useState<'home' | 'away'>('home');

  const fixture = fixtureQ.data;
  if (!fixture) {
    return (
      <Screen header={<NavHeader title="Match" />}>
        {fixtureQ.data === null ? (
          <Empty icon="help-circle" title="Match not found" body="This fixture is not in the database." action="Back to matches" onAction={() => router.replace('/matches')} />
        ) : (
          <QueryState loading={fixtureQ.loading} error={fixtureQ.error} onRetry={fixtureQ.reload} />
        )}
      </Screen>
    );
  }

  const staleMinutes = status.data?.stale_minutes ?? 90;
  const markets = marketsQ.data ?? [];
  const open = fixture.status === 'scheduled' && fixture.kickoff_at > now;
  const picked = new Set(fixture.my_predictions.filter((p) => p.status === 'open').map((p) => p.selection_id));
  const price = (s: Selection) => priceFor(s.quotes, profile, staleMinutes, now);
  const button = (market: Market, s: Selection, label = s.label, wide = false) => (
    <PriceButton
      key={s.id}
      label={label}
      wide={wide}
      price={open || s.result ? price(s) : null}
      result={s.result}
      picked={picked.has(s.id)}
      onPress={open ? () => setSlip({ fixture, market, selection: s }) : undefined}
    />
  );
  const matchMarkets = markets.filter((m) => m.scope === 'match');
  const playerMarkets = markets.filter((m) => m.scope === 'player');
  const result = matchMarkets.find((m) => m.market_key === 'match_result');
  const team = (teamId: number | null): Team | null => (teamId === fixture.home.id ? fixture.home : teamId === fixture.away.id ? fixture.away : null);
  const standing = (t: Team): StandingRow | undefined => fixture.standings.find((s) => s.team_id === t.id);
  const slipSelection = slip ? markets.flatMap((m) => m.selections).find((s) => s.id === slip.selection.id) ?? slip.selection : null;

  /* ------------------------------------------------------------- sections */

  const marketCard = (m: Market) => (
    <Card key={m.id} pad={space.md}>
      <Txt v="bodyBold">{marketTitle(m, fixture)}</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>{m.selections.map((s) => button(m, s))}</View>
    </Card>
  );

  const noPrices = (
    <Card>
      <Empty
        icon="pricetags"
        title={marketsQ.loading ? 'Loading markets' : 'No prices for this match'}
        body={marketsQ.error?.message ?? 'No bookmaker has prices for this match in our feed yet. Markets appear only when a real price exists; nothing is estimated in their place.'}
      />
    </Card>
  );

  const overview = (
    <>
      {!open && fixture.status === 'scheduled' ? <Notice tone="muted" icon="lock-closed" text="Kick-off time has passed. Predictions are closed." /> : null}
      {result ? marketCard(result) : matchMarkets.length || playerMarkets.length ? null : noPrices}
      {fixture.my_predictions.length ? (
        <>
          <SectionTitle title="Your predictions on this match" />
          <Card pad={space.md} style={{ gap: 0 }}>
            {fixture.my_predictions.map((p, i) => (
              <Row key={p.id} style={{ paddingVertical: space.md, borderTopWidth: i ? 1 : 0, borderTopColor: color.line }}>
                <View style={{ flex: 1 }}>
                  <Txt v="bodyBold" numberOfLines={1}>{p.label}</Txt>
                  <Txt v="small" c={color.muted}>{coins(p.stake)} coins at {odds(p.locked_odds)} → {p.status === 'open' ? `${coins(p.potential_return)} if correct` : `${coins(p.payout ?? 0)} returned`}</Txt>
                </View>
                <PredictionStatusPill status={p.status} />
              </Row>
            ))}
          </Card>
        </>
      ) : null}
      {fixture.events.length ? (
        <>
          <SectionTitle title="Match events" />
          <Card pad={space.md} style={{ gap: 0 }}>
            {fixture.events.filter((e) => e.kind !== 'other').map((e, i) => {
              const [icon, tint] = EVENT_ICON[e.kind] ?? EVENT_ICON.other;
              const home = e.team_id === fixture.home.id;
              return (
                <Row key={e.seq} style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: color.line, flexDirection: home ? 'row' : 'row-reverse' }}>
                  <Txt v="num" c={color.muted} style={{ width: 38, fontSize: 14, textAlign: home ? 'left' : 'right' }}>{e.minute}′{e.extra_minute ? `+${e.extra_minute}` : ''}</Txt>
                  <Icon name={icon as never} size={16} c={tint} />
                  <View style={{ flex: 1, alignItems: home ? 'flex-start' : 'flex-end' }}>
                    <Txt v="bodyBold" style={{ fontSize: 14 }}>{e.player ?? 'Unknown player'}</Txt>
                    <Txt v="small" c={color.muted}>
                      {e.kind === 'substitution' ? `with ${e.related_player ?? '—'}` : e.kind === 'own_goal' ? 'Own goal' : e.kind === 'penalty_goal' ? 'Penalty' : e.related_player ? `Assist: ${e.related_player}` : e.kind.replace('_', ' ')}
                    </Txt>
                  </View>
                </Row>
              );
            })}
          </Card>
        </>
      ) : null}
      {fixture.injuries.length ? (
        <>
          <SectionTitle title="Injuries and suspensions" />
          <Card pad={space.md} style={{ gap: 0 }}>
            {fixture.injuries.map((x, i) => (
              <Row key={`${x.player_id}`} style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: color.line }}>
                <TeamBadge team={team(x.team_id)} size={22} />
                <View style={{ flex: 1 }}>
                  <Txt v="bodyBold" style={{ fontSize: 14 }}>{x.player}</Txt>
                  <Txt v="small" c={color.muted}>{[x.kind, x.reason].filter(Boolean).join(' · ')}</Txt>
                </View>
              </Row>
            ))}
            <Txt v="small" c={color.faint} style={{ paddingTop: space.sm }}>As reported by the data provider on {formatStamp(fixture.injuries[0].reported_at)}.</Txt>
          </Card>
        </>
      ) : null}
      <Txt v="small" c={color.faint}>
        Match data updated {ago(fixture.updated_at, now)}.{fixture.status === 'live' ? ' Live scores can lag the broadcast by up to a minute.' : ''}
      </Txt>
    </>
  );

  const groups = [...new Set(matchMarkets.map((m) => m.group))] as MarketGroup[];
  const matchTab = matchMarkets.length ? (
    groups.map((g) => (
      <View key={g} style={{ gap: space.md }}>
        <Txt v="caption" c={color.muted}>{MARKET_GROUP_LABEL[g] ?? g}</Txt>
        {matchMarkets.filter((m) => m.group === g).map(marketCard)}
      </View>
    ))
  ) : noPrices;

  const sideTeam = side === 'home' ? fixture.home : fixture.away;
  const playersOnSide = new Map<number, { player: NonNullable<Selection['player']>; rows: { market: Market; selection: Selection }[] }>();
  for (const m of playerMarkets) {
    for (const s of m.selections) {
      if (!s.player || s.player.team_id !== sideTeam.id) continue;
      const entry = playersOnSide.get(s.player.id) ?? { player: s.player, rows: [] };
      entry.rows.push({ market: m, selection: s });
      playersOnSide.set(s.player.id, entry);
    }
  }
  const playersTab = playerMarkets.length ? (
    <>
      <Segmented value={side} onChange={setSide} options={[{ value: 'home', label: fixture.home.name }, { value: 'away', label: fixture.away.name }]} />
      {[...playersOnSide.values()].map(({ player, rows }) => (
        <Card key={player.id} pad={space.md}>
          <Pressable accessibilityRole="button" onPress={() => router.push(`/player/${player.id}`)}>
            <Row>
              <PlayerPhoto player={player} size={44} />
              <View style={{ flex: 1 }}>
                <Txt v="h3">{player.name}</Txt>
                <Txt v="small" c={color.muted}>{[player.position, sideTeam.name, player.shirt_number ? `#${player.shirt_number}` : null].filter(Boolean).join(' · ')}</Txt>
              </View>
              <Icon name="chevron-forward" size={18} c={color.faint} />
            </Row>
          </Pressable>
          <View style={{ gap: space.sm }}>
            {rows.map(({ market, selection }) =>
              button(market, selection, market.line != null ? `${market.name} · ${selection.label}` : market.name, true)
            )}
          </View>
        </Card>
      ))}
      {!playersOnSide.size ? <Txt c={color.muted}>No player prices for {sideTeam.name} right now.</Txt> : null}
      <Txt v="small" c={color.faint}>
        Player markets depend on which bookmakers price them, so they vary by match. A player without a button has no
        current price.
      </Txt>
    </>
  ) : (
    <Card>
      <Empty icon="person" title="No player markets for this match" body="Bookmakers in our feed have not priced player markets here. They usually appear closer to kick-off and only in some competitions." />
    </Card>
  );

  const hs = standing(fixture.home);
  const as = standing(fixture.away);
  const model =
    hs && as && fixture.league_averages?.home_goals && fixture.league_averages?.away_goals && hs.home.played && as.away.played
      ? matchModel({
          home: { played: hs.home.played, scoredPerGame: (hs.home.goals_for ?? 0) / hs.home.played, concededPerGame: (hs.home.goals_against ?? 0) / hs.home.played },
          away: { played: as.away.played, scoredPerGame: (as.away.goals_for ?? 0) / as.away.played, concededPerGame: (as.away.goals_against ?? 0) / as.away.played },
          leagueHomeGoals: Number(fixture.league_averages.home_goals),
          leagueAwayGoals: Number(fixture.league_averages.away_goals),
        })
      : null;
  const consensus = result ? (['home', 'draw', 'away'] as const).map((k) => result.selections.find((s) => s.key === k)).map((s) => (s ? priceFor(s.quotes, null, staleMinutes, now)?.decimal ?? null : null)) : null;
  const fair = consensus && consensus.every((x): x is number => x !== null) ? fairProbabilities(consensus) : null;
  const statRow = (label: string, a: string | number | null | undefined, b: string | number | null | undefined) => (
    <Row key={label} style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: color.line }}>
      <Txt v="num" style={{ width: 70, fontSize: 15 }}>{a ?? '–'}</Txt>
      <Txt v="small" c={color.muted} style={{ flex: 1, textAlign: 'center' }}>{label}</Txt>
      <Txt v="num" style={{ width: 70, fontSize: 15, textAlign: 'right' }}>{b ?? '–'}</Txt>
    </Row>
  );
  const rec = (s?: { won?: number; drawn?: number; lost?: number }) => (s && s.won != null ? `${s.won}-${s.drawn}-${s.lost}` : null);
  const ts = (t: Team) => fixture.team_stats.find((x) => x.team_id === t.id);
  const formDots = (rows: FixtureDetail['form']['home']) =>
    rows.length ? (
      <Row gap={4}>
        {rows.map((r) => {
          const res = r.goals_for > r.goals_against ? 'W' : r.goals_for < r.goals_against ? 'L' : 'D';
          return (
            <View key={r.fixture_id} style={{ width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: res === 'W' ? color.accentDim : res === 'L' ? color.dangerDim : color.surfaceHi }}>
              <Text style={{ fontFamily: font.bodyBold, fontSize: 11, color: res === 'W' ? color.accent : res === 'L' ? color.danger : color.muted }}>{res}</Text>
            </View>
          );
        })}
      </Row>
    ) : (
      <Txt v="small" c={color.faint}>No matches on record</Txt>
    );

  const statsTab = (
    <>
      {ts(fixture.home) || ts(fixture.away) ? (
        <>
          <SectionTitle title={fixture.status === 'finished' ? 'Match statistics · full time' : 'Match statistics · so far'} />
          <Card style={{ gap: 0 }}>
            {statRow('Possession %', ts(fixture.home)?.possession, ts(fixture.away)?.possession)}
            {statRow('Shots', ts(fixture.home)?.shots, ts(fixture.away)?.shots)}
            {statRow('Shots on target', ts(fixture.home)?.shots_on_target, ts(fixture.away)?.shots_on_target)}
            {statRow('Corners', ts(fixture.home)?.corners, ts(fixture.away)?.corners)}
            {statRow('Fouls', ts(fixture.home)?.fouls, ts(fixture.away)?.fouls)}
            {statRow('Yellow cards', ts(fixture.home)?.yellow_cards, ts(fixture.away)?.yellow_cards)}
            {statRow('Red cards', ts(fixture.home)?.red_cards, ts(fixture.away)?.red_cards)}
            <Txt v="small" c={color.faint} style={{ paddingTop: space.sm }}>Provider data, updated {ago((ts(fixture.home) ?? ts(fixture.away))!.updated_at, now)}.</Txt>
          </Card>
        </>
      ) : null}

      <SectionTitle title="Season so far" />
      {hs || as ? (
        <Card style={{ gap: 0 }}>
          <Row style={{ paddingBottom: space.sm }}>
            <Txt v="caption" c={color.muted} style={{ width: 70 }}>{fixture.home.code ?? 'Home'}</Txt>
            <View style={{ flex: 1 }} />
            <Txt v="caption" c={color.muted} style={{ width: 70, textAlign: 'right' }}>{fixture.away.code ?? 'Away'}</Txt>
          </Row>
          {statRow('League position', hs?.position, as?.position)}
          {statRow('Points', hs?.points, as?.points)}
          {statRow('Played', hs?.played, as?.played)}
          {statRow('Goals for', hs?.goals_for, as?.goals_for)}
          {statRow('Goals against', hs?.goals_against, as?.goals_against)}
          {statRow('Goals per match', hs?.played ? ((hs.goals_for ?? 0) / hs.played).toFixed(2) : null, as?.played ? ((as.goals_for ?? 0) / as.played).toFixed(2) : null)}
          {statRow('Home record · Away record (W-D-L)', rec(hs?.home), rec(as?.away))}
          <Txt v="small" c={color.faint} style={{ paddingTop: space.sm }}>
            Standings from the data provider, updated {formatStamp((hs ?? as)!.updated_at)}. Historical, not live.
          </Txt>
        </Card>
      ) : (
        <Txt c={color.muted}>Standings for this competition have not been synchronised.</Txt>
      )}

      <SectionTitle title="Last five" />
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt v="bodyBold" style={{ fontSize: 14 }}>{fixture.home.name}</Txt>
          {formDots(fixture.form.home)}
        </Row>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt v="bodyBold" style={{ fontSize: 14 }}>{fixture.away.name}</Txt>
          {formDots(fixture.form.away)}
        </Row>
        <Txt v="small" c={color.faint}>Most recent first, from matches stored in MATCH.IQ{hs?.form ? `. Provider form string: ${hs.form} / ${as?.form ?? '–'}` : ''}.</Txt>
      </Card>

      {fixture.head_to_head.length ? (
        <>
          <SectionTitle title="Head to head" />
          <Card pad={space.md} style={{ gap: 0 }}>
            {fixture.head_to_head.slice(0, 6).map((h, i) => (
              <Row key={h.fixture_id} style={{ paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: color.line }}>
                <Txt v="small" c={color.muted} style={{ width: 84 }}>{formatDay(h.kickoff_at)}</Txt>
                <Txt v="small" style={{ flex: 1 }} numberOfLines={1}>{h.home.name} {h.ft_home}–{h.ft_away} {h.away.name}</Txt>
              </Row>
            ))}
          </Card>
        </>
      ) : null}

      <SectionTitle title="Model estimate · experimental" />
      <Card>
        {model ? (
          <>
            <Row>
              <View style={{ flex: 1 }} />
              <Txt v="caption" c={color.muted} style={{ width: 64, textAlign: 'right' }}>Model</Txt>
              <Txt v="caption" c={color.muted} style={{ width: 64, textAlign: 'right' }}>Market</Txt>
            </Row>
            {([['home', fixture.home.name, model.home], ['draw', 'Draw', model.draw], ['away', fixture.away.name, model.away]] as const).map(([k, label, p], i) => (
              <Row key={k}>
                <Txt v="small" style={{ flex: 1 }} numberOfLines={1}>{label}</Txt>
                <Txt v="num" style={{ width: 64, textAlign: 'right', fontSize: 15 }}>{pct(p)}</Txt>
                <Txt v="num" c={color.muted} style={{ width: 64, textAlign: 'right', fontSize: 15 }}>{fair ? pct(fair[i]) : '–'}</Txt>
              </Row>
            ))}
            <Row>
              <Txt v="small" c={color.muted} style={{ flex: 1 }}>Expected goals {model.lambdaHome.toFixed(2)} – {model.lambdaAway.toFixed(2)} · Over 2.5: {pct(model.over(2.5))} · Both score: {pct(model.btts)}</Txt>
            </Row>
          </>
        ) : (
          <Txt c={color.muted}>Not enough home and away matches this season to estimate anything (at least five each are needed).</Txt>
        )}
        <Notice
          tone="muted"
          text={`A simple Poisson model built from this season's home and away scoring rates${model ? ` (${model.sample} matches at minimum)` : ''}. It has not been validated against results, ignores injuries and line-ups, and is context only: not advice and not a prediction of what will happen. "Market" is the bookmaker average with the margin removed.`}
        />
      </Card>
    </>
  );

  const lineupOf = (t: Team) => fixture.lineups.filter((l) => l.team_id === t.id);
  const lineupsTab = fixture.lineups.length ? (
    <>
      {[fixture.home, fixture.away].map((t) => {
        const rows = lineupOf(t);
        return (
          <View key={t.id} style={{ gap: space.sm }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row gap={space.sm}>
                <TeamBadge team={t} size={22} />
                <Txt v="h3">{t.name}</Txt>
              </Row>
              <Txt v="small" c={color.muted}>{rows[0]?.formation ?? ''}</Txt>
            </Row>
            <Card pad={space.md} style={{ gap: 0 }}>
              {rows.map((l, i) => (
                <Pressable key={l.player_id} accessibilityRole="button" onPress={() => router.push(`/player/${l.player_id}`)}>
                  <Row style={{ paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: color.line, opacity: l.is_starter ? 1 : 0.6 }}>
                    <Txt v="num" c={color.muted} style={{ width: 28, fontSize: 14 }}>{l.shirt_number ?? ''}</Txt>
                    <Txt v="bodyBold" style={{ flex: 1, fontSize: 14 }}>{l.name}</Txt>
                    <Txt v="small" c={color.muted}>{l.is_starter ? l.position ?? '' : 'Bench'}</Txt>
                  </Row>
                </Pressable>
              ))}
            </Card>
          </View>
        );
      })}
      <Txt v="small" c={color.faint}>Official line-ups from the data provider{fixture.lineups_at ? `, received ${formatStamp(fixture.lineups_at)}` : ''}.</Txt>
    </>
  ) : (
    <Card>
      <Empty icon="shirt" title="Line-ups not announced" body="Starting elevens are usually published 20 to 60 minutes before kick-off and appear here as soon as the provider has them." />
    </Card>
  );

  const started = fixture.status !== 'scheduled';
  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <Screen
        header={
          <View style={{ gap: space.md }}>
            <NavHeader title={fixture.competition.name} subtitle={fixture.round ?? undefined} />
            <View style={{ borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: color.line }}>
              <LinearGradient colors={['#15301A', color.surface]} style={{ padding: space.lg, gap: space.md, alignItems: 'center' }}>
                <Row style={{ alignSelf: 'stretch' }}>
                  <View style={{ flex: 1, alignItems: 'center', gap: space.sm }}>
                    <TeamBadge team={fixture.home} size={52} />
                    <Txt v="bodyBold" center numberOfLines={2} style={{ fontSize: 14 }}>{fixture.home.name}</Txt>
                  </View>
                  <View style={{ alignItems: 'center', gap: 4, minWidth: 96 }}>
                    {started && fixture.home_goals != null ? (
                      <Text style={{ fontFamily: font.displayHeavy, fontSize: 38, letterSpacing: -1, color: color.text }}>{fixture.home_goals} – {fixture.away_goals}</Text>
                    ) : (
                      <Text style={{ fontFamily: font.displayHeavy, fontSize: 30, color: color.text }}>{formatTime(fixture.kickoff_at)}</Text>
                    )}
                    {started ? <StatusPill fixture={fixture} /> : <Txt v="small" c={color.muted}>{formatDay(fixture.kickoff_at)}</Txt>}
                    {open ? <Txt v="small" c={color.accent}>in {countdown(fixture.kickoff_at - now)}</Txt> : null}
                  </View>
                  <View style={{ flex: 1, alignItems: 'center', gap: space.sm }}>
                    <TeamBadge team={fixture.away} size={52} />
                    <Txt v="bodyBold" center numberOfLines={2} style={{ fontSize: 14 }}>{fixture.away.name}</Txt>
                  </View>
                </Row>
                <Txt v="small" c={color.faint} center>{[fixture.venue, 'Madrid time'].filter(Boolean).join(' · ')}</Txt>
              </LinearGradient>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
              {TABS.map((t) => (
                <Chip key={t.value} label={t.label} active={tab === t.value} onPress={() => setTab(t.value)} />
              ))}
            </ScrollView>
          </View>
        }>
        <DataBanner />
        {tab === 'overview' ? overview : tab === 'match' ? matchTab : tab === 'players' ? playersTab : tab === 'stats' ? statsTab : lineupsTab}
      </Screen>
      {slip && slipSelection ? (
        <BetSlip
          target={{ ...slip, selection: slipSelection }}
          price={price(slipSelection)}
          staleMinutes={staleMinutes}
          balance={walletQ.data?.wallet.balance ?? null}
          onClose={() => setSlip(null)}
        />
      ) : null}
    </View>
  );
}
