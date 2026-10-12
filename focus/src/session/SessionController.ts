import { DistractionEngine, type EngineEvent } from '../engine/DistractionEngine';
import { fireAlert } from '../alerts/AlertManager';
import { unlockAudio } from '../alerts/audio';
import { VisibilitySource } from '../signals/visibility/VisibilitySource';
import type { SignalSource } from '../signals/types';
import { saveSession } from '../storage/db';
import { allowScreenOff, keepScreenOn } from '../lib/wakeLock';
import { activeMs, useSession } from '../store/session';
import { useSettings } from '../store/settings';
import type { Activity, Mode, SessionRecord, TimelineEntry } from './types';

/**
 * Orquesta una sesión: crea las fuentes de señal del modo elegido,
 * las conecta al motor y traduce sus eventos en alertas y línea de tiempo.
 * Nada se detecta fuera de una sesión iniciada por el usuario.
 */
let sources: SignalSource[] = [];
let engine: DistractionEngine | null = null;
let timeline: TimelineEntry[] = [];
let openDistraction = new Map<string, Extract<TimelineEntry, { type: 'distraction' }>>();
let appExits = 0;

function buildSources(mode: Mode): SignalSource[] {
  // Fase 2 añadirá WebcamSource y fase 3 MotionSource.
  return [new VisibilitySource(mode === 'desktop')];
}

function onEngineEvent(event: EngineEvent) {
  const { patchLive, live } = useSession.getState();
  if (!live) return;

  switch (event.type) {
    case 'distraction-start': {
      const entry = { at: event.at, type: 'distraction' as const, kind: event.kind, durationMs: 0 };
      timeline.push(entry);
      openDistraction.set(event.kind, entry);
      patchLive((l) => ({
        distracted: true,
        distractions: { ...l.distractions, [event.kind]: (l.distractions[event.kind] ?? 0) + 1 },
      }));
      break;
    }
    case 'distraction-end': {
      const entry = openDistraction.get(event.kind);
      if (entry) entry.durationMs = event.durationMs;
      openDistraction.delete(event.kind);
      patchLive({ distracted: engine?.isDistracted ?? false });
      if (event.kind === 'tab-hidden' && live.mode === 'mobile') {
        appExits += 1;
        patchLive({
          notice: `De vuelta · has salido ${appExits} ${appExits === 1 ? 'vez' : 'veces'} de la app`,
        });
      }
      break;
    }
    case 'alert':
      timeline.push({ at: event.at, type: 'alert', kind: event.kind });
      patchLive((l) => ({ alerts: l.alerts + 1 }));
      void fireAlert(() => patchLive((l) => ({ flashKey: l.flashKey + 1 })));
      break;
  }
}

/** Llamar directamente desde el clic del botón (desbloquea audio y permisos). */
export async function startSession(activity: Activity, mode: Mode) {
  await unlockAudio();
  const now = Date.now();
  timeline = [{ at: now, type: 'start' }];
  openDistraction = new Map();
  appExits = 0;

  useSession.setState({
    screen: 'session',
    live: {
      activity,
      mode,
      startedAt: now,
      pausedAt: null,
      pausedTotalMs: 0,
      distracted: false,
      distractions: {},
      alerts: 0,
      notice: null,
      flashKey: 0,
    },
  });

  engine = new DistractionEngine(
    () => {
      const s = useSettings.getState();
      return {
        minDistractionSec: s.minDistractionSec,
        cooldownSec: s.cooldownSec,
        sensitivity: s.sensitivity,
        // En móvil, salir de la app ya es la señal: se cuenta al momento.
        overrides: mode === 'mobile' ? { 'tab-hidden': 0, 'phone-lifted': 2 } : undefined,
      };
    },
    onEngineEvent,
  );
  engine.start();

  sources = buildSources(mode);
  for (const source of sources) await source.start(engine.handle);
  keepScreenOn();
}

export function pauseSession() {
  const { live, patchLive } = useSession.getState();
  if (!live || live.pausedAt) return;
  engine?.pause();
  const now = Date.now();
  timeline.push({ at: now, type: 'pause' });
  patchLive({ pausedAt: now, distracted: false });
}

export function resumeSession() {
  const { live, patchLive } = useSession.getState();
  if (!live?.pausedAt) return;
  const now = Date.now();
  engine?.resume();
  timeline.push({ at: now, type: 'resume' });
  patchLive({ pausedAt: null, pausedTotalMs: live.pausedTotalMs + (now - live.pausedAt) });
}

export async function endSession() {
  // Cerrar primero las fuentes y el motor para que las distracciones abiertas se registren.
  for (const source of sources) source.stop();
  sources = [];
  engine?.stop();
  engine = null;
  allowScreenOff();

  const { live } = useSession.getState();
  if (!live) return;
  const now = Date.now();
  timeline.push({ at: now, type: 'end' });

  const latest = useSession.getState().live ?? live;
  const record: SessionRecord = {
    id: `${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    activity: latest.activity,
    mode: latest.mode,
    startedAt: latest.startedAt,
    endedAt: now,
    activeMs: activeMs(latest, now),
    distractions: latest.distractions,
    alerts: latest.alerts,
    timeline,
  };

  useSession.setState({ live: null, lastRecord: record, screen: 'summary' });
  await saveSession(record).catch(() => {});
}

export function dismissNotice() {
  useSession.getState().patchLive({ notice: null });
}
