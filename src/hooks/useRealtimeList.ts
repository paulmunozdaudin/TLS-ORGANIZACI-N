"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface Options {
  table: string;
  workspaceId: string | null;
  orderBy?: string;
  ascending?: boolean;
}

/**
 * Fetches all rows for a table scoped to a workspace_id, keeps a local copy
 * in sync via Supabase Realtime, and exposes optimistic helpers so the UI
 * can update instantly while the write round-trips to the database.
 */
export function useRealtimeList<T extends { id: string }>({
  table,
  workspaceId,
  orderBy = "created_at",
  ascending = true,
}: Options) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      const { data: rows, error } = await supabase
        .from(table)
        .select("*")
        .eq("workspace_id", workspaceId)
        .order(orderBy, { ascending });

      if (cancelled) return;
      if (!error && rows) {
        setData(rows as T[]);
      }
      setLoading(false);
    }

    load();

    const channel: RealtimeChannel = supabase
      .channel(`${table}:${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as T;
            setData((prev) =>
              prev.some((r) => r.id === row.id) ? prev : [...prev, row]
            );
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as T;
            setData((prev) => prev.map((r) => (r.id === row.id ? row : r)));
          } else if (payload.eventType === "DELETE") {
            const oldRow = payload.old as Partial<T>;
            setData((prev) => prev.filter((r) => r.id !== oldRow.id));
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [table, workspaceId, orderBy, ascending]);

  return { data, setData, loading };
}
