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
