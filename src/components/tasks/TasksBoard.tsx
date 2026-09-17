"use client";

import { useMemo, useState } from "react";
import { DragDropContext, Droppable, type DropResult } from "@hello-pangea/dnd";
import { KanbanSquare, Plus } from "lucide-react";
import TaskCard from "./TaskCard";
import TaskModal from "./TaskModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { supabase } from "@/lib/supabase/client";
import { logActivity } from "@/lib/activity";
import { useUser } from "@/components/providers/UserProvider";
import { TASK_COLUMNS, TASK_STATUS_LABEL, type Task, type TaskStatus } from "@/lib/types";

const COLUMN_STYLES: Record<TaskStatus, string> = {
  pendiente: "bg-slate-50 border-slate-200",
  en_proceso: "bg-blue-50/60 border-blue-100",
  completada: "bg-emerald-50/60 border-emerald-100",
};

export default function TasksBoard({
  tasks,
  setTasks,
  workspaceId,
  search,
}: {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  workspaceId: string;
  search: string;
}) {
  const { userName } = useUser();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);

  const q = search.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      tasks.filter(
        (t) =>
          !q ||
          t.title.toLowerCase().includes(q) ||
          (t.assignee || "").toLowerCase().includes(q)
      ),
    [tasks, q]
  );

  const columns = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { pendiente: [], en_proceso: [], completada: [] };
    for (const t of filtered) map[t.status].push(t);
    for (const status of TASK_COLUMNS) map[status].sort((a, b) => a.position - b.position);
    return map;
  }, [filtered]);

  const nextPosition = tasks.length ? Math.max(...tasks.map((t) => t.position)) + 1 : 0;

  async function handleDragEnd(result: DropResult) {
    const { source, destination } = result;
    if (!destination || q) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const fromStatus = source.droppableId as TaskStatus;
    const toStatus = destination.droppableId as TaskStatus;

    const sourceList = [...columns[fromStatus]];
    const [moved] = sourceList.splice(source.index, 1);
    const destList = fromStatus === toStatus ? sourceList : [...columns[toStatus]];
    destList.splice(destination.index, 0, { ...moved, status: toStatus });

    const updates: Task[] = destList.map((t, index) => ({ ...t, status: toStatus, position: index }));
    const sourceUpdates: Task[] = fromStatus === toStatus ? [] : sourceList.map((t, index) => ({ ...t, position: index }));

    setTasks((prev) => {
      const byId = new Map(prev.map((t) => [t.id, t]));
      for (const t of [...updates, ...sourceUpdates]) byId.set(t.id, t);
      return Array.from(byId.values());
    });

    await Promise.all(
      [...updates, ...sourceUpdates].map((t) =>
        supabase.from("tasks").update({ status: t.status, position: t.position }).eq("id", t.id)
      )
    );

    if (fromStatus !== toStatus && userName) {
      await logActivity(
        workspaceId,
        userName,
        toStatus === "completada"
          ? `completó la tarea "${moved.title}"`
          : `movió "${moved.title}" a ${TASK_STATUS_LABEL[toStatus].toLowerCase()}`
      );
    }
  }

  async function handleDelete(task: Task) {
    await supabase.from("tasks").delete().eq("id", task.id);
    if (userName) await logActivity(workspaceId, userName, `eliminó la tarea "${task.title}"`);
  }

  return (
    <section id="tareas" className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="section-title flex items-center gap-2">
          <KanbanSquare className="h-5 w-5 text-indigo-600" />
          Tareas
        </h2>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" /> Nueva tarea
        </button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {TASK_COLUMNS.map((status) => (
            <Droppable droppableId={status} key={status}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex min-h-[140px] flex-col gap-2.5 rounded-2xl border p-3 ${COLUMN_STYLES[status]}`}
                >
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {TASK_STATUS_LABEL[status]}
                    </span>
                    <span className="rounded-full bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200">
                      {columns[status].length}
                    </span>
                  </div>
                  {columns[status].map((task, index) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      index={index}
                      onEdit={() => setEditing(task)}
                      onDelete={() => setDeleting(task)}
                    />
                  ))}
                  {provided.placeholder}
                  {columns[status].length === 0 && (
                    <p className="px-1 text-xs text-slate-400">Sin tareas</p>
                  )}
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>

      {creating && (
        <TaskModal workspaceId={workspaceId} nextPosition={nextPosition} onClose={() => setCreating(false)} />
      )}
      {editing && (
        <TaskModal
          workspaceId={workspaceId}
          task={editing}
          nextPosition={nextPosition}
          onClose={() => setEditing(null)}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Eliminar tarea"
          message={`¿Seguro que quieres eliminar "${deleting.title}"?`}
          onConfirm={() => handleDelete(deleting)}
          onClose={() => setDeleting(null)}
        />
      )}
    </section>
  );
}
