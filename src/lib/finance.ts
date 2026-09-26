import { supabase } from "@/lib/supabase/client";
import type { FinanceEntry, FinanceType } from "@/lib/types";

const PIN_STORAGE_KEY = "tls_finance_pin";

// Session-only on purpose: the PIN gate should re-ask after the tab closes,
// not persist indefinitely like the (low-stakes) user name does.
export function getStoredPin(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(PIN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredPin(pin: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(PIN_STORAGE_KEY, pin);
  } catch {
    // no-op
  }
}

export function clearStoredPin() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(PIN_STORAGE_KEY);
  } catch {
    // no-op
  }
}

export async function verifyFinancePin(workspaceId: string, pin: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("finance_check_pin", {
    p_workspace_id: workspaceId,
    p_pin: pin,
  });
  if (error) return false;
  return Boolean(data);
}

export async function listFinanceEntries(
  workspaceId: string,
  pin: string
): Promise<{ data: FinanceEntry[] | null; error: string | null }> {
  const { data, error } = await supabase.rpc("finance_list_entries", {
    p_workspace_id: workspaceId,
    p_pin: pin,
  });
  if (error) return { data: null, error: error.message };
  return { data: data as FinanceEntry[], error: null };
}

export async function addFinanceEntry(
  workspaceId: string,
  pin: string,
  entry: {
    type: FinanceType;
    concept: string;
    amount: number;
    category: string | null;
    entryDate: string;
    addedBy: string;
  }
): Promise<{ data: FinanceEntry | null; error: string | null }> {
  const { data, error } = await supabase.rpc("finance_add_entry", {
    p_workspace_id: workspaceId,
    p_pin: pin,
    p_type: entry.type,
    p_concept: entry.concept,
    p_amount: entry.amount,
    p_category: entry.category,
    p_entry_date: entry.entryDate,
    p_added_by: entry.addedBy,
  });
  if (error) return { data: null, error: error.message };
  return { data: data as FinanceEntry, error: null };
}

export async function deleteFinanceEntry(
  workspaceId: string,
  pin: string,
  entryId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc("finance_delete_entry", {
    p_workspace_id: workspaceId,
    p_pin: pin,
    p_entry_id: entryId,
  });
  return { error: error?.message ?? null };
}
