import { useState } from 'react';
import { View } from 'react-native';

import { RouteSketch } from './RouteSketch';
import type { RouteMapProps } from './types';

/** En web no hay mapa nativo: se dibuja el trazado vectorial de la ruta. */
export function RouteMap({ points, live, style }: RouteMapProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  return (
    <View
      style={[{ flex: 1 }, style]}
      onLayout={(e) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
    >
      {size.width > 0 ? <RouteSketch points={points} width={size.width} height={size.height} live={live} /> : null}
    </View>
  );
}
