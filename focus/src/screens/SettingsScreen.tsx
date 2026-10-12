import { useEffect, useRef, useState } from 'react';
import { unlockAudio } from '../alerts/audio';
import { fireAlert } from '../alerts/AlertManager';
import {
  forgetCustomSoundCache,
  loadCustomSound,
  MAX_CUSTOM_BYTES,
  removeCustomSound,
  setCustomSound,
} from '../alerts/customSound';
import { BUILTIN_SOUNDS, playSound } from '../alerts/sounds';
import { BackIcon, PlayIcon } from '../components/Icons';
import { PrivacyNote } from '../components/PrivacyNote';
import { Segmented } from '../components/Segmented';
import type { Sensitivity } from '../engine/DistractionEngine';
import { canVibrate, isIOS } from '../lib/platform';
import { clearAll } from '../storage/db';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';

export function SettingsScreen() {
  const settings = useSettings();
  const go = useSession((s) => s.go);
  const fileInput = useRef<HTMLInputElement>(null);
  const [custom, setCustom] = useState<{ buffer: AudioBuffer; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(0);
  const [confirmClear, setConfirmClear] = useState(false);
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    loadCustomSound().then(setCustom).catch(() => setCustom(null));
  }, []);

  const preview = async (sound: Parameters<typeof playSound>[0]) => {
    await unlockAudio();
    playSound(sound, settings.volume);
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    try {
      await unlockAudio();
      const buffer = await setCustomSound(file);
      setCustom({ buffer, name: file.name });
      settings.set({ soundId: 'custom' });
      playSound(buffer, settings.volume);
    } catch (err) {
      setError(
        (err as Error).message === 'too-big'
          ? `El archivo es demasiado grande (máx. ${MAX_CUSTOM_BYTES / 1024 / 1024} MB).`
          : 'No se ha podido leer ese audio. Prueba con MP3, M4A o WAV.',
      );
    }
  };

  const removeCustom = async () => {
    await removeCustomSound();
    setCustom(null);
    if (settings.soundId === 'custom') settings.set({ soundId: 'bell' });
  };

  const testAlert = async () => {
    await unlockAudio();
    await fireAlert(() => setFlash((n) => n + 1));
  };

  const clearData = async () => {
    if (!confirmClear) return setConfirmClear(true);
    await clearAll();
    forgetCustomSoundCache();
    localStorage.removeItem('focus-settings');
    settings.reset();
    setCustom(null);
    setConfirmClear(false);
    setCleared(true);
  };

  const vibrationAvailable = canVibrate();
  const selectedSound = settings.soundId === 'custom' ? (custom?.buffer ?? 'bell') : settings.soundId;

  return (
    <main className="screen">
      <header className="topbar">
        <button className="icon-btn" onClick={() => go('home')} aria-label="Volver">
          <BackIcon />
        </button>
        <h1 className="title">Ajustes</h1>
        <span style={{ width: 40 }} />
      </header>

      <section className="stack">
        <span className="label">Tipo de aviso</span>
        <Segmented
          label="Tipo de aviso"
          value={settings.alertStyle}
          onChange={(alertStyle) => settings.set({ alertStyle })}
          options={[
            { value: 'sound', label: 'Sonido' },
            { value: 'visual', label: 'Solo visual' },
          ]}
        />
        {settings.alertStyle === 'visual' && (
          <p className="muted small">Un brillo suave en los bordes de la pantalla, sin sonido.</p>
        )}
      </section>

      {settings.alertStyle === 'sound' && (
        <section className="stack">
          <span className="label">Sonido</span>
          <div className="card list" role="radiogroup" aria-label="Sonido" style={{ paddingBlock: 6 }}>
            {BUILTIN_SOUNDS.map((s) => (
              <div className="row" key={s.id}>
                <button
                  className="radio-row"
                  role="radio"
                  aria-checked={settings.soundId === s.id}
                  onClick={() => {
                    settings.set({ soundId: s.id });
                    void preview(s.id);
                  }}
                >
                  <span className="radio" />
                  {s.label}
                </button>
                <button className="icon-btn" onClick={() => preview(s.id)} aria-label={`Escuchar ${s.label}`}>
                  <PlayIcon />
                </button>
              </div>
            ))}
            <div className="row">
              {custom ? (
                <>
                  <button
                    className="radio-row"
                    role="radio"
                    aria-checked={settings.soundId === 'custom'}
                    onClick={() => settings.set({ soundId: 'custom' })}
                  >
                    <span className="radio" />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {custom.name}
                    </span>
                  </button>
                  <button className="icon-btn" onClick={() => preview(custom.buffer)} aria-label="Escuchar sonido propio">
                    <PlayIcon />
                  </button>
                  <button className="btn btn-ghost small" onClick={removeCustom}>
                    Quitar
                  </button>
                </>
              ) : (
                <button className="btn btn-ghost" style={{ paddingInline: 0 }} onClick={() => fileInput.current?.click()}>
                  + Subir un sonido propio
                </button>
              )}
            </div>
          </div>
          <input ref={fileInput} type="file" accept="audio/*" hidden onChange={onFile} />
          {error && <p className="small" style={{ color: 'var(--warm)' }}>{error}</p>}
          <p className="muted small">Tu sonido se guarda solo en este dispositivo.</p>

          <div className="row">
            <span>Volumen</span>
            <span className="muted small">{Math.round(settings.volume * 100)}%</span>
          </div>
          <input
            type="range"
            min={0.05}
            max={1}
            step={0.05}
            value={settings.volume}
            aria-label="Volumen"
            onChange={(e) => settings.set({ volume: Number(e.target.value) })}
            onPointerUp={() => void preview(selectedSound)}
          />
          {isIOS() && (
            <p className="muted small">En iPhone, el interruptor de silencio puede silenciar los avisos.</p>
          )}
        </section>
      )}

      <section className="card">
        <label className="row">
          <span>
            Vibración
            {!vibrationAvailable && <span className="muted small"> · no disponible en este navegador</span>}
          </span>
          <input
            type="checkbox"
            className="switch"
            checked={settings.vibrate && vibrationAvailable}
            disabled={!vibrationAvailable}
            onChange={(e) => settings.set({ vibrate: e.target.checked })}
          />
        </label>
      </section>

      <section className="stack">
        <span className="label">Detección</span>
        <Segmented<Sensitivity>
          label="Sensibilidad"
          value={settings.sensitivity}
          onChange={(sensitivity) => settings.set({ sensitivity })}
          options={[
            { value: 'low', label: 'Baja' },
            { value: 'medium', label: 'Media' },
            { value: 'high', label: 'Alta' },
          ]}
        />
        <p className="muted small">Más sensibilidad = avisa antes. Menos = solo si la distracción dura más.</p>

        <div className="row">
          <span>Esperar antes de avisar</span>
          <span className="muted small">{settings.minDistractionSec} s</span>
        </div>
        <input
          type="range"
          min={3}
          max={30}
          step={1}
          value={settings.minDistractionSec}
          aria-label="Esperar antes de avisar"
          onChange={(e) => settings.set({ minDistractionSec: Number(e.target.value) })}
        />

        <div className="row">
          <span>Tiempo mínimo entre avisos</span>
          <span className="muted small">{settings.cooldownSec} s</span>
        </div>
        <input
          type="range"
          min={10}
          max={120}
          step={5}
          value={settings.cooldownSec}
          aria-label="Tiempo mínimo entre avisos"
          onChange={(e) => settings.set({ cooldownSec: Number(e.target.value) })}
        />
      </section>

      <button className="btn" onClick={testAlert}>
        Probar aviso
      </button>

      <section className="stack">
        <span className="label">Datos</span>
        <PrivacyNote>
          Tus sesiones y ajustes se guardan solo en este navegador. No hay cuentas ni servidores.
        </PrivacyNote>
        <button className={confirmClear ? 'btn btn-primary' : 'btn'} onClick={clearData}>
          {confirmClear ? 'Pulsa otra vez para borrarlo todo' : 'Borrar todos los datos'}
        </button>
        {cleared && <p className="muted small">Datos borrados.</p>}
      </section>

      {flash > 0 && <div key={flash} className="flash" aria-hidden />}
    </main>
  );
}
