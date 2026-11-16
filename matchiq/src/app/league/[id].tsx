import { formatDay } from '@core/season.ts';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { RankingTable } from '@/components/Ranking';
import { QueryState } from '@/components/status';
import { Avatar, Button, Card, Confirm, Empty, IconButton, NavHeader, Pill, Row, Screen, Segmented, Txt } from '@/components/ui';
import { ApiError, call, invalidate, useQuery } from '@/lib/api';
import { toast } from '@/lib/feedback';
import { copy, joinLink, shareText } from '@/lib/share';
import type { LeagueDetail, RankRow } from '@/lib/types';
import { color, radius, signed, space } from '@/theme/tokens';

export default function LeagueScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const league = useQuery<LeagueDetail | null>('get_league', { p_id: id });
  const table = useQuery<RankRow[]>(league.data?.is_member || league.data?.is_public ? 'get_rankings' : null, { p_scope: 'league', p_league_id: id }, 60_000);
  const [tab, setTab] = useState<'table' | 'members' | 'history'>('table');
  const [confirm, setConfirm] = useState<'leave' | 'delete' | null>(null);
  const l = league.data;

  if (!l) {
    return (
      <Screen header={<NavHeader title="League" />}>
        {league.data === null ? (
          <Empty icon="lock-closed" title="League not available" body="It is private or no longer exists. Ask a member for the code." action="Join with a code" onAction={() => router.replace('/league/join')} />
        ) : (
          <QueryState loading={league.loading} error={league.error} onRetry={league.reload} />
        )}
      </Screen>
    );
  }
  const invite = async () => {
    try {
      const inv = await call<{ token: string }>('create_invitation', { p_league_id: l.id, p_max_uses: null, p_expires_hours: 168 });
      await shareText(`Join my MATCH.IQ league "${l.name}". Code: ${l.code}\n${joinLink(inv.token)}`);
    } catch (e) {
      toast((e as ApiError).message, 'error');
    }
  };
  const act = async (fn: string, args: Record<string, unknown>, done: string) => {
    try {
      await call(fn, args);
      toast(done, 'info');
      invalidate('my_leagues', 'get_league', 'public_leagues');
      router.replace('/leagues');
    } catch (e) {
      toast((e as ApiError).message, 'error');
    }
  };

  return (
    <Screen
      header={
        <View style={{ gap: space.md }}>
          <NavHeader title={l.name} subtitle={`${l.members} member${l.members === 1 ? '' : 's'} · ${l.is_public ? 'Public' : 'Private'}`} right={l.is_member ? <IconButton icon="share-outline" label="Invite" onPress={invite} /> : undefined} />
          <Segmented value={tab} onChange={setTab} options={[{ value: 'table', label: 'Table' }, { value: 'members', label: 'Members' }, { value: 'history', label: 'Winners' }]} />
        </View>
      }>
      {tab === 'table' ? (
        <>
          {l.is_member && l.code ? (
            <Card tone="accent" style={{ alignItems: 'center' }}>
              <Txt v="caption" c={color.muted}>League code</Txt>
              <Row gap={6}>
                {l.code.split('').map((ch, i) => (
                  <View key={i} style={{ width: 40, height: 50, borderRadius: radius.sm, backgroundColor: color.bg, borderWidth: 1, borderColor: color.lineStrong, alignItems: 'center', justifyContent: 'center' }}>
                    <Txt v="h2" c={color.accent}>{ch}</Txt>
                  </View>
                ))}
              </Row>
              <Row style={{ alignSelf: 'stretch' }}>
                <Button label="Copy code" icon="copy-outline" kind="secondary" small onPress={() => copy(l.code!, 'League code copied.')} style={{ flex: 1 }} />
                <Button label="Invite friends" icon="share-outline" small onPress={invite} style={{ flex: 1 }} />
              </Row>
            </Card>
          ) : null}
          {table.data ? (
            table.data.length ? (
              <Card>
                <RankingTable rows={table.data} />
              </Card>
            ) : (
              <Card>
                <Empty icon="podium" title="No predictions yet this week" body="The table fills in as members place predictions." />
              </Card>
            )
          ) : (
            <QueryState loading={table.loading} error={table.error} onRetry={table.reload} rows={1} />
          )}
          <Txt v="small" c={color.faint}>This week&apos;s profit for each member. Weeks run Monday to Sunday, Madrid time.</Txt>
        </>
      ) : tab === 'members' ? (
        <>
          <Card pad={space.md} style={{ gap: 0 }}>
            {l.member_list.map((m, i) => (
              <Row key={m.user_id} style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: color.line }}>
                <Avatar person={m} size={34} />
                <Txt v="bodyBold" style={{ flex: 1 }}>{m.username}</Txt>
                {m.role === 'owner' ? <Pill label="OWNER" tone="accent" /> : l.is_owner ? (
                  <Button label="Remove" small kind="ghost" onPress={() => call('leave_league', { p_league_id: l.id, p_user_id: m.user_id }).then(() => { toast(`${m.username} removed.`, 'info'); invalidate('get_league', 'get_rankings'); }, (e: ApiError) => toast(e.message, 'error'))} />
                ) : null}
              </Row>
            ))}
          </Card>
          {l.is_member ? (
            l.is_owner ? (
              <Button label="Delete league" icon="trash" kind="danger" onPress={() => setConfirm('delete')} />
            ) : (
              <Button label="Leave league" icon="exit-outline" kind="danger" onPress={() => setConfirm('leave')} />
            )
          ) : (
            <Button label="Join this league" onPress={() => call('join_public_league', { p_league_id: l.id }).then(() => { toast(`You joined ${l.name}.`); invalidate('my_leagues', 'get_league', 'public_leagues'); }, (e: ApiError) => toast(e.message, 'error'))} />
          )}
        </>
      ) : l.winners.length ? (
        <Card pad={space.md} style={{ gap: 0 }}>
          {l.winners.map((w, i) => (
            <Row key={w.season_id} style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: color.line }}>
              <Avatar person={w} size={34} />
              <View style={{ flex: 1 }}>
                <Txt v="bodyBold">{w.username}</Txt>
                <Txt v="small" c={color.muted}>Week of {formatDay(w.starts_at)}</Txt>
              </View>
              <Txt v="num" c={color.accent} style={{ fontSize: 15 }}>{signed(w.net_profit)}</Txt>
            </Row>
          ))}
        </Card>
      ) : (
        <Card>
          <Empty icon="trophy" title="No weekly winner yet" body="The first champion is crowned when this week closes on Sunday night." />
        </Card>
      )}
      <Confirm
        visible={confirm !== null}
        danger
        title={confirm === 'delete' ? 'Delete this league?' : 'Leave this league?'}
        body={confirm === 'delete' ? 'The league, its member list and its winners history are removed for everyone. Predictions and wallets are not affected.' : 'You can rejoin later with the code.'}
        confirmLabel={confirm === 'delete' ? 'Delete' : 'Leave'}
        onClose={() => setConfirm(null)}
        onConfirm={() => (confirm === 'delete' ? act('delete_league', { p_league_id: l.id }, 'League deleted.') : act('leave_league', { p_league_id: l.id }, 'You left the league.'))}
      />
    </Screen>
  );
}
