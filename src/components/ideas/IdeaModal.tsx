"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { supabase } from "@/lib/supabase/client";
import { logActivity } from "@/lib/activity";
import { useUser } from "@/components/providers/UserProvider";

export default function IdeaModal({ workspaceId, onClose }: { workspaceId: string; onClose: () => void }) {
  const { userName } = useUser();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userName || !title.trim()) return;
    setSaving(true);
    await supabase.from("ideas").insert({
      workspace_id: workspaceId,
      title: title.trim(),
      description: description.trim() || null,
      added_by: userName,
    });
    await logActivity(workspaceId, userName, `añadió la idea "${title.trim()}"`);
    setSaving(false);
    onClose();
  }

  return (
    <Modal title="Añadir idea" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-500">Título</span>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. Organizar una actividad de team building"
            className="input"
            maxLength={120}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-500">Descripción (opcional)</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Cuéntanos un poco más…"
            className="textarea"
          />
        </label>
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={saving || !title.trim()} className="btn-primary">
            {saving ? "Guardando…" : "Añadir idea"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
