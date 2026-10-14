/** Tipos y validación compartidos entre el formulario y la Server Action. */
import { SEEKING_VALUES, SKILL_VALUES } from "@/content/options";

export type Field = "email" | "city" | "skill" | "seeking" | "privacy";

export type JoinState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      fieldErrors?: Partial<Record<Field, true>>;
      values?: Partial<Record<"email" | "city" | "skill" | "seeking", string>>;
    }
  | {
      status: "success";
      already: boolean;
      code: string;
      place: number | null;
    };

export type JoinInput = {
  email: string;
  city: string;
  skill: string;
  seeking: string;
  privacy: boolean;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateJoin(input: JoinInput): Partial<Record<Field, true>> {
  const errors: Partial<Record<Field, true>> = {};
  if (!EMAIL_RE.test(input.email) || input.email.length > 254) errors.email = true;
  const city = input.city.trim();
  if (city.length < 2 || city.length > 80) errors.city = true;
  if (!SKILL_VALUES.includes(input.skill)) errors.skill = true;
  if (!SEEKING_VALUES.includes(input.seeking)) errors.seeking = true;
  if (!input.privacy) errors.privacy = true;
  return errors;
}

/** "  valencia " -> "Valencia", "a coruña" -> "A Coruña". */
export function normalizeCity(city: string): string {
  return city
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("es-ES")
    .replace(/(^|[\s-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toLocaleUpperCase("es-ES"));
}

export const REFERRAL_RE = /^[a-z0-9]{6,12}$/;
