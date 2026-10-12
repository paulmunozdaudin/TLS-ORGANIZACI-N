import { ACTIVITY_LABEL, KIND_LABEL } from '../i18n/es';
import { formatDuration } from '../lib/time';
import type { DistractionKind } from '../signals/types';
import { useSession } from '../store/session';

export function SummaryScreen() {
  const record = useSession((s) => s.lastRecord);
  const go = useSession((s) => s.go);
  if (!record) return null;

  const kinds = Object.entries(record.distractions) as [DistractionKind, number][];
  const total = kinds.reduce((n, [, c]) => n + c, 0);
  const duration = formatDuration(record.activeMs);

  return (
    <main className="screen">
      <header className="stack" style={{ gap: 8 }}>
        <span className="label">Sesión completada</span>
        <h1 className="lead">
          {duration[0].toUpperCase() + duration.slice(1)} de{' '}
          {record.activity === 'other' ? 'concentración' : ACTIVITY_LABEL[record.activity].toLowerCase()}. Bien hecho.
        </h1>
      </header>

      <section className="stats">
        <div className="card">
          <div className="stat-value">{total}</div>
          <div className="muted small">Posibles distracciones</div>
        </div>
        <div className="card">
          <div className="stat-value">{record.alerts}</div>
          <div className="muted small">Avisos</div>
        </div>
      </section>

      <section className="card">
        {kinds.length === 0 ? (
          <p className="muted">No se ha detectado ninguna posible distracción.</p>
        ) : (
          <div className="list">
            {kinds.map(([kind, count]) => (
              <div className="row" key={kind}>
                <span>{KIND_LABEL[kind]}</span>
                <span className="muted">{count}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="spacer" />
      <button className="btn btn-primary btn-hero" onClick={() => go('home')}>
        Volver al inicio
      </button>
    </main>
  );
}
