"use client";

import { useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { ideas } from "@/content/landing";

/** Ideas: pestañas por sector y, a la derecha, las ideas publicadas. */
export default function IdeasTabs() {
  const [active, setActive] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tab = ideas.tabs[active];

  function onKey(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    const last = ideas.tabs.length - 1;
    const next =
      e.key === "ArrowDown" || e.key === "ArrowRight" ? (i === last ? 0 : i + 1)
      : e.key === "ArrowUp" || e.key === "ArrowLeft" ? (i === 0 ? last : i - 1)
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : null;
    if (next === null) return;
    e.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <section id={ideas.id} aria-labelledby="ideas-title" className="px-5 py-28 sm:px-10 lg:px-14 lg:py-44">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 id="ideas-title" data-reveal className="display text-step-head">
            <span className="block text-muted">{ideas.titleSoft}</span>
            <span className="block">{ideas.titleStrong}</span>
          </h2>
          <p data-reveal style={{ "--i": 1 } as CSSProperties} className="mt-6 max-w-[52ch] text-step-body">
            {ideas.text}
          </p>
        </div>
        <a href="#lista" data-reveal style={{ "--i": 2 } as CSSProperties} className="button w-full shrink-0 sm:w-auto">
          {ideas.action}
        </a>
      </div>

      <div data-ui className="mt-14 grid gap-2 lg:mt-16 lg:grid-cols-[180px_1fr] lg:gap-10">
        <div
          role="tablist"
          aria-label="Sectores"
          aria-orientation="vertical"
          data-reveal
          className="sticky top-0 z-10 -mx-5 flex gap-1.5 overflow-x-auto bg-bg px-5 py-2 lg:static lg:mx-0 lg:flex-col lg:overflow-visible lg:p-0"
        >
          {ideas.tabs.map((t, i) => {
            const selected = i === active;
            return (
              <button
                key={t.sector}
                ref={(el) => { tabRefs.current[i] = el; }}
                role="tab"
                id={`ideas-tab-${i}`}
                aria-selected={selected}
                aria-controls="ideas-panel"
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(i)}
                onKeyDown={(e) => onKey(e, i)}
                className={`flex h-14 shrink-0 items-center rounded-md px-4 text-left text-step-body transition-colors duration-200 lg:h-16 ${
                  selected ? "bg-ink text-bg" : "bg-surface text-ink hover:bg-surface-2"
                }`}
              >
                <span className="font-medium">{t.sector}</span>
              </button>
            );
          })}
        </div>

        <ul
          key={tab.sector}
          id="ideas-panel"
          role="tabpanel"
          aria-labelledby={`ideas-tab-${active}`}
          className="grid gap-1"
        >
          {tab.items.map((item, i) => (
            <li
              key={item.title}
              style={{ "--i": i } as CSSProperties}
              className={`swap grid gap-3 rounded-md p-5 lg:grid-cols-[minmax(0,1fr)_200px_180px] lg:items-center lg:gap-8 lg:px-6 lg:py-5 ${
                i % 2 === 0 ? "bg-surface" : "bg-surface-2"
              }`}
            >
              <div>
                <p className="text-[1.125rem] leading-snug font-medium">{item.title}</p>
                <p className="mt-1 text-step-small text-muted">{item.note}</p>
              </div>
              <p className="text-step-small">
                <span className="text-muted">{ideas.seekingLabel}: </span>
                <span className="font-medium text-accent">{item.seeking}</span>
              </p>
              <p className="flex items-center gap-3 text-step-small lg:justify-end">
                <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent">
                  {item.author.slice(0, 1)}
                </span>
                <span>
                  {item.author}, {item.city}
                </span>
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
