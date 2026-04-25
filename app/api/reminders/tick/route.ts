import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { sendPushTo } from "@/lib/push";
import { today } from "@/lib/date";

interface ScheduledReminder {
  kind: string;
  hour: number;
  minute: number;
  title: string;
  body: string;
}

const SCHEDULE: ScheduledReminder[] = [
  { kind: "wake_water",   hour: 8,  minute: 0,  title: "good morning, snegu ❤", body: "warm water before anything else" },
  { kind: "meds_morning", hour: 9,  minute: 0,  title: "morning medicine time", body: "with breakfast, gently" },
  { kind: "lunch",        hour: 13, minute: 30, title: "lunch reminder", body: "even small portions count" },
  { kind: "snack",        hour: 16, minute: 0,  title: "snack time", body: "biscuit / chocolate / fruit — your choice" },
  { kind: "steam",        hour: 18, minute: 30, title: "steam inhalation", body: "5 mins, eyes closed, breathe" },
  { kind: "meds_evening", hour: 20, minute: 0,  title: "evening medicine", body: "with dinner, on time" },
  { kind: "dinner",       hour: 20, minute: 30, title: "dinner reminder", body: "no skipping, my love" },
  { kind: "sleep",        hour: 22, minute: 0,  title: "sleep early tonight", body: "phone down, lights low" }
];

function withinWindow(h: number, m: number, nowH: number, nowM: number): boolean {
  const target = h * 60 + m;
  const now = nowH * 60 + nowM;
  return now >= target && now < target + 30;
}

export async function POST() {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const now = new Date();
  const nowH = now.getHours();
  const nowM = now.getMinutes();
  const day = today();

  const fired: string[] = [];

  for (const r of SCHEDULE) {
    if (!withinWindow(r.hour, r.minute, nowH, nowM)) continue;
    const dayKey = `${r.kind}-${day}`;
    const { data: already } = await supabase
      .from("notification_log")
      .select("id")
      .eq("who", "snegu")
      .eq("kind", dayKey)
      .gte("sent_at", `${day}T00:00:00`)
      .limit(1)
      .maybeSingle();
    if (already) continue;
    await sendPushTo("snegu", { title: r.title, body: r.body, tag: dayKey, url: "/snegu" });
    await supabase
      .from("notification_log")
      .update({ kind: dayKey })
      .eq("kind", "general")
      .eq("title", r.title)
      .eq("who", "snegu");
    fired.push(r.kind);
  }

  const inFifteen = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
  const { data: dueTasks } = await supabase
    .from("shared_task")
    .select("*")
    .eq("done", false)
    .not("due_at", "is", null)
    .lte("due_at", inFifteen)
    .gte("due_at", now.toISOString());

  for (const t of dueTasks ?? []) {
    const tag = `task-${t.id}`;
    const { data: alreadyTask } = await supabase
      .from("notification_log")
      .select("id")
      .eq("kind", tag)
      .limit(1)
      .maybeSingle();
    if (alreadyTask) continue;
    const target = (t.assigned_to ?? (t.created_by === "snegu" ? "ribtu" : "snegu")) as "snegu" | "ribtu";
    await sendPushTo(target, {
      title: "task coming up",
      body: t.title,
      tag,
      url: "/" + target
    });
    fired.push(`task:${t.title}`);
  }

  return NextResponse.json({ fired });
}
