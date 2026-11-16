/**
 * Modelo de dominio de Gecko.
 * TypeScript puro, sin dependencias de React Native: este módulo (y el resto de
 * `src/domain`) está pensado para compartirse con el backend (Supabase Edge
 * Functions), donde se repetirá la verificación de forma autoritativa.
 */

export type ActivityType = 'run' | 'walk' | 'ride';

export interface TrackPoint {
  lat: number;
  lon: number;
  /** Epoch ms del fix GPS. */
  t: number;
  /** Precisión horizontal en metros (null si el dispositivo no la informa). */
  acc: number | null;
  alt: number | null;
  /** Velocidad instantánea informada por el sensor, m/s. */
  speed: number | null;
  /** Segmento de grabación. Cambia tras cada pausa: no se mide distancia entre segmentos. */
  seg: number;
  /** Android: el SO marca la posición como simulada (mock location). */
  mocked?: boolean;
}

export type VerificationStatus = 'verified' | 'suspicious' | 'rejected';

export type VerificationFlagCode =
  | 'MOCK_LOCATION'
  | 'TELEPORT'
  | 'SPEED_TOO_HIGH'
  | 'SPARSE_GPS'
  | 'LOW_ACCURACY'
  | 'DISTANCE_MISMATCH'
  | 'TOO_SHORT'
  | 'DUPLICATE_WINDOW'
  | 'TIME_INCONSISTENT'
  | 'CADENCE_MISMATCH'
  | 'CONSTANT_SPEED';

export interface VerificationFlag {
  code: VerificationFlagCode;
  severity: 'warn' | 'block';
  message: string;
}

export interface VerificationResult {
  status: VerificationStatus;
  /** 0–100. Confianza en que la actividad es real. */
  score: number;
  flags: VerificationFlag[];
  /** Distancia recalculada a partir de la ruta: es la única que cuenta para compromisos. */
  verifiedDistanceM: number;
  checkedAt: number;
}

export interface Activity {
  id: string;
  type: ActivityType;
  startedAt: number;
  endedAt: number;
  /** Tiempo en movimiento (sin pausas), segundos. */
  movingTimeSec: number;
  /** Distancia medida por el cliente durante la grabación, metros. */
  distanceM: number;
  /** Pasos del podómetro durante la sesión (null si el dispositivo no lo soporta). */
  steps: number | null;
  calories: number;
  /** Ruta simplificada para mostrar. La ruta cruda se verifica y (Fase 4) se sube al backend. */
  route: { lat: number; lon: number }[];
  verification: VerificationResult;
  commitmentId: string | null;
}

export type GoalMetric = 'distance' | 'steps' | 'sessions';

export type CommitmentStatus = 'active' | 'completed' | 'failed' | 'pending_verification';

export interface Commitment {
  id: string;
  activityType: ActivityType;
  metric: GoalMetric;
  /** Metros, pasos o número de sesiones, según `metric`. */
  target: number;
  /** Dinero comprometido en céntimos (enteros: nunca floats para dinero). */
  stakeCents: number;
  createdAt: number;
  deadline: number;
  status: CommitmentStatus;
  resolvedAt: number | null;
  /** Referencia de la retención en el proveedor de pagos. */
  holdId: string;
}

export interface CommitmentProgress {
  /** Progreso verificado. */
  value: number;
  /** Progreso aportado por actividades marcadas como sospechosas (no cuenta hasta revisión). */
  pendingValue: number;
  ratio: number;
}

export type LedgerEntryKind = 'deposit' | 'hold' | 'release' | 'forfeit';

export interface LedgerEntry {
  id: string;
  kind: LedgerEntryKind;
  amountCents: number;
  commitmentId: string | null;
  at: number;
}

export interface Wallet {
  /** Saldo disponible. */
  availableCents: number;
  /** Saldo retenido en compromisos activos. */
  heldCents: number;
  ledger: LedgerEntry[];
}

export interface UserProfile {
  name: string;
  username: string;
  weightKg: number;
  joinedAt: number;
}
