import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { MEDIA_BUCKET } from "@/lib/storage";

export async function GET() {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data, error } = await supabase
    .from("memory")
    .select("*")
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ memories: data });
}

export async function POST(req: Request) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const storage_path = String(body.storage_path ?? "").trim();
  if (!storage_path) return NextResponse.json({ error: "storage_path required" }, { status: 400 });

  const insert: Record<string, unknown> = {
    storage_path,
    caption: body.caption ? String(body.caption).slice(0, 500) : null,
    taken_on: body.taken_on ?? null,
    uploaded_by: role,
    pinned: !!body.pinned
  };
  const { data, error } = await supabase
    .from("memory")
    .insert(insert)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ memory: data });
}

export async function PATCH(req: Request) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const patch: Record<string, unknown> = {};
  if ("caption" in body) patch.caption = body.caption ? String(body.caption).slice(0, 500) : null;
  if ("taken_on" in body) patch.taken_on = body.taken_on ?? null;
  if ("pinned" in body) patch.pinned = !!body.pinned;
  const { data, error } = await supabase
    .from("memory")
    .update(patch)
    .eq("id", body.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ memory: data });
}

export async function DELETE(req: Request) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { data: row } = await supabase.from("memory").select("storage_path").eq("id", id).maybeSingle();
  if (row?.storage_path) {
    await supabase.storage.from(MEDIA_BUCKET).remove([row.storage_path]).catch(() => {});
  }
  const { error } = await supabase.from("memory").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
