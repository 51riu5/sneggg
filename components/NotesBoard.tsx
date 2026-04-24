"use client";

import { useEffect, useState, useRef } from "react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { supabase } from "@/lib/supabase";
import type { LoveNote } from "@/lib/types";

export default function NotesBoard() {
  const [notes, setNotes] = useState<LoveNote[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const refresh = async () => {
    const r = await fetch("/api/notes", { cache: "no-store" });
    const d = await r.json();
    setNotes(d.notes ?? []);
  };

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel("notes-board")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "love_note" }, () => refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [notes.length]);

  const send = async () => {
    if (!body.trim()) return;
    setSending(true);
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body })
    });
    setBody("");
    setSending(false);
  };

  return (
    <div className="card p-6 max-w-2xl mx-auto">
      <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-2 flex flex-col-reverse">
        <div ref={endRef} />
        {notes.map((n) => (
          <div
            key={n.id}
            className={`rounded-2xl p-4 max-w-[85%] ${
              n.from_user === "snegu"
                ? "self-end bg-gradient-to-br from-accent to-accent-lav text-white"
                : "self-start bg-white border border-accent/20"
            }`}
            style={{ alignSelf: n.from_user === "snegu" ? "flex-end" : "flex-start" }}
          >
            <p className="text-[10px] uppercase tracking-widest opacity-70">
              {n.from_user === "ribtu" ? "ribtu" : "snegu"} · {formatDistanceToNow(parseISO(n.created_at), { addSuffix: true })}
            </p>
            <p className="font-serif text-lg leading-relaxed mt-1">{n.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="write something gentle…"
          className="flex-1 rounded-full bg-white border border-accent/20 px-4 py-3 focus:outline-none focus:border-accent"
        />
        <button onClick={send} disabled={sending || !body.trim()} className="btn-primary disabled:opacity-50">
          send
        </button>
      </div>
    </div>
  );
}
