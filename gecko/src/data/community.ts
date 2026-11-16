import type { LatLon } from '@/domain/geo';
import type { ActivityType, GoalMetric } from '@/domain/types';

/**
 * Datos de ejemplo de la comunidad.
 * Mientras no exista backend (Fase 4/7), el feed, los rankings y los retos públicos
 * se alimentan de estos perfiles de muestra. Las interacciones del usuario (likes,
 * comentarios, seguir) sí son reales y se guardan en el dispositivo.
 */

export interface CommunityUser {
  id: string;
  name: string;
  rank: string;
  color: string;
  weekKm: number;
}

export interface CommunityPost {
  id: string;
  userId: string;
  hoursAgo: number;
  type: ActivityType;
  title: string;
  distanceM: number;
  movingTimeSec: number;
  likes: number;
  /** Compromiso cumplido con esta actividad, si lo hubo. */
  stakeCents?: number;
  route: LatLon[];
}

export interface ChallengeTemplate {
  id: string;
  title: string;
  tagline: string;
  activityType: ActivityType;
  metric: GoalMetric;
  target: number;
  stakeCents: number;
  /** Plazo sugerido en horas. */
  hours: number;
  participants: number;
}

/** Circuito cerrado sintético alrededor de un punto, para las rutas de ejemplo. */
function loop(center: LatLon, radiusM: number, phase: number, n = 90): LatLon[] {
  const pts: LatLon[] = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = radiusM * (1 + 0.28 * Math.sin(3 * a + phase) + 0.12 * Math.cos(5 * a - phase));
    pts.push({
      lat: center.lat + (r * Math.cos(a)) / 111_320,
      lon: center.lon + (r * Math.sin(a)) / (111_320 * Math.cos((center.lat * Math.PI) / 180)),
    });
  }
  return pts;
}

export const USERS: CommunityUser[] = [
  { id: 'u1', name: 'Lucía Ferrer', rank: 'Gecko Pro', color: '#7DD3FC', weekKm: 42.3 },
  { id: 'u2', name: 'Marc Soler', rank: 'Gecko Runner', color: '#FDBA74', weekKm: 31.8 },
  { id: 'u3', name: 'Aitana Ruiz', rank: 'Gecko Runner', color: '#F0ABFC', weekKm: 27.4 },
  { id: 'u4', name: 'Diego Navarro', rank: 'Gecko Rookie', color: '#FDE047', weekKm: 18.9 },
  { id: 'u5', name: 'Noa Castillo', rank: 'Gecko Rookie', color: '#A5B4FC', weekKm: 12.1 },
];

export const POSTS: CommunityPost[] = [
  { id: 'p1', userId: 'u1', hoursAgo: 1, type: 'run', title: 'Rodaje por el Retiro', distanceM: 10_240, movingTimeSec: 3122, likes: 24, stakeCents: 1000, route: loop({ lat: 40.4153, lon: -3.6845 }, 640, 0.4) },
  { id: 'p2', userId: 'u2', hoursAgo: 3, type: 'ride', title: 'Salida a la Casa de Campo', distanceM: 38_600, movingTimeSec: 5640, likes: 17, stakeCents: 2000, route: loop({ lat: 40.4189, lon: -3.7512 }, 1900, 1.9) },
  { id: 'p3', userId: 'u3', hoursAgo: 7, type: 'run', title: 'Series al amanecer', distanceM: 6_100, movingTimeSec: 1705, likes: 31, route: loop({ lat: 41.3902, lon: 2.1876 }, 380, 2.7) },
  { id: 'p4', userId: 'u4', hoursAgo: 22, type: 'walk', title: 'Paseo largo por el río', distanceM: 7_850, movingTimeSec: 5210, likes: 9, stakeCents: 500, route: loop({ lat: 39.4702, lon: -0.3768 }, 520, 5.1) },
  { id: 'p5', userId: 'u5', hoursAgo: 30, type: 'run', title: 'Primer 5K del mes', distanceM: 5_020, movingTimeSec: 1790, likes: 42, stakeCents: 1000, route: loop({ lat: 37.3826, lon: -5.9963 }, 330, 3.3) },
];

export const CHALLENGES: ChallengeTemplate[] = [
  { id: 'ch1', title: '5K hoy', tagline: 'Sin excusas. Antes de medianoche.', activityType: 'run', metric: 'distance', target: 5_000, stakeCents: 500, hours: 0, participants: 1284 },
  { id: 'ch2', title: '10.000 pasos', tagline: 'El clásico diario.', activityType: 'walk', metric: 'steps', target: 10_000, stakeCents: 500, hours: 0, participants: 3410 },
  { id: 'ch3', title: '3 entrenos esta semana', tagline: 'Constancia antes que intensidad.', activityType: 'run', metric: 'sessions', target: 3, stakeCents: 1500, hours: 168, participants: 962 },
  { id: 'ch4', title: '10K del domingo', tagline: 'Tu tirada larga, con algo en juego.', activityType: 'run', metric: 'distance', target: 10_000, stakeCents: 1000, hours: 72, participants: 731 },
  { id: 'ch5', title: '40 km sobre ruedas', tagline: 'Una buena salida en bici.', activityType: 'ride', metric: 'distance', target: 40_000, stakeCents: 2000, hours: 72, participants: 418 },
];

export const userById = (id: string) => USERS.find((u) => u.id === id) as CommunityUser;
