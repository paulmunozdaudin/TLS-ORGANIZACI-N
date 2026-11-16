import { Pressable, StyleSheet, View, type ViewProps } from 'react-native';

import { colors, radius, space } from '@/theme/tokens';

interface Props extends ViewProps {
  onPress?: () => void;
  tone?: 'default' | 'lime' | 'high';
  accessibilityLabel?: string;
}

export function Card({ onPress, tone = 'default', style, children, accessibilityLabel, ...rest }: Props) {
  const toneStyle = tone === 'lime' ? styles.lime : tone === 'high' ? styles.high : null;
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [styles.card, toneStyle, pressed && styles.pressed, style]}
      >
        {children}
      </Pressable>
    );
  }
  return (
    <View {...rest} style={[styles.card, toneStyle, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
  },
  high: { backgroundColor: colors.surfaceHigh, borderColor: colors.borderStrong },
  lime: { backgroundColor: colors.lime, borderColor: colors.lime },
  pressed: { opacity: 0.8 },
});
