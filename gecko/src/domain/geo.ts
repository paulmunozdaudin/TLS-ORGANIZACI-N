import type { TrackPoint } from './types';

const EARTH_RADIUS_M = 6_371_008.8;
const toRad = (deg: number) => (deg * Math.PI) / 180;

export interface LatLon {
  lat: number;
  lon: number;
}

/** Distancia de círculo máximo entre dos coordenadas, en metros. */
export function haversine(a: LatLon, b: LatLon): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface Segment {
  from: TrackPoint;
  to: TrackPoint;
  distanceM: number;
  dtSec: number;
  speedMps: number;
}

/** Tramos consecutivos dentro del mismo segmento de grabación (se ignoran los saltos por pausa). */
export function segments(route: TrackPoint[]): Segment[] {
  const out: Segment[] = [];
  for (let i = 1; i < route.length; i++) {
    const from = route[i - 1];
    const to = route[i];
    if (from.seg !== to.seg) continue;
    const distanceM = haversine(from, to);
    const dtSec = (to.t - from.t) / 1000;
    out.push({ from, to, distanceM, dtSec, speedMps: dtSec > 0 ? distanceM / dtSec : Infinity });
  }
  return out;
}

export function routeDistance(route: TrackPoint[]): number {
  return segments(route).reduce((sum, s) => sum + s.distanceM, 0);
}

/** Proyección equirectangular local a una caja de dibujo (para miniaturas de ruta en SVG). */
export function projectRoute(
  points: LatLon[],
  width: number,
  height: number,
  padding = 12,
): { x: number; y: number }[] {
  if (points.length === 0) return [];
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;
  for (const p of points) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLon = Math.min(minLon, p.lon);
    maxLon = Math.max(maxLon, p.lon);
  }
  const kx = Math.cos(toRad((minLat + maxLat) / 2));
  const spanX = Math.max((maxLon - minLon) * kx, 1e-6);
  const spanY = Math.max(maxLat - minLat, 1e-6);
  const scale = Math.min((width - padding * 2) / spanX, (height - padding * 2) / spanY);
  const offX = (width - spanX * scale) / 2;
  const offY = (height - spanY * scale) / 2;
  return points.map((p) => ({
    x: offX + (p.lon - minLon) * kx * scale,
    y: height - (offY + (p.lat - minLat) * scale),
  }));
}
