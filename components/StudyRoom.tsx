"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Role, StudyPresence, StudySession } from "@/lib/types";

interface Props {
  role: Role;
}

const PRESETS = [
  { label: "25 min", value: 25 * 60 },
  { label: "50 min", value: 50 * 60 },
  { label: "5 min break", value: 5 * 60 },
  { label: "15 min break", value: 15 * 60 }
];

function fmt(secs: number): string {
  const m = Math.max(0, Math.floor(secs / 60));
  const s = Math.max(0, secs % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function computeRemaining(s: StudySession | null): number {
  if (!s) return 0;
  if (s.is_running && s.started_at) {
    const elapsed = Math.floor((Date.now() - new Date(s.started_at).getTime()) / 1000);
    return Math.max(0, s.duration_seconds - elapsed);
  }
  if (typeof s.paused_remaining_seconds === "number") return s.paused_remaining_seconds;
  return s.duration_seconds;
}

export default function StudyRoom({ role }: Props) {
  const [session, setSession] = useState<StudySession | null>(null);
  const [presence, setPresence] = useState<StudyPresence[]>([]);
  const [remaining, setRemaining] = useState(0);
  const [busy, setBusy] = useState(false);
  const [chimed, setChimed] = useState(false);
  const meetLink = process.env.NEXT_PUBLIC_MEET_LINK ?? "";

  const refresh = useCallback(async () => {
    const r = await fetch("/api/study", { cache: "no-store" });
    const d = await r.json();
    setSession(d.session ?? null);
    setPresence(d.presence ?? []);
  }, []);

  useEffect(() => {
    refresh();
    const ch = supabase
      .channel("study")
      .on("postgres_changes", { event: "*", schema: "public", table: "study_session" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "study_presence" }, () => refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [refresh]);

  useEffect(() => {
    setRemaining(computeRemaining(session));
    if (!session?.is_running) return;
    const iv = setInterval(() => {
      setRemaining(computeRemaining(session));
    }, 250);
    return () => clearInterval(iv);
  }, [session]);

  useEffect(() => {
    if (session?.is_running && remaining === 0 && !chimed) {
      setChimed(true);
      try {
        const a = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const o = a.createOscillator();
        const g = a.createGain();
        o.connect(g);
        g.connect(a.destination);
        o.frequency.value = 660;
        g.gain.setValueAtTime(0.001, a.currentTime);
        g.gain.exponentialRampToValueAtTime(0.2, a.currentTime + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 1.2);
        o.start();
        o.stop(a.currentTime + 1.3);
      } catch {}
    }
    if (remaining > 0 && chimed) setChimed(false);
  }, [session, remaining, chimed]);

  useEffect(() => {
    let alive = true;
    const ping = () => {
      if (!alive) return;
      fetch("/api/study/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ in_room: true })
      }).catch(() => {});
    };
    ping();
    const iv = setInterval(ping, 30 * 1000);
    const onUnload = () => {
      navigator.sendBeacon?.(
        "/api/study/presence",
        new Blob([JSON.stringify({ in_room: false })], { type: "application/json" })
      );
    };
    window.addEventListener("beforeunload", onUnload);
    return () => {
      alive = false;
      clearInterval(iv);
      window.removeEventListener("beforeunload", onUnload);
      onUnload();
    };
  }, []);

  const action = async (a: string, extra?: Record<string, unknown>) => {
    setBusy(true);
    await fetch("/api/study", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: a, ...extra })
    });
    setBusy(false);
  };

  const sneg = presence.find((p) => p.who === "snegu");
  const ribtu = presence.find((p) => p.who === "ribtu");
  const totalDur = session?.is_running
    ? session.duration_seconds
    : session?.paused_remaining_seconds ?? session?.duration_seconds ?? 1500;
  const pct = totalDur > 0 ? (1 - remaining / totalDur) * 100 : 0;

  return (
    <div className="space-y-6">
      <section className="card p-8 text-center relative overflow-hidden">
        <div
          className="absolute inset-x-0 bottom-0 h-1.5 transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, #e86a8f, #b189c9)"
          }}
        />

        <p className="kicker">study room</p>
        <p className="font-script text-7xl sm:text-8xl text-accent mt-3 tabular-nums">
          {fmt(remaining)}
        </p>
        <p className="font-serif italic text-ink-soft mt-2">
          round {session?.round ?? 1}
          {session?.is_running ? " · ticking" : remaining === 0 ? " · time ❤" : " · paused"}
          {session?.who_last && (
            <> · {session.who_last === role ? "you" : session.who_last} last touched it</>
          )}
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => action("set_duration", { duration_seconds: p.value })}
              disabled={busy}
              className={`px-3 py-1.5 rounded-full text-xs border transition ${
                session?.duration_seconds === p.value
                  ? "bg-accent text-white border-transparent"
                  : "bg-white border-accent/25 hover:-translate-y-0.5"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {session?.is_running ? (
            <button onClick={() => action("pause")} disabled={busy} className="btn-primary">
              pause
            </button>
          ) : remaining > 0 && session?.paused_remaining_seconds ? (
            <button onClick={() => action("resume")} disabled={busy} className="btn-primary">
              resume
            </button>
          ) : (
            <button onClick={() => action("start")} disabled={busy} className="btn-primary">
              start
            </button>
          )}
          <button onClick={() => action("reset", { duration_seconds: 1500 })} disabled={busy} className="btn-ghost">
            reset
          </button>
          <button onClick={() => action("next_round")} disabled={busy} className="btn-ghost">
            next round
          </button>
        </div>
      </section>

      <div className="grid sm:grid-cols-2 gap-5">
        <section className="card p-6">
          <p className="kicker">who's here</p>
          <div className="mt-4 space-y-3">
            <PresenceRow label="snegu" me={role === "snegu"} p={sneg} />
            <PresenceRow label="ribtu" me={role === "ribtu"} p={ribtu} />
          </div>
        </section>

        <section className="card p-6">
          <p className="kicker">video</p>
          <h3 className="font-serif text-2xl mt-2">join the meet</h3>
          <p className="text-sm text-ink-soft italic mt-1">
            opens our google meet in a new tab. cam on, audio on, and we study together.
          </p>
          {meetLink ? (
            <a
              href={meetLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary mt-4 inline-flex"
            >
              open meet ↗
            </a>
          ) : (
            <p className="text-xs text-ink-mute mt-3">
              set <code>NEXT_PUBLIC_MEET_LINK</code> env var to your meet room link
            </p>
          )}
          <p className="text-[11px] text-ink-mute mt-3">
            tip: keep this tab open with the timer, meet in another tab, and we'll vibe through the whole session.
          </p>
        </section>
      </div>
    </div>
  );
}

function PresenceRow({ label, me, p }: { label: string; me: boolean; p?: StudyPresence }) {
  const fresh = p && Date.now() - new Date(p.last_seen).getTime() < 90 * 1000;
  const here = !!(p?.in_room && fresh);
  return (
    <div className="flex items-center justify-between rounded-xl px-4 py-3 bg-white/70">
      <div className="flex items-center gap-3">
        <span className={`w-2.5 h-2.5 rounded-full ${here ? "bg-emerald-500 animate-pulse" : "bg-ink-mute/40"}`} />
        <span className="font-serif text-lg">
          {label}
          {me && <span className="text-xs text-accent ml-2">(you)</span>}
        </span>
      </div>
      <span className="text-xs text-ink-mute">
        {here ? "here now" : p?.last_seen ? "offline" : "—"}
      </span>
    </div>
  );
}
