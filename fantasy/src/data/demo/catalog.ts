/**
 * DEMO CATALOG — everything in this file is fictional.
 *
 * Clubs, footballers, ratings and prices are invented and generated from a
 * fixed seed. They exist so the product can be used end-to-end before a
 * licensed football data provider is connected. Never present this data as
 * real football data.
 */
import type { Club, Player, Position } from '@/domain/types';

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CLUB_SEED: [string, string, string, string, number][] = [
  ['Northbridge Athletic', 'NBA', '#E5484D', '#1B1F2A', 88],
  ['Port Solane', 'PSO', '#3E63DD', '#F5F7FA', 86],
  ['Kestrel City', 'KES', '#F5D90A', '#1B1F2A', 84],
  ['Sant Marès', 'SMA', '#12A594', '#F5F7FA', 82],
  ['Ironfield United', 'IRO', '#8E4EC6', '#F5F7FA', 80],
  ['Dynamo Brask', 'DBR', '#F76B15', '#1B1F2A', 78],
  ['Aurelia SC', 'AUR', '#E93D82', '#F5F7FA', 76],
  ['Vale Rovers', 'VAL', '#46A758', '#F5F7FA', 75],
  ['Lumen Sporting', 'LUM', '#7CE2FE', '#1B1F2A', 73],
  ['Westmere Town', 'WES', '#978365', '#F5F7FA', 72],
  ['Orvane FC', 'ORV', '#D6409F', '#1B1F2A', 70],
  ['Alder Wanderers', 'ALD', '#5B5BD6', '#F5F7FA', 68],
];

export const CLUBS: Club[] = CLUB_SEED.map(([name, short, a, b, strength], i) => ({
  id: `c${i + 1}`,
  name,
  short,
  colors: [a, b],
  strength,
}));

const FIRST = [
  'Leo', 'Mateo', 'Luca', 'Noah', 'Hugo', 'Elias', 'Milan', 'Nico', 'Theo', 'Oscar',
  'Jonas', 'Rafael', 'Dario', 'Emil', 'Tomas', 'Andre', 'Samir', 'Kofi', 'Yuto', 'Ivan',
  'Marco', 'Diego', 'Felix', 'Adrien', 'Bruno', 'Caio', 'Idris', 'Joao', 'Kian', 'Luka',
];
const LAST = [
  'Valdren', 'Morvane', 'Tesaro', 'Quintal', 'Brask', 'Halvorn', 'Dunmere', 'Okarre',
  'Selvik', 'Castellane', 'Ferrow', 'Lindqvar', 'Abanto', 'Zelnik', 'Tavora', 'Mbekwe',
  'Sandoro', 'Kirelli', 'Almeira', 'Drennan', 'Ostrow', 'Paixa', 'Nuvola', 'Yildor',
  'Corvane', 'Fontaro', 'Galvek', 'Imbrani', 'Jorvik', 'Kaldane', 'Mireaux', 'Pellane',
  'Radmer', 'Soltero', 'Tibaut', 'Ulvane', 'Varro', 'Zamorin', 'Esquiro', 'Hartvane',
  'Belmoro', 'Cendrik', 'Dovale', 'Ekwane', 'Farrasi', 'Gostelo', 'Hervane', 'Ibanol',
];

const SQUAD_SHAPE: [Position, number][] = [
  ['GK', 2],
  ['DEF', 6],
  ['MID', 6],
  ['FWD', 4],
];

export function priceForRating(rating: number): number {
  return Math.max(3, Math.round(((rating - 55) * (rating - 55)) / 21) + 3);
}

function buildPlayers(): Player[] {
  const rand = mulberry32(20261116);
  const names: string[] = [];
  for (const f of FIRST) for (const l of LAST) names.push(`${f} ${l}`);
  for (let i = names.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [names[i], names[j]] = [names[j], names[i]];
  }
  const players: Player[] = [];
  let n = 0;
  for (const club of CLUBS) {
    for (const [position, count] of SQUAD_SHAPE) {
      for (let k = 0; k < count; k++) {
        // Depth chart: each extra player at a position is a little weaker.
        const base = club.strength - k * 3.2 - (position === 'GK' && k > 0 ? 6 : 0);
        const rating = Math.round(Math.max(58, Math.min(94, base + (rand() * 8 - 3))));
        players.push({
          id: `p${n + 1}`,
          name: names[n],
          clubId: club.id,
          position,
          rating,
          price: priceForRating(rating),
        });
        n++;
      }
    }
  }
  return players;
}

export const PLAYERS: Player[] = buildPlayers();
export const PLAYERS_BY_ID: Record<string, Player> = Object.fromEntries(PLAYERS.map((p) => [p.id, p]));
export const CLUBS_BY_ID: Record<string, Club> = Object.fromEntries(CLUBS.map((c) => [c.id, c]));

export const BOT_NAMES = [
  'tiki_taka_tom', 'la_pausa', 'gegenpress_gigi', 'catenaccio_kid', 'false9_fran',
  'route_one_ria', 'panenka_pat', 'nutmeg_nour', 'offside_ola', 'rabona_ravi',
  'sweeper_sam', 'trequartista', 'box2box_bea', 'libero_lin',
];
export const MANAGER_COLORS = [
  '#B6F542', '#5EC8FF', '#FF8A5C', '#C58BFF', '#FFD166', '#4FE3B0', '#FF6B9A', '#8FA3FF',
];
