"use client";

import { useId, useState, type CSSProperties, type KeyboardEvent } from "react";
import { communities } from "@/content/landing";

const normalize = (s: string) =>
  s.toLocaleLowerCase("es-ES").normalize("NFD").replace(/\p{Diacritic}/gu, "");

/** Comunidades: el buscador de sectores de la app, a tamaño de sección. */
export default function Communities() {
  const uid = useId();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(communities.items[1].name);

  const q = normalize(query.trim());
  const visible = communities.items.filter((c) => normalize(c.name).includes(q));
  const current = visible.find((c) => c.name === selected) ?? visible[0];

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    if (!visible.length) return;
    const i = Math.max(0, visible.indexOf(current!));
    const next = e.key === "ArrowDown" ? Math.min(visible.length - 1, i + 1) : Math.max(0, i - 1);
    setSelected(visible[next].name);
  }

  return (
    <section id={communities.id} aria-labelledby="communities-title" className="bg-surface px-5 py-28 sm:px-10 lg:px-14 lg:py-44">
      <div className="grid gap-6 lg:grid-cols-12 lg:gap-10">
        <h2 id="communities-title" data-reveal className="display text-step-head lg:col-span-6">
          {communities.title}
        </h2>
        <p data-reveal style={{ "--i": 1 } as CSSProperties} className="max-w-[46ch] text-step-lead leading-[1.4] lg:col-span-5 lg:col-start-8 lg:self-end">
          {communities.text}
        </p>
      </div>

      <div data-ui className="mt-14 lg:mt-20">
        <label htmlFor={`${uid}-q`} className="sr-only">
          {communities.searchLabel}
        </label>
        <input
          id={`${uid}-q`}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKey}
          placeholder={communities.searchLabel}
          autoComplete="off"
          aria-controls={`${uid}-list`}
          data-reveal
          className="h-14 w-full bg-bg px-5 text-[1.25rem] text-ink outline-none placeholder:text-muted focus:outline-2 focus:outline-offset-0 focus:outline-accent lg:h-[1.9em] lg:w-5/6 lg:text-[clamp(1.75rem,3vw,2.75rem)] lg:tracking-[-0.02em]"
        />

        <ul id={`${uid}-list`} data-reveal className="mt-4 grid gap-1 lg:mt-6">
          {visible.map((c) => {
            const isSel = current?.name === c.name;
            return (
              <li key={c.name}>
                <button
                  type="button"
                  aria-pressed={isSel}
                  onClick={() => setSelected(c.name)}
                  className={`block w-full px-4 py-2 text-left transition-colors duration-200 lg:px-5 ${
                    isSel ? "bg-accent text-on-accent" : "text-ink hover:bg-surface-2"
                  }`}
                >
                  <span className="display block text-[8.5vw] leading-[1.1] sm:text-[clamp(2.25rem,4.6vw,4.5rem)]">
                    {c.name}
                  </span>
                  {isSel && (
                    <span className="swap mt-1 block max-w-[52ch] pb-2 text-step-body">{c.text}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        {visible.length === 0 && (
          <p role="status" className="mt-6 max-w-[52ch] text-step-body">
            {communities.empty}
          </p>
        )}
      </div>
    </section>
  );
}
