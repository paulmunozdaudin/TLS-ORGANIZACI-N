import { useEffect, useState } from 'react';
import { ACTIVITY_LABEL, CALM_MESSAGES, MODE_LABEL } from '../i18n/es';
import { formatClock } from '../lib/time';
import { useNow } from '../lib/useNow';
import { dismissNotice, endSession, pauseSession, resumeSession } from '../session/SessionController';
import { activeMs, useSession } from '../store/session';

export function SessionScreen() {
  const live = useSession((s) => s.live);
  const paused = !!live?.pausedAt;
  const now = useNow(1000, !paused);
  const [confirmEnd, setConfirmEnd] = useState(false);

  // El aviso de "has salido N veces" desaparece solo.
  useEffect(() => {
    if (!live?.notice) return;
    const id = window.setTimeout(dismissNotice, 6000);
    return () => window.clearTimeout(id);
  }, [live?.notice]);

  useEffect(() => {
    if (!confirmEnd) return;
    const id = window.setTimeout(() => setConfirmEnd(false), 4000);
    return () => window.clearTimeout(id);
  }, [confirmEnd]);

  if (!live) return null;

  const elapsed = activeMs(live, now);
  const state = paused ? 'paused' : live.distracted ? 'distracted' : 'calm';
  const calm = CALM_MESSAGES[Math.floor(elapsed / 300000) % CALM_MESSAGES.length];
  const status = paused ? 'En pausa' : live.distracted ? 'Posible distracción · vuelve cuando puedas' : calm;

  return (
    <main className="screen session">
      <header className="stack" style={{ gap: 4 }}>
        <span className="label">
          {ACTIVITY_LABEL[live.activity]} · {MODE_LABEL[live.mode]}
        </span>
      </header>

      <section className="session-center">
        <div className="orb" data-state={state}>
          <span className="timer" style={elapsed >= 3600000 ? { fontSize: '2.6rem' } : undefined}>
            {formatClock(elapsed)}
          </span>
        </div>
        <p className="status" data-state={state} aria-live="polite">
          {status}
        </p>
      </section>

      <footer className="stack" style={{ gap: 20 }}>
        <div className="session-actions">
          <button className="btn" onClick={paused ? resumeSession : pauseSession}>
            {paused ? 'Reanudar' : 'Pausa'}
          </button>
          <button
            className={confirmEnd ? 'btn btn-primary' : 'btn btn-ghost'}
            onClick={() => (confirmEnd ? void endSession() : setConfirmEnd(true))}
          >
            {confirmEnd ? '¿Terminar?' : 'Terminar'}
          </button>
        </div>
        <p className="muted small">
          {live.mode === 'mobile'
            ? 'La pantalla se mantiene encendida durante la sesión.'
            : 'Si cambias de pestaña un rato, te avisaremos con suavidad.'}
        </p>
      </footer>

      {live.flashKey > 0 && <div key={live.flashKey} className="flash" aria-hidden />}
      {live.notice && (
        <div className="notice-wrap" role="status">
          <button className="notice" onClick={dismissNotice}>
            {live.notice}
          </button>
        </div>
      )}
    </main>
  );
}
