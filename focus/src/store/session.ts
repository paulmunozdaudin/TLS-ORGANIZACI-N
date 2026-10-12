import { create } from 'zustand';
import type { DistractionKind } from '../signals/types';
import type { Activity, Mode, SessionRecord } from '../session/types';

export type Screen = 'home' | 'session' | 'summary' | 'settings';

export interface LiveSession {
  activity: Activity;
  mode: Mode;
  startedAt: number;
  pausedAt: number | null;
  pausedTotalMs: number;
  distracted: boolean;
  distractions: Partial<Record<DistractionKind, number>>;
  alerts: number;
  /** Mensaje breve al volver a la app (modo móvil). */
  notice: string | null;
  /** Cambia en cada aviso visual para relanzar la animación. */
  flashKey: number;
}

interface SessionStore {
  screen: Screen;
  live: LiveSession | null;
  lastRecord: SessionRecord | null;
  go: (screen: Screen) => void;
  patchLive: (patch: Partial<LiveSession> | ((l: LiveSession) => Partial<LiveSession>)) => void;
}

export const useSession = create<SessionStore>()((set) => ({
  screen: 'home',
  live: null,
  lastRecord: null,
  go: (screen) => set({ screen }),
  patchLive: (patch) =>
    set((s) => (s.live ? { live: { ...s.live, ...(typeof patch === 'function' ? patch(s.live) : patch) } } : s)),
}));

export function activeMs(live: LiveSession, now = Date.now()) {
  return (live.pausedAt ?? now) - live.startedAt - live.pausedTotalMs;
}
