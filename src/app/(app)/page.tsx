"use client";

import { useRef, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import Header from "@/components/Header";
import NextMeetingHero from "@/components/NextMeetingHero";
import AgendaSection, { type AgendaSectionHandle } from "@/components/agenda/AgendaSection";
import TasksBoard from "@/components/tasks/TasksBoard";
import IdeasSection from "@/components/ideas/IdeasSection";
import MinutesSection from "@/components/minutes/MinutesSection";
import ActivityFeed from "@/components/activity/ActivityFeed";
import { useUser } from "@/components/providers/UserProvider";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useRealtimeList } from "@/hooks/useRealtimeList";
import { usePresence } from "@/hooks/usePresence";
import type { ActivityLogEntry, AgendaItem, Idea, Minutes, NextMeeting, Task } from "@/lib/types";

export default function Home() {
  const { userName } = useUser();
  const { workspace, loading: workspaceLoading, error } = useWorkspace();
  const workspaceId = workspace?.id ?? null;

  const [search, setSearch] = useState("");
  const agendaRef = useRef<AgendaSectionHandle>(null);

  const { data: meetings } = useRealtimeList<NextMeeting>({
    table: "next_meeting",
    workspaceId,
    orderBy: "updated_at",
    ascending: false,
  });
  const { data: agendaItems, setData: setAgendaItems } = useRealtimeList<AgendaItem>({
    table: "agenda_items",
    workspaceId,
  });
  const { data: tasks, setData: setTasks } = useRealtimeList<Task>({
    table: "tasks",
    workspaceId,
  });
  const { data: ideas } = useRealtimeList<Idea>({ table: "ideas", workspaceId });
  const { data: minutes } = useRealtimeList<Minutes>({ table: "minutes", workspaceId });
  const { data: activity } = useRealtimeList<ActivityLogEntry>({
    table: "activity_log",
    workspaceId,
  });

  const onlineUsers = usePresence(workspaceId, userName);
  const nextMeeting = meetings[0] ?? null;

  if (workspaceLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error || !workspaceId) {
    return <SetupNotice message={error} />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        nextMeeting={nextMeeting}
        onlineUsers={onlineUsers}
        search={search}
        onSearchChange={setSearch}
      />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
        <NextMeetingHero
          meeting={nextMeeting}
          workspaceId={workspaceId}
          onAddTopic={() => {
            document.getElementById("agenda")?.scrollIntoView({ behavior: "smooth", block: "start" });
            agendaRef.current?.openCreate();
          }}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <AgendaSection
              ref={agendaRef}
              items={agendaItems}
              setItems={setAgendaItems}
              workspaceId={workspaceId}
              search={search}
            />
            <TasksBoard tasks={tasks} setTasks={setTasks} workspaceId={workspaceId} search={search} />
            <IdeasSection ideas={ideas} workspaceId={workspaceId} search={search} />
            <MinutesSection minutes={minutes} workspaceId={workspaceId} search={search} />
          </div>

          <div className="lg:sticky lg:top-24 lg:self-start">
            <ActivityFeed entries={activity} />
          </div>
        </div>

        <footer className="pb-6 pt-2 text-center text-xs text-slate-400">
          TLS Organización · Espacio compartido de la company
        </footer>
      </main>
    </div>
  );
}

function SetupNotice({ message }: { message: string | null }) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="max-w-md rounded-3xl border border-amber-200 bg-amber-50 p-6 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" />
        <h1 className="mt-3 text-lg font-semibold text-amber-900">Falta configurar Supabase</h1>
        <p className="mt-2 text-sm text-amber-800">
          {message ||
            "Añade NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en tu archivo .env.local y ejecuta supabase/schema.sql en tu proyecto de Supabase."}
        </p>
      </div>
    </div>
  );
}
