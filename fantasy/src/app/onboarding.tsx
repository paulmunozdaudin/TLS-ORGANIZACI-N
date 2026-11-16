import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wordmark } from '@/components/brand';
import { Pitch } from '@/components/game';
import { Avatar, Button, Card, Glow, Icon, Row, Txt } from '@/components/ui';
import { actions } from '@/state/store';
import { color, MAX_WIDTH, radius, space } from '@/theme/tokens';

const STEPS = [
  {
    kicker: 'Step 1',
    title: 'Start a league\nwith your people',
    body: 'Private leagues of 2 to 10 managers. Share a six-letter code and you are in.',
  },
  {
    kicker: 'Step 2',
    title: 'Win the auction,\nbuild your squad',
    body: 'Everyone gets €500M. Bids are blind: the highest offer signs the player.',
  },
  {
    kicker: 'Step 3',
    title: 'Beat a friend\nevery matchday',
    body: 'Real performances become fantasy goals. One rival a week, one table to climb.',
  },
] as const;

function Art({ step }: { step: number }) {
  if (step === 0) {
    const crew = ['#B6F542', '#5EC8FF', '#FF8A5C', '#C58BFF', '#FFD166'];
    return (
      <Card tone="raised" style={{ alignItems: 'center', paddingVertical: space.xxl }}>
        <Row gap={-10}>
          {crew.map((c, i) => (
            <Avatar key={c} size={54} ring manager={{ id: c, username: ['you', 'ana', 'max', 'leo', 'sam'][i], color: c, isBot: false }} />
          ))}
        </Row>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: space.md }}>
          {'K7RM2X'.split('').map((ch, i) => (
            <View key={i} style={{ width: 38, height: 48, borderRadius: radius.sm, backgroundColor: color.bg, borderWidth: 1, borderColor: color.lineStrong, alignItems: 'center', justifyContent: 'center' }}>
              <Txt v="h2" c={color.accent}>{ch}</Txt>
            </View>
          ))}
        </View>
        <Txt v="caption" c={color.muted}>Invitation code</Txt>
      </Card>
    );
  }
  if (step === 1) {
    const bids: [string, number, boolean][] = [['you', 64, true], ['ana', 58, false], ['max', 41, false]];
    return (
      <Card tone="raised">
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt v="caption" c={color.muted}>Blind auction</Txt>
          <Icon name="lock-closed" size={14} c={color.muted} />
        </Row>
        {bids.map(([who, amount, win]) => (
          <Row key={who}>
            <Txt v="bodyBold" style={{ width: 40 }} c={win ? color.accent : color.muted}>{who}</Txt>
            <View style={{ flex: 1, height: 30, borderRadius: 10, backgroundColor: color.bg, overflow: 'hidden' }}>
              <View style={{ width: `${amount + 30}%`, flex: 1, borderRadius: 10, backgroundColor: win ? color.accent : color.surface }} />
            </View>
            <Txt v="num" style={{ width: 62, textAlign: 'right' }} c={win ? color.accent : color.muted}>€{amount}M</Txt>
          </Row>
        ))}
        <Txt v="small" c={color.muted}>Highest bid wins. Everyone else gets their money back.</Txt>
      </Card>
    );
  }
  return (
    <Pitch
      compact
      lines={{ FWD: ['p17', 'p35'], MID: ['p9', 'p27', 'p45', 'p63'], DEF: ['p3', 'p21', 'p39', 'p57'], GK: ['p1'] }}
      captainId="p17"
      caption={(id) => (id === 'p17' ? { text: '+18' } : id === 'p9' ? { text: '+7' } : null)}
    />
  );
}

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const insets = useSafeAreaInsets();
  const last = step === STEPS.length - 1;
  const done = () => {
    actions.completeOnboarding();
    router.replace('/sign-in');
  };
  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <Glow height={420} />
      <LinearGradient pointerEvents="none" colors={['transparent', color.bg]} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 200 }} />
      <View style={{ flex: 1, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', paddingHorizontal: space.xl, paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.xl }}>
        <Row style={{ justifyContent: 'space-between', height: 44 }}>
          <Wordmark size={22} />
          {!last ? <Button label="Skip" kind="ghost" small onPress={done} /> : null}
        </Row>
        <View style={{ flex: 1, justifyContent: 'center', gap: space.xxl }}>
          <Art step={step} />
          <View style={{ gap: space.md }}>
            <Txt v="caption" c={color.accent}>{STEPS[step].kicker} of 3</Txt>
            <Txt v="hero" style={{ fontSize: 34, lineHeight: 40 }}>{STEPS[step].title}</Txt>
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
          <Button label={last ? 'Get started' : 'Next'} icon={last ? undefined : 'arrow-forward'} onPress={last ? done : () => setStep(step + 1)} style={{ flex: 2 }} />
        </Row>
      </View>
    </View>
  );
}
