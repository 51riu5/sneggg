import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: session } = await supabase
    .from("study_session")
    .select("*")
    .eq("id", "main")
    .maybeSingle();
  const { data: presence } = await supabase.from("study_presence").select("*");
  return NextResponse.json({ session, presence });
}

export async function POST(req: Request) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const action = body.action as string;

  const { data: session } = await supabase
    .from("study_session")
    .select("*")
    .eq("id", "main")
    .single();
  if (!session) return NextResponse.json({ error: "no session row" }, { status: 500 });

  const patch: Record<string, unknown> = { who_last: role };

  if (action === "start") {
    const dur = typeof body.duration_seconds === "number" ? body.duration_seconds : session.duration_seconds;
    patch.duration_seconds = dur;
    patch.is_running = true;
    patch.started_at = new Date().toISOString();
    patch.paused_remaining_seconds = null;
  } else if (action === "pause") {
    if (session.is_running && session.started_at) {
      const elapsed = Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000);
      const remaining = Math.max(0, session.duration_seconds - elapsed);
      patch.is_running = false;
      patch.paused_remaining_seconds = remaining;
      patch.started_at = null;
    }
  } else if (action === "resume") {
    if (!session.is_running && typeof session.paused_remaining_seconds === "number") {
      patch.duration_seconds = session.paused_remaining_seconds;
      patch.started_at = new Date().toISOString();
      patch.is_running = true;
      patch.paused_remaining_seconds = null;
    }
  } else if (action === "reset") {
    patch.is_running = false;
    patch.started_at = null;
    patch.paused_remaining_seconds = null;
    patch.duration_seconds = typeof body.duration_seconds === "number" ? body.duration_seconds : 1500;
  } else if (action === "set_duration") {
    if (typeof body.duration_seconds !== "number") {
      return NextResponse.json({ error: "duration_seconds required" }, { status: 400 });
    }
    patch.duration_seconds = body.duration_seconds;
    patch.is_running = false;
    patch.started_at = null;
    patch.paused_remaining_seconds = null;
  } else if (action === "next_round") {
    patch.round = session.round + 1;
    patch.is_running = false;
    patch.started_at = null;
    patch.paused_remaining_seconds = null;
  } else if (action === "set_meet") {
    patch.meet_link = body.meet_link ?? null;
  } else {
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("study_session")
    .update(patch)
    .eq("id", "main")
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ session: data });
}
