/** Tipos y validación compartidos entre el formulario y la Server Action. */
import { COUNTRY_CODES, SECTOR_VALUES, SEEKING_VALUES, SKILL_VALUES } from "@/content/options";

export type Field = "email" | "country" | "city" | "skill" | "seeking" | "privacy";

export type JoinState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      fieldErrors?: Partial<Record<Field, true>>;
      values?: Partial<Record<"email" | "country" | "city" | "skill" | "seeking", string>>;
    }
  | {
      status: "success";
      already: boolean;
      code: string;
      place: number | null;
    };

export type JoinInput = {
  email: string;
  country: string;
  city: string;
  skill: string;
  seeking: string;
  interests: string[];
  privacy: boolean;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateJoin(input: JoinInput): Partial<Record<Field, true>> {
  const errors: Partial<Record<Field, true>> = {};
  if (!EMAIL_RE.test(input.email) || input.email.length > 254) errors.email = true;
  if (!COUNTRY_CODES.includes(input.country)) errors.country = true;
  const city = input.city.trim();
  if (city.length < 2 || city.length > 80) errors.city = true;
  if (!SKILL_VALUES.includes(input.skill)) errors.skill = true;
  if (!SEEKING_VALUES.includes(input.seeking)) errors.seeking = true;
  if (!input.privacy) errors.privacy = true;
  // Los intereses son opcionales; solo se descartan valores desconocidos.
  input.interests = input.interests.filter((i) => SECTOR_VALUES.includes(i));
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
