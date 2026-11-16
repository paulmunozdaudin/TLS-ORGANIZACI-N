import { formatDay, zonedDayKey, zonedMidnight } from '@core/season.ts';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { FixtureCard } from '@/components/match';
import { DataBanner, QueryState } from '@/components/status';
import { Card, Chip, Empty, Screen, Txt } from '@/components/ui';
import { useQuery } from '@/lib/api';
import type { FixtureListItem } from '@/lib/types';
import { color, space } from '@/theme/tokens';

const DAY = 86_400_000;

export default function Matches() {
  // Calendar days are Europe/Madrid days, whatever the phone's timezone.
  const [openedAt] = useState(() => Date.now());
  const days = useMemo(() => {
    const [y, m, d] = zonedDayKey(openedAt).split('-').map(Number);
    const today = zonedMidnight(y, m, d);
    return Array.from({ length: 9 }, (_, i) => {
      const noon = today + (i - 1) * DAY + 12 * 3600e3;
      const [yy, mm, dd] = zonedDayKey(noon).split('-').map(Number);
      const start = zonedMidnight(yy, mm, dd);
      const [ny, nm, nd] = zonedDayKey(start + 36 * 3600e3).split('-').map(Number);
      return { key: zonedDayKey(noon), start, end: zonedMidnight(ny, nm, nd), label: i === 0 ? 'Yesterday' : i === 1 ? 'Today' : i === 2 ? 'Tomorrow' : formatDay(noon) };
    });
  }, [openedAt]);
  const [dayKey, setDayKey] = useState(days[1].key);
  const [competition, setCompetition] = useState<number | null>(null);
  const day = days.find((d) => d.key === dayKey) ?? days[1];
  const args = useMemo(() => ({ p_from: new Date(day.start).toISOString(), p_to: new Date(day.end).toISOString() }), [day]);
  const { data, loading, error, reload } = useQuery<FixtureListItem[]>('list_fixtures', args, 60_000);

  const competitions = [...new Map((data ?? []).map((f) => [f.competition.id, f.competition])).values()];
  const shown = (data ?? []).filter((f) => !competition || f.competition.id === competition);
  const groups = [...new Map(shown.map((f) => [f.competition.id, f.competition])).values()];

  return (
    <Screen
      tabbed
      header={
        <View style={{ gap: space.md }}>
          <Txt v="h1">Matches</Txt>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
            {days.map((d) => (
              <Chip key={d.key} label={d.label} active={d.key === dayKey} onPress={() => { setDayKey(d.key); setCompetition(null); }} />
            ))}
          </ScrollView>
        </View>
      }>
      <DataBanner />
      {competitions.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          <Chip label="All" active={!competition} onPress={() => setCompetition(null)} />
          {competitions.map((c) => (
            <Chip key={c.id} label={c.name} active={competition === c.id} onPress={() => setCompetition(c.id)} />
          ))}
        </ScrollView>
      ) : null}
      {data ? (
        shown.length ? (
          groups.map((c) => (
            <View key={c.id} style={{ gap: space.md }}>
              <Txt v="caption" c={color.muted}>{c.name}{c.country ? ` · ${c.country}` : ''}</Txt>
              {shown.filter((f) => f.competition.id === c.id).map((f) => <FixtureCard key={f.id} fixture={f} />)}
            </View>
          ))
        ) : (
          <Card>
            <Empty icon="calendar" title={`No matches ${day.label.toLowerCase()}`} body="Try another day. Times are shown in Madrid time." />
          </Card>
        )
      ) : (
        <QueryState loading={loading} error={error} onRetry={reload} />
      )}
      <Txt v="small" c={color.faint} center>Kick-off times in Europe/Madrid. 1 X 2 shows the average across bookmakers.</Txt>
    </Screen>
  );
}
