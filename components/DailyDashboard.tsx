"use client";

import { useCallback, useEffect, useState } from "react";
import { today } from "@/lib/date";
import type { DailyLog, Mood } from "@/lib/types";
import { supabase } from "@/lib/supabase";

const CHECKLIST = [
  { icon: "☀️", label: "warm water when you wake up", time: "morning" },
  { icon: "💊", label: "morning dose of medicine", time: "with food" },
  { icon: "🥣", label: "soft breakfast (oats / idli / egg)", time: "8–9 am" },
  { icon: "🧂", label: "salt water gargle", time: "3× today" },
  { icon: "🍵", label: "something warm mid-morning", time: "11 am" },
  { icon: "🍛", label: "proper lunch", time: "1–2 pm" },
  { icon: "🍫", label: "small snack (chocolate / biscuit)", time: "4 pm" },
  { icon: "🫖", label: "steam inhalation, 5 min", time: "evening" },
  { icon: "💊", label: "evening dose of medicine", time: "with food" },
  { icon: "🥣", label: "dinner on time", time: "8 pm" },
  { icon: "🌙", label: "phone down early, sleep early", time: "10 pm" }
];

const MEALS = [
  { icon: "🌅", name: "breakfast" },
  { icon: "☕", name: "morning snack" },
  { icon: "🍛", name: "lunch" },
  { icon: "🍎", name: "evening snack" },
  { icon: "🌙", name: "dinner" }
];

const MOODS: { id: Mood; label: string }[] = [
  { id: "rough", label: "🥺 rough" },
  { id: "tired", label: "😮‍💨 tired" },
  { id: "okay", label: "🙂 okay" },
  { id: "better", label: "🌼 a bit better" },
  { id: "cozy", label: "💗 cozy" }
];

const MOOD_NOTES: Record<Mood, string> = {
  rough: "it's okay to have rough days. lie down, small sip of water, breathe. i'm with you.",
  tired: "tired is your body asking for rest. give in — it's wisdom, not weakness.",
  okay: "okay is perfect. not every day has to be great. proud of okay.",
  better: "yay 🌼 small wins count the most. keep going, my love.",
  cozy: "my favourite one. wrap yourself up and enjoy it."
};

const MESSAGES = [
  "start whenever you're ready",
  "one tiny step — proud of you already",
  "you're doing so well, keep going",
  "halfway through today. slow and gentle.",
  "more than half. look at you go.",
  "almost there, my love.",
  "every single one ticked. today, you won."
];

function burstHearts(anchor: HTMLElement) {
  const rect = anchor.getBoundingClientRect();
  for (let i = 0; i < 6; i++) {
    const h = document.createElement("span");
    h.textContent = ["❤", "♡", "✿"][Math.floor(Math.random() * 3)];
    Object.assign(h.style, {
      position: "fixed",
      left: rect.left + rect.width / 2 + "px",
      top: rect.top + rect.height / 2 + "px",
      fontSize: 14 + Math.random() * 10 + "px",
      color: "#e86a8f",
      pointerEvents: "none",
      zIndex: "80",
      transform: "translate(-50%, -50%)"
    });
    const dx = (Math.random() - 0.5) * 140;
    const dy = -(40 + Math.random() * 80);
    h.animate(
      [
        { transform: "translate(-50%, -50%) scale(0.6)", opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1.2)`, opacity: 0 }
      ],
      { duration: 1200, easing: "cubic-bezier(.2,.7,.3,1)" }
    );
    document.body.appendChild(h);
    setTimeout(() => h.remove(), 1200);
  }
}

export default function DailyDashboard() {
  const [log, setLog] = useState<DailyLog | null>(null);
  const [loading, setLoading] = useState(true);
  const day = today();

  const refresh = useCallback(async () => {
    const res = await fetch("/api/daily?day=" + day, { cache: "no-store" });
    const data = await res.json();
    setLog(data.log ?? null);
    setLoading(false);
  }, [day]);

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel("daily-" + day)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "daily_log", filter: `day=eq.${day}` },
        () => refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [day, refresh]);

  const save = async (patch: Partial<DailyLog>) => {
    const optimistic = { ...(log ?? { day } as DailyLog), ...patch } as DailyLog;
    setLog(optimistic);
    await fetch("/api/daily", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ day, ...patch })
    });
  };

  const toggleCheck = (i: number, e: React.MouseEvent<HTMLDivElement>) => {
    const list = new Set(log?.checklist ?? []);
    if (list.has(i)) list.delete(i);
    else {
      list.add(i);
      burstHearts(e.currentTarget);
    }
    save({ checklist: [...list] });
  };

  const setCups = (n: number, e?: React.MouseEvent<HTMLDivElement>) => {
    if (e && n > (log?.cups ?? 0)) burstHearts(e.currentTarget);
    save({ cups: n });
  };

  const toggleMeal = (i: number, e: React.MouseEvent<HTMLDivElement>) => {
    const list = new Set(log?.meals ?? []);
    if (list.has(i)) list.delete(i);
    else {
      list.add(i);
      burstHearts(e.currentTarget);
    }
    save({ meals: [...list] });
  };

  const setMood = (m: Mood, e: React.MouseEvent<HTMLButtonElement>) => {
    burstHearts(e.currentTarget);
    save({ mood: m });
  };

  const checkedCount = log?.checklist?.length ?? 0;
  const pct = Math.round((checkedCount / CHECKLIST.length) * 100);
  const messageIdx = Math.min(MESSAGES.length - 1, Math.floor(pct / 16));

  if (loading) {
    return (
      <div className="card p-8 text-center text-ink-mute">waking up, one sec…</div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="card p-6 sm:p-8">
        <div className="flex items-baseline justify-between mb-5">
          <div>
            <p className="kicker">today</p>
            <h2 className="font-serif text-3xl mt-2">gentle things</h2>
          </div>
          <span className="text-sm text-ink-mute">{checkedCount} / {CHECKLIST.length}</span>
        </div>

        <div className="space-y-2">
          {CHECKLIST.map((item, i) => {
            const done = log?.checklist?.includes(i);
            return (
              <div
                key={i}
                onClick={(e) => toggleCheck(i, e)}
                className={`flex items-center gap-4 px-5 py-4 rounded-2xl cursor-pointer border border-white/60 transition select-none ${
                  done ? "bg-accent/10" : "bg-white/60 hover:bg-white/90 hover:translate-x-1"
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-md border-2 border-accent flex items-center justify-center transition ${
                    done ? "bg-accent" : "bg-white"
                  }`}
                >
                  {done && (
                    <svg viewBox="0 0 16 16" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M3 8.5 L7 12 L13 4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span className="text-xl">{item.icon}</span>
                <span className={`flex-1 ${done ? "line-through text-ink-mute" : ""}`}>{item.label}</span>
                <span className="text-xs text-ink-mute">{item.time}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-6">
          <div className="h-1.5 bg-accent/15 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: pct + "%", background: "linear-gradient(90deg, #e86a8f, #b189c9)" }}
            />
          </div>
          <p className="mt-3 text-center font-serif italic text-ink-soft">{MESSAGES[messageIdx]}</p>
        </div>
      </section>

      <div className="grid md:grid-cols-3 gap-5">
        <section className="card p-6">
          <p className="kicker">water today</p>
          <h3 className="font-serif text-2xl mt-2">{log?.cups ?? 0} / 10 cups</h3>
          <p className="text-xs text-ink-mute mt-1">each cup ≈ 250ml</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {Array.from({ length: 10 }).map((_, i) => {
              const full = i < (log?.cups ?? 0);
              return (
                <div
                  key={i}
                  onClick={(e) => setCups(full ? i : i + 1, e)}
                  className="w-10 h-12 rounded-b-2xl rounded-t-md border-2 border-accent bg-white cursor-pointer relative overflow-hidden hover:-translate-y-0.5 transition"
                >
                  <div
                    className="absolute inset-x-0 bottom-0 transition-all duration-500"
                    style={{ height: full ? "100%" : "0%", background: "linear-gradient(to top, #e86a8f, #f0a7b8)" }}
                  />
                </div>
              );
            })}
          </div>
        </section>

        <section className="card p-6">
          <p className="kicker">meals</p>
          <h3 className="font-serif text-2xl mt-2">{log?.meals?.length ?? 0} / 5 done</h3>
          <p className="text-xs text-ink-mute mt-1">3 meals + 2 snacks</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {MEALS.map((m, i) => {
              const done = log?.meals?.includes(i);
              return (
                <div
                  key={i}
                  onClick={(e) => toggleMeal(i, e)}
                  title={m.name}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl cursor-pointer transition border-2 ${
                    done ? "bg-gradient-to-br from-accent to-accent-lav text-white border-transparent scale-105" : "bg-white border-dashed border-accent hover:-translate-y-0.5"
                  }`}
                >
                  {m.icon}
                </div>
              );
            })}
          </div>
        </section>

        <section className="card p-6">
          <p className="kicker">how you feel</p>
          <h3 className="font-serif text-2xl mt-2">any answer is a good answer</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {MOODS.map((m) => {
              const active = log?.mood === m.id;
              return (
                <button
                  key={m.id}
                  onClick={(e) => setMood(m.id, e)}
                  className={`px-3 py-2 text-sm rounded-full transition border ${
                    active
                      ? "bg-gradient-to-r from-accent to-accent-lav text-white border-transparent shadow-soft"
                      : "bg-white border-accent/25 text-ink-soft hover:-translate-y-0.5"
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
          <p className="mt-4 font-serif italic text-ink-soft min-h-6">
            {log?.mood ? MOOD_NOTES[log.mood] : " "}
          </p>
        </section>
      </div>
    </div>
  );
}
