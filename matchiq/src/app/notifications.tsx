import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';

import { ago, useNow } from '@/components/match';
import { QueryState } from '@/components/status';
import { Card, Empty, Icon, NavHeader, Screen, Txt, type IconName } from '@/components/ui';
import { call, invalidate, useQuery } from '@/lib/api';
import type { NotificationRow } from '@/lib/types';
import { color, space } from '@/theme/tokens';

const ICON: Record<string, IconName> = {
  prediction_won: 'checkmark-circle', prediction_lost: 'close-circle', prediction_void: 'refresh-circle', prediction_corrected: 'construct',
  season_closed: 'trophy', league_joined: 'people', friend_request: 'person-add',
};

export default function Notifications() {
  const { data, loading, error, reload } = useQuery<NotificationRow[]>('my_notifications');
  const now = useNow();
  const hasUnread = Boolean(data?.some((n) => !n.read));
  // Mark as read on the way out, so new items stay highlighted while they are on screen.
  useEffect(
    () => () => {
      if (hasUnread) call('mark_notifications_read').then(() => invalidate('my_notifications'), () => {});
    },
    [hasUnread]
  );
  const open = (n: NotificationRow) => {
    if (n.data.fixture_id) router.push(`/match/${n.data.fixture_id}`);
    else if (n.data.league_id) router.push(`/league/${n.data.league_id}`);
    else if (n.kind === 'friend_request') router.push('/friends');
    else if (n.kind === 'season_closed') router.push('/wallet');
  };
  return (
    <Screen header={<NavHeader title="Notifications" />}>
      {data ? (
        data.length ? (
          <Card pad={space.sm} style={{ gap: 0 }}>
            {data.map((n, i) => (
              <Pressable key={n.id} accessibilityRole="button" onPress={() => open(n)} style={({ pressed }) => ({ flexDirection: 'row', gap: space.md, padding: space.md, borderTopWidth: i ? 1 : 0, borderTopColor: color.line, opacity: pressed ? 0.6 : 1 })}>
                <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: n.read ? color.surfaceHi : color.accentDim, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={ICON[n.kind] ?? 'notifications'} size={18} c={n.read ? color.muted : color.accent} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt v="bodyBold">{n.title}</Txt>
                  <Txt v="small" c={color.muted}>{n.body}</Txt>
                </View>
                <Txt v="small" c={color.faint}>{ago(n.at, now)}</Txt>
              </Pressable>
            ))}
          </Card>
        ) : (
          <Empty icon="notifications-off" title="Nothing yet" body="Settled predictions, weekly results and league news show up here." />
        )
      ) : (
        <QueryState loading={loading} error={error} onRetry={reload} />
      )}
    </Screen>
  );
}
