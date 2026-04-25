import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { sendPushTo } from "@/lib/push";

export async function GET() {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data, error } = await supabase
    .from("shared_task")
    .select("*")
    .order("done", { ascending: true })
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tasks: data });
}

export async function POST(req: Request) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const title = (body.title ?? "").toString().trim().slice(0, 200);
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  const insert: Record<string, unknown> = {
    title,
    detail: body.detail ? String(body.detail).slice(0, 1000) : null,
    due_at: body.due_at ?? null,
    created_by: role,
    assigned_to: body.assigned_to ?? null
  };

  const { data, error } = await supabase
    .from("shared_task")
    .insert(insert)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const otherRole = role === "snegu" ? "ribtu" : "snegu";
  const target = data.assigned_to ?? otherRole;
  if (target !== role) {
    sendPushTo(target, {
      title: `${role === "ribtu" ? "ribtu" : "snegu"} added a task`,
      body: title
    }).catch(() => {});
  }

  return NextResponse.json({ task: data });
}

export async function PATCH(req: Request) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const id = body.id;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if ("done" in body) {
    patch.done = !!body.done;
    patch.done_by = body.done ? role : null;
    patch.done_at = body.done ? new Date().toISOString() : null;
  }
  if ("title" in body) patch.title = String(body.title).slice(0, 200);
  if ("detail" in body) patch.detail = body.detail ? String(body.detail).slice(0, 1000) : null;
  if ("due_at" in body) patch.due_at = body.due_at ?? null;
  if ("assigned_to" in body) patch.assigned_to = body.assigned_to ?? null;

  const { data, error } = await supabase
    .from("shared_task")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ task: data });
}

export async function DELETE(req: Request) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { error } = await supabase.from("shared_task").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
