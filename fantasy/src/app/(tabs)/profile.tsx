import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Avatar, Button, Card, Field, Glow, Icon, IconButton, Pill, Row, Screen, SectionTitle, Sheet, Stat, Txt, type IconName } from '@/components/ui';
import { MANAGER_COLORS } from '@/data/demo/catalog';
import { achievements, careerStats } from '@/state/game';
import { useActiveLeague } from '@/state/hooks';
import { actions, attempt } from '@/state/store';
import { color, space } from '@/theme/tokens';

const PLUS = ['Advanced player analytics', 'Full historical statistics', 'Custom league rules', 'Team insights', 'Profile themes'];

export default function Profile() {
  const { s, me, leagues } = useActiveLeague();
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState(me?.username ?? '');
  const [tint, setTint] = useState(me?.color ?? MANAGER_COLORS[0]);
  if (!me) return null;
  const career = careerStats(s, me.id);
  const badges = achievements(s, me.id);
  const unlocked = badges.filter((b) => b.unlocked).length;
  const unread = s.notices.filter((n) => !n.read).length;
  const links: { icon: IconName; label: string; detail: string; href: Href }[] = [
    { icon: 'people', label: 'Friends', detail: `${s.friends.length}`, href: '/friends' },
    { icon: 'notifications', label: 'Notifications', detail: unread ? `${unread} new` : '', href: '/notifications' },
    { icon: 'settings', label: 'Settings', detail: '', href: '/settings' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <Glow tint={me.color} height={220} />
      <Screen tabbed>
        <Row style={{ justifyContent: 'flex-end' }}>
          <IconButton icon="create-outline" label="Edit profile" onPress={() => { setUsername(me.username); setTint(me.color); setEditing(true); }} />
        </Row>
        <View style={{ alignItems: 'center', gap: space.sm }}>
          <Avatar manager={me} size={96} ring />
          <Txt v="h1">{me.username}</Txt>
          <Pill label="DEMO PROFILE · THIS DEVICE ONLY" tone="warn" icon="flask" />
        </View>

        <Card>
          <Row>
            <Stat value={career.played} label="Played" />
            <Stat value={career.wins} label="Wins" tint={color.accent} />
            <Stat value={career.draws} label="Draws" />
            <Stat value={career.losses} label="Losses" />
          </Row>
          <View style={{ height: 1, backgroundColor: color.line }} />
          <Row>
            <Stat value={leagues.length} label="Leagues" />
            <Stat value={career.goalsFor} label="Goals" />
            <Stat value={career.bestPoints} label="Best pts" />
            <Stat value={career.played ? `${Math.round((career.wins / career.played) * 100)}%` : '–'} label="Win rate" />
          </Row>
        </Card>

        <SectionTitle title={`Achievements · ${unlocked}/${badges.length}`} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
          {badges.map((b) => (
            <View key={b.id} style={{ width: '47.5%', flexGrow: 1, backgroundColor: color.surface, borderRadius: 18, borderWidth: 1, borderColor: b.unlocked ? 'rgba(182,245,66,0.3)' : color.line, padding: space.md, gap: 6, opacity: b.unlocked ? 1 : 0.5 }}>
              <Icon name={(b.unlocked ? b.icon : 'lock-closed') as IconName} size={20} c={b.unlocked ? color.accent : color.faint} />
              <Txt v="bodyBold">{b.title}</Txt>
              <Txt v="small" c={color.muted}>{b.description}</Txt>
            </View>
          ))}
        </View>

        <Card pad={space.sm} style={{ gap: 0 }}>
          {links.map((l, i) => (
            <Pressable key={l.label} accessibilityRole="button" onPress={() => router.push(l.href)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderTopWidth: i ? 1 : 0, borderTopColor: color.line, opacity: pressed ? 0.6 : 1 })}>
              <Icon name={l.icon} size={20} c={color.muted} />
              <Txt v="bodyBold" style={{ flex: 1 }}>{l.label}</Txt>
              <Txt v="small" c={color.accent}>{l.detail}</Txt>
              <Icon name="chevron-forward" size={18} c={color.faint} />
            </Pressable>
          ))}
        </Card>

        <Card tone="raised">
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt v="h3">Rondo Plus</Txt>
            <Pill label="NOT AVAILABLE YET" />
          </Row>
          <Txt v="small" c={color.muted}>
            Playing is free and always will be: virtual budgets only, no betting, no cash prizes. A later optional
            membership would add:
          </Txt>
          {PLUS.map((f) => (
            <Row key={f} gap={space.sm}>
              <Icon name="ellipse" size={6} c={color.faint} />
              <Txt v="small" c={color.muted}>{f}</Txt>
            </Row>
          ))}
        </Card>
      </Screen>

      <Sheet visible={editing} onClose={() => setEditing(false)} title="Edit profile">
        <Field label="Manager name" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} maxLength={18} />
        <View style={{ gap: space.sm }}>
          <Txt v="caption" c={color.muted}>Colour</Txt>
          <Row gap={space.md} style={{ flexWrap: 'wrap' }}>
            {MANAGER_COLORS.map((c) => (
              <Pressable key={c} accessibilityRole="button" accessibilityLabel={`Colour ${c}`} onPress={() => setTint(c)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c, borderWidth: 3, borderColor: tint === c ? color.text : 'transparent' }} />
            ))}
          </Row>
        </View>
        <Button
          label="Save"
          onPress={() => {
            if (attempt(actions.updateProfile({ username, color: tint }), 'Profile updated.')) setEditing(false);
          }}
        />
      </Sheet>
    </View>
  );
}
