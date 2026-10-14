"use client";

import { useId } from "react";
import type { Field } from "@/lib/waitlist";

type Props = {
  name: string;
  legend: string;
  options: readonly { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  errorId?: string;
  field: Field;
};

/** Grupo de opciones de una sola respuesta, con radios reales accesibles. */
export default function ChoiceGroup({ name, legend, options, value, onChange, error, errorId, field }: Props) {
  const uid = useId();
  return (
    <fieldset aria-describedby={errorId} aria-invalid={error ? true : undefined}>
      <legend className="mb-2 text-step-small font-medium text-ink">{legend}</legend>
      <div className="flex flex-wrap gap-1">
        {options.map((o, i) => {
          const id = `${uid}-${o.value}`;
          return (
            <div key={o.value}>
              <input
                id={id}
                type="radio"
                name={name}
                value={o.value}
                checked={value === o.value}
                onChange={() => onChange(o.value)}
                data-field={i === 0 ? field : undefined}
                className="peer sr-only"
              />
              <label
                htmlFor={id}
                className={`flex h-11 cursor-pointer items-center px-3.5 text-step-small transition-[background-color,color] duration-200 peer-checked:bg-ink peer-checked:text-bg peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent ${
                  error ? "bg-surface ring-1 ring-danger ring-inset" : "bg-surface hover:bg-surface-2"
                }`}
              >
                {o.label}
              </label>
            </div>
          );
        })}
      </div>
      {error && errorId && (
        <p id={errorId} className="mt-2 text-step-small text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}
