"use client";

import { History } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { formatRelativeTime } from "@/lib/date";
import type { ActivityLogEntry } from "@/lib/types";

export default function ActivityFeed({ entries }: { entries: ActivityLogEntry[] }) {
  const recent = [...entries]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 20);

  return (
    <section className="card p-5">
      <h2 className="section-title flex items-center gap-2 text-base">
        <History className="h-4.5 w-4.5 text-indigo-600" />
        Actividad reciente
      </h2>
      {recent.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">Todavía no hay actividad registrada.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {recent.map((entry) => (
            <li key={entry.id} className="flex items-start gap-2.5">
              <Avatar name={entry.actor_name} size={24} />
              <div className="min-w-0">
                <p className="text-sm leading-snug text-slate-600">
                  <span className="font-medium text-slate-900">{entry.actor_name}</span>{" "}
                  {entry.action}
                </p>
                <p className="text-xs text-slate-400">{formatRelativeTime(entry.created_at)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
