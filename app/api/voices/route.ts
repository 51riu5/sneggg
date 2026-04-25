import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { MEDIA_BUCKET } from "@/lib/storage";
import { sendPushTo } from "@/lib/push";

export async function GET() {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data, error } = await supabase
    .from("voice_note")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ voices: data });
}

export async function POST(req: Request) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const storage_path = String(body.storage_path ?? "").trim();
  if (!storage_path) return NextResponse.json({ error: "storage_path required" }, { status: 400 });

  const to = role === "snegu" ? "ribtu" : "snegu";

  const insert: Record<string, unknown> = {
    storage_path,
    duration_seconds: typeof body.duration_seconds === "number" ? Math.round(body.duration_seconds) : null,
    from_user: role,
    to_user: to,
    caption: body.caption ? String(body.caption).slice(0, 200) : null
  };
  const { data, error } = await supabase
    .from("voice_note")
    .insert(insert)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  sendPushTo(to as "snegu" | "ribtu", {
    title: `${role} sent a voice note ❤`,
    body: data.caption ?? "tap to listen",
    tag: `voice-${data.id}`,
    url: `/${to}/voices`
  }).catch(() => {});

  return NextResponse.json({ voice: data });
}

export async function PATCH(req: Request) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const patch: Record<string, unknown> = {};
  if (body.played === true) {
    patch.seen = true;
    patch.played_at = new Date().toISOString();
  }
  const { data, error } = await supabase
    .from("voice_note")
    .update(patch)
    .eq("id", body.id)
    .eq("to_user", role)
    .select()
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ voice: data });
}

export async function DELETE(req: Request) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { data: row } = await supabase
    .from("voice_note")
    .select("storage_path,from_user")
    .eq("id", id)
    .maybeSingle();
  if (!row) return NextResponse.json({ ok: true });
  if (row.from_user !== role) {
    return NextResponse.json({ error: "only sender can delete" }, { status: 403 });
  }
  if (row.storage_path) {
    await supabase.storage.from(MEDIA_BUCKET).remove([row.storage_path]).catch(() => {});
  }
  const { error } = await supabase.from("voice_note").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
