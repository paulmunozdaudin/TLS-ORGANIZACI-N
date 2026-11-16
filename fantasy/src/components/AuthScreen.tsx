import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Wordmark } from '@/components/brand';
import { Button, Card, Field, Glow, Icon, Row, Screen, Txt } from '@/components/ui';
import { ACCOUNTS_AVAILABLE } from '@/lib/backend';
import { validateUsername } from '@/state/game';
import { actions, attempt } from '@/state/store';
import { color, space } from '@/theme/tokens';

/**
 * Sign-in and registration share one layout. While `ACCOUNTS_AVAILABLE` is
 * false nothing typed here leaves the device and the account controls are
 * disabled, so the app never pretends a sign-in succeeded.
 */
export function AuthScreen({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const signUp = mode === 'sign-up';

  const playDemo = () => {
    const check = validateUsername(username);
    if (!check.ok) return setError(check.error);
    setError(null);
    setBusy(true);
    // Let the button paint its loading state before seeding the demo league.
    setTimeout(() => {
      const done = attempt(actions.startDemoSession(username));
      setBusy(false);
      if (done) router.replace('/home');
    }, 30);
  };

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <Glow />
      <Screen gap={space.xl}>
        <View style={{ gap: space.md, marginTop: space.xl }}>
          <Wordmark size={30} />
          <Txt v="h1" style={{ marginTop: space.lg }}>{signUp ? 'Create your manager' : 'Welcome back, boss'}</Txt>
          <Txt c={color.muted}>
            {signUp ? 'One profile for every league you play in.' : 'Your leagues and rivals are waiting.'}
          </Txt>
        </View>

        <Card tone="accent">
          <Row gap={space.sm}>
            <Icon name="flask" size={18} c={color.accent} />
            <Txt v="h3">Play the demo</Txt>
          </Row>
          <Txt v="small" c={color.muted}>
            This build runs in demo mode: a local profile on this device, fictional footballers and simulated
            matchdays. Pick a manager name to jump in.
          </Txt>
          <Field
            placeholder="Manager name"
            icon="person"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={18}
            value={username}
            onChangeText={(t) => {
              setUsername(t);
              setError(null);
            }}
            onSubmitEditing={playDemo}
            returnKeyType="go"
            error={error}
          />
          <Button label="Enter demo mode" icon="play" onPress={playDemo} loading={busy} />
        </Card>

        <View style={{ gap: space.md, opacity: ACCOUNTS_AVAILABLE ? 1 : 0.55 }}>
          <Row>
            <View style={{ flex: 1, height: 1, backgroundColor: color.line }} />
            <Txt v="caption" c={color.faint}>{signUp ? 'Or create an account' : 'Or sign in'}</Txt>
            <View style={{ flex: 1, height: 1, backgroundColor: color.line }} />
          </Row>
          {signUp ? <Field placeholder="Username" icon="at" editable={ACCOUNTS_AVAILABLE} /> : null}
          <Field placeholder="Email" icon="mail" keyboardType="email-address" autoCapitalize="none" editable={ACCOUNTS_AVAILABLE} />
          <Field placeholder="Password" icon="lock-closed" secureTextEntry editable={ACCOUNTS_AVAILABLE} />
          <Button label={signUp ? 'Create account' : 'Sign in'} kind="secondary" disabled={!ACCOUNTS_AVAILABLE} />
          <Row>
            <Button label="Google" icon="logo-google" kind="ghost" disabled={!ACCOUNTS_AVAILABLE} style={{ flex: 1 }} />
            <Button label="Apple" icon="logo-apple" kind="ghost" disabled={!ACCOUNTS_AVAILABLE} style={{ flex: 1 }} />
          </Row>
        </View>
        {!ACCOUNTS_AVAILABLE ? (
          <Txt v="small" c={color.faint} center>
            Email, Google and Apple sign-in are switched on when the Supabase backend is connected. Nothing you
            type on this screen is sent anywhere.
          </Txt>
        ) : null}

        <Pressable
          accessibilityRole="link"
          onPress={() => router.replace(signUp ? '/sign-in' : '/sign-up')}
          style={{ alignSelf: 'center', padding: space.sm }}>
          <Txt v="small" c={color.muted}>
            {signUp ? 'Already have an account? ' : 'New here? '}
            <Txt v="small" c={color.accent}>{signUp ? 'Sign in' : 'Create an account'}</Txt>
          </Txt>
        </Pressable>
      </Screen>
    </View>
  );
}
