import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { today } from "@/lib/date";

export async function GET(req: Request) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const day = searchParams.get("day") ?? today();
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (from && to) {
    const { data, error } = await supabase
      .from("daily_log")
      .select("*")
      .gte("day", from)
      .lte("day", to)
      .order("day", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ logs: data });
  }

  const { data, error } = await supabase
    .from("daily_log")
    .select("*")
    .eq("day", day)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ log: data });
}

export async function POST(req: Request) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (role !== "snegu") return NextResponse.json({ error: "read-only for this role" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const day: string = body.day ?? today();

  const patch: Record<string, unknown> = { day };
  for (const k of ["checklist", "cups", "meals", "mood", "mood_note", "symptoms", "notes", "meds_taken"] as const) {
    if (k in body) patch[k] = body[k];
  }

  const { data, error } = await supabase
    .from("daily_log")
    .upsert(patch, { onConflict: "day" })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ log: data });
}
