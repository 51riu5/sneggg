import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data, error } = await supabase
    .from("period_log")
    .select("*")
    .order("start_date", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ periods: data });
}

export async function POST(req: Request) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (role !== "snegu") return NextResponse.json({ error: "read-only for this role" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  for (const k of ["id", "start_date", "end_date", "flow", "symptoms", "mood", "notes"] as const) {
    if (k in body) patch[k] = body[k];
  }
  if (!patch.start_date && !patch.id) {
    return NextResponse.json({ error: "start_date required" }, { status: 400 });
  }

  let q;
  if (patch.id) {
    q = supabase.from("period_log").update(patch).eq("id", patch.id).select().single();
  } else {
    q = supabase.from("period_log").insert(patch).select().single();
  }
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ period: data });
}

export async function DELETE(req: Request) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (role !== "snegu") return NextResponse.json({ error: "read-only for this role" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { error } = await supabase.from("period_log").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
