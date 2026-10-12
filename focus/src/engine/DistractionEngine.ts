import type { DistractionKind, Signal } from '../signals/types';

export type Sensitivity = 'low' | 'medium' | 'high';

export interface EngineConfig {
  /** Segundos que debe durar una condición para contar como posible distracción. */
  minDistractionSec: number;
  /** Segundos mínimos entre dos alertas. */
  cooldownSec: number;
  sensitivity: Sensitivity;
  /** Umbral propio por tipo (en segundos), p. ej. levantar el móvil es un gesto claro. */
  overrides?: Partial<Record<DistractionKind, number>>;
}

export type EngineEvent =
  | { type: 'distraction-start'; kind: DistractionKind; at: number }
  | { type: 'distraction-end'; kind: DistractionKind; at: number; durationMs: number }
  | { type: 'alert'; kind: DistractionKind; at: number };

const SENSITIVITY_FACTOR: Record<Sensitivity, number> = { low: 1.5, medium: 1, high: 0.6 };
const TICK_MS = 250;

interface Condition {
  since: number;
  counted: boolean;
}

/**
 * Convierte señales crudas en posibles distracciones:
 * cuenta una condición solo si dura más del umbral, y limita las alertas con un cooldown.
 * Si la condición continúa, la alerta se repite al acabar el cooldown.
 */
export class DistractionEngine {
  private active = new Map<DistractionKind, Condition>();
  private lastAlertAt = -Infinity;
  private paused = false;
  private timer: number | undefined;

  constructor(
    private readonly getConfig: () => EngineConfig,
    private readonly onEvent: (event: EngineEvent) => void,
  ) {}

  start() {
    this.timer = window.setInterval(() => this.tick(Date.now()), TICK_MS);
  }

  stop() {
    window.clearInterval(this.timer);
    this.closeAll(Date.now());
  }

  pause() {
    this.paused = true;
    this.closeAll(Date.now());
  }

  resume() {
    this.paused = false;
  }

  get isDistracted() {
    for (const c of this.active.values()) if (c.counted) return true;
    return false;
  }

  handle = (signal: Signal) => {
    if (this.paused) return;
    const current = this.active.get(signal.kind);
    if (signal.active && !current) {
      this.active.set(signal.kind, { since: signal.at, counted: false });
      this.tick(signal.at);
    } else if (!signal.active && current) {
      this.active.delete(signal.kind);
      if (current.counted) {
        this.onEvent({
          type: 'distraction-end',
          kind: signal.kind,
          at: signal.at,
          durationMs: signal.at - current.since,
        });
      }
    }
  };

  thresholdMs(kind: DistractionKind) {
    const cfg = this.getConfig();
    const base = cfg.overrides?.[kind] ?? cfg.minDistractionSec;
    return base * SENSITIVITY_FACTOR[cfg.sensitivity] * 1000;
  }

  private tick(now: number) {
    if (this.paused) return;
    const cooldownMs = this.getConfig().cooldownSec * 1000;
    for (const [kind, c] of this.active) {
      if (!c.counted && now - c.since >= this.thresholdMs(kind)) {
        c.counted = true;
        this.onEvent({ type: 'distraction-start', kind, at: c.since });
      }
      if (c.counted && now - this.lastAlertAt >= cooldownMs) {
        this.lastAlertAt = now;
        this.onEvent({ type: 'alert', kind, at: now });
      }
    }
  }

  private closeAll(now: number) {
    for (const [kind, c] of this.active) {
      if (c.counted) this.onEvent({ type: 'distraction-end', kind, at: now, durationMs: now - c.since });
    }
    this.active.clear();
  }
}
