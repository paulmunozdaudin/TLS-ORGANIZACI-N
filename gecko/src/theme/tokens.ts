/**
 * Design tokens de Gecko.
 * Identidad: negro profundo + verde lima como único color de acción. El lima se
 * reserva para lo que importa (CTA, progreso, dinero a salvo); el resto es neutro.
 */
export const colors = {
  bg: '#0A0B0A',
  surface: '#141614',
  surfaceHigh: '#1D201D',
  border: '#262A26',
  borderStrong: '#363B36',

  text: '#F4F6F2',
  textMuted: '#9AA29A',
  textDim: '#626A62',

  lime: '#C5F82A',
  limeDeep: '#8FC400',
  limeSoft: 'rgba(197, 248, 42, 0.12)',
  onLime: '#0A0B0A',

  danger: '#FF5B4D',
  dangerSoft: 'rgba(255, 91, 77, 0.12)',
  warning: '#FFC247',
  warningSoft: 'rgba(255, 194, 71, 0.12)',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40 } as const;

export const radius = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 } as const;

export const TAB_BAR_HEIGHT = 72;
