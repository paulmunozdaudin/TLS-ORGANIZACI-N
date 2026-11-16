import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';

import { Gecko } from '@/components/mascot/Gecko';
import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { useAppStore } from '@/store/useAppStore';
import { colors, radius, space } from '@/theme/tokens';

const POINTS: { icon: IconName; text: string }[] = [
  { icon: 'target', text: 'Elige un objetivo y comprométete con dinero.' },
  { icon: 'pin', text: 'Gecko registra y verifica tu actividad por GPS.' },
  { icon: 'check', text: 'Si cumples, lo recuperas. Si no, lo pierdes.' },
];

export default function Welcome() {
  const user = useAppStore((s) => s.user);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const [name, setName] = useState('');

  if (user) return <Redirect href="/" />;
  const valid = name.trim().length >= 2;

  const submit = () => {
    if (!valid) return;
    completeOnboarding(name);
    router.replace('/');
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen contentStyle={styles.content}>
        <View style={styles.hero}>
          <Gecko mood="neutral" size={250} />
          <T style={styles.brand}>GECKO</T>
          <T variant="display" center>
            BET ON{'\n'}
            <T variant="display" color={colors.lime}>YOURSELF.</T>
          </T>
        </View>

        <View style={styles.points}>
          {POINTS.map((p) => (
            <View key={p.text} style={styles.point}>
              <View style={styles.pointIcon}>
                <Icon name={p.icon} size={18} color={colors.lime} />
              </View>
              <T style={styles.flex}>{p.text}</T>
            </View>
          ))}
        </View>

        <View style={styles.form}>
          <T variant="label">¿Cómo te llamas?</T>
          <TextInput
            accessibilityLabel="Tu nombre"
            value={name}
            onChangeText={setName}
            placeholder="Tu nombre"
            placeholderTextColor={colors.textDim}
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={24}
            returnKeyType="done"
            onSubmitEditing={submit}
            style={styles.input}
          />
          <Button label="Empezar" onPress={submit} disabled={!valid} />
          <T variant="caption" center>
            Modo simulación: empiezas con 100 € ficticios. No se cobra dinero real.
          </T>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { gap: space.xxl, paddingTop: space.xxl },
  hero: { alignItems: 'center', gap: space.sm },
  brand: { fontSize: 13, fontWeight: '900', letterSpacing: 6, color: colors.lime },
  points: { gap: space.md },
  point: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  pointIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.limeSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: { gap: space.md },
  input: {
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    paddingHorizontal: space.lg,
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
  },
});
