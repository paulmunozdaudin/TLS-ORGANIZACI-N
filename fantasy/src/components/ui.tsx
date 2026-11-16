import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Club, Manager, Position } from '@/domain/types';
import { buzz, useToasts } from '@/state/store';
import { color, font, MAX_WIDTH, positionColor, radius, space, TAB_BAR_SPACE, type, type TypeVariant } from '@/theme/tokens';

export type IconName = ComponentProps<typeof Ionicons>['name'];

/* --------------------------------------------------------------------- text */

export function Txt({
  v = 'body',
  c = color.text,
  center,
  style,
  ...rest
}: TextProps & { v?: TypeVariant; c?: string; center?: boolean }) {
  return <Text {...rest} style={[type[v], { color: c }, center && { textAlign: 'center' }, style]} />;
}

export function Icon({ name, size = 20, c = color.text }: { name: IconName; size?: number; c?: string }) {
  return <Ionicons name={name} size={size} color={c} />;
}

/* ------------------------------------------------------------------- layout */

export function Screen({
  children,
  tabbed,
  scroll = true,
  header,
  footer,
  gap = space.lg,
}: {
  children: ReactNode;
  tabbed?: boolean;
  scroll?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
  gap?: number;
}) {
  const insets = useSafeAreaInsets();
  const padBottom = (tabbed ? TAB_BAR_SPACE : space.xxl) + insets.bottom;
  const inner: ViewStyle = { paddingHorizontal: space.xl, gap, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' };
  return (
    <View style={{ flex: 1, backgroundColor: color.bg, paddingTop: insets.top }}>
      {header ? <View style={[inner, { paddingTop: space.sm, paddingBottom: space.md }]}>{header}</View> : null}
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[inner, { paddingTop: header ? space.xs : space.lg, paddingBottom: footer ? space.lg : padBottom }]}>
          {children}
        </ScrollView>
      ) : (
        <View style={[inner, { flex: 1, paddingTop: header ? space.xs : space.lg, paddingBottom: footer ? space.lg : padBottom }]}>
          {children}
        </View>
      )}
      {footer ? (
        <View style={[inner, { paddingTop: space.md, paddingBottom: insets.bottom + space.lg, borderTopWidth: 1, borderTopColor: color.line }]}>
          {footer}
        </View>
      ) : null}
    </View>
  );
}

export function NavHeader({ title, subtitle, right }: { title?: string; subtitle?: string; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 44 }}>
      <IconButton
        icon="chevron-back"
        label="Back"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      />
      <View style={{ flex: 1 }}>
        {title ? <Txt v="h3" numberOfLines={1}>{title}</Txt> : null}
        {subtitle ? <Txt v="small" c={color.muted} numberOfLines={1}>{subtitle}</Txt> : null}
      </View>
      {right}
    </View>
  );
}

export function Row({ children, gap = space.md, style }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <Row style={{ justifyContent: 'space-between', marginTop: space.sm }}>
      <Txt v="caption" c={color.muted}>{title}</Txt>
      {action ? (
        <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button">
          <Txt v="small" c={color.accent}>{action}</Txt>
        </Pressable>
      ) : null}
    </Row>
  );
}

export function Card({
  children,
  onPress,
  style,
  tone = 'surface',
  pad = space.lg,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  tone?: 'surface' | 'raised' | 'accent';
  pad?: number;
}) {
  const base: ViewStyle = {
    backgroundColor: tone === 'raised' ? color.surfaceHi : tone === 'accent' ? color.accentDim : color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: tone === 'accent' ? 'rgba(182,245,66,0.28)' : color.line,
    padding: pad,
    gap: space.md,
  };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        buzz();
        onPress();
      }}
      style={({ pressed }) => [base, style, pressed && { opacity: 0.75, transform: [{ scale: 0.99 }] }]}>
      {children}
    </Pressable>
  );
}

/* ----------------------------------------------------------------- controls */

export function Button({
  label,
  onPress,
  kind = 'primary',
  icon,
  disabled,
  loading,
  small,
  style,
}: {
  label: string;
  onPress?: () => void;
  kind?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const fg = kind === 'primary' ? color.onAccent : kind === 'danger' ? color.danger : color.text;
  const bg = kind === 'primary' ? color.accent : kind === 'secondary' ? color.surfaceHi : kind === 'danger' ? color.dangerDim : 'transparent';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={() => {
        buzz();
        onPress?.();
      }}
      style={({ pressed }) => [
        {
          height: small ? 40 : 54,
          paddingHorizontal: small ? space.lg : space.xl,
          borderRadius: radius.pill,
          backgroundColor: bg,
          borderWidth: kind === 'ghost' ? 1 : 0,
          borderColor: color.lineStrong,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: space.sm,
          opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}>
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Icon name={icon} size={small ? 16 : 19} c={fg} /> : null}
      <Text style={{ fontFamily: font.displayMedium, fontSize: small ? 13 : 15, color: fg }}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  badge,
  active,
}: {
  icon: IconName;
  label: string;
  onPress?: () => void;
  badge?: number;
  active?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={() => {
        buzz();
        onPress?.();
      }}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: active ? color.accentDim : color.surface,
        borderWidth: 1,
        borderColor: active ? 'rgba(182,245,66,0.3)' : color.line,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}>
      <Icon name={icon} size={20} c={active ? color.accent : color.text} />
      {badge ? (
        <View style={styles.badgeDot}>
          <Text style={{ fontFamily: font.bodyBold, fontSize: 10, color: color.onAccent }}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function Chip({
  label,
  active,
  onPress,
  icon,
  tint = color.accent,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  icon?: IconName;
  tint?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={() => {
        buzz();
        onPress?.();
      }}
      style={({ pressed }) => ({
        height: 36,
        paddingHorizontal: space.md + 2,
        borderRadius: radius.pill,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: active ? tint : color.surface,
        borderWidth: 1,
        borderColor: active ? tint : color.line,
        opacity: pressed ? 0.75 : 1,
      })}>
      {icon ? <Icon name={icon} size={14} c={active ? color.onAccent : color.muted} /> : null}
      <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: active ? color.onAccent : color.muted }}>{label}</Text>
    </Pressable>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; badge?: number }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => {
              buzz();
              onChange(o.value);
            }}
            style={[styles.segment, on && { backgroundColor: color.surfaceHi }]}>
            <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: on ? color.text : color.muted }}>{o.label}</Text>
            {o.badge ? (
              <View style={{ backgroundColor: color.accent, borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }}>
                <Text style={{ fontFamily: font.bodyBold, fontSize: 10, color: color.onAccent }}>{o.badge}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function Field({
  label,
  error,
  hint,
  icon,
  ...input
}: TextInputProps & { label?: string; error?: string | null; hint?: string; icon?: IconName }) {
  return (
    <View style={{ gap: 6 }}>
      {label ? <Txt v="caption" c={color.muted}>{label}</Txt> : null}
      <View style={[styles.field, error ? { borderColor: color.danger } : null, input.editable === false && { opacity: 0.45 }]}>
        {icon ? <Icon name={icon} size={18} c={color.muted} /> : null}
        <TextInput
          placeholderTextColor={color.faint}
          selectionColor={color.accent}
          accessibilityLabel={label ?? input.placeholder}
          {...input}
          style={[{ flex: 1, color: color.text, fontFamily: font.bodyMedium, fontSize: 15, height: 52, outlineStyle: 'none' } as object, input.style]}
        />
      </View>
      {error ? <Txt v="small" c={color.danger}>{error}</Txt> : hint ? <Txt v="small" c={color.faint}>{hint}</Txt> : null}
    </View>
  );
}

/* ------------------------------------------------------------------ identity */

export function Avatar({ manager, size = 40, ring }: { manager?: Manager; size?: number; ring?: boolean }) {
  const tint = manager?.color ?? color.faint;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: `${tint}26`,
        borderWidth: ring ? 2 : 1,
        borderColor: ring ? tint : `${tint}55`,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text style={{ fontFamily: font.display, fontSize: size * 0.4, color: tint }}>
        {(manager?.username ?? '?').replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase()}
      </Text>
    </View>
  );
}

/** Generated two-tone crest. Demo clubs are fictional, so no real badges. */
export function Crest({ club, size = 28 }: { club?: Club; size?: number }) {
  const [a, b] = club?.colors ?? [color.faint, color.surface];
  return (
    <View style={{ width: size, height: size * 1.12, borderTopLeftRadius: size * 0.22, borderTopRightRadius: size * 0.22, borderBottomLeftRadius: size * 0.5, borderBottomRightRadius: size * 0.5, overflow: 'hidden', flexDirection: 'row', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' }}>
      <View style={{ flex: 1, backgroundColor: a }} />
      <View style={{ flex: 1, backgroundColor: b }} />
    </View>
  );
}

export function PosTag({ position }: { position: Position }) {
  const tint = positionColor[position];
  return (
    <View style={{ backgroundColor: `${tint}22`, borderRadius: 6, paddingHorizontal: 6, height: 20, justifyContent: 'center', minWidth: 38, alignItems: 'center' }}>
      <Text style={{ fontFamily: font.bodyBold, fontSize: 10, letterSpacing: 0.6, color: tint }}>{position}</Text>
    </View>
  );
}

export function Pill({ label, tone = 'muted', icon }: { label: string; tone?: 'muted' | 'accent' | 'warn' | 'danger' | 'info'; icon?: IconName }) {
  const map = {
    muted: [color.muted, 'rgba(255,255,255,0.07)'],
    accent: [color.accent, color.accentDim],
    warn: [color.warn, color.warnDim],
    danger: [color.danger, color.dangerDim],
    info: [color.info, color.infoDim],
  } as const;
  const [fg, bg] = map[tone];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: bg, borderRadius: radius.pill, paddingHorizontal: 10, height: 24, alignSelf: 'flex-start' }}>
      {icon ? <Icon name={icon} size={12} c={fg} /> : null}
      <Text style={{ fontFamily: font.bodyBold, fontSize: 11, letterSpacing: 0.4, color: fg }}>{label}</Text>
    </View>
  );
}

/** Mandatory wherever football data is shown while it is not real data. */
export function DemoNote({ text = 'Demo data · fictional players, simulated stats' }: { text?: string }) {
  return (
    <Row gap={space.sm} style={{ backgroundColor: color.warnDim, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: space.sm }}>
      <Icon name="flask" size={14} c={color.warn} />
      <Txt v="small" c={color.warn} style={{ flex: 1 }}>{text}</Txt>
    </Row>
  );
}

export function Stat({ value, label, tint = color.text }: { value: string | number; label: string; tint?: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Txt v="h2" c={tint}>{value}</Txt>
      <Txt v="caption" c={color.muted}>{label}</Txt>
    </View>
  );
}

/* -------------------------------------------------------------------- states */

export function Empty({
  icon,
  title,
  body,
  action,
  onAction,
}: {
  icon: IconName;
  title: string;
  body: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={{ alignItems: 'center', gap: space.md, paddingVertical: space.xxxl, paddingHorizontal: space.lg }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={26} c={color.accent} />
      </View>
      <Txt v="h3" center>{title}</Txt>
      <Txt c={color.muted} center>{body}</Txt>
      {action ? <Button label={action} onPress={onAction} small style={{ marginTop: space.sm }} /> : null}
    </View>
  );
}

export function Skeleton({ height = 72 }: { height?: number }) {
  return <View style={{ height, borderRadius: radius.lg, backgroundColor: color.surface, opacity: 0.6 }} />;
}

export function LoadingScreen() {
  return (
    <Screen>
      <Skeleton height={36} />
      <Skeleton height={180} />
      <Skeleton />
      <Skeleton />
    </Screen>
  );
}

/* -------------------------------------------------------------------- sheets */

export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: color.scrim }} onPress={onClose} accessibilityLabel="Close" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + space.xl }]}>
        <View style={styles.grabber} />
        {title ? <Txt v="h2">{title}</Txt> : null}
        {children}
      </View>
    </Modal>
  );
}

export function Confirm({
  visible,
  title,
  body,
  confirmLabel,
  danger,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: color.scrim, alignItems: 'center', justifyContent: 'center', padding: space.xl }}>
        <View style={{ width: '100%', maxWidth: 380, backgroundColor: color.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: color.lineStrong, padding: space.xl, gap: space.md }}>
          <Txt v="h2">{title}</Txt>
          <Txt c={color.muted}>{body}</Txt>
          <Row style={{ marginTop: space.sm }}>
            <Button label="Cancel" kind="ghost" onPress={onClose} style={{ flex: 1 }} />
            <Button
              label={confirmLabel}
              kind={danger ? 'danger' : 'primary'}
              onPress={() => {
                onClose();
                onConfirm();
              }}
              style={{ flex: 1 }}
            />
          </Row>
        </View>
      </View>
    </Modal>
  );
}

export function ToastHost() {
  const toasts = useToasts();
  const insets = useSafeAreaInsets();
  if (!toasts.length) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: insets.top + space.md, left: space.lg, right: space.lg, alignItems: 'center', gap: space.sm }}>
      {toasts.map((t) => {
        const tint = t.kind === 'error' ? color.danger : t.kind === 'info' ? color.info : color.accent;
        return (
          <View key={t.id} accessibilityRole="alert" style={[styles.toast, { borderColor: `${tint}66` }]}>
            <Icon name={t.kind === 'error' ? 'alert-circle' : t.kind === 'info' ? 'information-circle' : 'checkmark-circle'} size={18} c={tint} />
            <Txt v="small" style={{ flexShrink: 1 }}>{t.text}</Txt>
          </View>
        );
      })}
    </View>
  );
}

export function Glow({ tint = color.accent, height = 260 }: { tint?: string; height?: number }) {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[`${tint}30`, `${tint}00`]}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, height }}
    />
  );
}

const styles = StyleSheet.create({
  badgeDot: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: color.surface,
    borderRadius: radius.pill,
    padding: 4,
    borderWidth: 1,
    borderColor: color.line,
  },
  segment: {
    flex: 1,
    height: 38,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.line,
    paddingHorizontal: space.lg,
  },
  sheet: {
    backgroundColor: color.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: color.lineStrong,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    gap: space.lg,
    width: '100%',
    maxWidth: MAX_WIDTH,
    alignSelf: 'center',
  },
  grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: color.lineStrong, alignSelf: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: color.surfaceHi,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    maxWidth: MAX_WIDTH - 40,
  },
});
