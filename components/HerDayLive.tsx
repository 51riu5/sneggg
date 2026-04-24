"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { today } from "@/lib/date";
import type { DailyLog, Mood } from "@/lib/types";

const CHECKLIST_LABELS = [
  "warm water when waking",
  "morning medicine",
  "soft breakfast",
  "salt gargle",
  "warm mid-morning drink",
  "lunch",
  "snack (choc / biscuit)",
  "steam inhalation",
  "evening medicine",
  "dinner",
  "sleep early"
];

const MEAL_NAMES = ["breakfast", "morning snack", "lunch", "evening snack", "dinner"];

const MOOD_EMOJI: Record<Mood, string> = {
  rough: "🥺",
  tired: "😮‍💨",
  okay: "🙂",
  better: "🌼",
  cozy: "💗"
};

export default function HerDayLive() {
  const [log, setLog] = useState<DailyLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [pulse, setPulse] = useState(false);
  const day = today();

  const refresh = useCallback(async () => {
    const r = await fetch("/api/daily?day=" + day, { cache: "no-store" });
    const d = await r.json();
    setLog(d.log ?? null);
    setLoading(false);
  }, [day]);

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel("ribtu-watch-" + day)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "daily_log", filter: `day=eq.${day}` },
        () => {
          setPulse(true);
          refresh();
          setTimeout(() => setPulse(false), 1500);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [day, refresh]);

  if (loading) {
    return <div className="card p-8 text-center text-ink-mute">connecting…</div>;
  }

  const cups = log?.cups ?? 0;
  const meals = log?.meals ?? [];
  const checks = log?.checklist ?? [];

  return (
    <div className={`space-y-6 transition ${pulse ? "ring-2 ring-accent/40 rounded-3xl" : ""}`}>
      <div className="grid sm:grid-cols-4 gap-4">
        <Stat label="water" value={`${cups} / 10`} note={cups >= 7 ? "doing so well 💧" : cups >= 4 ? "keep sipping" : "nudge her gently"} />
        <Stat label="meals" value={`${meals.length} / 5`} note={meals.length >= 3 ? "eating well today" : "check in with her"} />
        <Stat label="checklist" value={`${checks.length} / ${CHECKLIST_LABELS.length}`} note="small wins" />
        <Stat label="mood" value={log?.mood ? `${MOOD_EMOJI[log.mood]} ${log.mood}` : "—"} note={log?.mood ? "she told us" : "not logged yet"} />
      </div>

      <section className="card p-6">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="font-serif text-2xl">checklist · {format(new Date(day), "EEE, MMM d")}</h3>
          <span className="text-xs text-ink-mute">{pulse ? "just updated ✨" : "live"}</span>
        </div>
        <ul className="space-y-2">
          {CHECKLIST_LABELS.map((label, i) => {
            const done = checks.includes(i);
            return (
              <li
                key={i}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border border-white/60 ${
                  done ? "bg-accent/10" : "bg-white/60"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded border-2 border-accent flex items-center justify-center ${
                    done ? "bg-accent" : "bg-white"
                  }`}
                >
                  {done && (
                    <svg viewBox="0 0 16 16" className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M3 8.5 L7 12 L13 4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span className={`text-sm ${done ? "line-through text-ink-mute" : ""}`}>{label}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card p-6">
        <h3 className="font-serif text-2xl mb-3">meals</h3>
        <div className="flex flex-wrap gap-2">
          {MEAL_NAMES.map((n, i) => {
            const done = meals.includes(i);
            return (
              <span
                key={i}
                className={`px-3 py-1.5 rounded-full text-sm ${
                  done
                    ? "bg-gradient-to-r from-accent to-accent-lav text-white"
                    : "bg-white border border-accent/25 text-ink-soft"
                }`}
              >
                {n}
              </span>
            );
          })}
        </div>
      </section>

      {(log?.mood_note || log?.notes) && (
        <section className="card p-6">
          <h3 className="font-serif text-2xl mb-3">her words</h3>
          {log?.notes && <p className="font-serif italic text-lg leading-relaxed">"{log.notes}"</p>}
          {log?.mood_note && <p className="font-serif italic text-ink-soft mt-2">"{log.mood_note}"</p>}
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="card p-5">
      <p className="kicker">{label}</p>
      <p className="font-serif text-2xl text-accent mt-2">{value}</p>
      <p className="text-xs text-ink-mute italic mt-1">{note}</p>
    </div>
  );
}
