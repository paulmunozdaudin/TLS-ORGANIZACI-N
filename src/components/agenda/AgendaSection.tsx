"use client";

import { forwardRef, useImperativeHandle, useMemo, useState } from "react";
import { DragDropContext, Droppable, type DropResult } from "@hello-pangea/dnd";
import { ClipboardList, Plus } from "lucide-react";
import AgendaItemCard from "./AgendaItemCard";
import AgendaItemModal from "./AgendaItemModal";
import AgendaItemDetailModal from "./AgendaItemDetailModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { supabase } from "@/lib/supabase/client";
import { logActivity } from "@/lib/activity";
import { useUser } from "@/components/providers/UserProvider";
import type { AgendaItem, AgendaStatus, Priority } from "@/lib/types";

export interface AgendaSectionHandle {
  openCreate: () => void;
}

interface AgendaSectionProps {
  items: AgendaItem[];
  setItems: React.Dispatch<React.SetStateAction<AgendaItem[]>>;
  workspaceId: string;
  search: string;
}

const AgendaSection = forwardRef<AgendaSectionHandle, AgendaSectionProps>(function AgendaSection(
  { items, setItems, workspaceId, search },
  ref
) {
  const { userName } = useUser();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AgendaItem | null>(null);
  const [viewing, setViewing] = useState<AgendaItem | null>(null);
  const [deleting, setDeleting] = useState<AgendaItem | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<Priority | "todas">("todas");
  const [statusFilter, setStatusFilter] = useState<AgendaStatus | "todos">("todos");

  useImperativeHandle(ref, () => ({
    openCreate: () => setCreating(true),
  }));

  const sorted = useMemo(() => [...items].sort((a, b) => a.position - b.position), [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sorted.filter((item) => {
      if (priorityFilter !== "todas" && item.priority !== priorityFilter) return false;
      if (statusFilter !== "todos" && item.status !== statusFilter) return false;
      if (q && !item.title.toLowerCase().includes(q) && !(item.description || "").toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [sorted, priorityFilter, statusFilter, search]);

  const nextPosition = sorted.length ? sorted[sorted.length - 1].position + 1 : 0;
  const isFiltering = priorityFilter !== "todas" || statusFilter !== "todos" || search.trim() !== "";

  async function handleDragEnd(result: DropResult) {
    if (!result.destination || isFiltering) return;
    const from = result.source.index;
    const to = result.destination.index;
    if (from === to) return;

    const reordered = [...sorted];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);

    const withPositions = reordered.map((item, index) => ({ ...item, position: index }));
    setItems(withPositions);

    await Promise.all(
      withPositions.map((item) =>
        supabase.from("agenda_items").update({ position: item.position }).eq("id", item.id)
      )
    );
  }

  async function toggleResolved(item: AgendaItem) {
    const newStatus: AgendaStatus = item.status === "resuelto" ? "pendiente" : "resuelto";
    await supabase.from("agenda_items").update({ status: newStatus }).eq("id", item.id);
    if (userName) {
      await logActivity(
        workspaceId,
        userName,
        newStatus === "resuelto" ? `marcó "${item.title}" como resuelto` : `reabrió "${item.title}"`
      );
    }
  }

  async function handleDelete(item: AgendaItem) {
    await supabase.from("agenda_items").delete().eq("id", item.id);
    if (userName) await logActivity(workspaceId, userName, `eliminó el tema "${item.title}"`);
  }

  return (
    <section id="agenda" className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="section-title flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-indigo-600" />
          Agenda de la reunión
        </h2>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" /> Añadir tema
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <FilterGroup
          value={priorityFilter}
          onChange={setPriorityFilter}
          options={[
            { value: "todas", label: "Todas las prioridades" },
            { value: "alta", label: "🔴 Alta" },
            { value: "media", label: "🟡 Media" },
            { value: "baja", label: "🟢 Baja" },
          ]}
        />
        <FilterGroup
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "todos", label: "Todos los estados" },
            { value: "pendiente", label: "Pendiente" },
            { value: "en_discusion", label: "En discusión" },
            { value: "resuelto", label: "Resuelto" },
          ]}
        />
      </div>

      <div className="mt-4">
        {filtered.length === 0 ? (
          <EmptyAgenda hasItems={items.length > 0} onAdd={() => setCreating(true)} />
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="agenda">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="flex flex-col gap-2.5">
                  {filtered.map((item, index) => (
                    <AgendaItemCard
                      key={item.id}
                      item={item}
                      index={index}
                      onOpen={() => setViewing(item)}
                      onEdit={() => setEditing(item)}
                      onDelete={() => setDeleting(item)}
                      onToggleResolved={() => toggleResolved(item)}
                    />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>

      {creating && (
        <AgendaItemModal workspaceId={workspaceId} nextPosition={nextPosition} onClose={() => setCreating(false)} />
      )}
      {editing && (
        <AgendaItemModal
          workspaceId={workspaceId}
          item={editing}
          nextPosition={nextPosition}
          onClose={() => setEditing(null)}
        />
      )}
      {viewing && (
        <AgendaItemDetailModal item={viewing} workspaceId={workspaceId} onClose={() => setViewing(null)} />
      )}
      {deleting && (
        <ConfirmDialog
          title="Eliminar tema"
          message={`¿Seguro que quieres eliminar "${deleting.title}"? Esta acción no se puede deshacer.`}
          onConfirm={() => handleDelete(deleting)}
          onClose={() => setDeleting(null)}
        />
      )}
    </section>
  );
});

export default AgendaSection;

function FilterGroup<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 outline-none transition focus:border-indigo-300"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function EmptyAgenda({ hasItems, onAdd }: { hasItems: boolean; onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 py-10 text-center">
      <ClipboardList className="h-8 w-8 text-slate-300" />
      <p className="text-sm text-slate-500">
        {hasItems ? "Ningún tema coincide con los filtros." : "Todavía no hay temas para la próxima reunión."}
      </p>
      {!hasItems && (
        <button onClick={onAdd} className="mt-1 text-sm font-medium text-indigo-600 hover:underline">
          Añade el primero
        </button>
      )}
    </div>
  );
}
