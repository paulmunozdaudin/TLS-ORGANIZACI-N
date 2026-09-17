import Modal from "@/components/ui/Modal";
import { formatMeetingDateFull } from "@/lib/date";
import type { Minutes } from "@/lib/types";

function Block({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</h4>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{value}</p>
    </div>
  );
}

export default function MinutesDetailModal({ minutes, onClose }: { minutes: Minutes; onClose: () => void }) {
  return (
    <Modal title={`Acta · ${formatMeetingDateFull(minutes.meeting_date)}`} onClose={onClose} wide>
      <div className="flex flex-col gap-5">
        <Block label="Asistentes" value={minutes.attendees} />
        <Block label="Decisiones tomadas" value={minutes.decisions} />
        <Block label="Tareas asignadas" value={minutes.tasks_assigned} />
        <Block label="Próximos pasos" value={minutes.next_steps} />
        <p className="text-xs text-slate-400">Creada por {minutes.created_by}</p>
      </div>
    </Modal>
  );
}
