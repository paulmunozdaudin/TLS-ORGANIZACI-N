import type { DistractionKind } from '../signals/types';
import type { Activity, Mode } from '../session/types';

// Textos cortos y amables. Nunca afirmamos saber si alguien está concentrado,
// y no hacemos afirmaciones médicas.

export const ACTIVITY_LABEL: Record<Activity, string> = {
  study: 'Estudiar',
  read: 'Leer',
  work: 'Trabajar',
  class: 'Clase',
  other: 'Otra',
};

export const MODE_LABEL: Record<Mode, string> = {
  desktop: 'Ordenador',
  mobile: 'Móvil',
};

export const MODE_HINT: Record<Mode, string> = {
  desktop: 'Detecta cambios de pestaña o ventana. La cámara llega pronto.',
  mobile: 'Deja el móvil en la mesa. Cuenta las veces que sales de la app.',
};

export const KIND_LABEL: Record<DistractionKind, string> = {
  'gaze-away': 'Mirada fuera de la pantalla',
  'head-down': 'Cabeza inclinada hacia abajo',
  'face-missing': 'Fuera de cámara',
  'eyes-closed': 'Ojos cerrados un rato',
  'tab-hidden': 'Cambio de pestaña o app',
  'phone-lifted': 'Móvil levantado',
};

export const CALM_MESSAGES = ['Todo tranquilo', 'Sigue a tu ritmo', 'Aquí estás'];
