import type { CSSProperties } from "react";
import { closing } from "@/content/landing";
import WaitlistForm from "./WaitlistForm";

/** Cierre: campo verde oliva con el formulario abierto como una pantalla de la app. */
export default function ClosingCta() {
  return (
    <section
      id="apuntarme"
      aria-labelledby="closing-title"
      className="grid min-h-[90svh] gap-12 bg-accent px-4 py-20 text-on-accent sm:px-10 lg:grid-cols-12 lg:gap-10 lg:px-14 lg:py-24"
    >
      <div className="flex flex-col lg:col-span-6 lg:justify-end">
        <h2 id="closing-title" data-reveal className="display text-step-display leading-[0.95]">
          {closing.title.map((l) => (
            <span key={l} className="block">{l}</span>
          ))}
        </h2>
        <p data-reveal style={{ "--i": 1 } as CSSProperties} className="mt-6 max-w-[40ch] text-step-body">
          {closing.text}
        </p>
      </div>

      <div className="flex items-center lg:col-span-5 lg:col-start-8">
        <div
          data-ui
          data-reveal
          style={{ "--i": 2 } as CSSProperties}
          className="w-full rounded-xl bg-bg p-5 text-ink shadow-[0_24px_60px_-20px_rgba(20,22,10,0.45)] sm:p-8"
        >
          <p className="mb-6 text-[1.5rem] font-semibold tracking-[-0.02em]">{closing.dialogTitle}</p>
          <WaitlistForm />
        </div>
      </div>
    </section>
  );
}
