/** Mantiene la pantalla encendida durante la sesión (si el navegador lo permite). */
let sentinel: WakeLockSentinel | null = null;
let wanted = false;

async function acquire() {
  if (!wanted || sentinel || !('wakeLock' in navigator) || document.hidden) return;
  try {
    sentinel = await navigator.wakeLock.request('screen');
    sentinel.addEventListener('release', () => (sentinel = null));
  } catch {
    // Batería baja o permiso denegado: la sesión sigue igual.
  }
}

// El navegador libera el bloqueo al ocultar la página; lo pedimos de nuevo al volver.
const onVisibility = () => void acquire();

export function keepScreenOn() {
  wanted = true;
  document.addEventListener('visibilitychange', onVisibility);
  void acquire();
}

export function allowScreenOff() {
  wanted = false;
  document.removeEventListener('visibilitychange', onVisibility);
  void sentinel?.release();
  sentinel = null;
}

export const wakeLockSupported = () => 'wakeLock' in navigator;
