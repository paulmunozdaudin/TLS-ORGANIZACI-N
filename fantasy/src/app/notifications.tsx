import { router, type Href } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';

import { timeAgo, useNow } from '@/components/game';
import { Card, Empty, Icon, NavHeader, Screen, Txt, type IconName } from '@/components/ui';
import type { NoticeKind } from '@/state/game';
import { actions, useGameState } from '@/state/store';
import { color, space } from '@/theme/tokens';

const ICONS: Record<NoticeKind, IconName> = { bid: 'hammer', match: 'football', league: 'trophy', social: 'people' };

export default function Notifications() {
  const s = useGameState();
  const now = useNow();
  const hasUnread = s.notices.some((n) => !n.read);
  // Mark as read when leaving, so new items stay highlighted while you look.
  useEffect(() => () => void (hasUnread && actions.markNoticesRead()), [hasUnread]);

  return (
    <Screen header={<NavHeader title="Notifications" />}>
      {s.notices.length ? (
        <Card pad={space.sm} style={{ gap: 0 }}>
          {s.notices.map((n, i) => (
            <Pressable
              key={n.id}
              accessibilityRole="button"
              onPress={() => n.href && router.push(n.href as Href)}
              style={({ pressed }) => ({ flexDirection: 'row', gap: space.md, padding: space.md, borderTopWidth: i ? 1 : 0, borderTopColor: color.line, opacity: pressed ? 0.6 : 1 })}>
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: n.read ? color.surfaceHi : color.accentDim, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={ICONS[n.kind]} size={18} c={n.read ? color.muted : color.accent} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt v="bodyBold">{n.title}</Txt>
                <Txt v="small" c={color.muted}>{n.body}</Txt>
              </View>
              <Txt v="small" c={color.faint}>{timeAgo(n.at, now)}</Txt>
            </Pressable>
          ))}
        </Card>
      ) : (
        <Empty icon="notifications-off" title="Nothing yet" body="Auction results and match scores will show up here." />
      )}
    </Screen>
  );
}
