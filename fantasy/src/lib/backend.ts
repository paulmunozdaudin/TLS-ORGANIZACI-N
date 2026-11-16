/**
 * Backend wiring status. Only public (`EXPO_PUBLIC_`) values may live in the
 * app bundle: the Supabase URL and anon key. Football API keys and the
 * Supabase service role key stay server-side, in Edge Function secrets.
 */
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * Real accounts (email, Google, Apple) arrive with Phase 3. Until then the
 * app runs in demo mode: one local profile, stored only on this device.
 */
export const ACCOUNTS_AVAILABLE = false;
export const APP_NAME = 'Rondo';
