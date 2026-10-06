// Anillos de crecimiento dibujados en SVG: el motivo visual de la marca.
// Las ondulaciones son deterministas (sin aleatoriedad) para que el HTML
// del servidor y el del cliente coincidan.

export function ringPath(radius: number, seed: number, cx: number, cy: number) {
  const steps = 120;
  const points: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const wobble =
      Math.sin(a * 3 + seed) * radius * 0.025 +
      Math.sin(a * 7 + seed * 1.7) * radius * 0.012 +
      Math.cos(a * 2 + seed * 0.6) * radius * 0.03;
    const r = radius + wobble;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r * 0.94;
    points.push(`${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return points.join(" ") + " Z";
}

// Radio del anillo i de n: más juntos hacia fuera, como en un tronco real.
export function ringRadius(i: number, n: number, max: number) {
  return max * Math.pow((i + 1) / n, 0.8);
}

export default function TreeRings({
  rings = 14,
  className,
  draw = false,
}: {
  rings?: number;
  className?: string;
  /** Anima el trazado de los anillos desde el centro hacia fuera. */
  draw?: boolean;
}) {
  const size = 400;
  const c = size / 2;
  const max = c - 8;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className={className} aria-hidden="true">
      {Array.from({ length: rings }, (_, i) => {
        const t = (i + 1) / rings;
        return (
          <path
            key={i}
            d={ringPath(ringRadius(i, rings, max), i * 1.3, c, c)}
            fill="none"
            stroke="currentColor"
            strokeWidth={i % 4 === 3 ? 1.6 : 0.8}
            opacity={0.35 + t * 0.5}
            pathLength={1}
            className={draw ? "ring-draw" : undefined}
            style={draw ? { animationDelay: `${0.2 + i * 0.09}s` } : undefined}
          />
        );
      })}
      <circle cx={c} cy={c} r={3} fill="currentColor" />
    </svg>
  );
}
