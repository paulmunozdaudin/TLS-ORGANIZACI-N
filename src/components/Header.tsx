"use client";

import { Search, Sparkles, Users } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import type { NextMeeting } from "@/lib/types";
import { formatMeetingDate } from "@/lib/date";

export default function Header({
  nextMeeting,
  onlineUsers,
  search,
  onSearchChange,
}: {
  nextMeeting: NextMeeting | null;
  onlineUsers: string[];
  search: string;
  onSearchChange: (value: string) => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight text-slate-900 sm:text-lg">
                TLS Organización
              </h1>
              <p className="text-xs text-slate-500">
                Organización de reuniones de la company
              </p>
            </div>
          </div>

          {nextMeeting && (
            <div className="hidden rounded-xl bg-slate-50 px-3 py-1.5 text-xs text-slate-600 ring-1 ring-slate-200 sm:block">
              <span className="font-medium text-slate-800">{nextMeeting.title}</span>
              {nextMeeting.meeting_date && (
                <span> · {formatMeetingDate(nextMeeting.meeting_date, nextMeeting.meeting_time)}</span>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            {onlineUsers.length > 0 && (
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 py-1 pl-1.5 pr-3 ring-1 ring-emerald-200">
                <div className="flex -space-x-1.5">
                  {onlineUsers.slice(0, 4).map((name) => (
                    <Avatar key={name} name={name} size={22} ring />
                  ))}
                </div>
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-700">
                  <Users className="h-3 w-3" />
                  {onlineUsers.length}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar temas, tareas o actas…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
          />
        </div>
      </div>
    </header>
  );
}
