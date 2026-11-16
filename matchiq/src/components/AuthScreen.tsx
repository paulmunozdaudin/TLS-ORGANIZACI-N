import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Wordmark } from '@/components/brand';
import { Button, Field, Glow, Icon, Notice, Row, Screen, Txt } from '@/components/ui';
import { ApiError, call } from '@/lib/api';
import { useSession } from '@/lib/session';
import { color, space } from '@/theme/tokens';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME = /^[a-zA-Z0-9_.]{3,18}$/;

export function AuthScreen({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const { signIn, signUp, refreshProfile } = useSession();
  const signingUp = mode === 'sign-up';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [adult, setAdult] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    const next: Record<string, string> = {};
    if (!EMAIL.test(email.trim())) next.email = 'Enter a valid email address.';
    if (password.length < 6) next.password = 'Passwords need at least 6 characters.';
    if (signingUp && !USERNAME.test(username)) next.username = 'Use 3 to 18 letters, numbers, dots or underscores.';
    if (signingUp && !adult) next.adult = 'MATCH.IQ shows betting odds and is for adults only.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      if (signingUp) {
        const { needsEmailConfirmation } = await signUp(email, password, username);
        if (needsEmailConfirmation) return setSent(true);
        await call('update_profile', { p_confirm_adult: true });
        await refreshProfile();
      } else {
        await signIn(email, password);
      }
      router.replace('/home');
    } catch (e) {
      setErrors({ form: (e as ApiError).message });
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <Screen gap={space.xl}>
        <View style={{ marginTop: space.xxxl, gap: space.lg, alignItems: 'center' }}>
          <Icon name="mail-unread" size={48} c={color.accent} />
          <Txt v="h1" center>Check your inbox</Txt>
          <Txt c={color.muted} center>We sent a confirmation link to {email.trim()}. Open it, then sign in.</Txt>
          <Button label="Go to sign in" onPress={() => router.replace('/sign-in')} />
        </View>
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <Glow />
      <Screen gap={space.lg}>
        <View style={{ gap: space.md, marginTop: space.xl, marginBottom: space.sm }}>
          <Wordmark size={24} />
          <Txt v="h1" style={{ marginTop: space.lg }}>{signingUp ? 'Create your account' : 'Welcome back'}</Txt>
          <Txt c={color.muted}>{signingUp ? 'You get 1,000 virtual coins every week.' : 'Your predictions and leagues are waiting.'}</Txt>
        </View>
        {signingUp ? (
          <Field label="Username" placeholder="How friends will see you" icon="at" autoCapitalize="none" autoCorrect={false} maxLength={18} value={username} onChangeText={setUsername} error={errors.username} />
        ) : null}
        <Field label="Email" placeholder="you@example.com" icon="mail" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} value={email} onChangeText={setEmail} error={errors.email} />
        <Field label="Password" placeholder="At least 6 characters" icon="lock-closed" secureTextEntry value={password} onChangeText={setPassword} error={errors.password} onSubmitEditing={submit} returnKeyType="go" />
        {signingUp ? (
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: adult }} onPress={() => setAdult(!adult)}>
            <Row style={{ alignItems: 'flex-start' }}>
              <Icon name={adult ? 'checkbox' : 'square-outline'} size={22} c={adult ? color.accent : errors.adult ? color.danger : color.muted} />
              <Txt v="small" c={errors.adult ? color.danger : color.muted} style={{ flex: 1 }}>
                I am 18 or older. I understand MATCH.IQ is a free game with virtual coins that have no cash value and
                cannot be bought, withdrawn or exchanged.
              </Txt>
            </Row>
          </Pressable>
        ) : null}
        {errors.form ? <Notice tone="danger" icon="alert-circle" text={errors.form} /> : null}
        <Button label={signingUp ? 'Create account' : 'Sign in'} onPress={submit} loading={busy} />
        <Pressable accessibilityRole="link" onPress={() => router.replace(signingUp ? '/sign-in' : '/sign-up')} style={{ alignSelf: 'center', padding: space.sm }}>
          <Txt v="small" c={color.muted}>
            {signingUp ? 'Already have an account? ' : 'New here? '}
            <Txt v="small" c={color.accent}>{signingUp ? 'Sign in' : 'Create an account'}</Txt>
          </Txt>
        </Pressable>
      </Screen>
    </View>
  );
}
