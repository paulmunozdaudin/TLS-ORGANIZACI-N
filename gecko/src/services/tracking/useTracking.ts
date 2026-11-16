import * as Location from 'expo-location';
import { Pedometer } from 'expo-sensors';
import { Platform } from 'react-native';
import { create } from 'zustand';

import { haversine } from '@/domain/geo';
import type { ActivityType, TrackPoint } from '@/domain/types';
import type { ActivityDraft } from '@/store/useAppStore';

/**
 * Motor de grabación de actividades.
 *
 * Registra la ruta con GPS de alta precisión y (si el dispositivo lo permite) los
 * pasos del podómetro. El estado vive fuera de React para que la grabación no
 * dependa del ciclo de vida de ninguna pantalla.
 *
 * Limitación conocida (Expo Go): el seguimiento es en primer plano. El GPS en
 * segundo plano requiere un development build con `expo-task-manager` (Fase 5).
 */

/** Se descartan fixes con peor precisión que esto: meterían distancia fantasma. */
const MAX_ACCURACY_M = 35;
/** Movimiento mínimo entre puntos para filtrar el ruido del GPS estando parado. */
const MIN_MOVE_M = 3;

type Status = 'idle' | 'running' | 'paused';

interface TrackingState {
  status: Status;
  type: ActivityType;
  commitmentId: string | null;
  startedAt: number;
  /** Tiempo en movimiento acumulado en segmentos ya cerrados. */
  accumulatedMs: number;
  /** Inicio del segmento actual (null si está en pausa). */
  segmentStartedAt: number | null;
  seg: number;
  points: TrackPoint[];
  distanceM: number;
  steps: number | null;
  /** Precisión del último fix recibido (aunque se haya descartado). */
  gpsAccuracy: number | null;
  hasFix: boolean;
  error: string | null;

  start: (type: ActivityType, commitmentId: string | null) => Promise<boolean>;
  pause: () => void;
  resume: () => void;
  finish: () => ActivityDraft;
  discard: () => void;
}

let locationSub: Location.LocationSubscription | null = null;
let stepSub: { remove: () => void } | null = null;
let lastStepCount = 0;

function stopSensors() {
  locationSub?.remove();
  locationSub = null;
  stepSub?.remove();
  stepSub = null;
}

const idle = {
  status: 'idle' as Status,
  commitmentId: null,
  startedAt: 0,
  accumulatedMs: 0,
  segmentStartedAt: null,
  seg: 0,
  points: [] as TrackPoint[],
  distanceM: 0,
  steps: null,
  gpsAccuracy: null,
  hasFix: false,
  error: null,
};

export const useTracking = create<TrackingState>((set, get) => {
  function onLocation(loc: Location.LocationObject) {
    const s = get();
    const acc = loc.coords.accuracy ?? null;
    set({ gpsAccuracy: acc });
    if (s.status !== 'running') return;
    if (acc != null && acc > MAX_ACCURACY_M) return;

    const point: TrackPoint = {
      lat: loc.coords.latitude,
      lon: loc.coords.longitude,
      t: loc.timestamp,
      acc,
      alt: loc.coords.altitude ?? null,
      speed: loc.coords.speed ?? null,
      seg: s.seg,
      ...(loc.mocked ? { mocked: true } : null),
    };

    const prev = s.points[s.points.length - 1];
    if (prev && prev.seg === point.seg) {
      if (point.t <= prev.t) return;
      const d = haversine(prev, point);
      if (d < MIN_MOVE_M) return;
      set({ points: [...s.points, point], distanceM: s.distanceM + d, hasFix: true });
    } else {
      set({ points: [...s.points, point], hasFix: true });
    }
  }

  async function startSteps() {
    try {
      if (!(await Pedometer.isAvailableAsync())) return;
      const perm = await Pedometer.requestPermissionsAsync();
      if (!perm.granted) return;
      lastStepCount = 0;
      set({ steps: 0 });
      // `result.steps` es acumulado desde la suscripción: se suman solo los incrementos en movimiento.
      stepSub = Pedometer.watchStepCount((result) => {
        const delta = result.steps - lastStepCount;
        lastStepCount = result.steps;
        if (delta > 0 && get().status === 'running') set({ steps: (get().steps ?? 0) + delta });
      });
    } catch {
      // Sin podómetro (p. ej. web): la actividad se registra sin pasos.
    }
  }

  return {
    ...idle,
    type: 'run',

    async start(type, commitmentId) {
      if (get().status !== 'idle') return true;
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        set({ error: 'Gecko necesita acceso a tu ubicación para registrar la actividad.' });
        return false;
      }
      const now = Date.now();
      set({ ...idle, status: 'running', type, commitmentId, startedAt: now, segmentStartedAt: now });
      try {
        locationSub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: MIN_MOVE_M },
          onLocation,
          (reason) => set({ error: `Se perdió la señal GPS: ${reason}` }),
        );
      } catch {
        set({ ...idle, error: 'No se pudo iniciar el GPS. Comprueba que la ubicación está activada.' });
        return false;
      }
      if (type !== 'ride' && Platform.OS !== 'web') void startSteps();
      return true;
    },

    pause() {
      const s = get();
      if (s.status !== 'running' || s.segmentStartedAt == null) return;
      set({
        status: 'paused',
        accumulatedMs: s.accumulatedMs + (Date.now() - s.segmentStartedAt),
        segmentStartedAt: null,
      });
    },

    resume() {
      const s = get();
      if (s.status !== 'paused') return;
      // Nuevo segmento: la distancia entre el punto de pausa y el de reanudación no cuenta.
      set({ status: 'running', segmentStartedAt: Date.now(), seg: s.seg + 1 });
    },

    finish() {
      const s = get();
      const now = Date.now();
      const movingMs = s.accumulatedMs + (s.segmentStartedAt != null ? now - s.segmentStartedAt : 0);
      const draft: ActivityDraft = {
        type: s.type,
        startedAt: s.startedAt,
        endedAt: now,
        movingTimeSec: Math.round(movingMs / 1000),
        distanceM: s.distanceM,
        steps: s.steps,
        route: s.points,
        commitmentId: s.commitmentId,
      };
      stopSensors();
      set({ ...idle });
      return draft;
    },

    discard() {
      stopSensors();
      set({ ...idle });
    },
  };
});

/** Tiempo en movimiento en el instante `now`, en segundos. */
export function movingSeconds(s: Pick<TrackingState, 'accumulatedMs' | 'segmentStartedAt'>, now: number): number {
  return (s.accumulatedMs + (s.segmentStartedAt != null ? now - s.segmentStartedAt : 0)) / 1000;
}

/** Velocidad reciente (m/s) sobre los últimos `windowSec` segundos del segmento actual. */
export function recentSpeed(points: TrackPoint[], seg: number, now: number, windowSec = 20): number | null {
  const recent = points.filter((p) => p.seg === seg && now - p.t <= windowSec * 1000);
  if (recent.length < 2) return null;
  let d = 0;
  for (let i = 1; i < recent.length; i++) d += haversine(recent[i - 1], recent[i]);
  const dt = (recent[recent.length - 1].t - recent[0].t) / 1000;
  return dt > 0 ? d / dt : null;
}
