import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { QueryState } from '@/components/status';
import { Avatar, Button, Card, Field, Glow, Icon, IconButton, Row, Screen, SectionTitle, Sheet, Stat, Txt, type IconName } from '@/components/ui';
import { ApiError, call, invalidate, useQuery } from '@/lib/api';
import { toast } from '@/lib/feedback';
import { useSession } from '@/lib/session';
import { color, signed, space } from '@/theme/tokens';

const COLORS = ['#B6F542', '#5EC8FF', '#FF8A5C', '#C58BFF', '#FFD166', '#4FE3B0', '#FF6B9A', '#8FA3FF'];

interface ProfileView {
  achievements: { key: string; name: string; description: string; icon: string; times: number }[];
  career: { seasons: number; net_profit: number; best_rank: number | null; predictions: number; won: number };
}

export default function Profile() {
  const { profile, refreshProfile } = useSession();
  const view = useQuery<ProfileView>('get_profile', { p_user: null });
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState('');
  const [tint, setTint] = useState(COLORS[0]);
  const [error, setError] = useState<string | null>(null);
  if (!profile) return <Screen tabbed><QueryState loading error={null} onRetry={() => {}} /></Screen>;

  const save = async () => {
    try {
      await call('update_profile', { p_username: username, p_avatar_color: tint });
      await refreshProfile();
      invalidate('get_rankings', 'get_league');
      toast('Profile updated.');
      setEditing(false);
    } catch (e) {
      setError((e as ApiError).message);
    }
  };
  const links: { icon: IconName; label: string; href: Href }[] = [
    { icon: 'receipt', label: 'My predictions', href: '/predictions' },
    { icon: 'wallet', label: 'Wallet and ledger', href: '/wallet' },
    { icon: 'people', label: 'Friends', href: '/friends' },
    { icon: 'notifications', label: 'Notifications', href: '/notifications' },
    { icon: 'settings', label: 'Settings', href: '/settings' },
  ];
  const c = view.data?.career;

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <Glow tint={profile.avatar_color} height={220} />
      <Screen tabbed>
        <Row style={{ justifyContent: 'flex-end' }}>
          <IconButton icon="create-outline" label="Edit profile" onPress={() => { setUsername(profile.username); setTint(profile.avatar_color); setError(null); setEditing(true); }} />
        </Row>
        <View style={{ alignItems: 'center', gap: space.sm }}>
          <Avatar person={profile} size={96} ring />
          <Txt v="h1">{profile.username}</Txt>
        </View>

        <SectionTitle title="Finished weeks" />
        {c ? (
          <Card>
            <Row>
              <Stat value={c.seasons} label="Weeks" />
              <Stat value={c.best_rank ? `#${c.best_rank}` : '–'} label="Best rank" tint={color.accent} />
              <Stat value={signed(Number(c.net_profit))} label="Profit" />
              <Stat value={Number(c.predictions) ? `${Math.round((Number(c.won) / Number(c.predictions)) * 100)}%` : '–'} label="Hit rate" />
            </Row>
            <Button label="Week by week" small kind="secondary" onPress={() => router.push('/wallet')} />
          </Card>
        ) : (
          <QueryState loading={view.loading} error={view.error} onRetry={view.reload} rows={1} />
        )}

        <SectionTitle title={`Achievements · ${view.data?.achievements.filter((a) => a.times > 0).length ?? 0}/${view.data?.achievements.length ?? 0}`} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
          {(view.data?.achievements ?? []).map((a) => (
            <View key={a.key} style={{ width: '47.5%', flexGrow: 1, backgroundColor: color.surface, borderRadius: 18, borderWidth: 1, borderColor: a.times ? 'rgba(182,245,66,0.3)' : color.line, padding: space.md, gap: 6, opacity: a.times ? 1 : 0.5 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Icon name={(a.times ? a.icon : 'lock-closed') as IconName} size={20} c={a.times ? color.accent : color.faint} />
                {a.times > 1 ? <Txt v="small" c={color.accent}>×{a.times}</Txt> : null}
              </Row>
              <Txt v="bodyBold">{a.name}</Txt>
              <Txt v="small" c={color.muted}>{a.description}</Txt>
            </View>
          ))}
        </View>

        <Card pad={space.sm} style={{ gap: 0 }}>
          {links.map((l, i) => (
            <Pressable key={l.label} accessibilityRole="button" onPress={() => router.push(l.href)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderTopWidth: i ? 1 : 0, borderTopColor: color.line, opacity: pressed ? 0.6 : 1 })}>
              <Icon name={l.icon} size={20} c={color.muted} />
              <Txt v="bodyBold" style={{ flex: 1 }}>{l.label}</Txt>
              <Icon name="chevron-forward" size={18} c={color.faint} />
            </Pressable>
          ))}
        </Card>
      </Screen>

      <Sheet visible={editing} onClose={() => setEditing(false)} title="Edit profile">
        <Field label="Username" value={username} onChangeText={(t) => { setUsername(t); setError(null); }} autoCapitalize="none" autoCorrect={false} maxLength={18} error={error} />
        <View style={{ gap: space.sm }}>
          <Txt v="caption" c={color.muted}>Colour</Txt>
          <Row gap={space.md} style={{ flexWrap: 'wrap' }}>
            {COLORS.map((x) => (
              <Pressable key={x} accessibilityRole="button" accessibilityLabel={`Colour ${x}`} onPress={() => setTint(x)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: x, borderWidth: 3, borderColor: tint === x ? color.text : 'transparent' }} />
            ))}
          </Row>
        </View>
        <Button label="Save" onPress={save} />
      </Sheet>
    </View>
  );
}
