import { formatDay, formatStamp } from '@core/season.ts';
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { FixtureCard } from '@/components/match';
import { QueryState } from '@/components/status';
import { Card, Empty, NavHeader, PlayerPhoto, Row, Screen, SectionTitle, Stat, TeamBadge, Txt } from '@/components/ui';
import { useQuery } from '@/lib/api';
import type { Fixture, FixtureListItem, Team } from '@/lib/types';
import { color, space } from '@/theme/tokens';

interface PlayerView {
  id: number;
  name: string;
  full_name: string | null;
  photo_url: string | null;
  nationality: string | null;
  position: string | null;
  shirt_number: number | null;
  team: Team | null;
  updated_at: number;
  seasons: { competition: string; season: number; appearances: number | null; starts: number | null; minutes: number | null; goals: number | null; assists: number | null; yellow_cards: number | null; red_cards: number | null; shots: number | null; shots_on_target: number | null; updated_at: number }[];
  recent: { fixture_id: number; kickoff_at: number; home: Team; away: Team; ft_home: number | null; ft_away: number | null; minutes: number | null; started: boolean; goals: number | null; assists: number | null; shots: number | null; shots_on_target: number | null; yellow_cards: number | null; red_cards: number | null }[];
  next_fixture: Fixture | null;
}

const n = (v: number | null | undefined) => (v == null ? '–' : v);

export default function PlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, reload } = useQuery<PlayerView | null>('get_player', { p_id: Number(id) });
  if (!data) {
    return (
      <Screen header={<NavHeader title="Player" />}>
        {data === null ? <Empty icon="help-circle" title="Player not found" body="This player is not in the database." /> : <QueryState loading={loading} error={error} onRetry={reload} />}
      </Screen>
    );
  }
  const s = data.seasons[0];
  const played = data.recent.filter((r) => (r.minutes ?? 0) > 0);
  const scoredIn = played.filter((r) => (r.goals ?? 0) > 0).length;
  return (
    <Screen header={<NavHeader />}>
      <Row gap={space.lg}>
        <PlayerPhoto player={data} size={84} />
        <View style={{ flex: 1, gap: 4 }}>
          <Txt v="h1">{data.name}</Txt>
          {data.full_name && data.full_name !== data.name ? <Txt v="small" c={color.muted}>{data.full_name}</Txt> : null}
          <Row gap={space.sm}>
            <TeamBadge team={data.team} size={20} />
            <Txt v="small" c={color.muted}>{[data.team?.name, data.position, data.shirt_number ? `#${data.shirt_number}` : null, data.nationality].filter(Boolean).join(' · ')}</Txt>
          </Row>
        </View>
      </Row>

      <SectionTitle title={s ? `${s.competition} ${s.season}` : 'Season statistics'} />
      {s ? (
        <Card>
          <Row>
            <Stat value={n(s.appearances)} label="Apps" />
            <Stat value={n(s.starts)} label="Starts" />
            <Stat value={n(s.minutes)} label="Minutes" />
            <Stat value={n(s.goals)} label="Goals" tint={color.accent} />
          </Row>
          <Row>
            <Stat value={n(s.assists)} label="Assists" />
            <Stat value={n(s.shots)} label="Shots" />
            <Stat value={n(s.shots_on_target)} label="On target" />
            <Stat value={`${n(s.yellow_cards)}/${n(s.red_cards)}`} label="Y / R cards" />
          </Row>
          <Txt v="small" c={color.faint}>Season totals from the data provider, updated {formatStamp(s.updated_at)}. Historical, not live.</Txt>
        </Card>
      ) : (
        <Txt c={color.muted}>Season statistics have not been synchronised for this player.</Txt>
      )}

      <SectionTitle title="Recent matches" />
      {data.recent.length ? (
        <Card pad={space.md} style={{ gap: 0 }}>
          <Row style={{ paddingBottom: space.sm }}>
            <Txt v="caption" c={color.faint} style={{ flex: 1 }}>Match</Txt>
            {['Min', 'G', 'A', 'Sh', 'SoT'].map((h) => (
              <Txt key={h} v="caption" c={color.faint} style={{ width: 34, textAlign: 'right' }}>{h}</Txt>
            ))}
          </Row>
          {data.recent.map((r) => (
            <Row key={r.fixture_id} style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: color.line }}>
              <View style={{ flex: 1 }}>
                <Txt v="small" numberOfLines={1} onPress={() => router.push(`/match/${r.fixture_id}`)}>{r.home.name} {n(r.ft_home)}–{n(r.ft_away)} {r.away.name}</Txt>
                <Txt v="small" c={color.faint}>{formatDay(r.kickoff_at)}{r.started ? '' : ' · sub'}</Txt>
              </View>
              {[r.minutes, r.goals, r.assists, r.shots, r.shots_on_target].map((v, i) => (
                <Txt key={i} v="small" c={i === 1 && (v ?? 0) > 0 ? color.accent : color.muted} style={{ width: 34, textAlign: 'right' }}>{v ?? 0}</Txt>
              ))}
            </Row>
          ))}
          {played.length >= 5 ? (
            <Txt v="small" c={color.faint} style={{ paddingTop: space.sm }}>
              Scored in {scoredIn} of the last {played.length} matches played ({Math.round((scoredIn / played.length) * 100)}%). A historical frequency, not a forecast.
            </Txt>
          ) : null}
        </Card>
      ) : (
        <Txt c={color.muted}>No finished matches with statistics on record yet.</Txt>
      )}

      {data.next_fixture ? (
        <>
          <SectionTitle title="Next match" />
          <FixtureCard fixture={{ ...data.next_fixture, markets: 0, result_prices: null } as FixtureListItem} showDay />
          <Txt v="small" c={color.faint}>Open the match to see which player markets are priced.</Txt>
        </>
      ) : null}
    </Screen>
  );
}
