"use client";

import { complementOf, matchProfiles } from "@/content/landing";
import { SKILLS, type Seeking, type Skill } from "@/content/options";
import AppTabBar from "./AppTabBar";
import Phone from "./Phone";
import { normalizeCity } from "@/lib/waitlist";
import { useWaitlist } from "./WaitlistProvider";

const skillName = (s: Skill | "") =>
  s === "" || s === "otro" ? "lo tuyo" : SKILLS.find((o) => o.value === s)!.label.toLowerCase();

function reasonFor(skill: Skill | "", seeking: Seeking | "", city: string): string {
  if (!skill) return "Marca qué sabes hacer y te enseño quién encaja.";
  const what = skillName(skill);
  switch (seeking) {
    case "cofundador":
      return `Busca cofundador que sepa de ${what}.`;
    case "colaboradores":
      return `Necesita a alguien de ${what} para su proyecto.`;
    case "aprender":
      return `Lleva años en ${what} y le gusta enseñar.`;
    case "networking":
      return `Quiere conocer a gente de ${what}${city ? ` en ${city}` : ""}.`;
    case "idea":
      return "Tiene una idea parecida a la tuya y quiere contrastarla.";
    default:
      return `Busca a alguien que sepa de ${what}, como tú.`;
  }
}

/** El móvil de la portada: muestra un match que cambia con lo que se marca. */
export default function PhoneMatch() {
  const { draft } = useWaitlist();
  const { skill, seeking } = draft;
  const city = normalizeCity(draft.city);

  // "Aprender" enseña a alguien de tu mismo campo; el resto, a quien te complementa.
  const key =
    seeking === "aprender" && skill && skill !== "otro" ? skill : complementOf[skill || "desarrollo"];
  const p = matchProfiles[key];
  const initials = p.name.slice(0, 1);

  return (
    <Phone label="Vista previa de la app: tu primer match">
      <div className="flex items-baseline justify-between px-5 pt-3 pb-4">
        <p className="text-[22px] font-semibold tracking-[-0.02em]">Para ti</p>
        <p className="text-[13px] text-muted">{city || "Tu ciudad"}</p>
      </div>

      <div key={`${key}-${seeking}`} className="swap mx-3 flex flex-1 flex-col bg-surface">
        <div className="flex flex-1 flex-col justify-between gap-4 bg-accent-soft p-4">
          <div className="flex items-start justify-between gap-3">
            <span className="text-[13px] text-accent">Su idea</span>
            <span className="bg-bg px-2 py-1 text-[13px] text-ink">{city ? `En ${city}` : "Cerca de ti"}</span>
          </div>
          <p className="text-[21px] leading-[1.15] font-semibold tracking-[-0.02em] text-accent">{p.idea}</p>
        </div>
        <div className="grid gap-3 p-4">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="flex size-11 items-center justify-center rounded-full bg-accent text-[18px] font-semibold text-on-accent">
              {initials}
            </span>
            <div>
              <p className="text-[18px] leading-tight font-semibold">
                {p.name}, {p.age}
              </p>
              <p className="text-[13px] text-muted">Sabe de {p.skill.toLowerCase()}</p>
            </div>
          </div>
          <p className="text-[14px] leading-snug text-ink">{reasonFor(skill, seeking, city)}</p>
        </div>
        <div className="grid grid-cols-2 gap-1.5 p-3 pt-0">
          <span className="flex h-11 items-center justify-center bg-bg text-[14px] font-medium">Pasar</span>
          <span className="flex h-11 items-center justify-center bg-accent text-[14px] font-medium text-on-accent">
            Conectar
          </span>
        </div>
      </div>

      <AppTabBar active="Personas" />
    </Phone>
  );
}
