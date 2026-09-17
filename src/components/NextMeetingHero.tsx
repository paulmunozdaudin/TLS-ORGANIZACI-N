"use client";

import { useState } from "react";
import { Calendar, Clock, MapPin, Pencil, Plus } from "lucide-react";
import type { NextMeeting } from "@/lib/types";
import { combineDateAndTime, formatMeetingDateFull } from "@/lib/date";
import { useCountdown } from "@/hooks/useCountdown";
import EditMeetingModal from "@/components/EditMeetingModal";

function CountdownBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex min-w-[64px] flex-col items-center rounded-2xl bg-white/10 px-3 py-2.5 backdrop-blur-sm">
      <span className="text-2xl font-bold tabular-nums text-white sm:text-3xl">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[11px] uppercase tracking-wide text-indigo-100">{label}</span>
    </div>
  );
}

export default function NextMeetingHero({
  meeting,
  workspaceId,
  onAddTopic,
}: {
  meeting: NextMeeting | null;
  workspaceId: string;
  onAddTopic: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const target = meeting ? combineDateAndTime(meeting.meeting_date, meeting.meeting_time) : null;
  const countdown = useCountdown(target);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-700 px-6 py-7 shadow-xl shadow-indigo-900/20 sm:px-9 sm:py-9">
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-black/10" />

      <div className="relative flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-200">
              Próxima reunión
            </p>
            <h2 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
              {meeting?.title || "Sin reunión programada"}
            </h2>
            {meeting?.meeting_date && (
              <p className="mt-1 text-sm capitalize text-indigo-100">
                {formatMeetingDateFull(meeting.meeting_date)}
              </p>
            )}
          </div>
          <button
            onClick={() => setEditing(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/25"
          >
            <Pencil className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Editar</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-indigo-50">
          {meeting?.meeting_time && (
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" /> {meeting.meeting_time}
            </span>
          )}
          {meeting?.location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" /> {meeting.location}
            </span>
          )}
          {!meeting?.meeting_date && (
            <span className="flex items-center gap-1.5 text-indigo-100">
              <Calendar className="h-4 w-4" /> Añade una fecha para la próxima reunión
            </span>
          )}
        </div>

        {countdown && target && (
          <div className="flex flex-wrap items-center gap-2">
            {countdown.isPast ? (
              <span className="rounded-2xl bg-white/10 px-4 py-2.5 text-sm font-medium text-white">
                La reunión ya ha comenzado o ha finalizado
              </span>
            ) : (
              <>
                <CountdownBlock value={countdown.days} label="días" />
                <CountdownBlock value={countdown.hours} label="horas" />
                <CountdownBlock value={countdown.minutes} label="min" />
                <CountdownBlock value={countdown.seconds} label="seg" />
              </>
            )}
          </div>
        )}

        <div>
          <button
            onClick={onAddTopic}
            className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 shadow-lg shadow-black/10 transition hover:bg-indigo-50"
          >
            <Plus className="h-4 w-4" /> Añadir tema
          </button>
        </div>
      </div>

      {editing && (
        <EditMeetingModal
          meeting={meeting}
          workspaceId={workspaceId}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}
