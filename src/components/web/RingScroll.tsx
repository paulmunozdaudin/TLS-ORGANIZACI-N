"use client";

import { useEffect, useRef, useState } from "react";
import { ringPath, ringRadius } from "./TreeRings";

const RINGS = 64;
const BORN = 1890;
const NOW = 2027;

const MILESTONES = [
  { at: 0, year: BORN, text: "Un tali brota en un bosque de África occidental." },
  { at: 0.3, year: 1925, text: "Crece despacio. Su madera se vuelve de las más duras del mundo." },
  { at: 0.6, year: 1978, text: "Se convierte en estructura: traviesas, un puente, un muelle." },
  { at: 0.85, year: 2025, text: "La obra se desmonta. Su destino era el vertedero o la hoguera." },
  { at: 0.97, year: NOW, text: "Llega al taller. Más de un siglo después, se convierte en tu pieza." },
];

// Sección fija en pantalla: al hacer scroll, el tronco crece anillo a anillo.
export default function RingScroll() {
  const ref = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      setProgress(Math.min(1, Math.max(0, -r.top / total)));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const visible = progress * RINGS;
  const milestone = [...MILESTONES].reverse().find((m) => progress >= m.at) ?? MILESTONES[0];
  const year = Math.round(BORN + progress * (NOW - BORN));
  const size = 400;
  const c = size / 2;

  return (
    <section ref={ref} className="relative h-[320vh] bg-tinta text-crema">
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <div className="web-container grid items-center gap-8 md:grid-cols-[1fr_1.1fr]">
          <div className="order-2 md:order-1">
            <p className="eyebrow text-miel">Cada anillo, un año</p>
            <p className="mt-6 font-display text-7xl tabular-nums tracking-tight sm:text-8xl lg:text-9xl">
              {year}
            </p>
            <p key={milestone.year} className="fade-swap mt-6 max-w-sm text-lg leading-relaxed text-crema/75">
              {milestone.text}
            </p>
            <p className="mt-3 text-xs text-crema/35">Historia ilustrativa</p>
            <div className="mt-8 h-px w-full max-w-sm bg-crema/15">
              <div className="h-px bg-miel" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
          <div className="order-1 mx-auto w-[min(78vw,30rem)] md:order-2">
            <svg viewBox={`0 0 ${size} ${size}`} className="w-full" aria-hidden="true">
              <defs>
                <radialGradient id="heartwood" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#c58b52" />
                  <stop offset="55%" stopColor="#8a5a33" />
                  <stop offset="100%" stopColor="#4a2f1b" />
                </radialGradient>
              </defs>
              <path
                d={ringPath(ringRadius(Math.max(0, visible - 1), RINGS, c - 8) + 2, 0.4, c, c)}
                fill="url(#heartwood)"
                opacity={0.9}
              />
              {Array.from({ length: RINGS }, (_, i) => {
                const shown = Math.min(1, Math.max(0, visible - i));
                if (shown === 0) return null;
                return (
                  <path
                    key={i}
                    d={ringPath(ringRadius(i, RINGS, c - 8), i * 1.3, c, c)}
                    fill="none"
                    stroke="#2a1a0f"
                    strokeWidth={i % 5 === 4 ? 1.4 : 0.6}
                    opacity={shown * 0.75}
                  />
                );
              })}
              <circle cx={c} cy={c} r={2.5} fill="#2a1a0f" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
