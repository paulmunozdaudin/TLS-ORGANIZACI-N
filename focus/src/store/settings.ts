import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SoundId } from '../alerts/sounds';
import type { Sensitivity } from '../engine/DistractionEngine';
import type { Activity, Mode } from '../session/types';

export interface Settings {
  soundId: SoundId;
  volume: number;
  /** 'visual' = aviso visual suave sin sonido (bibliotecas). */
  alertStyle: 'sound' | 'visual';
  vibrate: boolean;
  sensitivity: Sensitivity;
  cooldownSec: number;
  minDistractionSec: number;
  lastActivity: Activity;
  lastMode: Mode;
}

export const DEFAULT_SETTINGS: Settings = {
  soundId: 'bell',
  volume: 0.6,
  alertStyle: 'sound',
  vibrate: true,
  sensitivity: 'medium',
  cooldownSec: 30,
  minDistractionSec: 8,
  lastActivity: 'study',
  lastMode: 'desktop',
};

interface SettingsStore extends Settings {
  set: (patch: Partial<Settings>) => void;
  reset: () => void;
}

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      set: (patch) => set(patch),
      reset: () => set(DEFAULT_SETTINGS),
    }),
    { name: 'focus-settings', version: 1 },
  ),
);
