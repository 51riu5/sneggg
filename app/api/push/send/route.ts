import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/auth";
import { sendPushTo } from "@/lib/push";
import type { Role } from "@/lib/types";

export async function POST(req: Request) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { to, title, body, url, tag } = await req.json().catch(() => ({}));
  if (!to || !title) return NextResponse.json({ error: "to + title required" }, { status: 400 });
  if (to !== "snegu" && to !== "ribtu") return NextResponse.json({ error: "invalid recipient" }, { status: 400 });

  const result = await sendPushTo(to as Role, { title, body, url, tag });
  return NextResponse.json(result);
}
