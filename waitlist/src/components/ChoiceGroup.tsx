"use client";

import { useId } from "react";
import type { Field } from "@/lib/waitlist";

type Base = {
  name: string;
  legend: string;
  options: readonly { value: string; label: string }[];
  error?: string;
  errorId?: string;
  field?: Field;
};

type Single = Base & { multiple?: false; value: string; onChange: (value: string) => void };
type Multi = Base & { multiple: true; value: string[]; onChange: (value: string[]) => void };

/** Grupo de opciones con radios (una respuesta) o casillas (varias), accesibles. */
export default function ChoiceGroup(props: Single | Multi) {
  const { name, legend, options, error, errorId, field } = props;
  const uid = useId();

  const isChecked = (v: string) => (props.multiple ? props.value.includes(v) : props.value === v);
  const toggle = (v: string) => {
    if (props.multiple) {
      props.onChange(props.value.includes(v) ? props.value.filter((x) => x !== v) : [...props.value, v]);
    } else {
      props.onChange(v);
    }
  };

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
                type={props.multiple ? "checkbox" : "radio"}
                name={name}
                value={o.value}
                checked={isChecked(o.value)}
                onChange={() => toggle(o.value)}
                data-field={i === 0 ? field : undefined}
                className="peer sr-only"
              />
              <label
                htmlFor={id}
                className={`flex h-10 cursor-pointer items-center px-3 text-step-small transition-[background-color,color] duration-200 peer-checked:bg-ink peer-checked:text-bg peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent ${
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
