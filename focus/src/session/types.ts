import type { DistractionKind } from '../signals/types';

export type Activity = 'study' | 'read' | 'work' | 'class' | 'other';
export type Mode = 'desktop' | 'mobile';

export type TimelineEntry =
  | { at: number; type: 'start' | 'pause' | 'resume' | 'end' }
  | { at: number; type: 'distraction'; kind: DistractionKind; durationMs: number }
  | { at: number; type: 'alert'; kind: DistractionKind };

export interface SessionRecord {
  id: string;
  activity: Activity;
  mode: Mode;
  startedAt: number;
  endedAt: number;
  /** Tiempo sin contar las pausas. */
  activeMs: number;
  distractions: Partial<Record<DistractionKind, number>>;
  alerts: number;
  timeline: TimelineEntry[];
  rating?: number;
}
