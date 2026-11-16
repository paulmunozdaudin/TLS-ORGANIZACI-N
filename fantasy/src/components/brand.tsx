import { Text, View } from 'react-native';

import { APP_NAME } from '@/lib/backend';
import { color, font } from '@/theme/tokens';

/** Mark: a rondo seen from above — a ring of players around one in the middle. */
export function Mark({ size = 44 }: { size?: number }) {
  const dot = size * 0.16;
  const spots = [0, 60, 120, 180, 240, 300];
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {spots.map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const r = size / 2 - dot / 2;
        return (
          <View
            key={deg}
            style={{
              position: 'absolute',
              width: dot,
              height: dot,
              borderRadius: dot / 2,
              backgroundColor: color.text,
              left: size / 2 - dot / 2 + Math.cos(rad) * r,
              top: size / 2 - dot / 2 + Math.sin(rad) * r,
            }}
          />
        );
      })}
      <View style={{ width: size * 0.34, height: size * 0.34, borderRadius: size, backgroundColor: color.accent }} />
    </View>
  );
}

export function Wordmark({ size = 28 }: { size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.32 }}>
      <Mark size={size * 1.05} />
      <Text style={{ fontFamily: font.displayHeavy, fontSize: size, letterSpacing: -size * 0.04, color: color.text }}>
        {APP_NAME.toLowerCase()}
      </Text>
    </View>
  );
}
