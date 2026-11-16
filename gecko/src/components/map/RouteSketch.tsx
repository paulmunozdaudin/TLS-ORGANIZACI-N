import { View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

import { projectRoute, type LatLon } from '@/domain/geo';
import { colors, radius } from '@/theme/tokens';

interface Props {
  points: LatLon[];
  width: number;
  height: number;
  /** Marca la posición actual con un punto pulsante en lugar de la meta. */
  live?: boolean;
}

/** Trazado vectorial de una ruta sobre rejilla. Se usa en miniaturas y como mapa en web. */
export function RouteSketch({ points, width, height, live }: Props) {
  const projected = projectRoute(points, width, height, 18);
  const first = projected[0];
  const last = projected[projected.length - 1];
  const grid = 32;

  return (
    <View style={{ width, height, borderRadius: radius.md, overflow: 'hidden', backgroundColor: '#0F110F' }}>
      <Svg width={width} height={height}>
        {Array.from({ length: Math.ceil(width / grid) }, (_, i) => (
          <Line key={`v${i}`} x1={i * grid} y1={0} x2={i * grid} y2={height} stroke={colors.border} strokeWidth={1} opacity={0.5} />
        ))}
        {Array.from({ length: Math.ceil(height / grid) }, (_, i) => (
          <Line key={`h${i}`} x1={0} y1={i * grid} x2={width} y2={i * grid} stroke={colors.border} strokeWidth={1} opacity={0.5} />
        ))}
        {projected.length > 1 ? (
          <Polyline
            points={projected.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
            fill="none"
            stroke={colors.lime}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        {first ? <Circle cx={first.x} cy={first.y} r={5} fill={colors.bg} stroke={colors.lime} strokeWidth={3} /> : null}
        {last && projected.length > 1 ? (
          <>
            {live ? <Circle cx={last.x} cy={last.y} r={12} fill={colors.lime} opacity={0.25} /> : null}
            <Circle cx={last.x} cy={last.y} r={6} fill={live ? colors.lime : colors.white} />
          </>
        ) : null}
      </Svg>
    </View>
  );
}
