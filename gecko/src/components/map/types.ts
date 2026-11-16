import type { StyleProp, ViewStyle } from 'react-native';

import type { LatLon } from '@/domain/geo';

export interface RouteMapProps {
  points: LatLon[];
  /** Actividad en curso: sigue al usuario y muestra su posición. */
  live?: boolean;
  style?: StyleProp<ViewStyle>;
}
