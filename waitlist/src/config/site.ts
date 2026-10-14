/**
 * Ajustes generales de la landing. Cambia el nombre de la marca aquí y se
 * actualiza en toda la web (titulares, metadatos, privacidad, imagen social).
 */
export const BRAND = "[NOMBRE]";

/** Email de contacto para la política de privacidad y el pie. */
export const CONTACT_EMAIL = "hola@ejemplo.com";

/** Puestos que sube alguien por cada persona que se apunta con su enlace. */
export const REFERRAL_BOOST = 5;

/** Máximo de registros por IP y hora (protección básica contra spam). */
export const MAX_SIGNUPS_PER_IP_PER_HOUR = 5;

/** URL pública de la web. En Vercel se rellena sola si no la defines. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");
