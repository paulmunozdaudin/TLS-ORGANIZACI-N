import { playSound } from './sounds';
import { loadCustomSound } from './customSound';
import { canVibrate } from '../lib/platform';
import { useSettings } from '../store/settings';

/** Lanza la alerta según los ajustes: sonido (o aviso visual) y vibración si está disponible. */
export async function fireAlert(showVisual: () => void) {
  const { alertStyle, soundId, volume, vibrate } = useSettings.getState();

  // El aviso visual es suave y acompaña siempre; en modo "visual" es lo único que hay.
  showVisual();

  if (alertStyle === 'sound') {
    if (soundId === 'custom') {
      const custom = await loadCustomSound().catch(() => null);
      playSound(custom?.buffer ?? 'bell', volume);
    } else {
      playSound(soundId, volume);
    }
  }

  if (vibrate && canVibrate()) navigator.vibrate([180, 120, 180]);
}
