import { NextResponse } from "next/server";
import { pinToRole, setSessionRole } from "@/lib/auth";

export async function POST(req: Request) {
  const { pin } = await req.json().catch(() => ({ pin: "" }));
  if (typeof pin !== "string" || !pin) {
    return NextResponse.json({ error: "please enter the PIN" }, { status: 400 });
  }
  const role = pinToRole(pin.trim());
  if (!role) {
    return NextResponse.json({ error: "that PIN didn't work, my love" }, { status: 401 });
  }
  await setSessionRole(role);
  return NextResponse.json({ role });
}
