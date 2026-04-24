import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data, error } = await supabase
    .from("love_note")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notes: data });
}

export async function POST(req: Request) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { body } = await req.json().catch(() => ({ body: "" }));
  if (typeof body !== "string" || !body.trim()) {
    return NextResponse.json({ error: "please write something" }, { status: 400 });
  }
  const to_user = role === "snegu" ? "ribtu" : "snegu";
  const { data, error } = await supabase
    .from("love_note")
    .insert({ from_user: role, to_user, body: body.trim().slice(0, 1000) })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ note: data });
}

export async function PATCH(req: Request) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { ids } = await req.json().catch(() => ({ ids: [] }));
  if (!Array.isArray(ids) || !ids.length) return NextResponse.json({ ok: true });
  const { error } = await supabase
    .from("love_note")
    .update({ seen: true })
    .in("id", ids)
    .eq("to_user", role);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
