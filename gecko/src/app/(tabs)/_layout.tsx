import { Redirect } from 'expo-router';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tap } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { useTracking } from '@/services/tracking/useTracking';
import { useAppStore } from '@/store/useAppStore';
import { colors, TAB_BAR_HEIGHT } from '@/theme/tokens';

const TABS: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'Inicio', icon: 'home' },
  community: { label: 'Explorar', icon: 'search' },
  start: { label: 'Empezar', icon: 'play' },
  commitments: { label: 'Retos', icon: 'heart' },
  profile: { label: 'Perfil', icon: 'user' },
};

function GeckoTabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const recording = useTracking((s) => s.status !== 'idle');

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const tab = TABS[route.name];
          if (!tab) return null;
          const focused = state.index === index;
          const onPress = () => {
            tap();
            const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigateToTab(route.key);
          };

          if (route.name === 'start') {
            return (
              <Pressable
                key={route.key}
                accessibilityRole="tab"
                accessibilityLabel={recording ? 'Actividad en curso' : 'Empezar actividad'}
                accessibilityState={{ selected: focused }}
                onPress={onPress}
                style={styles.item}
              >
                <View style={[styles.startButton, recording && styles.startRecording]}>
                  <Icon name={recording ? 'bolt' : 'run'} size={28} color={colors.onLime} strokeWidth={2.4} filled={recording} />
                </View>
              </Pressable>
            );
          }

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: focused }}
              onPress={onPress}
              style={styles.item}
            >
              <Icon name={tab.icon} size={22} color={focused ? colors.lime : colors.textDim} />
              <T style={[styles.label, { color: focused ? colors.lime : colors.textDim }]}>{tab.label}</T>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const user = useAppStore((s) => s.user);
  if (!user) return <Redirect href="/welcome" />;

  return (
    <Tabs
      tabBar={(props) => <GeckoTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="community" />
      <Tabs.Screen name="start" />
      <Tabs.Screen name="commitments" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingHorizontal: 16 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: TAB_BAR_HEIGHT,
    width: '100%',
    maxWidth: 480,
    backgroundColor: colors.surface,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 6,
  },
  item: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', gap: 3 },
  label: { fontSize: 11, fontWeight: '600' },
  startButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -6,
  },
  startRecording: { backgroundColor: colors.warning },
});
