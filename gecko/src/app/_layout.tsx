import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAppStore } from '@/store/useAppStore';
import { colors } from '@/theme/tokens';

export default function RootLayout() {
  const hydrated = useAppStore((s) => s.hydrated);
  const settle = useAppStore((s) => s.settleCommitments);

  // Los compromisos vencen aunque el usuario no haga nada: se liquidan al abrir la app,
  // al volver a primer plano y periódicamente mientras está abierta.
  useEffect(() => {
    if (!hydrated) return;
    void settle();
    const timer = setInterval(() => void settle(), 30_000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void settle();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [hydrated, settle]);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {hydrated ? (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
          <Stack.Screen name="commitment/new" options={{ presentation: 'modal' }} />
          <Stack.Screen name="commitment/[id]" />
          <Stack.Screen name="activity/live" options={{ gestureEnabled: false, animation: 'fade' }} />
          <Stack.Screen name="activity/[id]" />
        </Stack>
      ) : (
        <View style={{ flex: 1, backgroundColor: colors.bg }} />
      )}
    </SafeAreaProvider>
  );
}
