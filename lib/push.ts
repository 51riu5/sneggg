import webpush from "web-push";
import { supabase } from "./supabase";
import type { Role } from "./types";

let configured = false;

function ensure() {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subj = process.env.VAPID_SUBJECT ?? "mailto:noreply@snegu.app";
  if (!pub || !priv) {
    console.warn("[push] VAPID keys not set; push disabled");
    return false;
  }
  webpush.setVapidDetails(subj, pub, priv);
  configured = true;
  return true;
}

export interface PushMsg {
  title: string;
  body?: string;
  url?: string;
  icon?: string;
  tag?: string;
}

export async function sendPushTo(role: Role, msg: PushMsg) {
  if (!ensure()) return { sent: 0, removed: 0 };
  const { data: subs, error } = await supabase
    .from("push_subscription")
    .select("*")
    .eq("who", role);
  if (error || !subs?.length) return { sent: 0, removed: 0 };

  const payload = JSON.stringify({
    title: msg.title,
    body: msg.body ?? "",
    url: msg.url ?? "/",
    icon: msg.icon ?? "/icon.png",
    tag: msg.tag ?? "snegu"
  });

  let sent = 0;
  let removed = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: s.endpoint,
          keys: { p256dh: s.p256dh, auth: s.auth }
        },
        payload
      );
      sent++;
    } catch (e: unknown) {
      const err = e as { statusCode?: number };
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await supabase.from("push_subscription").delete().eq("id", s.id);
        removed++;
      } else {
        console.warn("[push] error sending", err);
      }
    }
  }

  await supabase.from("notification_log").insert({
    who: role,
    kind: msg.tag ?? "general",
    title: msg.title,
    body: msg.body ?? null
  });

  return { sent, removed };
}
