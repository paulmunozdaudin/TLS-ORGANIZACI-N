import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, space, TAB_BAR_HEIGHT } from '@/theme/tokens';

interface Props {
  children: React.ReactNode;
  scroll?: boolean;
  /** La pantalla vive dentro de las pestañas: reserva espacio para la barra inferior. */
  tabbed?: boolean;
  contentStyle?: ViewStyle;
  footer?: React.ReactNode;
}

export function Screen({ children, scroll = true, tabbed, contentStyle, footer }: Props) {
  const insets = useSafeAreaInsets();
  const bottom = (tabbed ? TAB_BAR_HEIGHT + 24 : 0) + insets.bottom + space.xl;
  const padding = { paddingTop: insets.top + space.md, paddingBottom: footer ? space.xl : bottom };

  return (
    <View style={styles.root}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, padding, contentStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.fill, padding, contentStyle]}>{children}</View>
      )}
      {footer ? <View style={[styles.footer, { paddingBottom: insets.bottom + space.lg }]}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  fill: { flex: 1 },
  content: { paddingHorizontal: space.xl, gap: space.xl, width: '100%', maxWidth: 560, alignSelf: 'center' },
  footer: {
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
});
