import Constants from 'expo-constants';
import { formatStamp } from '@core/season.ts';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { useDataStatus } from '@/components/status';
import { Button, Card, Chip, Confirm, Icon, NavHeader, Notice, Row, Screen, SectionTitle, Txt } from '@/components/ui';
import { ApiError, call, invalidate, useQuery } from '@/lib/api';
import { toast } from '@/lib/feedback';
import { REFERENCE_LABEL } from '@/lib/pricing';
import { useSession } from '@/lib/session';
import type { Profile } from '@/lib/types';
import { color, space } from '@/theme/tokens';

const MODES: { value: Profile['reference_mode']; body: string }[] = [
  { value: 'consensus', body: 'The average price across every bookmaker with a current quote.' },
  { value: 'best', body: 'The highest price currently offered by any bookmaker.' },
  { value: 'bookmaker', body: 'Always the price of one bookmaker you choose. Markets it does not price are unavailable to you.' },
];
const JOB_LABEL: Record<string, string> = { fixtures: 'Fixtures', reference: 'Teams and squads', 'reference-stats': 'Season statistics', live: 'Live scores', details: 'Line-ups and match data', odds: 'Odds', settle: 'Settlement', seasons: 'Weekly seasons' };

export default function Settings() {
  const { profile, refreshProfile, signOut } = useSession();
  const status = useDataStatus();
  const books = useQuery<{ id: number; name: string }[]>('list_bookmakers');
  const [confirm, setConfirm] = useState(false);
  if (!profile) return null;

  const setReference = async (mode: Profile['reference_mode'], bookmakerId: number | null = null) => {
    try {
      await call('update_profile', { p_reference_mode: mode, p_reference_bookmaker_id: bookmakerId });
      await refreshProfile();
      invalidate('get_fixture_markets');
    } catch (e) {
      toast((e as ApiError).message, 'error');
    }
  };

  return (
    <Screen header={<NavHeader title="Settings" />}>
      <SectionTitle title="Reference odds" />
      <Txt v="small" c={color.muted}>Which price your predictions lock in. It applies from your next prediction; placed ones never change.</Txt>
      {MODES.map((m) => {
        const on = profile.reference_mode === m.value;
        return (
          <Card key={m.value} onPress={() => (m.value === 'bookmaker' ? (books.data?.[0] ? setReference('bookmaker', profile.reference_bookmaker_id ?? books.data[0].id) : toast('No bookmaker has prices yet.', 'error')) : setReference(m.value))} style={{ borderColor: on ? color.accent : color.line }}>
            <Row>
              <View style={{ flex: 1 }}>
                <Txt v="h3">{REFERENCE_LABEL[m.value]}</Txt>
                <Txt v="small" c={color.muted}>{m.body}</Txt>
              </View>
              <Icon name={on ? 'radio-button-on' : 'radio-button-off'} c={on ? color.accent : color.faint} />
            </Row>
            {on && m.value === 'bookmaker' ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                {(books.data ?? []).map((b) => (
                  <Chip key={b.id} label={b.name} active={profile.reference_bookmaker_id === b.id} onPress={() => setReference('bookmaker', b.id)} />
                ))}
              </View>
            ) : null}
          </Card>
        );
      })}

      <SectionTitle title="Data sources" />
      <Card style={{ gap: 0 }}>
        {(status.data?.jobs ?? []).map((j, i) => {
          const failing = (j.last_error_at ?? 0) > (j.last_ok_at ?? 0);
          return (
            <Row key={`${j.job}-${j.provider}`} style={{ paddingVertical: 9, borderTopWidth: i ? 1 : 0, borderTopColor: color.line, alignItems: 'flex-start' }}>
              <Icon name={failing ? 'alert-circle' : 'checkmark-circle'} size={16} c={failing ? color.danger : color.accent} />
              <View style={{ flex: 1 }}>
                <Txt v="small">{JOB_LABEL[j.job] ?? j.job} · {j.provider}</Txt>
                <Txt v="small" c={color.faint}>{j.last_ok_at ? `Last success ${formatStamp(j.last_ok_at)}` : 'Never succeeded'}{failing ? ` · failing since ${formatStamp(j.last_error_at!)}` : ''}</Txt>
              </View>
            </Row>
          );
        })}
        {status.data && !status.data.jobs.length ? <Txt c={color.muted}>No synchronisation has run yet.</Txt> : null}
        {status.data ? (
          <Txt v="small" c={color.faint} style={{ paddingTop: space.sm }}>
            {status.data.priced_fixtures} of {status.data.fixtures} upcoming matches have prices. Times are Madrid time. Odds are shown for information inside a free game; MATCH.IQ takes no bets.
          </Txt>
        ) : null}
      </Card>

      <SectionTitle title="About" />
      <Notice tone="muted" icon="shield-checkmark" text="MATCH.IQ is a free prediction game for adults. Coins are virtual points with no monetary value: no deposits, no withdrawals, no purchases, no cash prizes. Statistics and model estimates are context, never a guarantee." />
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt v="small" c={color.muted}>Version</Txt>
          <Txt v="small">{Constants.expoConfig?.version ?? '–'}</Txt>
        </Row>
      </Card>
      <Pressable accessibilityRole="button" onPress={() => router.push('/wallet')}>
        <Txt v="small" c={color.accent} center>How coins and weekly seasons work</Txt>
      </Pressable>
      <Button label="Sign out" icon="log-out-outline" kind="danger" onPress={() => setConfirm(true)} />
      <Confirm visible={confirm} title="Sign out?" body="Your predictions and leagues stay on your account." confirmLabel="Sign out" onClose={() => setConfirm(false)} onConfirm={async () => { await signOut(); router.replace('/'); }} />
    </Screen>
  );
}
