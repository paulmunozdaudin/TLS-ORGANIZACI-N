"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { supabase } from "@/lib/supabase/client";
import { logActivity } from "@/lib/activity";
import { useUser } from "@/components/providers/UserProvider";
import type { Task, TaskStatus } from "@/lib/types";

export default function TaskModal({
  workspaceId,
  task,
  nextPosition,
  onClose,
}: {
  workspaceId: string;
  task?: Task;
  nextPosition: number;
  onClose: () => void;
}) {
  const { userName } = useUser();
  const [title, setTitle] = useState(task?.title || "");
  const [assignee, setAssignee] = useState(task?.assignee || "");
  const [dueDate, setDueDate] = useState(task?.due_date || "");
  const [status, setStatus] = useState<TaskStatus>(task?.status || "pendiente");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userName || !title.trim()) return;
    setSaving(true);

    if (task) {
      await supabase
        .from("tasks")
        .update({
          title: title.trim(),
          assignee: assignee.trim() || null,
          due_date: dueDate || null,
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", task.id);
      await logActivity(workspaceId, userName, `editó la tarea "${title.trim()}"`);
    } else {
      await supabase.from("tasks").insert({
        workspace_id: workspaceId,
        title: title.trim(),
        assignee: assignee.trim() || null,
        due_date: dueDate || null,
        status: "pendiente",
        position: nextPosition,
        created_by: userName,
      });
      await logActivity(workspaceId, userName, `añadió la tarea "${title.trim()}"`);
    }

    setSaving(false);
    onClose();
  }

  return (
    <Modal title={task ? "Editar tarea" : "Nueva tarea"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-500">Nombre de la tarea</span>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. Preparar presentación"
            className="input"
            maxLength={120}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-500">Responsable</span>
          <input
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            placeholder="¿Quién se encarga?"
            className="input"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-500">Fecha límite</span>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="input"
            />
          </label>
          {task && (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-slate-500">Estado</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="input"
              >
                <option value="pendiente">Pendiente</option>
                <option value="en_proceso">En proceso</option>
                <option value="completada">Completada</option>
              </select>
            </label>
          )}
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={saving || !title.trim()} className="btn-primary">
            {saving ? "Guardando…" : task ? "Guardar cambios" : "Crear tarea"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
