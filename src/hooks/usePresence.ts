"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

interface PresenceState {
  name: string;
  online_at: string;
}

export function usePresence(workspaceId: string | null, userName: string | null) {
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!workspaceId || !userName) return;

    const channel = supabase.channel(`presence:${workspaceId}`, {
      config: { presence: { key: userName } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceState>();
        const names = Object.keys(state);
        setOnlineUsers(names);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ name: userName, online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, userName]);

  return onlineUsers;
}
