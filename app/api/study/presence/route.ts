import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));

  const patch: Record<string, unknown> = { last_seen: new Date().toISOString() };
  if ("in_room" in body) patch.in_room = !!body.in_room;
  if ("cam_on" in body) patch.cam_on = !!body.cam_on;

  const { data, error } = await supabase
    .from("study_presence")
    .update(patch)
    .eq("who", role)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ presence: data });
}
