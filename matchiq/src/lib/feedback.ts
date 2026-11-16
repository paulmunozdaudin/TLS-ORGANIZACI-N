import * as Haptics from 'expo-haptics';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

export interface Toast {
  id: number;
  text: string;
  kind: 'success' | 'error' | 'info';
}
let toasts: Toast[] = [];
let nextId = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function toast(text: string, kind: Toast['kind'] = 'success') {
  const id = ++nextId;
  toasts = [...toasts.slice(-1), { id, text, kind }];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, 3400);
}

export function useToasts() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => toasts,
    () => toasts
  );
}

export function buzz(kind: 'tap' | 'success' | 'error' = 'tap') {
  if (Platform.OS === 'web') return;
  if (kind === 'tap') Haptics.selectionAsync().catch(() => {});
  else {
    Haptics.notificationAsync(
      kind === 'success' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error
    ).catch(() => {});
  }
}
