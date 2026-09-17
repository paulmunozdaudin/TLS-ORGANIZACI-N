"use client";

import { Draggable } from "@hello-pangea/dnd";
import { CheckCircle2, GripVertical, MessageSquare, Pencil, Trash2 } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { PriorityBadge, AgendaStatusBadge } from "@/components/ui/Badges";
import { formatRelativeTime } from "@/lib/date";
import type { AgendaItem } from "@/lib/types";

export default function AgendaItemCard({
  item,
  index,
  commentCount,
  onOpen,
  onEdit,
  onDelete,
  onToggleResolved,
}: {
  item: AgendaItem;
  index: number;
  commentCount?: number;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleResolved: () => void;
}) {
  return (
    <Draggable draggableId={item.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`group flex gap-2 rounded-2xl border border-slate-200 bg-white p-4 transition ${
            snapshot.isDragging ? "shadow-lg ring-2 ring-indigo-200" : "hover:border-slate-300 hover:shadow-sm"
          } ${item.status === "resuelto" ? "opacity-70" : ""}`}
        >
          <div
            {...provided.dragHandleProps}
            className="flex shrink-0 cursor-grab items-center text-slate-300 active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1 cursor-pointer" onClick={onOpen}>
            <div className="flex flex-wrap items-center gap-2">
              <PriorityBadge priority={item.priority} />
              <AgendaStatusBadge status={item.status} />
            </div>
            <h3
              className={`mt-1.5 text-sm font-semibold text-slate-900 ${
                item.status === "resuelto" ? "line-through decoration-slate-400" : ""
              }`}
            >
              {item.title}
            </h3>
            {item.description && (
              <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">{item.description}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Avatar name={item.added_by} size={18} />
                {item.added_by}
              </span>
              <span>{formatRelativeTime(item.created_at)}</span>
              {!!commentCount && (
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5" /> {commentCount}
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end justify-between gap-1 opacity-0 transition group-hover:opacity-100">
            <div className="flex gap-1">
              <button
                onClick={onToggleResolved}
                title={item.status === "resuelto" ? "Marcar como pendiente" : "Marcar como resuelto"}
                className={`rounded-lg p-1.5 transition hover:bg-emerald-50 ${
                  item.status === "resuelto" ? "text-emerald-600" : "text-slate-400 hover:text-emerald-600"
                }`}
              >
                <CheckCircle2 className="h-4 w-4" />
              </button>
              <button
                onClick={onEdit}
                title="Editar"
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={onDelete}
                title="Eliminar"
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
