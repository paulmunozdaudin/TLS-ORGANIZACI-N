export type Priority = "baja" | "media" | "alta";
export type AgendaStatus = "pendiente" | "en_discusion" | "resuelto";
export type TaskStatus = "pendiente" | "en_proceso" | "completada";

export interface Workspace {
  id: string;
  slug: string;
  name: string;
  created_at: string;
}

export interface NextMeeting {
  id: string;
  workspace_id: string;
  title: string;
  meeting_date: string | null;
  meeting_time: string | null;
  location: string | null;
  updated_by: string | null;
  updated_at: string;
}

export interface AgendaItem {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  added_by: string;
  priority: Priority;
  status: AgendaStatus;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface AgendaComment {
  id: string;
  agenda_item_id: string;
  author: string;
  body: string;
  created_at: string;
}

export interface Poll {
  id: string;
  agenda_item_id: string;
  question: string;
  created_by: string | null;
  created_at: string;
}

export interface PollOption {
  id: string;
  poll_id: string;
  label: string;
  position: number;
}

export interface PollVote {
  id: string;
  poll_id: string;
  poll_option_id: string;
  voter_name: string;
  created_at: string;
}

export interface Task {
  id: string;
  workspace_id: string;
  title: string;
  assignee: string | null;
  due_date: string | null;
  status: TaskStatus;
  position: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Idea {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  added_by: string;
  created_at: string;
}

export interface Minutes {
  id: string;
  workspace_id: string;
  meeting_date: string;
  attendees: string | null;
  decisions: string | null;
  tasks_assigned: string | null;
  next_steps: string | null;
  created_by: string;
  created_at: string;
}

export interface ActivityLogEntry {
  id: string;
  workspace_id: string;
  actor_name: string;
  action: string;
  created_at: string;
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

export const AGENDA_STATUS_LABEL: Record<AgendaStatus, string> = {
  pendiente: "Pendiente",
  en_discusion: "En discusión",
  resuelto: "Resuelto",
};

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  completada: "Completada",
};

export const TASK_COLUMNS: TaskStatus[] = ["pendiente", "en_proceso", "completada"];
