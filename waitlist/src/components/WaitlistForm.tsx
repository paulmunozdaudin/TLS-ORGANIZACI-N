"use client";

import Link from "next/link";
import {
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { joinWaitlist } from "@/app/actions";
import { form } from "@/content/landing";
import {
  CITIES,
  COUNTRIES,
  COUNTRY_CODES,
  SECTORS,
  SEEKING,
  SKILLS,
  type Sector,
  type Seeking,
  type Skill,
} from "@/content/options";
import { validateJoin, type Field, type JoinState } from "@/lib/waitlist";
import ChoiceGroup from "./ChoiceGroup";
import SuccessPanel from "./SuccessPanel";
import { useWaitlist } from "./WaitlistProvider";

type Props = {
  /** Si es true, lo que se marca alimenta el móvil de la portada. */
  drivesPreview?: boolean;
  /** Texto junto al botón mientras no hay errores. */
  note?: string;
  className?: string;
};

const FIELD_ORDER: Field[] = ["email", "country", "city", "skill", "seeking", "privacy"];

export default function WaitlistForm({ drivesPreview = false, note, className = "" }: Props) {
  const uid = useId();
  const { draft, setDraft, result, setResult, referral } = useWaitlist();
  const [state, formAction, pending] = useActionState<JoinState, FormData>(
    joinWaitlist,
    { status: "idle" },
  );

  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [interests, setInterests] = useState<Sector[]>([]);
  const [skill, setSkill] = useState<Skill | "">("");
  const [seeking, setSeeking] = useState<Seeking | "">("");
  const [privacy, setPrivacy] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  const [errors, setErrors] = useState<Partial<Record<Field, true>>>({});
  const [message, setMessage] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- solo se conocen en el cliente */
    setStartedAt(Date.now());
    // País por defecto según el idioma del navegador (es-MX -> MX).
    const region = navigator.language.split("-")[1]?.toUpperCase();
    if (region && COUNTRY_CODES.includes(region)) setCountry((c) => c || region);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // El formulario de la portada comparte lo que se marca con el móvil.
  useEffect(() => {
    if (drivesPreview) setDraft({ country, city, skill, seeking, interests });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drivesPreview, country, city, skill, seeking, interests]);

  // El formulario del cierre parte de lo ya marcado arriba.
  useEffect(() => {
    if (drivesPreview) return;
    /* eslint-disable react-hooks/set-state-in-effect -- copia puntual del borrador */
    if (draft.country) setCountry(draft.country);
    if (draft.city && !city) setCity(draft.city);
    if (draft.interests.length && !interests.length) setInterests(draft.interests);
    if (draft.skill && !skill) setSkill(draft.skill);
    if (draft.seeking && !seeking) setSeeking(draft.seeking);
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drivesPreview, draft]);

  // Respuesta del servidor.
  useEffect(() => {
    if (state.status === "success") setResult(state);
    if (state.status === "error") {
      /* eslint-disable react-hooks/set-state-in-effect -- refleja la respuesta del servidor */
      setErrors(state.fieldErrors ?? {});
      setMessage(state.message);
      /* eslint-enable react-hooks/set-state-in-effect */
      focusFirst(state.fieldErrors ?? {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function focusFirst(errs: Partial<Record<Field, true>>) {
    const first = FIELD_ORDER.find((f) => errs[f]);
    if (!first) return;
    const el = formRef.current?.querySelector<HTMLElement>(`[data-field="${first}"]`);
    el?.focus();
  }

  function clear(field: Field) {
    if (!errors[field]) return;
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    const errs = validateJoin({ email: email.trim(), country, city, skill, seeking, interests, privacy });
    if (Object.keys(errs).length > 0) {
      e.preventDefault();
      setErrors(errs);
      setMessage(form.errors.summary);
      focusFirst(errs);
      return;
    }
    setMessage("");
  }

  if (result) return <SuccessPanel result={result} className={className} />;

  const id = (name: string) => `${uid}-${name}`;
  const errId = (f: Field) => (errors[f] ? id(`${f}-error`) : undefined);

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={onSubmit}
      noValidate
      className={`@container grid gap-4 ${className}`}
      aria-describedby={message ? id("status") : undefined}
    >
      <div className="grid gap-4 @md:grid-cols-2 @xl:grid-cols-[1.4fr_1fr_1fr]">
        <TextField
          id={id("email")}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          label={form.email.label}
          placeholder={form.email.placeholder}
          value={email}
          onChange={(v) => { setEmail(v); clear("email"); }}
          error={errors.email ? form.errors.email : undefined}
          errorId={errId("email")}
          field="email"
        />
        <div className="grid content-start gap-2">
          <label htmlFor={id("country")} className="text-step-small font-medium text-ink">
            {form.country.label}
          </label>
          <select
            id={id("country")}
            name="country"
            data-field="country"
            autoComplete="country"
            value={country}
            onChange={(e) => { setCountry(e.target.value); clear("country"); }}
            aria-invalid={errors.country ? true : undefined}
            aria-describedby={errId("country")}
            className={`h-13 w-full cursor-pointer border bg-surface px-3 text-ink outline-none transition-colors duration-200 focus:border-accent focus:bg-bg ${
              errors.country ? "border-danger" : "border-transparent hover:border-ink/25"
            } ${country ? "" : "text-muted"}`}
          >
            <option value="">{form.country.placeholder}</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
          {errors.country && <ErrorText id={errId("country")!}>{form.errors.country}</ErrorText>}
        </div>
        <TextField
          id={id("city")}
          name="city"
          autoComplete="address-level2"
          label={form.city.label}
          placeholder={form.city.placeholder}
          value={city}
          list={id("cities")}
          onChange={(v) => { setCity(v); clear("city"); }}
          error={errors.city ? form.errors.city : undefined}
          errorId={errId("city")}
          field="city"
        />
        <datalist id={id("cities")}>
          {CITIES.map((c) => <option key={c} value={c} />)}
        </datalist>
      </div>

      <ChoiceGroup
        name="skill"
        legend={form.skill}
        options={SKILLS}
        value={skill}
        onChange={(v) => { setSkill(v as Skill); clear("skill"); }}
        error={errors.skill ? form.errors.skill : undefined}
        errorId={errId("skill")}
        field="skill"
      />

      <ChoiceGroup
        name="seeking"
        legend={form.seeking}
        options={SEEKING}
        value={seeking}
        onChange={(v) => { setSeeking(v as Seeking); clear("seeking"); }}
        error={errors.seeking ? form.errors.seeking : undefined}
        errorId={errId("seeking")}
        field="seeking"
      />

      <ChoiceGroup
        multiple
        name="interests"
        legend={form.interests}
        options={SECTORS}
        value={interests}
        onChange={(v) => setInterests(v as Sector[])}
      />

      {/* Honeypot: invisible para personas, tentador para bots. */}
      <div aria-hidden="true" className="sr-only">
        <label htmlFor={id("company")}>Empresa</label>
        <input id={id("company")} name="company" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>
      <input type="hidden" name="t" value={startedAt || ""} />
      <input type="hidden" name="ref" value={referral} />

      <div className="grid gap-2">
        <label className="flex cursor-pointer items-start gap-3 text-step-small text-ink">
          <input
            type="checkbox"
            name="privacy"
            data-field="privacy"
            checked={privacy}
            onChange={(e) => { setPrivacy(e.target.checked); clear("privacy"); }}
            aria-invalid={errors.privacy ? true : undefined}
            aria-describedby={errId("privacy")}
            className="mt-0.5 size-5 shrink-0 cursor-pointer accent-accent"
          />
          <span>
            {form.privacy}{" "}
            <Link href="/privacidad" className="underline underline-offset-[0.2em]">
              {form.privacyLink}
            </Link>
            .
          </span>
        </label>
        {errors.privacy && <ErrorText id={errId("privacy")!}>{form.errors.privacy}</ErrorText>}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <button type="submit" className="button w-full sm:w-auto" disabled={pending} aria-disabled={pending}>
          {pending && <Spinner />}
          {pending ? form.loading : form.submit}
        </button>
        <p
          id={id("status")}
          role="status"
          aria-live="polite"
          className={`text-step-small ${message ? "text-danger" : note ? "text-muted" : "sr-only"}`}
        >
          {message || note}
        </p>
      </div>
    </form>
  );
}

type TextFieldProps = {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  errorId?: string;
  field: Field;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: "email" | "text";
  list?: string;
};

function TextField({ id, label, onChange, error, errorId, field, ...rest }: TextFieldProps) {
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-step-small font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        data-field={field}
        {...rest}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={`h-13 w-full border bg-surface px-4 text-ink outline-none transition-colors duration-200 placeholder:text-muted focus:border-accent focus:bg-bg ${
          error ? "border-danger" : "border-transparent hover:border-ink/25"
        }`}
      />
      {error && errorId && <ErrorText id={errorId}>{error}</ErrorText>}
    </div>
  );
}

export function ErrorText({ id, children }: { id: string; children: string }) {
  return (
    <p id={id} className="text-step-small text-danger">
      {children}
    </p>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="size-4 animate-spin rounded-full border-2 border-on-accent/30 border-t-on-accent motion-reduce:animate-none"
    />
  );
}
