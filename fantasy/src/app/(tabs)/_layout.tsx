import { Redirect } from 'expo-router';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/ui';
import { buzz, useGameState } from '@/state/store';
import { color, font, MAX_WIDTH, radius, space } from '@/theme/tokens';

const TABS: Record<string, { label: string; icon: IconName; iconOn: IconName }> = {
  home: { label: 'Home', icon: 'home-outline', iconOn: 'home' },
  leagues: { label: 'Leagues', icon: 'trophy-outline', iconOn: 'trophy' },
  market: { label: 'Market', icon: 'swap-horizontal-outline', iconOn: 'swap-horizontal' },
  squad: { label: 'Squad', icon: 'shirt-outline', iconOn: 'shirt' },
  profile: { label: 'Profile', icon: 'person-outline', iconOn: 'person' },
};

function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: insets.bottom + space.md, paddingHorizontal: space.lg, alignItems: 'center' }}>
      <View
        style={{
          flexDirection: 'row',
          width: '100%',
          maxWidth: MAX_WIDTH - 40,
          backgroundColor: 'rgba(16,28,44,0.96)',
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: color.lineStrong,
          padding: 6,
          boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
        }}>
        {state.routes.map((route, index) => {
          const tab = TABS[route.name];
          if (!tab) return null;
          const focused = state.index === index;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={tab.label}
              onPress={() => {
                buzz();
                if (!focused) navigateToTab(route.key);
              }}
              style={{
                flex: focused ? 1.5 : 1,
                height: 52,
                borderRadius: radius.pill,
                backgroundColor: focused ? color.accent : 'transparent',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}>
              <Icon name={focused ? tab.iconOn : tab.icon} size={20} c={focused ? color.onAccent : color.muted} />
              {focused ? <Text style={{ fontFamily: font.displayMedium, fontSize: 12, color: color.onAccent }}>{tab.label}</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const s = useGameState();
  if (!s.meId) return <Redirect href="/" />;
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: color.bg } }}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="leagues" />
      <Tabs.Screen name="market" />
      <Tabs.Screen name="squad" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
