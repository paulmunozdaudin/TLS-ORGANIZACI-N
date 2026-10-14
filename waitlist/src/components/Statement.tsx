import { statement } from "@/content/landing";

/** Frase de presentación con miniaturas de perfiles dentro de la línea. */
export default function Statement() {
  return (
    <section aria-label="Qué es" className="px-5 py-24 sm:px-10 lg:py-[22vh]">
      <p
        data-reveal
        className="mx-auto max-w-[24ch] text-[1.5rem] leading-[1.25] font-medium tracking-[-0.02em] text-balance sm:text-[2rem] lg:max-w-[30ch] lg:text-[2.25rem] lg:leading-[1.2]"
      >
        {statement.parts.map((part, i) =>
          "text" in part ? (
            <span key={i}>{part.text} </span>
          ) : (
            <span
              key={i}
              role="img"
              aria-label={part.label}
              data-ui
              className="mr-[0.25em] inline-flex size-[0.9em] items-center justify-center rounded-full bg-accent align-[-0.1em]"
            >
              <span aria-hidden="true" className="text-[0.48em] leading-none font-semibold text-on-accent">
                {part.thumb}
              </span>
            </span>
          ),
        )}
      </p>
    </section>
  );
}
