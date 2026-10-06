// Texturas de madera generadas con filtros SVG (sin fotos). Ruido fractal
// estirado en horizontal da la fibra; una tabla de color que oscila entre
// tonos oscuros y claros crea las "aguas" características de la veta.

export interface Species {
  id: string;
  name: string;
  latin: string;
  origin: string;
  story: string;
  use: string;
  tones: [string, string, string]; // oscuro, medio, claro
  freq: string;
  octaves: number;
  seed: number;
  bands: number;
}

export const SPECIES: Species[] = [
  {
    id: "tali",
    name: "Tali",
    latin: "Erythrophleum ivorense",
    origin: "Madera tropical recuperada · África occidental",
    story:
      "Dura, pesada y casi imputrescible: se ha usado en traviesas, puentes y obras marinas. Tonos miel y cobre que se oscurecen con la luz.",
    use: "Colección Origen · piezas de autor y accesorios tecnológicos",
    tones: ["#4e2f16", "#82552a", "#b07b42"],
    freq: "0.0025 0.035",
    octaves: 4,
    seed: 7,
    bands: 14,
  },
  {
    id: "bambu",
    name: "Bambú",
    latin: "Phyllostachys edulis",
    origin: "Cultivo sostenible certificado",
    story:
      "Crece hasta un metro al día y rebrota sin replantarse. Fibra recta, ligera y resistente para piezas finas.",
    use: "Joyería ligera · pendientes, collares y pulseras",
    tones: ["#a8834c", "#c9a66b", "#e6cc98"],
    freq: "0.0015 0.09",
    octaves: 2,
    seed: 11,
    bands: 8,
  },
  {
    id: "mukulungu",
    name: "Mukulungu",
    latin: "Autranella congolensis",
    origin: "Madera tropical recuperada · África central",
    story:
      "Una de las maderas más duras y estables que existen, usada en muelles y puentes. Veta fina y entrelazada en tonos chocolate y violeta.",
    use: "Colección Origen · objetos de escritorio e iluminación",
    tones: ["#2a1614", "#4a2723", "#704038"],
    freq: "0.004 0.03",
    octaves: 5,
    seed: 21,
    bands: 16,
  },
];

export const SPECIES_BY_ID = Object.fromEntries(SPECIES.map((s) => [s.id, s])) as Record<
  string,
  Species
>;

function channels(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => (v / 255).toFixed(3));
}

export function woodSvg(s: Species, size = 800) {
  const [dark, mid, light] = s.tones.map(channels);
  // Secuencia oscilante oscuro → medio → claro → medio … que dibuja las aguas.
  const stops: string[][] = [];
  for (let i = 0; i < s.bands; i++) {
    stops.push(i % 2 === 0 ? dark : light, mid);
  }
  stops.push(dark);
  const table = (c: number) => stops.map((s) => s[c]).join(" ");

  return `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'><filter id='w' x='0' y='0' width='100%' height='100%' color-interpolation-filters='sRGB'><feTurbulence type='fractalNoise' baseFrequency='${s.freq}' numOctaves='${s.octaves}' seed='${s.seed}' stitchTiles='stitch'/><feColorMatrix type='matrix' values='1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 0 0 0 0 1'/><feComponentTransfer><feFuncR type='table' tableValues='${table(0)}'/><feFuncG type='table' tableValues='${table(1)}'/><feFuncB type='table' tableValues='${table(2)}'/></feComponentTransfer></filter><rect width='100%' height='100%' filter='url(#w)'/></svg>`;
}

export function woodUrl(id: string, size?: number) {
  return `url("data:image/svg+xml,${encodeURIComponent(woodSvg(SPECIES_BY_ID[id], size))}")`;
}
