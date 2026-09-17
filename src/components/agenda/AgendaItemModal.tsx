"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { supabase } from "@/lib/supabase/client";
import { logActivity } from "@/lib/activity";
import { useUser } from "@/components/providers/UserProvider";
import type { AgendaItem, AgendaStatus, Priority } from "@/lib/types";

export default function AgendaItemModal({
  workspaceId,
  item,
  nextPosition,
  onClose,
}: {
  workspaceId: string;
  item?: AgendaItem;
  nextPosition: number;
  onClose: () => void;
}) {
  const { userName } = useUser();
  const [title, setTitle] = useState(item?.title || "");
  const [description, setDescription] = useState(item?.description || "");
  const [priority, setPriority] = useState<Priority>(item?.priority || "media");
  const [status, setStatus] = useState<AgendaStatus>(item?.status || "pendiente");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userName || !title.trim()) return;
    setSaving(true);

    if (item) {
      await supabase
        .from("agenda_items")
        .update({
          title: title.trim(),
          description: description.trim() || null,
          priority,
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);
      await logActivity(workspaceId, userName, `editó el tema "${title.trim()}"`);
    } else {
      await supabase.from("agenda_items").insert({
        workspace_id: workspaceId,
        title: title.trim(),
        description: description.trim() || null,
        added_by: userName,
        priority,
        status: "pendiente",
        position: nextPosition,
      });
      await logActivity(workspaceId, userName, `añadió el tema "${title.trim()}"`);
    }

    setSaving(false);
    onClose();
  }

  return (
    <Modal title={item ? "Editar tema" : "Añadir tema a la agenda"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-500">Título</span>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. Presupuesto del proyecto"
            className="input"
            maxLength={120}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-500">Descripción (opcional)</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Añade contexto sobre este tema…"
            className="textarea"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-500">Prioridad</span>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="input"
            >
              <option value="alta">🔴 Alta</option>
              <option value="media">🟡 Media</option>
              <option value="baja">🟢 Baja</option>
            </select>
          </label>

          {item && (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-slate-500">Estado</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AgendaStatus)}
                className="input"
              >
                <option value="pendiente">Pendiente</option>
                <option value="en_discusion">En discusión</option>
                <option value="resuelto">Resuelto</option>
              </select>
            </label>
          )}
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={saving || !title.trim()} className="btn-primary">
            {saving ? "Guardando…" : item ? "Guardar cambios" : "Añadir tema"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
