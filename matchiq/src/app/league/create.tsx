import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Field, Icon, NavHeader, Row, Screen, Txt } from '@/components/ui';
import { ApiError, call, invalidate } from '@/lib/api';
import { buzz } from '@/lib/feedback';
import type { League } from '@/lib/types';
import { color, space } from '@/theme/tokens';

export default function CreateLeague() {
  const [name, setName] = useState('');
  const [isPublic, setPublic] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setBusy(true);
    try {
      const league = await call<League>('create_league', { p_name: name, p_is_public: isPublic });
      buzz('success');
      invalidate('my_leagues', 'get_profile');
      router.replace(`/league/${league.id}`);
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen header={<NavHeader title="New league" />} footer={<Button label="Create league" icon="flag" onPress={submit} loading={busy} disabled={name.trim().length < 3} />}>
      <Field label="League name" placeholder="e.g. Sunday Pundits" value={name} onChangeText={(t) => { setName(t); setError(null); }} maxLength={28} autoFocus error={error} hint={`${name.trim().length}/28`} />
      <View style={{ gap: space.sm }}>
        <Txt v="caption" c={color.muted}>Who can join</Txt>
        {([
          [false, 'lock-closed', 'Private', 'Only people with your code or invitation link.'],
          [true, 'earth', 'Public', 'Listed in the app for anyone to join.'],
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
      <Txt v="small" c={color.faint}>Everyone in a league plays the same weekly season with the same starting coins. The league table simply compares members.</Txt>
    </Screen>
  );
}
