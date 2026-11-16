import { segments } from './geo';
import type {
  ActivityType,
  TrackPoint,
  VerificationFlag,
  VerificationResult,
  VerificationStatus,
} from './types';

/**
 * Verificación anti-trampas de una actividad.
 *
 * Función pura y determinista: el cliente la ejecuta para dar feedback inmediato,
 * y el backend la volverá a ejecutar sobre la ruta cruda antes de liberar dinero.
 * El cliente NUNCA es la fuente de verdad: la distancia que cuenta es la recalculada
 * aquí (`verifiedDistanceM`), no la que el frontend dice haber medido.
 */

interface Limits {
  /** Velocidad máxima plausible en un tramo aislado, m/s. */
  maxSegmentSpeed: number;
  /** Velocidad media máxima plausible sostenida, m/s. */
  maxAvgSpeed: number;
}

export const LIMITS: Record<ActivityType, Limits> = {
  walk: { maxSegmentSpeed: 4.5, maxAvgSpeed: 2.8 }, // ~10 km/h de media ya es correr
  run: { maxSegmentSpeed: 12, maxAvgSpeed: 6.7 }, // 6,7 m/s ≈ 2:29 min/km
  ride: { maxSegmentSpeed: 28, maxAvgSpeed: 16 }, // 16 m/s ≈ 58 km/h de media
};

export const MIN_DURATION_SEC = 60;
export const MIN_DISTANCE_M = 100;
const POOR_ACCURACY_M = 35;

export interface VerificationInput {
  type: ActivityType;
  startedAt: number;
  endedAt: number;
  movingTimeSec: number;
  /** Distancia declarada por el cliente. */
  distanceM: number;
  steps: number | null;
  route: TrackPoint[];
}

export interface VerificationContext {
  /** Ventanas temporales de otras actividades del mismo usuario (prevención de duplicados). */
  existing: { startedAt: number; endedAt: number }[];
  now: number;
}

export function verifyActivity(input: VerificationInput, ctx: VerificationContext): VerificationResult {
  const flags: VerificationFlag[] = [];
  const add = (code: VerificationFlag['code'], severity: VerificationFlag['severity'], message: string) =>
    flags.push({ code, severity, message });

  const limits = LIMITS[input.type];
  const segs = segments(input.route);
  const verifiedDistanceM = segs.reduce((s, x) => s + x.distanceM, 0);
  const elapsedSec = (input.endedAt - input.startedAt) / 1000;

  // 1. Coherencia temporal
  const timestampsOrdered = input.route.every((p, i) => i === 0 || p.t >= input.route[i - 1].t);
  const insideWindow = input.route.every(
    (p) => p.t >= input.startedAt - 5_000 && p.t <= input.endedAt + 5_000,
  );
  if (
    !timestampsOrdered ||
    !insideWindow ||
    input.endedAt > ctx.now + 60_000 ||
    input.endedAt <= input.startedAt ||
    input.movingTimeSec > elapsedSec + 5
  ) {
    add('TIME_INCONSISTENT', 'block', 'Las marcas de tiempo de la actividad no son coherentes.');
  }

  // 2. Duplicados: una persona no puede estar en dos actividades a la vez
  const overlaps = ctx.existing.some((e) => input.startedAt < e.endedAt && e.startedAt < input.endedAt);
  if (overlaps) add('DUPLICATE_WINDOW', 'block', 'Se solapa con otra actividad ya registrada.');

  // 3. Mínimos
  if (input.movingTimeSec < MIN_DURATION_SEC || verifiedDistanceM < MIN_DISTANCE_M) {
    add('TOO_SHORT', 'block', 'Actividad demasiado corta para contar (mín. 1 min y 100 m).');
  }

  // 4. Ubicación simulada (Android)
  if (input.route.some((p) => p.mocked)) {
    add('MOCK_LOCATION', 'block', 'Se detectó una app de ubicación simulada.');
  }

  // 5. Velocidad
  const avgSpeed = input.movingTimeSec > 0 ? verifiedDistanceM / input.movingTimeSec : 0;
  if (avgSpeed > limits.maxAvgSpeed * 1.4) {
    add('SPEED_TOO_HIGH', 'block', 'La velocidad media es imposible para esta actividad.');
  } else if (avgSpeed > limits.maxAvgSpeed) {
    add('SPEED_TOO_HIGH', 'warn', 'La velocidad media es inusualmente alta para esta actividad.');
  }

  // 6. Saltos de posición ("teletransporte")
  const jumps = segs.filter((s) => s.distanceM > 40 && s.speedMps > limits.maxSegmentSpeed * 1.5);
  const jumpDistance = jumps.reduce((s, x) => s + x.distanceM, 0);
  if (jumps.length > 0) {
    const heavy = verifiedDistanceM > 0 && jumpDistance / verifiedDistanceM > 0.15;
    add(
      'TELEPORT',
      heavy ? 'block' : 'warn',
      `Hay ${jumps.length} salto(s) de posición imposibles en la ruta.`,
    );
  }

  // 7. Densidad y calidad de la señal GPS
  if (verifiedDistanceM >= MIN_DISTANCE_M && input.route.length < verifiedDistanceM / 150) {
    add('SPARSE_GPS', 'warn', 'La ruta tiene muy pocos puntos GPS para la distancia recorrida.');
  }
  const withAcc = input.route.filter((p) => p.acc != null);
  if (withAcc.length > 0) {
    const poor = withAcc.filter((p) => (p.acc as number) > POOR_ACCURACY_M).length;
    if (poor / withAcc.length > 0.4) {
      add('LOW_ACCURACY', 'warn', 'La señal GPS fue débil durante gran parte de la actividad.');
    }
  }

  // 8. La distancia declarada debe coincidir con la ruta
  if (verifiedDistanceM > 0 || input.distanceM > 0) {
    const diff = Math.abs(input.distanceM - verifiedDistanceM) / Math.max(verifiedDistanceM, 1);
    if (diff > 0.15 && Math.abs(input.distanceM - verifiedDistanceM) > 50) {
      add('DISTANCE_MISMATCH', 'warn', 'La distancia declarada no coincide con la ruta registrada.');
    }
  }

  // 9. Cadencia: a pie, cada paso avanza una longitud plausible (detecta ir en vehículo)
  if (input.type !== 'ride' && input.steps != null && verifiedDistanceM > 300) {
    const stride = input.steps > 0 ? verifiedDistanceM / input.steps : Infinity;
    if (stride > 2.6) {
      add('CADENCE_MISMATCH', 'warn', 'Los pasos registrados no se corresponden con la distancia.');
    }
  }

  // 10. Velocidad perfectamente constante: típico de simuladores de ruta
  const moving = segs.filter((s) => s.dtSec > 0 && Number.isFinite(s.speedMps));
  if (moving.length >= 30 && verifiedDistanceM > 500) {
    const mean = moving.reduce((s, x) => s + x.speedMps, 0) / moving.length;
    const variance = moving.reduce((s, x) => s + (x.speedMps - mean) ** 2, 0) / moving.length;
    if (mean > 0 && Math.sqrt(variance) / mean < 0.01) {
      add('CONSTANT_SPEED', 'warn', 'La velocidad es artificialmente constante.');
    }
  }

  const blocks = flags.filter((f) => f.severity === 'block').length;
  const warns = flags.length - blocks;
  const status: VerificationStatus = blocks > 0 ? 'rejected' : warns > 0 ? 'suspicious' : 'verified';
  const score = Math.max(0, 100 - blocks * 60 - warns * 20);

  return { status, score, flags, verifiedDistanceM, checkedAt: ctx.now };
}
