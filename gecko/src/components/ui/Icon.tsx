import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '@/theme/tokens';

/** Set de iconos propio (trazo 2 px, rejilla 24). Evita depender de una librería de iconos. */
const PATHS = {
  search: ['M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z', 'M20 20l-3.9-3.9'],
  calendar: ['M5 5.5h14v14H5z', 'M5 10h14', 'M9 3v4', 'M15 3v4'],
  info: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 11v5', 'M12 8h.01'],
  chevronDown: ['M5 9l7 7 7-7'],
  arrowRight: ['M5 12h14', 'M13 6l6 6-6 6'],
  flag: ['M5 21V4', 'M5 4h13l-2.5 4.5L18 13H5'],
  coins: ['M12 9c3.9 0 7-1.3 7-3s-3.1-3-7-3-7 1.3-7 3 3.1 3 7 3Z', 'M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6', 'M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6'],
  home: ['M3 10.5 12 3l9 7.5', 'M5 9.5V20h5v-6h4v6h5V9.5'],
  users: ['M16 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20', 'M9 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z', 'M22 20v-1.5a4 4 0 0 0-3-3.85', 'M16 3.65a3.5 3.5 0 0 1 0 6.7'],
  target: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z', 'M12 12h.01'],
  user: ['M19 21v-1.5a4.5 4.5 0 0 0-4.5-4.5h-5A4.5 4.5 0 0 0 5 19.5V21', 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z'],
  play: ['M7 4.5v15l12-7.5-12-7.5Z'],
  pause: ['M8 5v14', 'M16 5v14'],
  stop: ['M6 6h12v12H6z'],
  plus: ['M12 5v14', 'M5 12h14'],
  minus: ['M5 12h14'],
  check: ['M4.5 12.5 10 18 19.5 6.5'],
  x: ['M6 6l12 12', 'M18 6 6 18'],
  chevronRight: ['M9 5l7 7-7 7'],
  chevronLeft: ['M15 5l-7 7 7 7'],
  clock: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 7v5l3.5 2'],
  flame: ['M12 22c4 0 7-2.9 7-7 0-3-1.6-5.2-3.2-7.1-.5 1.6-1.3 2.5-2.3 3C13.6 7.5 12.5 4.5 9.5 2c.3 3.2-1.3 5.3-2.7 7.2C5.6 10.9 5 12.7 5 15c0 4.1 3 7 7 7Z'],
  heart: ['M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2Z'],
  comment: ['M20.5 11.5a8 8 0 0 1-11.9 7L4 20l1.4-4.3A8 8 0 1 1 20.5 11.5Z'],
  share: ['M12 15V3.5', 'M7.5 7.5 12 3l4.5 4.5', 'M5 12.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-6.5'],
  trophy: ['M8 4h8v6a4 4 0 0 1-8 0V4Z', 'M8 6H4.5v1.5A3.5 3.5 0 0 0 8 11', 'M16 6h3.5v1.5A3.5 3.5 0 0 1 16 11', 'M12 14v4', 'M8.5 20.5h7', 'M10 18h4v2.5h-4z'],
  bolt: ['M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2Z'],
  pin: ['M12 21.5s7-6 7-11.5a7 7 0 1 0-14 0c0 5.5 7 11.5 7 11.5Z', 'M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z'],
  lock: ['M6 10.5h12V20H6z', 'M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3'],
  shield: ['M12 21.5c5-2 7.5-5.5 7.5-10V5.5L12 3 4.5 5.5v6c0 4.5 2.5 8 7.5 10Z', 'M8.8 12l2.3 2.3 4.2-4.6'],
  alert: ['M12 3.5 2.5 20h19L12 3.5Z', 'M12 10v4.5', 'M12 17.3h.01'],
  wallet: ['M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3', 'M4 7.5V17a2.5 2.5 0 0 0 2.5 2.5H20V8H6.5A2.5 2.5 0 0 1 4 7.5Z', 'M16 13.8h.01'],
  steps: ['M8.5 3.5c1.9 0 3 1.8 3 4.5 0 2-.6 3.2-.8 4.5H6.3C6 11.2 5.5 10 5.5 8c0-2.7 1.1-4.5 3-4.5Z', 'M6.5 15h4.2c0 1.9-.7 3.5-2.1 3.5s-2.1-1.6-2.1-3.5Z', 'M15.5 7.5c1.9 0 3 1.8 3 4.5 0 2-.5 3.2-.8 4.5h-4.4c-.2-1.3-.8-2.5-.8-4.5 0-2.7 1.1-4.5 3-4.5Z', 'M13.4 19h4.2c0 1.9-.7 3-2.1 3s-2.1-1.1-2.1-3Z'],
  run: ['M14.5 5.5a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4Z', 'M6 10.5l3.5-2.5 3.5.8 2 3.2 3.5 1', 'M13 8.8l-2 4.7 3 2.5V21', 'M11 13.5 9 17l-4.5.5'],
  walk: ['M12.5 5.5a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4Z', 'M12 8.5l-1.5 5.5 2.5 3 .8 4.5', 'M12 8.5 8.5 10.5 8 14', 'M12.3 9l2.2 3 3 1', 'M10.5 14 9.5 17.5 7.5 21.5'],
  ride: ['M5.5 20a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z', 'M18.5 20a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z', 'M5.5 16.5 9.5 9h6l3 7.5', 'M9.5 9l2.5 7.5', 'M14 5.5h2.5L15.5 9', 'M8 9h3'],
  settings: ['M4 7h10', 'M18 7h2', 'M4 17h4', 'M12 17h8', 'M16 9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z', 'M10 19.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z'],
  send: ['M21 3 10.5 13.5', 'M21 3l-6.5 18-4-7.5L3 9.5 21 3Z'],
  userPlus: ['M15 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20', 'M8.5 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z', 'M19 8v6', 'M16 11h6'],
} as const;

export type IconName = keyof typeof PATHS;

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  /** Rellena la forma (corazón activo, play…). */
  filled?: boolean;
}

export function Icon({ name, size = 22, color = colors.text, strokeWidth = 2, filled }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {PATHS[name].map((d, i) => (
        <Path
          key={i}
          d={d}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={filled ? color : 'none'}
        />
      ))}
    </Svg>
  );
}

export function Dot({ size = 8, color = colors.lime }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 8 8">
      <Circle cx={4} cy={4} r={4} fill={color} />
    </Svg>
  );
}
