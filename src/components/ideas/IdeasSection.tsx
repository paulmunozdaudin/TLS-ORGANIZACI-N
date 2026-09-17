"use client";

import { useMemo, useState } from "react";
import { Lightbulb, Plus, Trash2 } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import IdeaModal from "./IdeaModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { supabase } from "@/lib/supabase/client";
import { logActivity } from "@/lib/activity";
import { useUser } from "@/components/providers/UserProvider";
import { formatRelativeTime } from "@/lib/date";
import type { Idea } from "@/lib/types";

export default function IdeasSection({
  ideas,
  workspaceId,
  search,
}: {
  ideas: Idea[];
  workspaceId: string;
  search: string;
}) {
  const { userName } = useUser();
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Idea | null>(null);

  const q = search.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      [...ideas]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .filter((i) => !q || i.title.toLowerCase().includes(q) || (i.description || "").toLowerCase().includes(q)),
    [ideas, q]
  );

  async function handleDelete(idea: Idea) {
    await supabase.from("ideas").delete().eq("id", idea.id);
    if (userName) await logActivity(workspaceId, userName, `eliminó la idea "${idea.title}"`);
  }

  return (
    <section id="ideas" className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="section-title flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-amber-500" />
          Ideas y futuros temas
        </h2>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" /> Añadir idea
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 py-10 text-center">
          <Lightbulb className="h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-500">
            {ideas.length > 0 ? "Ninguna idea coincide con la búsqueda." : "Aún no hay ideas para futuras reuniones."}
          </p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((idea) => (
            <div
              key={idea.id}
              className="group flex flex-col gap-2 rounded-2xl border border-amber-100 bg-amber-50/50 p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900">{idea.title}</h3>
                <button
                  onClick={() => setDeleting(idea)}
                  className="shrink-0 rounded-lg p-1 text-slate-400 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              {idea.description && <p className="text-sm text-slate-600">{idea.description}</p>}
              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                <Avatar name={idea.added_by} size={18} />
                {idea.added_by} · {formatRelativeTime(idea.created_at)}
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && <IdeaModal workspaceId={workspaceId} onClose={() => setCreating(false)} />}
      {deleting && (
        <ConfirmDialog
          title="Eliminar idea"
          message={`¿Seguro que quieres eliminar "${deleting.title}"?`}
          onConfirm={() => handleDelete(deleting)}
          onClose={() => setDeleting(null)}
        />
      )}
    </section>
  );
}
