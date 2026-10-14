"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Seeking, Skill } from "@/content/options";
import { REFERRAL_RE, type JoinState } from "@/lib/waitlist";

type Draft = { city: string; skill: Skill | ""; seeking: Seeking | "" };
type Success = Extract<JoinState, { status: "success" }>;

type WaitlistContextValue = {
  /** Lo que el visitante va marcando: lo usa el móvil de la portada. */
  draft: Draft;
  setDraft: (patch: Partial<Draft>) => void;
  /** Resultado compartido: si se apunta en un formulario, el otro también lo muestra. */
  result: Success | null;
  setResult: (r: Success) => void;
  /** Código de invitación recibido en la URL (?ref=…). */
  referral: string;
};

const WaitlistContext = createContext<WaitlistContextValue | null>(null);

const STORAGE_KEY = "waitlist:ref";

export function WaitlistProvider({ children }: { children: ReactNode }) {
  const [draft, setDraftState] = useState<Draft>({ city: "", skill: "", seeking: "" });
  const [result, setResult] = useState<Success | null>(null);
  const [referral, setReferral] = useState("");

  useEffect(() => {
    let ref = new URLSearchParams(window.location.search).get("ref")?.toLowerCase() ?? "";
    try {
      if (REFERRAL_RE.test(ref)) localStorage.setItem(STORAGE_KEY, ref);
      else ref = localStorage.getItem(STORAGE_KEY) ?? "";
    } catch {
      // almacenamiento bloqueado: se usa solo el de la URL
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- se lee una vez al montar
    if (REFERRAL_RE.test(ref)) setReferral(ref);
  }, []);

  const value = useMemo<WaitlistContextValue>(
    () => ({
      draft,
      setDraft: (patch) => setDraftState((d) => ({ ...d, ...patch })),
      result,
      setResult,
      referral,
    }),
    [draft, result, referral],
  );

  return <WaitlistContext value={value}>{children}</WaitlistContext>;
}

export function useWaitlist() {
  const ctx = useContext(WaitlistContext);
  if (!ctx) throw new Error("useWaitlist debe usarse dentro de <WaitlistProvider>");
  return ctx;
}
