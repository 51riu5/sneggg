"use client";

import { useState } from "react";

const PRESETS = [
  "drink a cup of water, my love",
  "eat something soft please 🥣",
  "thinking of you, always",
  "so proud of you today",
  "you've got this, baby",
  "time for your medicine"
];

export default function QuickSendNote() {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [flash, setFlash] = useState(false);

  const send = async (text?: string) => {
    const msg = (text ?? body).trim();
    if (!msg) return;
    setSending(true);
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: msg })
    });
    setBody("");
    setSending(false);
    setFlash(true);
    setTimeout(() => setFlash(false), 2000);
  };

  return (
    <section className="card p-6">
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <p className="kicker">send her love</p>
          <h3 className="font-serif text-2xl mt-2">it'll pop up on her screen live</h3>
        </div>
        {flash && <span className="text-sm text-accent italic">sent ❤</span>}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => send(p)}
            className="px-3 py-1.5 rounded-full bg-white border border-accent/25 text-sm text-ink-soft hover:border-accent hover:-translate-y-0.5 transition"
          >
            {p}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              send();
            }
          }}
          placeholder="write your own…"
          className="flex-1 rounded-full bg-white border border-accent/20 px-4 py-3 focus:outline-none focus:border-accent"
        />
        <button onClick={() => send()} disabled={sending || !body.trim()} className="btn-primary disabled:opacity-50">
          send
        </button>
      </div>
    </section>
  );
}
