"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { supabase } from "@/lib/supabase";
import type { LoveNote, Role } from "@/lib/types";

interface Props {
  role: Role;
}

export default function NotesBoard({ role }: Props) {
  const [notes, setNotes] = useState<LoveNote[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    const r = await fetch("/api/notes", { cache: "no-store" });
    const d = await r.json();
    setNotes((d.notes ?? []).slice().reverse());
  }, []);

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel("notes-board")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "love_note" }, () => refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
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
    <div className="card p-4 sm:p-6 max-w-2xl mx-auto flex flex-col" style={{ height: "min(70vh, 640px)" }}>
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto pr-2 space-y-3 chat-scroll"
        style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(232,106,143,0.45) transparent" }}
      >
        {notes.length === 0 && (
          <p className="text-center font-serif italic text-ink-soft py-8">
            no letters yet — write the first one
          </p>
        )}
        {notes.map((n) => {
          const mine = n.from_user === role;
          return (
            <div
              key={n.id}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`rounded-2xl p-3 sm:p-4 max-w-[85%] ${
                  mine
                    ? "bg-gradient-to-br from-accent to-accent-lav text-white"
                    : "bg-white border border-accent/20"
                }`}
              >
                <p className="text-[10px] uppercase tracking-widest opacity-70">
                  {mine ? "you" : n.from_user} · {formatDistanceToNow(parseISO(n.created_at), { addSuffix: true })}
                </p>
                <p className="font-serif text-base sm:text-lg leading-relaxed mt-1 break-words whitespace-pre-wrap">
                  {n.body}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex gap-2 shrink-0">
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
