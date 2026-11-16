import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors, radius } from '@/theme/tokens';

interface BarProps {
  ratio: number;
  /** Tramo adicional pendiente de verificación (se pinta en ámbar tras el progreso real). */
  pendingRatio?: number;
  color?: string;
  track?: string;
  height?: number;
}

export function ProgressBar({ ratio, pendingRatio = 0, color = colors.lime, track = colors.border, height = 8 }: BarProps) {
  const clamped = Math.max(0, Math.min(1, ratio));
  const anim = useRef(new Animated.Value(clamped)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: clamped,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [anim, clamped]);

  const pending = Math.max(0, Math.min(1 - clamped, pendingRatio));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[styles.track, { backgroundColor: track, height, borderRadius: height / 2 }]}
    >
      <Animated.View
        style={{
          width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          backgroundColor: color,
          borderRadius: height / 2,
        }}
      />
      {pending > 0 ? <View style={{ width: `${pending * 100}%`, backgroundColor: colors.warning, opacity: 0.7 }} /> : null}
    </View>
  );
}

interface RingProps {
  ratio: number;
  size: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: React.ReactNode;
}

export function ProgressRing({ ratio, size, stroke = 8, color = colors.lime, track = colors.border, children }: RingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, ratio));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        {clamped > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${c * clamped} ${c}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', overflow: 'hidden', borderRadius: radius.pill },
});
