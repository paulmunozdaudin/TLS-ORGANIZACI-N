import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// A stub URL/key keeps createClient happy in environments where Supabase
// hasn't been configured yet, so the app can render a setup notice instead
// of crashing at import time.
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key"
);

export const WORKSPACE_SLUG = process.env.NEXT_PUBLIC_WORKSPACE_SLUG || "tls";
