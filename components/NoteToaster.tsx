"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { LoveNote, Role } from "@/lib/types";

export default function NoteToaster({ role }: { role: Role }) {
  const [toasts, setToasts] = useState<LoveNote[]>([]);

  useEffect(() => {
    const channel = supabase
      .channel("love-notes-" + role)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "love_note", filter: `to_user=eq.${role}` },
        (payload) => {
          const n = payload.new as LoveNote;
          setToasts((prev) => [n, ...prev]);
          setTimeout(() => {
            setToasts((prev) => prev.filter((x) => x.id !== n.id));
          }, 9000);
          fetch("/api/notes", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: [n.id] })
          }).catch(() => {});
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [role]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="card p-4 fade-up shadow-lift"
          style={{ background: "linear-gradient(135deg, #ffffff, #ffe9ef)" }}
        >
          <p className="text-[11px] uppercase tracking-[0.25em] text-accent">
            {t.from_user === "ribtu" ? "from ribtu ❤" : "from snegu ❤"}
          </p>
          <p className="font-serif italic text-lg mt-2 leading-relaxed">{t.body}</p>
        </div>
      ))}
    </div>
  );
}
