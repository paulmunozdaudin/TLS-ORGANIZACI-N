"use client";

import { useState, type CSSProperties } from "react";
import { people } from "@/content/landing";

/** Personas: la lista de perfiles de la app, a tamaño de panel de salidas. */
export default function PeopleBoard() {
  const [open, setOpen] = useState(people.openIndex);

  return (
    <section
      id={people.id}
      aria-labelledby="people-title"
      className="overflow-hidden bg-night pt-24 text-bg lg:pt-40"
    >
      <div className="grid gap-6 px-5 sm:px-10 lg:grid-cols-12 lg:gap-10 lg:px-14">
        <h2 id="people-title" data-reveal className="display text-step-head lg:col-span-6">
          {people.title}
        </h2>
        <p
          data-reveal
          style={{ "--i": 1 } as CSSProperties}
          className="max-w-[46ch] text-step-lead leading-[1.4] text-bg lg:col-span-5 lg:col-start-8 lg:self-end"
        >
          {people.text}
        </p>
      </div>

      <div className="mt-16 px-2 lg:mt-24 lg:px-3">
        <div
          aria-hidden="true"
          className="hidden grid-cols-12 gap-4 px-5 pb-3 text-step-small text-night-muted lg:grid"
        >
          <span className="col-span-5">Perfil</span>
          <span className="col-span-2">{people.columns.city}</span>
          <span className="col-span-2">{people.columns.skill}</span>
          <span className="col-span-3 text-right">{people.columns.seeking}</span>
        </div>

        <ul data-ui className="-mb-8 grid gap-1 lg:-mb-9">
          {people.rows.map((p, i) => {
            const isOpen = open === i;
            const panelId = `person-${i}`;
            return (
              <li key={p.name} data-reveal style={{ "--i": i } as CSSProperties}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  className={`grid w-full grid-cols-[1fr_auto] items-center gap-4 px-4 text-left transition-[background-color,color] duration-300 lg:grid-cols-12 lg:px-5 ${
                    isOpen
                      ? "bg-accent py-6 text-on-accent lg:py-8"
                      : "h-16 bg-night-row text-bg hover:bg-[#35322c] lg:h-[72px]"
                  }`}
                >
                  <span className="text-[1.25rem] font-medium tracking-[-0.01em] lg:col-span-5 lg:text-step-lead">
                    {p.name}, <span className="tabular">{p.age}</span>
                  </span>
                  <span className="hidden text-step-lead lg:col-span-2 lg:block">{p.city}</span>
                  <span className="hidden text-step-lead lg:col-span-2 lg:block">{p.skill}</span>
                  <span className="flex justify-end lg:col-span-3">
                    <span
                      className={`px-3 py-1.5 text-step-small font-medium lg:text-step-body ${
                        isOpen ? "bg-bg text-accent" : "bg-[#3d3a33] text-bg"
                      }`}
                    >
                      {p.seeking}
                    </span>
                  </span>

                  <span
                    id={panelId}
                    hidden={!isOpen}
                    className="col-span-2 grid gap-1 text-step-body leading-snug lg:col-span-7 lg:col-start-1 lg:mt-6 lg:max-w-[52ch]"
                  >
                    <span className="lg:hidden">
                      {p.city} · Sabe de {p.skill.toLowerCase()}
                    </span>
                    <span>{p.detail}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
