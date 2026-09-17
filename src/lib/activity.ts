import { supabase } from "@/lib/supabase/client";

export async function logActivity(workspaceId: string, actorName: string, action: string) {
  await supabase.from("activity_log").insert({
    workspace_id: workspaceId,
    actor_name: actorName,
    action,
  });
}
