"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { supabase } from "@/lib/supabase/client";
import { logActivity } from "@/lib/activity";
import { useUser } from "@/components/providers/UserProvider";
import type { NextMeeting } from "@/lib/types";

export default function EditMeetingModal({
  meeting,
  workspaceId,
  onClose,
}: {
  meeting: NextMeeting | null;
  workspaceId: string;
  onClose: () => void;
}) {
  const { userName } = useUser();
  const [title, setTitle] = useState(meeting?.title || "Reunión semanal");
  const [date, setDate] = useState(meeting?.meeting_date || "");
  const [time, setTime] = useState(meeting?.meeting_time || "");
  const [location, setLocation] = useState(meeting?.location || "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userName) return;
    setSaving(true);

    const payload = {
      workspace_id: workspaceId,
      title: title.trim() || "Reunión semanal",
      meeting_date: date || null,
      meeting_time: time || null,
      location: location.trim() || null,
      updated_by: userName,
      updated_at: new Date().toISOString(),
    };

    if (meeting) {
      await supabase.from("next_meeting").update(payload).eq("id", meeting.id);
    } else {
      await supabase.from("next_meeting").insert(payload);
    }

    await logActivity(workspaceId, userName, `actualizó los datos de la próxima reunión`);
    setSaving(false);
    onClose();
  }

  return (
    <Modal title="Próxima reunión" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Título">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
            placeholder="Reunión semanal"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Hora">
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="input"
            />
          </Field>
        </div>
        <Field label="Lugar">
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="input"
            placeholder="Madrid, sala principal, videollamada…"
          />
        </Field>

        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}
