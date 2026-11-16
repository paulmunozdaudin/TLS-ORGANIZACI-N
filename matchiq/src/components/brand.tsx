import { Text, View } from 'react-native';

import { color, font } from '@/theme/tokens';

export const APP_NAME = 'MATCH.IQ';
export const SLOGAN = 'THE GAME BEHIND THE GAME.';

/** Mark: a centre circle cut by the halfway line, with the accent dot on the spot. */
export function Mark({ size = 44 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.28, backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.56, height: size * 0.56, borderRadius: size, borderWidth: size * 0.07, borderColor: color.onAccent, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: size * 0.14, height: size * 0.14, borderRadius: size, backgroundColor: color.onAccent }} />
      </View>
      <View style={{ position: 'absolute', width: size * 0.07, top: 0, bottom: 0, backgroundColor: color.onAccent, opacity: 0.9 }} />
    </View>
  );
}

export function Wordmark({ size = 24 }: { size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.4 }}>
      <Mark size={size * 1.25} />
      <Text style={{ fontFamily: font.displayHeavy, fontSize: size, letterSpacing: -size * 0.03, color: color.text }}>
        MATCH<Text style={{ color: color.accent }}>.</Text>IQ
      </Text>
    </View>
  );
}
