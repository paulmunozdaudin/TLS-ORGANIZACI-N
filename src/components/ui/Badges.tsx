import type { AgendaStatus, Priority, TaskStatus } from "@/lib/types";
import { AGENDA_STATUS_LABEL, PRIORITY_LABEL, TASK_STATUS_LABEL } from "@/lib/types";

const PRIORITY_STYLES: Record<Priority, string> = {
  alta: "bg-rose-50 text-rose-600 ring-rose-200",
  media: "bg-amber-50 text-amber-600 ring-amber-200",
  baja: "bg-emerald-50 text-emerald-600 ring-emerald-200",
};

const PRIORITY_DOT: Record<Priority, string> = {
  alta: "bg-rose-500",
  media: "bg-amber-500",
  baja: "bg-emerald-500",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${PRIORITY_STYLES[priority]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[priority]}`} />
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

const AGENDA_STATUS_STYLES: Record<AgendaStatus, string> = {
  pendiente: "bg-slate-100 text-slate-600 ring-slate-200",
  en_discusion: "bg-blue-50 text-blue-600 ring-blue-200",
  resuelto: "bg-emerald-50 text-emerald-600 ring-emerald-200",
};

export function AgendaStatusBadge({ status }: { status: AgendaStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${AGENDA_STATUS_STYLES[status]}`}
    >
      {AGENDA_STATUS_LABEL[status]}
    </span>
  );
}

const TASK_STATUS_STYLES: Record<TaskStatus, string> = {
  pendiente: "bg-slate-100 text-slate-600 ring-slate-200",
  en_proceso: "bg-blue-50 text-blue-600 ring-blue-200",
  completada: "bg-emerald-50 text-emerald-600 ring-emerald-200",
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${TASK_STATUS_STYLES[status]}`}
    >
      {TASK_STATUS_LABEL[status]}
    </span>
  );
}
