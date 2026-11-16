import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SLOGAN, Wordmark } from '@/components/brand';
import { Avatar, Button, Card, Glow, Icon, Row, Txt } from '@/components/ui';
import { color, font, MAX_WIDTH, radius, space } from '@/theme/tokens';

const STEPS = [
  { title: 'Predict real\nfootball', body: 'Real fixtures, real players, and the prices real bookmakers are offering right now.' },
  { title: '1,000 coins.\nEvery week.', body: 'Stake virtual coins at the odds you lock in. Coins are points: nothing to buy, nothing to cash out.' },
  { title: 'Beat your\nfriends', body: 'Private leagues, weekly tables and a record of every call you made.' },
] as const;

/** Illustrations are schematic: they show how the product works, not real prices. */
function Art({ step }: { step: number }) {
  if (step === 0) {
    return (
      <Card tone="raised">
        <Txt v="caption" c={color.muted}>How a market looks</Txt>
        <Row gap={space.sm}>
          {['Home', 'Draw', 'Away'].map((l, i) => (
            <View key={l} style={{ flex: 1, borderRadius: radius.md, borderWidth: 1, borderColor: i === 0 ? 'rgba(182,245,66,0.45)' : color.line, backgroundColor: i === 0 ? color.accentDim : color.surface, padding: space.md, gap: 6 }}>
              <Txt v="small" c={color.muted}>{l}</Txt>
              <View style={{ height: 10, width: 44, borderRadius: 5, backgroundColor: i === 0 ? color.accent : color.lineStrong }} />
            </View>
          ))}
        </Row>
        <Row gap={space.sm}>
          <Icon name="shield-checkmark" size={14} c={color.accent} />
          <Txt v="small" c={color.muted} style={{ flex: 1 }}>Prices are real bookmaker odds delivered by an odds data provider, shown with their source and update time.</Txt>
        </Row>
      </Card>
    );
  }
  if (step === 1) {
    return (
      <Card tone="raised" style={{ alignItems: 'center', paddingVertical: space.xxl }}>
        <Text style={{ fontFamily: font.displayHeavy, fontSize: 64, letterSpacing: -2, color: color.accent }}>1,000</Text>
        <Txt v="caption" c={color.muted}>Virtual coins · resets Monday 00:00 Madrid</Txt>
      </Card>
    );
  }
  return (
    <Card tone="raised">
      {[['you', '#B6F542'], ['ana', '#5EC8FF'], ['max', '#FF8A5C']].map(([u, c], i) => (
        <Row key={u}>
          <Txt v="num" c={i === 0 ? color.accent : color.muted} style={{ width: 20 }}>{i + 1}</Txt>
          <Avatar person={{ username: u, avatar_color: c }} size={34} />
          <Txt v="bodyBold" style={{ flex: 1 }}>{u}</Txt>
          <View style={{ height: 10, width: 90 - i * 26, borderRadius: 5, backgroundColor: i === 0 ? color.accent : color.lineStrong }} />
        </Row>
      ))}
    </Card>
  );
}

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const insets = useSafeAreaInsets();
  const last = step === STEPS.length - 1;
  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <Glow height={420} />
      <View style={{ flex: 1, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', paddingHorizontal: space.xl, paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.xl }}>
        <Row style={{ justifyContent: 'space-between', height: 44 }}>
          <Wordmark size={20} />
          <Button label="Sign in" kind="ghost" small onPress={() => router.replace('/sign-in')} />
        </Row>
        <View style={{ flex: 1, justifyContent: 'center', gap: space.xxl }}>
          <Art step={step} />
          <View style={{ gap: space.md }}>
            <Txt v="caption" c={color.accent}>{step === 0 ? SLOGAN : `${step + 1} of ${STEPS.length}`}</Txt>
            <Txt v="hero" style={{ fontSize: 36, lineHeight: 42 }}>{STEPS[step].title}</Txt>
            <Txt c={color.muted} style={{ fontSize: 16, lineHeight: 24 }}>{STEPS[step].body}</Txt>
          </View>
        </View>
        <Row style={{ justifyContent: 'center', marginBottom: space.xl }} gap={6}>
          {STEPS.map((_, i) => (
            <View key={i} style={{ width: i === step ? 24 : 6, height: 6, borderRadius: 3, backgroundColor: i === step ? color.accent : color.lineStrong }} />
          ))}
        </Row>
        <Row>
          {step > 0 ? <Button label="Back" kind="secondary" onPress={() => setStep(step - 1)} style={{ flex: 1 }} /> : null}
          <Button label={last ? 'Create account' : 'Next'} icon={last ? undefined : 'arrow-forward'} onPress={last ? () => router.replace('/sign-up') : () => setStep(step + 1)} style={{ flex: 2 }} />
        </Row>
      </View>
    </View>
  );
}
