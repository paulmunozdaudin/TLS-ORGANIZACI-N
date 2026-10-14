"use server";

import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { MAX_SIGNUPS_PER_IP_PER_HOUR, REFERRAL_BOOST } from "@/config/site";
import { form } from "@/content/landing";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  REFERRAL_RE,
  normalizeCity,
  validateJoin,
  type JoinState,
} from "@/lib/waitlist";

const CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const MIN_FILL_MS = 2500;

function newCode(): string {
  const bytes = randomBytes(8);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT ?? "waitlist";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

export async function joinWaitlist(
  _prev: JoinState,
  formData: FormData,
): Promise<JoinState> {
  const values = {
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    city: String(formData.get("city") ?? ""),
    skill: String(formData.get("skill") ?? ""),
    seeking: String(formData.get("seeking") ?? ""),
  };

  // Honeypot y tiempo mínimo de relleno: los bots rellenan el campo oculto
  // o envían el formulario al instante.
  const honeypot = String(formData.get("company") ?? "");
  const startedAt = Number(formData.get("t") ?? 0);
  if (honeypot || !startedAt || Date.now() - startedAt < MIN_FILL_MS) {
    return { status: "error", message: form.errors.generic, values };
  }

  const fieldErrors = validateJoin({
    ...values,
    privacy: formData.get("privacy") === "on",
  });
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: form.errors.summary, fieldErrors, values };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error("[waitlist] Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
    return { status: "error", message: form.errors.generic, values };
  }

  const ipHash = hashIp(await clientIp());

  // Límite de envíos por IP y hora.
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await supabase
    .from("waitlist")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);
  if (countError) {
    console.error("[waitlist] rate limit", countError);
    return { status: "error", message: form.errors.generic, values };
  }
  if ((count ?? 0) >= MAX_SIGNUPS_PER_IP_PER_HOUR) {
    return { status: "error", message: form.errors.rate, values };
  }

  // Solo se acepta un código de invitación que exista.
  let referredBy: string | null = null;
  const ref = String(formData.get("ref") ?? "").toLowerCase();
  if (REFERRAL_RE.test(ref)) {
    const { data } = await supabase
      .from("waitlist")
      .select("referral_code")
      .eq("referral_code", ref)
      .maybeSingle();
    referredBy = data?.referral_code ?? null;
  }

  let code = newCode();
  let already = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    const { error } = await supabase.from("waitlist").insert({
      email: values.email,
      city: normalizeCity(values.city),
      skill: values.skill,
      seeking: values.seeking,
      referral_code: code,
      referred_by: referredBy,
      privacy_accepted_at: new Date().toISOString(),
      ip_hash: ipHash,
    });
    if (!error) break;

    if (error.code === "23505" && error.message.includes("email")) {
      const { data } = await supabase
        .from("waitlist")
        .select("referral_code")
        .eq("email", values.email)
        .maybeSingle();
      if (!data) return { status: "error", message: form.errors.generic, values };
      code = data.referral_code;
      already = true;
      break;
    }
    if (error.code === "23505") {
      code = newCode(); // código repetido: se reintenta con otro
      continue;
    }
    console.error("[waitlist] insert", error);
    return { status: "error", message: form.errors.generic, values };
  }

  const { data: rank, error: rankError } = await supabase
    .rpc("waitlist_position", { code, boost: REFERRAL_BOOST })
    .maybeSingle<{ place: number }>();
  if (rankError) console.error("[waitlist] position", rankError);

  return { status: "success", already, code, place: rank?.place ?? null };
}
