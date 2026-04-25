import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const sub = body?.subscription;
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return NextResponse.json({ error: "invalid subscription" }, { status: 400 });
  }

  const row = {
    who: role,
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
    device_label: body.device_label ?? null
  };

  const { data, error } = await supabase
    .from("push_subscription")
    .upsert(row, { onConflict: "endpoint" })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ subscription: data });
}

export async function DELETE(req: Request) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const endpoint = body?.endpoint;
  if (!endpoint) return NextResponse.json({ error: "endpoint required" }, { status: 400 });
  const { error } = await supabase
    .from("push_subscription")
    .delete()
    .eq("endpoint", endpoint)
    .eq("who", role);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
