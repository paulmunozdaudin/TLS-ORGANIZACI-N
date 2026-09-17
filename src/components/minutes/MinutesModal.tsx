"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { supabase } from "@/lib/supabase/client";
import { logActivity } from "@/lib/activity";
import { useUser } from "@/components/providers/UserProvider";

export default function MinutesModal({ workspaceId, onClose }: { workspaceId: string; onClose: () => void }) {
  const { userName } = useUser();
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendees, setAttendees] = useState("");
  const [decisions, setDecisions] = useState("");
  const [tasksAssigned, setTasksAssigned] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userName || !meetingDate) return;
    setSaving(true);
    await supabase.from("minutes").insert({
      workspace_id: workspaceId,
      meeting_date: meetingDate,
      attendees: attendees.trim() || null,
      decisions: decisions.trim() || null,
      tasks_assigned: tasksAssigned.trim() || null,
      next_steps: nextSteps.trim() || null,
      created_by: userName,
    });
    await logActivity(workspaceId, userName, `creó una nueva acta`);
    setSaving(false);
    onClose();
  }

  return (
    <Modal title="Crear acta de reunión" onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-500">Fecha de la reunión</span>
          <input
            type="date"
            value={meetingDate}
            onChange={(e) => setMeetingDate(e.target.value)}
            className="input max-w-xs"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-500">Asistentes</span>
          <input
            value={attendees}
            onChange={(e) => setAttendees(e.target.value)}
            placeholder="Pablo, Lucas, Clara…"
            className="input"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-500">Decisiones tomadas</span>
          <textarea
            value={decisions}
            onChange={(e) => setDecisions(e.target.value)}
            className="textarea"
            placeholder="¿Qué se decidió?"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-500">Tareas asignadas</span>
          <textarea
            value={tasksAssigned}
            onChange={(e) => setTasksAssigned(e.target.value)}
            className="textarea"
            placeholder="¿Quién se encarga de qué?"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-500">Próximos pasos</span>
          <textarea
            value={nextSteps}
            onChange={(e) => setNextSteps(e.target.value)}
            className="textarea"
            placeholder="¿Qué toca hacer antes de la próxima reunión?"
          />
        </label>
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={saving || !meetingDate} className="btn-primary">
            {saving ? "Guardando…" : "Guardar acta"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
