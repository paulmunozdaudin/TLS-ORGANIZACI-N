import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Field, NavHeader, Screen, Txt } from '@/components/ui';
import { ApiError, call, invalidate } from '@/lib/api';
import type { League } from '@/lib/types';
import { color, space } from '@/theme/tokens';

export default function JoinLeague() {
  const params = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState(params.code ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      const league = await call<League>('join_league', { p_code: code.trim() });
      invalidate('my_leagues', 'public_leagues');
      router.replace(`/league/${league.id}`);
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen header={<NavHeader title="Join a league" />} footer={<Button label="Join league" icon="enter-outline" onPress={submit} loading={busy} disabled={code.trim().length < 6} />}>
      <View style={{ gap: space.sm, marginTop: space.lg }}>
        <Txt v="h1">Got a code?</Txt>
        <Txt c={color.muted}>Enter the six-character league code, or the token from an invitation link.</Txt>
      </View>
      <Field
        label="Code"
        placeholder="ABC123"
        value={code}
        onChangeText={(t) => { setCode(t.replace(/[^a-zA-Z0-9]/g, '')); setError(null); }}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={32}
        autoFocus
        error={error}
        onSubmitEditing={submit}
        style={{ fontSize: 22, letterSpacing: 4, fontFamily: 'Sora_700Bold' }}
      />
    </Screen>
  );
}
