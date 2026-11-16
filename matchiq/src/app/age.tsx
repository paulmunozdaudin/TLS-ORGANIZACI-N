import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Icon, NavHeader, Notice, Screen, Txt } from '@/components/ui';
import { ApiError, call } from '@/lib/api';
import { useSession } from '@/lib/session';
import { color, space } from '@/theme/tokens';

/** Age confirmation for accounts that did not confirm at sign-up (e.g. social sign-in). */
export default function Age() {
  const { refreshProfile } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirm = async () => {
    setBusy(true);
    try {
      await call('update_profile', { p_confirm_adult: true });
      await refreshProfile();
      router.back();
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen header={<NavHeader title="Before you predict" />}>
      <View style={{ gap: space.lg, alignItems: 'center', marginTop: space.xxl }}>
        <Icon name="shield-checkmark" size={48} c={color.accent} />
        <Txt v="h1" center>Are you 18 or older?</Txt>
        <Txt c={color.muted} center>
          MATCH.IQ shows real bookmaker odds, so predictions are for adults. It is a free game: coins are virtual, have
          no cash value and cannot be bought, withdrawn or exchanged.
        </Txt>
      </View>
      {error ? <Notice tone="danger" text={error} /> : null}
      <Button label="Yes, I am 18 or older" onPress={confirm} loading={busy} />
      <Button label="No" kind="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
