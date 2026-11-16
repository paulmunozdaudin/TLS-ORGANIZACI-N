import type { GeckoMood } from '@/domain/gamification';

/**
 * Ilustración de la mascota como SVG generado.
 * Personaje de cuerpo entero (lienzo 240×320): cabeza de gecko con ojos saltones,
 * cinta deportiva, camiseta técnica y cola enroscada. El volumen se consigue con
 * gradientes radiales, sombras de contacto y brillos, sin filtros (no disponibles
 * en react-native-svg).
 */

const INK = '#10240A';
const OUTFIT = '#151715';
const LIME = '#C5F82A';

type Pt = [number, number];

interface Pose {
  /** Brazo izquierdo y derecho (vistos de frente): codo y mano. */
  armL: { elbow: Pt; hand: Pt; thumb?: boolean };
  armR: { elbow: Pt; hand: Pt; thumb?: boolean };
  eyeL: 'open' | 'wink' | 'joy';
  eyeR: 'open' | 'wink' | 'joy';
  /** Párpado superior: 0 abierto … 1 cerrado. */
  lid: number;
  /** Inclinación de las cejas: >0 decidido, <0 triste. */
  brow: number;
  pupilDy: number;
  mouth: 'smile' | 'grin' | 'open' | 'frown';
  sparkles?: boolean;
}

const POSES: Record<GeckoMood, Pose> = {
  neutral: {
    armL: { elbow: [62, 214], hand: [84, 236] },
    armR: { elbow: [182, 214], hand: [186, 178], thumb: true },
    eyeL: 'open', eyeR: 'wink', lid: 0.12, brow: 0, pupilDy: 0, mouth: 'grin',
  },
  motivated: {
    armL: { elbow: [58, 206], hand: [64, 172] },
    armR: { elbow: [182, 206], hand: [176, 172] },
    eyeL: 'open', eyeR: 'open', lid: 0.14, brow: 1, pupilDy: 0, mouth: 'smile',
  },
  happy: {
    armL: { elbow: [56, 176], hand: [40, 138] },
    armR: { elbow: [184, 176], hand: [200, 138] },
    eyeL: 'joy', eyeR: 'joy', lid: 0, brow: 0, pupilDy: 0, mouth: 'open',
  },
  proud: {
    armL: { elbow: [62, 214], hand: [84, 236] },
    armR: { elbow: [184, 178], hand: [198, 140] },
    eyeL: 'open', eyeR: 'open', lid: 0.22, brow: 0, pupilDy: 0, mouth: 'grin', sparkles: true,
  },
  disappointed: {
    armL: { elbow: [74, 222], hand: [72, 258] },
    armR: { elbow: [166, 222], hand: [168, 258] },
    eyeL: 'open', eyeR: 'open', lid: 0.3, brow: -1, pupilDy: 7, mouth: 'frown',
  },
};

function arm(id: string, shoulder: Pt, a: Pose['armL'], side: 1 | -1): string {
  const [sx, sy] = shoulder;
  const [ex, ey] = a.elbow;
  const [hx, hy] = a.hand;
  const d = `M${sx} ${sy} Q${ex} ${ey} ${hx} ${hy}`;
  const thumb = a.thumb
    ? `<rect x="${hx - 5}" y="${hy - 27}" width="10" height="20" rx="5" fill="url(#${id}skin)" stroke="#3F8A0A" stroke-width="1"/>`
    : '';
  return `
    <path d="${d}" stroke="#3F8A0A" stroke-width="19" stroke-linecap="round" fill="none"/>
    <path d="${d}" stroke="url(#${id}limb)" stroke-width="16" stroke-linecap="round" fill="none"/>
    ${thumb}
    <circle cx="${hx}" cy="${hy}" r="13" fill="#3F8A0A"/>
    <circle cx="${hx}" cy="${hy}" r="11.5" fill="url(#${id}skin)"/>
    <path d="M${hx - 6 * side} ${hy - 3} q${3 * side} 4 0 8" stroke="#4E9A0C" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <path d="M${hx - 1 * side} ${hy - 4} q${3 * side} 5 0 10" stroke="#4E9A0C" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <ellipse cx="${hx - 3}" cy="${hy - 6}" rx="4" ry="2.4" fill="#FFFFFF" opacity="0.35"/>`;
}

function eye(id: string, cx: number, kind: Pose['eyeL'], p: Pose, side: 1 | -1): string {
  const cy = 96;
  // cuenca: sobresale del cráneo, rasgo típico del gecko
  let out = `
    <circle cx="${cx}" cy="${cy}" r="31" fill="#3F8A0A"/>
    <circle cx="${cx}" cy="${cy}" r="29.5" fill="url(#${id}skin)"/>`;
  if (kind === 'open') {
    const lidY = cy - 23 + 46 * p.lid;
    const tilt = -p.brow * 5 * side;
    out += `
    <circle cx="${cx}" cy="${cy}" r="23" fill="url(#${id}eye)"/>
    <ellipse cx="${cx + 2 * side}" cy="${cy + 2 + p.pupilDy}" rx="13" ry="15" fill="url(#${id}iris)"/>
    <ellipse cx="${cx + 2 * side}" cy="${cy + 2 + p.pupilDy}" rx="8.5" ry="11" fill="#0B1206"/>
    <circle cx="${cx - 4 + 2 * side}" cy="${cy - 5 + p.pupilDy}" r="5" fill="#FFFFFF"/>
    <circle cx="${cx + 6 + 2 * side}" cy="${cy + 8 + p.pupilDy}" r="2.2" fill="#FFFFFF" opacity="0.8"/>
    <clipPath id="${id}clip${cx}"><circle cx="${cx}" cy="${cy}" r="23.6"/></clipPath>
    <path clip-path="url(#${id}clip${cx})" d="M${cx - 30} ${cy - 30} H${cx + 30} V${lidY - tilt} L${cx - 30} ${lidY + tilt} Z" fill="url(#${id}lid)"/>
    <path clip-path="url(#${id}clip${cx})" d="M${cx - 30} ${lidY + tilt} L${cx + 30} ${lidY - tilt}" stroke="${INK}" stroke-width="3" opacity="0.55"/>`;
  } else {
    // guiño / ojos de alegría: párpado cerrado con arco
    const arc =
      kind === 'joy'
        ? `M${cx - 15} ${cy + 6} Q${cx} ${cy - 14} ${cx + 15} ${cy + 6}`
        : `M${cx - 15} ${cy - 2} Q${cx} ${cy + 12} ${cx + 15} ${cy - 2}`;
    out += `
    <circle cx="${cx}" cy="${cy}" r="23" fill="url(#${id}lid)"/>
    <path d="${arc}" stroke="${INK}" stroke-width="5" stroke-linecap="round" fill="none"/>`;
  }
  if (p.brow !== 0) {
    const y1 = cy - 37 - p.brow * 5;
    const y2 = cy - 37 + p.brow * 6;
    out += `<path d="M${cx - 20 * side} ${y1} L${cx + 16 * side} ${y2}" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`;
  }
  return out;
}

function mouth(kind: Pose['mouth']): string {
  switch (kind) {
    case 'open':
      return `
        <path d="M82 138 Q120 150 158 138 Q154 172 120 172 Q86 172 82 138 Z" fill="#12260A"/>
        <path d="M100 162 Q120 150 140 162 Q132 172 120 172 Q108 172 100 162 Z" fill="#FF6F86"/>
        <path d="M88 141 Q120 151 152 141 L150 146 Q120 155 90 146 Z" fill="#FFFFFF"/>
        <path d="M78 136 Q120 152 162 136" stroke="${INK}" stroke-width="3.5" stroke-linecap="round" fill="none"/>`;
    case 'grin':
      return `
        <path d="M84 138 Q120 158 160 134 Q150 160 122 162 Q96 162 84 138 Z" fill="#12260A"/>
        <path d="M89 141 Q120 157 155 138 L152 144 Q120 161 92 146 Z" fill="#FFFFFF"/>
        <path d="M78 134 Q120 160 164 130" stroke="${INK}" stroke-width="3.5" stroke-linecap="round" fill="none"/>
        <path d="M164 130 q5 -1 6 -6" stroke="${INK}" stroke-width="3" stroke-linecap="round" fill="none"/>`;
    case 'frown':
      return `<path d="M92 154 Q120 138 148 154" stroke="${INK}" stroke-width="4" stroke-linecap="round" fill="none"/>`;
    default:
      return `
        <path d="M78 136 Q120 162 162 136" stroke="${INK}" stroke-width="4" stroke-linecap="round" fill="none"/>
        <path d="M74 132 q2 6 8 6 M166 132 q-2 6 -8 6" stroke="${INK}" stroke-width="3" stroke-linecap="round" fill="none"/>`;
  }
}

const sparkle = (x: number, y: number, s: number) =>
  `<path d="M${x} ${y - s} Q${x} ${y} ${x + s} ${y} Q${x} ${y} ${x} ${y + s} Q${x} ${y} ${x - s} ${y} Q${x} ${y} ${x} ${y - s} Z" fill="#F4FFC9"/>`;

/** `id` debe ser único por instancia: los gradientes se referencian por id en todo el documento. */
export function geckoSvg(mood: GeckoMood, id: string): string {
  const p = POSES[mood];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 320">
  <defs>
    <radialGradient id="${id}skin" cx="36%" cy="26%" r="85%">
      <stop offset="0" stop-color="#DBFA62"/><stop offset="0.45" stop-color="#93D91C"/><stop offset="1" stop-color="#4C9408"/>
    </radialGradient>
    <linearGradient id="${id}limb" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#B9EE3A"/><stop offset="1" stop-color="#63AB0E"/>
    </linearGradient>
    <radialGradient id="${id}belly" cx="45%" cy="25%" r="85%">
      <stop offset="0" stop-color="#FBFFDF"/><stop offset="1" stop-color="#BFE860"/>
    </radialGradient>
    <radialGradient id="${id}eye" cx="40%" cy="30%" r="78%">
      <stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#D3DDC4"/>
    </radialGradient>
    <radialGradient id="${id}iris" cx="50%" cy="35%" r="70%">
      <stop offset="0" stop-color="#5E7A12"/><stop offset="1" stop-color="#1F3306"/>
    </radialGradient>
    <linearGradient id="${id}lid" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#A6E32A"/><stop offset="1" stop-color="#6BB510"/>
    </linearGradient>
    <linearGradient id="${id}outfit" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2E322E"/><stop offset="1" stop-color="#0C0D0C"/>
    </linearGradient>
  </defs>

  <ellipse cx="124" cy="304" rx="74" ry="9" fill="#000000" opacity="0.4"/>

  <g transform="translate(121 250) scale(1.16 1.05) translate(-121 -250)">
  <!-- cola -->
  <path d="M138 232 C172 252 222 244 220 204 C219 182 194 174 184 192 C180 200 186 206 191 202 C196 194 205 197 205 208 C204 232 176 232 150 256 Z" fill="#3F8A0A"/>
  <path d="M140 234 C172 250 218 242 217 205 C216 186 196 179 187 193 C185 198 188 201 190 199 C196 190 208 194 208 208 C207 235 176 235 150 252 Z" fill="url(#${id}limb)"/>
  <path d="M150 240 C176 246 208 238 211 210" stroke="#DBFA62" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.55"/>
  <path d="M176 245 l6 -8 M192 240 l4 -9 M204 228 l1 -9" stroke="#4C9408" stroke-width="3" stroke-linecap="round" opacity="0.6"/>

  <!-- piernas y pies -->
  <path d="M104 244 Q98 270 96 288" stroke="#3F8A0A" stroke-width="23" stroke-linecap="round" fill="none"/>
  <path d="M104 244 Q98 270 96 288" stroke="url(#${id}limb)" stroke-width="20" stroke-linecap="round" fill="none"/>
  <path d="M138 244 Q144 270 146 288" stroke="#3F8A0A" stroke-width="23" stroke-linecap="round" fill="none"/>
  <path d="M138 244 Q144 270 146 288" stroke="url(#${id}limb)" stroke-width="20" stroke-linecap="round" fill="none"/>
  ${[90, 152].map((x) => `
  <ellipse cx="${x}" cy="296" rx="22" ry="10" fill="#3F8A0A"/>
  <ellipse cx="${x}" cy="295" rx="20.5" ry="8.8" fill="url(#${id}limb)"/>
  <circle cx="${x - 15}" cy="298" r="5.5" fill="#B9EE3A"/><circle cx="${x - 3}" cy="301" r="5.5" fill="#B9EE3A"/><circle cx="${x + 10}" cy="300" r="5.5" fill="#B9EE3A"/>`).join('')}

  <!-- torso -->
  <path d="M94 160 C80 184 78 222 88 248 C96 262 146 262 154 248 C164 222 162 184 148 160 Z" fill="#3F8A0A"/>
  <path d="M95 161 C82 184 80 222 89.5 247 C97 260 145 260 152.5 247 C162 222 160 184 147 161 Z" fill="url(#${id}skin)"/>
  <path d="M104 168 Q121 190 138 168 L134 200 Q121 206 108 200 Z" fill="url(#${id}belly)"/>
  <!-- camiseta técnica -->
  <path d="M86 196 C88 184 96 176 102 174 Q121 204 140 174 C146 176 154 184 156 196 C161 220 159 238 152.5 248 C145 261 97 261 89.5 248 C83 238 81 220 86 196 Z" fill="url(#${id}outfit)"/>
  <path d="M102 174 Q121 204 140 174" stroke="${LIME}" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M86 196 C88 184 96 176 102 174" stroke="${LIME}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity="0.9"/>
  <path d="M156 196 C154 184 146 176 140 174" stroke="${LIME}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity="0.9"/>
  <path d="M127.5 218 A9 9 0 1 0 127.5 232 L127.5 225.5 L121 225.5" stroke="${LIME}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M94 204 Q90 226 96 246" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.12"/>

  ${arm(id, [94, 186], p.armL, 1)}
  ${arm(id, [148, 186], p.armR, -1)}
  </g>

  <!-- sombra de la cabeza sobre el cuello -->
  <ellipse cx="121" cy="170" rx="34" ry="8" fill="#1E4A05" opacity="0.45"/>

  <!-- cabeza -->
  <path d="M120 30 C166 30 194 62 194 100 C194 138 164 172 120 172 C76 172 46 138 46 100 C46 62 74 30 120 30 Z" fill="#3F8A0A"/>
  <path d="M120 32 C164 32 192 63 192 100 C192 137 163 170 120 170 C77 170 48 137 48 100 C48 63 76 32 120 32 Z" fill="url(#${id}skin)"/>
  <!-- mandíbula y garganta claras -->
  <path d="M72 132 Q120 164 168 132 C162 156 144 170 120 170 C96 170 78 156 72 132 Z" fill="url(#${id}belly)" opacity="0.92"/>
  <!-- brillo del cráneo -->
  <ellipse cx="102" cy="50" rx="30" ry="9" fill="#FFFFFF" opacity="0.28" transform="rotate(-12 102 50)"/>

  <!-- cinta deportiva -->
  <path d="M50 84 Q120 36 190 84 L191 66 Q120 16 49 66 Z" fill="#050605"/>
  <path d="M51 82 Q120 35 189 82 L190 67 Q120 18 50 67 Z" fill="url(#${id}outfit)"/>
  <path d="M56 70 Q120 24 184 70" stroke="#FFFFFF" stroke-width="2" fill="none" opacity="0.14" stroke-linecap="round"/>
  <path d="M126 44.5 A7.5 7.5 0 1 0 126 56 L126 50.5 L120.5 50.5" stroke="${LIME}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>

  ${eye(id, 84, p.eyeL, p, 1)}
  ${eye(id, 156, p.eyeR, p, -1)}

  <!-- hocico -->
  <ellipse cx="110" cy="126" rx="2.6" ry="2" fill="${INK}" opacity="0.7"/>
  <ellipse cx="130" cy="126" rx="2.6" ry="2" fill="${INK}" opacity="0.7"/>
  ${mouth(p.mouth)}
  <ellipse cx="64" cy="128" rx="9" ry="5" fill="#FF8FA0" opacity="0.28"/>
  <ellipse cx="176" cy="128" rx="9" ry="5" fill="#FF8FA0" opacity="0.28"/>

  ${p.sparkles ? sparkle(26, 66, 10) + sparkle(222, 92, 7) + sparkle(30, 150, 6) : ''}
</svg>`;
}
