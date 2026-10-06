"use client";

import { useState } from "react";
import { SPECIES, woodUrl } from "@/lib/web/wood";

// Selector de especies: al elegir una, la tabla grande cambia de madera.
export default function SpeciesExplorer() {
  const [active, setActive] = useState(SPECIES[0].id);
  const species = SPECIES.find((s) => s.id === active)!;

  return (
    <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] shadow-2xl shadow-corteza/30">
        {SPECIES.map((s) => (
          <div
            key={s.id}
            className="absolute inset-0 bg-cover transition-opacity duration-700"
            style={{ backgroundImage: woodUrl(s.id), opacity: s.id === active ? 1 : 0 }}
          />
        ))}
        <div className="oil-sheen absolute inset-0" />
        <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
          <p className={`engraved font-display text-5xl sm:text-6xl ${active === "mukulungu" ? "engraved-light" : ""}`}>
            {species.name}
          </p>
          <p className={`engraved hidden text-sm italic sm:block ${active === "mukulungu" ? "engraved-light" : ""}`}>
            {species.latin}
          </p>
        </div>
      </div>

      <div>
        <div className="flex flex-wrap gap-3" role="tablist" aria-label="Maderas">
          {SPECIES.map((s) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={s.id === active}
              onClick={() => setActive(s.id)}
              className={`group flex items-center gap-2.5 rounded-full border py-1.5 pl-1.5 pr-4 text-sm transition ${
                s.id === active
                  ? "border-tinta bg-tinta text-crema"
                  : "border-tinta/15 hover:border-tinta/50"
              }`}
            >
              <span
                className="h-7 w-7 rounded-full bg-cover ring-1 ring-black/10"
                style={{ backgroundImage: woodUrl(s.id, 120) }}
              />
              {s.name}
            </button>
          ))}
        </div>
        <div key={species.id} className="fade-swap mt-10">
          <p className="eyebrow">{species.origin}</p>
          <p className="mt-4 font-display text-2xl leading-snug sm:text-3xl">{species.story}</p>
          <p className="mt-6 border-t border-tinta/10 pt-4 text-sm text-tinta/60">
            Se convierte en: <span className="text-tinta">{species.use}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
