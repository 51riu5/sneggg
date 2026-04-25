export type Role = "snegu" | "ribtu";

export type Mood = "rough" | "tired" | "okay" | "better" | "cozy";
export type Flow = "light" | "medium" | "heavy";

export interface DailyLog {
  id: string;
  day: string;
  checklist: number[];
  cups: number;
  meals: number[];
  mood: Mood | null;
  mood_note: string | null;
  symptoms: string[];
  notes: string | null;
  meds_taken: string[];
  created_at: string;
  updated_at: string;
}

export interface PeriodLog {
  id: string;
  start_date: string;
  end_date: string | null;
  flow: Flow | null;
  symptoms: string[];
  mood: Mood | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoveNote {
  id: string;
  from_user: Role;
  to_user: Role;
  body: string;
  seen: boolean;
  created_at: string;
}

export interface AiInsight {
  id: string;
  kind: "period" | "recovery" | "weekly";
  window_start: string | null;
  window_end: string | null;
  prompt_hash: string | null;
  response: string;
  created_at: string;
}

export interface SharedTask {
  id: string;
  title: string;
  detail: string | null;
  due_at: string | null;
  created_by: Role;
  assigned_to: Role | null;
  done: boolean;
  done_by: Role | null;
  done_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudySession {
  id: string;
  mode: "pomodoro" | "free";
  duration_seconds: number;
  started_at: string | null;
  paused_remaining_seconds: number | null;
  is_running: boolean;
  round: number;
  who_last: Role | null;
  meet_link: string | null;
  updated_at: string;
}

export interface StudyPresence {
  who: Role;
  in_room: boolean;
  cam_on: boolean;
  last_seen: string;
}

export interface PushSubscription {
  id: string;
  who: Role;
  endpoint: string;
  p256dh: string;
  auth: string;
  device_label: string | null;
  created_at: string;
}

export interface Memory {
  id: string;
  storage_path: string;
  caption: string | null;
  taken_on: string | null;
  uploaded_by: Role;
  pinned: boolean;
  created_at: string;
}

export interface VoiceNote {
  id: string;
  storage_path: string;
  duration_seconds: number | null;
  from_user: Role;
  to_user: Role;
  caption: string | null;
  seen: boolean;
  played_at: string | null;
  created_at: string;
}
