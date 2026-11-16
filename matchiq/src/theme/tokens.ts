export const color = {
  bg: '#080D14',
  surface: '#101C2C',
  surfaceHi: '#172840',
  line: 'rgba(255,255,255,0.08)',
  lineStrong: 'rgba(255,255,255,0.16)',
  accent: '#B6F542',
  accentDim: 'rgba(182,245,66,0.14)',
  onAccent: '#0B1405',
  text: '#FFFFFF',
  muted: '#929BA8',
  faint: '#5C6878',
  danger: '#FF5C6C',
  dangerDim: 'rgba(255,92,108,0.14)',
  warn: '#FFC24B',
  warnDim: 'rgba(255,194,75,0.14)',
  info: '#5EC8FF',
  infoDim: 'rgba(94,200,255,0.14)',
  pitch: '#0E2A1F',
  pitchLine: 'rgba(255,255,255,0.10)',
  scrim: 'rgba(4,7,12,0.72)',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40 } as const;
export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;

export const font = {
  display: 'Sora_700Bold',
  displayHeavy: 'Sora_800ExtraBold',
  displayMedium: 'Sora_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodyBold: 'Inter_600SemiBold',
} as const;

/** Type scale. `num` variants use tabular display figures for scores. */
export const type = {
  hero: { fontFamily: font.displayHeavy, fontSize: 40, lineHeight: 44, letterSpacing: -1.2 },
  h1: { fontFamily: font.display, fontSize: 28, lineHeight: 34, letterSpacing: -0.6 },
  h2: { fontFamily: font.display, fontSize: 20, lineHeight: 26, letterSpacing: -0.3 },
  h3: { fontFamily: font.displayMedium, fontSize: 16, lineHeight: 22, letterSpacing: -0.1 },
  body: { fontFamily: font.body, fontSize: 15, lineHeight: 22 },
  bodyBold: { fontFamily: font.bodyBold, fontSize: 15, lineHeight: 22 },
  small: { fontFamily: font.bodyMedium, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: font.bodyBold, fontSize: 11, lineHeight: 14, letterSpacing: 0.9, textTransform: 'uppercase' },
  score: { fontFamily: font.displayHeavy, fontSize: 56, lineHeight: 60, letterSpacing: -2 },
  num: { fontFamily: font.display, fontSize: 17, lineHeight: 22 },
} as const;
export type TypeVariant = keyof typeof type;

export const TAB_BAR_SPACE = 104;
export const MAX_WIDTH = 520;
/** Coins with thousands separators. */
export const coins = (n: number) => Math.round(n).toLocaleString('en-GB');
export const signed = (n: number) => `${n > 0 ? '+' : ''}${coins(n)}`;
export const odds = (d: number | null | undefined) => (d == null ? '—' : Number(d).toFixed(2));
