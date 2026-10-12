/**
 * Una fuente de señal solo informa de cuándo empieza y termina una condición
 * ("la cara no está", "la pestaña está oculta"...). Las reglas (umbral, cooldown,
 * sensibilidad) las aplica el DistractionEngine, así cualquier fuente nueva
 * —por ejemplo una pulsera Bluetooth— se enchufa sin tocar el resto.
 */
export type DistractionKind =
  | 'gaze-away'
  | 'head-down'
  | 'face-missing'
  | 'eyes-closed'
  | 'tab-hidden'
  | 'phone-lifted';

export interface Signal {
  kind: DistractionKind;
  active: boolean;
  at: number;
}

export type Emit = (signal: Signal) => void;

export interface SignalSource {
  readonly id: string;
  /** Debe llamarse dentro de un gesto del usuario (requisito de iOS). */
  requestPermission?(): Promise<void>;
  calibrate?(ms: number): Promise<void>;
  start(emit: Emit): Promise<void> | void;
  stop(): void;
}
