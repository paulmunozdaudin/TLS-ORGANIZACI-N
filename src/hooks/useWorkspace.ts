"use client";

import { useEffect, useState } from "react";
import { supabase, WORKSPACE_SLUG, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Workspace } from "@/lib/types";

export function useWorkspace() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!isSupabaseConfigured) {
        setError("Supabase no está configurado todavía.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("workspaces")
        .select("*")
        .eq("slug", WORKSPACE_SLUG)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      if (!data) {
        setError(
          `No se encontró el workspace "${WORKSPACE_SLUG}". Ejecuta supabase/schema.sql en tu proyecto de Supabase.`
        );
        setLoading(false);
        return;
      }

      setWorkspace(data as Workspace);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { workspace, loading, error };
}
