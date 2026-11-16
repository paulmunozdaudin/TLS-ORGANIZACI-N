import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Sora_600SemiBold, Sora_700Bold, Sora_800ExtraBold } from '@expo-google-fonts/sora';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';

import { Mark } from '@/components/brand';
import { ToastHost } from '@/components/ui';
import { SessionProvider, useSession } from '@/lib/session';
import { color } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Shell({ fontsReady }: { fontsReady: boolean }) {
  const { ready } = useSession();
  const up = ready && fontsReady;
  useEffect(() => {
    if (up) SplashScreen.hideAsync().catch(() => {});
  }, [up]);
  if (!up) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Mark size={72} />
      </View>
    );
  }
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg }, animation: 'slide_from_right' }} />;
}

export default function RootLayout() {
  const [loaded, error] = useFonts({ Sora_600SemiBold, Sora_700Bold, Sora_800ExtraBold, Inter_400Regular, Inter_500Medium, Inter_600SemiBold });
  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <StatusBar style="light" />
      <SessionProvider>
        <Shell fontsReady={loaded || Boolean(error)} />
      </SessionProvider>
      <ToastHost />
    </View>
  );
}
