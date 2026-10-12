import { useState } from 'react';
import { SettingsIcon } from '../components/Icons';
import { PrivacyNote } from '../components/PrivacyNote';
import { Segmented } from '../components/Segmented';
import { ACTIVITY_LABEL, MODE_HINT, MODE_LABEL } from '../i18n/es';
import { startSession } from '../session/SessionController';
import type { Activity, Mode } from '../session/types';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';

const ACTIVITIES = Object.keys(ACTIVITY_LABEL) as Activity[];
const MODES = Object.keys(MODE_LABEL) as Mode[];

export function HomeScreen() {
  const { lastActivity, lastMode, set } = useSettings();
  const go = useSession((s) => s.go);
  const [starting, setStarting] = useState(false);

  const start = async () => {
    setStarting(true);
    try {
      await startSession(lastActivity, lastMode);
    } finally {
      setStarting(false);
    }
  };

  return (
    <main className="screen">
      <header className="topbar">
        <div className="brand">
          <span className="brand-dot" aria-hidden />
          Focus
        </div>
        <button className="icon-btn" onClick={() => go('settings')} aria-label="Ajustes">
          <SettingsIcon />
        </button>
      </header>

      <h1 className="lead">¿En qué te vas a centrar?</h1>

      <section className="stack">
        <span className="label">Actividad</span>
        <div className="chips">
          {ACTIVITIES.map((a) => (
            <button
              key={a}
              type="button"
              className="chip"
              aria-pressed={a === lastActivity}
              onClick={() => set({ lastActivity: a })}
            >
              {ACTIVITY_LABEL[a]}
            </button>
          ))}
        </div>
      </section>

      <section className="stack">
        <span className="label">Modo</span>
        <Segmented
          label="Modo"
          value={lastMode}
          onChange={(m) => set({ lastMode: m })}
          options={MODES.map((m) => ({ value: m, label: MODE_LABEL[m] }))}
        />
        <p className="muted small">{MODE_HINT[lastMode]}</p>
      </section>

      <div className="spacer" />

      <div className="stack">
        <button className="btn btn-primary btn-hero" onClick={start} disabled={starting}>
          Empezar Focus
        </button>
        <PrivacyNote />
      </div>
    </main>
  );
}
