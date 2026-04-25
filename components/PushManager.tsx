"use client";

import { useEffect, useState } from "react";
import type { Role } from "@/lib/types";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

interface Props {
  role: Role;
}

export default function PushManager({ role }: Props) {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setSupported(ok);
    if (!ok) return;

    (async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        const sub = await reg.pushManager.getSubscription();
        setEnabled(!!sub && Notification.permission === "granted");
      } catch {
        setSupported(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const tick = async () => {
      try {
        await fetch("/api/reminders/tick", { method: "POST" });
      } catch {}
    };
    tick();
    const iv = setInterval(() => { if (!cancelled) tick(); }, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [enabled]);

  const enable = async () => {
    setBusy(true);
    setHint("");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setHint("permission denied — you can re-enable in browser settings");
        setBusy(false);
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!pub) {
        setHint("server missing VAPID key");
        setBusy(false);
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(pub) as BufferSource
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          device_label: navigator.userAgent.slice(0, 80)
        })
      });
      if (!res.ok) throw new Error(await res.text());
      setEnabled(true);
      setHint("notifications on — i'll nudge you gently");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setHint(`couldn't enable: ${msg.slice(0, 80)}`);
    }
    setBusy(false);
  };

  const disable = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint })
        });
        await sub.unsubscribe();
      }
      setEnabled(false);
      setHint("notifications off");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setHint(`couldn't disable: ${msg.slice(0, 80)}`);
    }
    setBusy(false);
  };

  const test = async () => {
    setBusy(true);
    try {
      await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: role,
          title: "test, my love ❤",
          body: "if you can read this, notifications are working",
          tag: "test"
        })
      });
      setHint("test sent — should arrive in a moment");
    } finally {
      setBusy(false);
    }
  };

  if (!supported) {
    return null;
  }

  return (
    <div className="card p-5 flex items-center justify-between gap-4">
      <div>
        <p className="kicker">notifications</p>
        <p className="font-serif text-lg mt-1">
          {enabled ? "you'll get gentle reminders even when the app is closed" : "let me nudge you about meds, water, and sleep"}
        </p>
        {hint && <p className="text-xs text-ink-mute italic mt-1">{hint}</p>}
      </div>
      <div className="flex flex-col gap-2 shrink-0">
        {enabled ? (
          <>
            <button onClick={test} disabled={busy} className="btn-ghost text-xs disabled:opacity-50">test</button>
            <button onClick={disable} disabled={busy} className="text-xs text-ink-mute hover:text-accent">turn off</button>
          </>
        ) : (
          <button onClick={enable} disabled={busy} className="btn-primary text-sm disabled:opacity-50">
            {busy ? "..." : "enable"}
          </button>
        )}
      </div>
    </div>
  );
}
