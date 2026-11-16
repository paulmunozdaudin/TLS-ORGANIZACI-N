import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, radius } from '@/theme/tokens';
import { Icon, type IconName } from './Icon';
import { T } from './T';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: 'md' | 'lg';
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function tap() {
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function Button({ label, onPress, variant = 'primary', size = 'lg', icon, disabled, loading, style }: Props) {
  const fg = variant === 'primary' ? colors.onLime : variant === 'danger' ? colors.danger : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled || loading}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' ? styles.lg : styles.md,
        styles[variant],
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <Icon name={icon} size={18} color={fg} strokeWidth={2.4} /> : null}
          <T style={[styles.label, size === 'md' && styles.labelMd, { color: fg }]}>{label}</T>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, paddingHorizontal: 22 },
  lg: { height: 58 },
  md: { height: 42, paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  labelMd: { fontSize: 14 },
  primary: { backgroundColor: colors.lime },
  secondary: { backgroundColor: colors.surfaceHigh, borderWidth: 1, borderColor: colors.borderStrong },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: colors.dangerSoft },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.35 },
});
