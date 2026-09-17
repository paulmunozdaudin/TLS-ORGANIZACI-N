"use client";

import { Draggable } from "@hello-pangea/dnd";
import { CalendarClock, Pencil, Trash2 } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { parseDateOnly } from "@/lib/date";
import type { Task } from "@/lib/types";

export default function TaskCard({
  task,
  index,
  onEdit,
  onDelete,
}: {
  task: Task;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const overdue =
    task.due_date && task.status !== "completada" && parseDateOnly(task.due_date) < new Date(new Date().toDateString());

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`group rounded-2xl border border-slate-200 bg-white p-3.5 transition ${
            snapshot.isDragging ? "shadow-lg ring-2 ring-indigo-200" : "hover:border-slate-300 hover:shadow-sm"
          } ${task.status === "completada" ? "opacity-70" : ""}`}
        >
          <div className="flex items-start justify-between gap-2">
            <p
              className={`text-sm font-medium text-slate-900 ${
                task.status === "completada" ? "line-through decoration-slate-400" : ""
              }`}
            >
              {task.title}
            </p>
            <div className="flex shrink-0 gap-0.5 opacity-0 transition group-hover:opacity-100">
              <button
                onClick={onEdit}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onDelete}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-between">
            {task.assignee ? (
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <Avatar name={task.assignee} size={18} />
                {task.assignee}
              </span>
            ) : (
              <span className="text-xs text-slate-300">Sin asignar</span>
            )}
            {task.due_date && (
              <span
                className={`flex items-center gap-1 text-xs ${
                  overdue ? "font-medium text-rose-500" : "text-slate-400"
                }`}
              >
                <CalendarClock className="h-3.5 w-3.5" />
                {parseDateOnly(task.due_date).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
              </span>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}
