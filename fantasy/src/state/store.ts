import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import type { Lineup, Result } from '@/domain/types';

import * as game from './game';
import type { Ctx, GameState, Settings } from './game';

const KEY = 'rondo.demo.v1';
const ctx = (): Ctx => ({ now: Date.now(), rand: Math.random });

let state: GameState | null = null;
let hydrateFailed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

function commit(next: GameState) {
  state = next;
  emit();
  AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {
    toast('Could not save your progress on this device.', 'error');
  });
}

export async function hydrate() {
  if (state) return;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as GameState) : null;
    state = parsed?.version === 1 ? parsed : game.initialState(ctx());
  } catch {
    hydrateFailed = true;
    state = game.initialState(ctx());
  }
  emit();
}

/** Whole-state subscription. `null` until storage has been read. */
export function useGame(): GameState | null {
  return useSyncExternalStore(subscribe, () => state, () => state);
}
/** For screens rendered behind the auth gate, where state always exists. */
export function useGameState(): GameState {
  return useGame() as GameState;
}
export const didHydrateFail = () => hydrateFailed;

type Action = (s: GameState, c: Ctx) => Result<GameState>;
function run(action: Action): Result {
  if (!state) return { ok: false, error: 'The app is still loading.' };
  const result = action(state, ctx());
  if (!result.ok) return result;
  commit(result.value);
  return { ok: true, value: undefined };
}

export const actions = {
  completeOnboarding: () => run((s) => game.completeOnboarding(s)),
  startDemoSession: (username: string) => run((s, c) => game.startDemoSession(s, username, c)),
  updateProfile: (input: { username: string; color: string }) => run((s) => game.updateProfile(s, input)),
  updateSettings: (patch: Partial<Settings>) => run((s) => game.updateSettings(s, patch)),
  createLeague: (input: { name: string; size: number; isPublic: boolean }) =>
    run((s, c) => game.createLeague(s, input, c)),
  joinLeague: (code: string) => run((s, c) => game.joinLeague(s, code, c)),
  fillWithBots: (leagueId: string) => run((s) => game.fillWithBots(s, leagueId)),
  startLeague: (leagueId: string) => run((s, c) => game.startLeague(s, leagueId, c)),
  setActiveLeague: (leagueId: string) => run((s) => game.setActiveLeague(s, leagueId)),
  placeBid: (input: { leagueId: string; playerId: string; amount: number }) =>
    run((s, c) => game.placeBid(s, input, c)),
  cancelBid: (bidId: string) => run((s) => game.cancelBid(s, bidId)),
  closeMarketRound: (leagueId: string) => run((s, c) => game.closeMarketRound(s, leagueId, c)),
  sellPlayer: (leagueId: string, playerId: string) => run((s) => game.sellPlayer(s, leagueId, playerId)),
  saveLineup: (leagueId: string, lineup: Lineup) => run((s, c) => game.saveLineup(s, leagueId, lineup, c)),
  playMatchday: (leagueId: string) => run((s, c) => game.playMatchday(s, leagueId, c)),
  sendMessage: (leagueId: string, text: string) => run((s, c) => game.sendMessage(s, leagueId, text, c)),
  toggleReaction: (messageId: string, emoji: string) => run((s) => game.toggleReaction(s, messageId, emoji)),
  toggleFriend: (managerId: string) => run((s) => game.toggleFriend(s, managerId)),
  markNoticesRead: () => run((s) => game.markNoticesRead(s)),
  /** Wipes the device-local demo and returns to onboarding. */
  resetDemo: async () => {
    await AsyncStorage.removeItem(KEY);
    state = game.initialState(ctx());
    emit();
  },
};

/* ------------------------------------------------------------------- toasts */

export interface Toast {
  id: number;
  text: string;
  kind: 'success' | 'error' | 'info';
}
let toasts: Toast[] = [];
let toastId = 0;
const toastListeners = new Set<() => void>();
export function toast(text: string, kind: Toast['kind'] = 'success') {
  const id = ++toastId;
  toasts = [...toasts.slice(-1), { id, text, kind }];
  toastListeners.forEach((l) => l());
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    toastListeners.forEach((l) => l());
  }, 3200);
}
export function useToasts() {
  return useSyncExternalStore(
    (l) => {
      toastListeners.add(l);
      return () => toastListeners.delete(l);
    },
    () => toasts,
    () => toasts
  );
}

export function buzz(kind: 'tap' | 'success' | 'error' = 'tap') {
  if (Platform.OS === 'web' || !state?.settings.haptics) return;
  if (kind === 'tap') Haptics.selectionAsync().catch(() => {});
  else {
    Haptics.notificationAsync(
      kind === 'success' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error
    ).catch(() => {});
  }
}

/** Runs an action and reports the outcome to the user. Returns success. */
export function attempt(result: Result, success?: string): boolean {
  if (result.ok) {
    buzz('success');
    if (success) toast(success);
    return true;
  }
  buzz('error');
  toast(result.error, 'error');
  return false;
}
