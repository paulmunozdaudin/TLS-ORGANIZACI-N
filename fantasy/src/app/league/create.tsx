import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, Card, Field, Icon, NavHeader, Row, Screen, Txt } from '@/components/ui';
import { RULES } from '@/state/game';
import { actions, attempt, useGameState } from '@/state/store';
import { color, radius, space } from '@/theme/tokens';

export default function CreateLeague() {
  const s = useGameState();
  const [name, setName] = useState('');
  const [size, setSize] = useState(6);
  const [isPublic, setPublic] = useState(false);

  const submit = () => {
    if (!attempt(actions.createLeague({ name, size, isPublic }), 'League created.')) return;
    // The repository makes the new league the active one.
    router.replace('/league/active');
  };

  return (
    <Screen
      header={<NavHeader title="New league" />}
      footer={<Button label="Create league" icon="flag" onPress={submit} disabled={name.trim().length < 3} />}>
      <Field label="League name" placeholder="e.g. Thursday Five-a-side" value={name} onChangeText={setName} maxLength={28} autoFocus hint={`${name.trim().length}/28`} />

      <View style={{ gap: space.sm }}>
        <Txt v="caption" c={color.muted}>Managers</Txt>
        <Row gap={space.sm}>
          {RULES.leagueSizes.map((n) => (
            <Pressable
              key={n}
              accessibilityRole="button"
              accessibilityState={{ selected: size === n }}
              onPress={() => setSize(n)}
              style={{ flex: 1, height: 56, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: size === n ? color.accent : color.surface, borderWidth: 1, borderColor: size === n ? color.accent : color.line }}>
              <Txt v="h2" c={size === n ? color.onAccent : color.text}>{n}</Txt>
            </Pressable>
          ))}
        </Row>
        <Txt v="small" c={color.faint}>
          Everyone plays everyone home and away: {(size - 1) * 2} matchdays.
        </Txt>
      </View>

      <View style={{ gap: space.sm }}>
        <Txt v="caption" c={color.muted}>Access</Txt>
        {([
          [false, 'lock-closed', 'Private', 'Only people with your invitation code can join.'],
          [true, 'earth', 'Public', 'Listed in the app. Anyone can take a free seat.'],
        ] as const).map(([value, icon, title, body]) => (
          <Card key={title} onPress={() => setPublic(value)} style={{ borderColor: isPublic === value ? color.accent : color.line }}>
            <Row>
              <Icon name={icon} c={isPublic === value ? color.accent : color.muted} />
              <View style={{ flex: 1 }}>
                <Txt v="h3">{title}</Txt>
                <Txt v="small" c={color.muted}>{body}</Txt>
              </View>
              <Icon name={isPublic === value ? 'radio-button-on' : 'radio-button-off'} c={isPublic === value ? color.accent : color.faint} />
            </Row>
          </Card>
        ))}
      </View>

      <Card tone="raised">
        <Txt v="h3">How it starts</Txt>
        <Txt v="small" c={color.muted}>
          You get an invitation code to share. When all {size} seats are taken you start the league, every manager
          receives €{RULES.startingBudget}M and the transfer market opens. {s.meId ? 'You are the league owner.' : ''}
        </Txt>
      </Card>
    </Screen>
  );
}
