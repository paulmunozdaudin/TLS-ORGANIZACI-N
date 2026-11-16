import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Field, Icon, NavHeader, Row, Screen, Txt } from '@/components/ui';
import { actions, useGameState } from '@/state/store';
import { color, space } from '@/theme/tokens';

export default function JoinLeague() {
  const s = useGameState();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const result = actions.joinLeague(code);
    if (!result.ok) return setError(result.error);
    router.replace('/league/active');
  };

  return (
    <Screen
      header={<NavHeader title="Join a league" />}
      footer={<Button label="Join league" icon="enter-outline" onPress={submit} disabled={code.trim().length !== 6} />}>
      <View style={{ gap: space.sm, marginTop: space.lg }}>
        <Txt v="h1">Got a code?</Txt>
        <Txt c={color.muted}>Ask the league owner for the six-character invitation code.</Txt>
      </View>
      <Field
        label="Invitation code"
        placeholder="ABC123"
        value={code}
        onChangeText={(t) => {
          setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, ''));
          setError(null);
        }}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={6}
        autoFocus
        error={error}
        onSubmitEditing={submit}
        style={{ fontSize: 24, letterSpacing: 8, fontFamily: 'Sora_700Bold' }}
      />
      <Card tone="raised">
        <Row gap={space.sm}>
          <Icon name="flask" size={16} c={color.warn} />
          <Txt v="h3">Demo mode</Txt>
        </Row>
        <Txt v="small" c={color.muted}>
          Leagues live on this device until the backend is connected, so codes from other phones will not be found.
          To try the flow, use the code of a demo public league:
        </Txt>
        {Object.values(s.leagues)
          .filter((l) => l.isPublic && l.status === 'lobby' && !l.memberIds.includes(s.meId ?? ''))
          .map((l) => (
            <Row key={l.id} style={{ justifyContent: 'space-between' }}>
              <Txt v="small">{l.name}</Txt>
              <Txt v="num" c={color.accent} onPress={() => setCode(l.code)}>{l.code}</Txt>
            </Row>
          ))}
      </Card>
    </Screen>
  );
}
