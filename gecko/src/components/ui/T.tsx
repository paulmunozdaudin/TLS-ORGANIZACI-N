import { StyleSheet, Text, type TextProps } from 'react-native';

import { colors } from '@/theme/tokens';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'label' | 'caption' | 'stat' | 'statLg' | 'hero';

interface Props extends TextProps {
  variant?: Variant;
  color?: string;
  center?: boolean;
}

/** Tipografía de la app. Las cifras deportivas usan peso black en cursiva y dígitos tabulares. */
export function T({ variant = 'body', color, center, style, ...rest }: Props) {
  return (
    <Text
      {...rest}
      style={[styles.base, styles[variant], color ? { color } : null, center ? styles.center : null, style]}
    />
  );
}

const styles = StyleSheet.create({
  base: { color: colors.text },
  center: { textAlign: 'center' },
  display: { fontSize: 34, lineHeight: 38, fontWeight: '900', letterSpacing: -1.2 },
  title: { fontSize: 24, lineHeight: 29, fontWeight: '800', letterSpacing: -0.6 },
  heading: { fontSize: 17, lineHeight: 22, fontWeight: '700', letterSpacing: -0.2 },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' },
  label: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  caption: { fontSize: 13, lineHeight: 18, color: colors.textMuted },
  stat: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: -0.6,
    fontVariant: ['tabular-nums'],
  },
  statLg: {
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: -1.5,
    fontVariant: ['tabular-nums'],
  },
  hero: {
    fontSize: 92,
    lineHeight: 96,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: -4,
    fontVariant: ['tabular-nums'],
  },
});
