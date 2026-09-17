"use client";

import { useMemo, useState } from "react";
import { ChevronRight, FileText, Plus } from "lucide-react";
import MinutesModal from "./MinutesModal";
import MinutesDetailModal from "./MinutesDetailModal";
import { formatMeetingDateFull } from "@/lib/date";
import type { Minutes } from "@/lib/types";

export default function MinutesSection({
  minutes,
  workspaceId,
  search,
}: {
  minutes: Minutes[];
  workspaceId: string;
  search: string;
}) {
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<Minutes | null>(null);

  const q = search.trim().toLowerCase();
  const sorted = useMemo(
    () =>
      [...minutes]
        .sort((a, b) => new Date(b.meeting_date).getTime() - new Date(a.meeting_date).getTime())
        .filter(
          (m) =>
            !q ||
            (m.decisions || "").toLowerCase().includes(q) ||
            (m.attendees || "").toLowerCase().includes(q) ||
            m.meeting_date.includes(q)
        ),
    [minutes, q]
  );

  return (
    <section id="actas" className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="section-title flex items-center gap-2">
          <FileText className="h-5 w-5 text-indigo-600" />
          Actas
        </h2>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" /> Crear acta
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 py-10 text-center">
          <FileText className="h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-500">
            {minutes.length > 0 ? "Ningún acta coincide con la búsqueda." : "Todavía no se ha registrado ningún acta."}
          </p>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {sorted.map((m) => (
            <button
              key={m.id}
              onClick={() => setViewing(m)}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50/40"
            >
              <div>
                <p className="text-sm font-medium capitalize text-slate-900">
                  Reunión {formatMeetingDateFull(m.meeting_date)}
                </p>
                {m.attendees && <p className="text-xs text-slate-400">Asistentes: {m.attendees}</p>}
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
            </button>
          ))}
        </div>
      )}

      {creating && <MinutesModal workspaceId={workspaceId} onClose={() => setCreating(false)} />}
      {viewing && <MinutesDetailModal minutes={viewing} onClose={() => setViewing(null)} />}
    </section>
  );
}
