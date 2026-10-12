import type { Emit, SignalSource } from '../types';

/**
 * Cambio de pestaña, de ventana o de app.
 * - `withBlur`: en ordenador también cuenta perder el foco de la ventana
 *   (p. ej. pasar a otra aplicación con la pestaña aún visible).
 *   En móvil se desactiva porque los diálogos del sistema también provocan blur.
 */
export class VisibilitySource implements SignalSource {
  readonly id = 'visibility';
  private emit: Emit | null = null;
  private away = false;

  constructor(private readonly withBlur: boolean) {}

  start(emit: Emit) {
    this.emit = emit;
    document.addEventListener('visibilitychange', this.update);
    if (this.withBlur) {
      window.addEventListener('blur', this.update);
      window.addEventListener('focus', this.update);
    }
    this.update();
  }

  stop() {
    document.removeEventListener('visibilitychange', this.update);
    window.removeEventListener('blur', this.update);
    window.removeEventListener('focus', this.update);
    this.emit = null;
    this.away = false;
  }

  private update = () => {
    const away = document.hidden || (this.withBlur && !document.hasFocus());
    if (away === this.away) return;
    this.away = away;
    this.emit?.({ kind: 'tab-hidden', active: away, at: Date.now() });
  };
}
