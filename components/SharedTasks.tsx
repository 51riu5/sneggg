"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format, formatDistanceToNow, isAfter, parseISO } from "date-fns";
import { supabase } from "@/lib/supabase";
import type { Role, SharedTask } from "@/lib/types";

interface Props {
  role: Role;
}

export default function SharedTasks({ role }: Props) {
  const [tasks, setTasks] = useState<SharedTask[]>([]);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState<string>("");
  const [assignTo, setAssignTo] = useState<"both" | Role>("both");
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const r = await fetch("/api/tasks", { cache: "no-store" });
    const d = await r.json();
    setTasks(d.tasks ?? []);
  }, []);

  useEffect(() => {
    refresh();
    const ch = supabase
      .channel("shared-tasks")
      .on("postgres_changes", { event: "*", schema: "public", table: "shared_task" }, () => refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [refresh]);

  const add = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!title.trim()) return;
    setAdding(true);
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        due_at: due ? new Date(due).toISOString() : null,
        assigned_to: assignTo === "both" ? null : assignTo
      })
    });
    setTitle("");
    setDue("");
    setAssignTo("both");
    setAdding(false);
    inputRef.current?.focus();
  };

  const toggle = async (t: SharedTask) => {
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: t.id, done: !t.done })
    });
  };

  const remove = async (id: string) => {
    if (!confirm("delete this task?")) return;
    await fetch(`/api/tasks?id=${id}`, { method: "DELETE" });
  };

  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done).slice(0, 5);

  return (
    <section className="card p-6">
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <p className="kicker">shared tasks</p>
          <h3 className="font-serif text-2xl mt-2">things, together</h3>
        </div>
        <span className="text-xs text-ink-mute">{open.length} open</span>
      </div>

      <form onSubmit={add} className="flex flex-col sm:flex-row gap-2 mb-5">
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="add something… (e.g. 'pick up prescription')"
          className="flex-1 rounded-full bg-white border border-accent/20 px-4 py-2.5 focus:outline-none focus:border-accent text-sm"
        />
        <input
          type="datetime-local"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          className="rounded-full bg-white border border-accent/20 px-3 py-2.5 focus:outline-none focus:border-accent text-sm"
          title="reminder time (optional)"
        />
        <select
          value={assignTo}
          onChange={(e) => setAssignTo(e.target.value as "both" | Role)}
          className="rounded-full bg-white border border-accent/20 px-3 py-2.5 focus:outline-none focus:border-accent text-sm"
          title="for whom"
        >
          <option value="both">both of us</option>
          <option value="snegu">for snegu</option>
          <option value="ribtu">for ribtu</option>
        </select>
        <button type="submit" disabled={adding || !title.trim()} className="btn-primary text-sm disabled:opacity-50">
          {adding ? "…" : "add"}
        </button>
      </form>

      {open.length === 0 && done.length === 0 && (
        <p className="text-ink-soft italic text-center py-6">no tasks yet — add the first one</p>
      )}

      <ul className="space-y-2">
        {open.map((t) => {
          const overdue = t.due_at && isAfter(new Date(), parseISO(t.due_at));
          const youAdded = t.created_by === role;
          return (
            <li
              key={t.id}
              className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-white/70 hover:bg-white transition border border-white/60"
            >
              <button
                onClick={() => toggle(t)}
                className="mt-1 w-5 h-5 rounded-md border-2 border-accent shrink-0 hover:bg-accent/10 transition"
                aria-label="mark done"
              />
              <div className="flex-1">
                <p className="text-sm">{t.title}</p>
                <div className="flex flex-wrap gap-2 mt-1 text-[11px] text-ink-mute items-center">
                  <span className={`px-2 py-0.5 rounded-full ${youAdded ? "bg-accent/15 text-accent" : "bg-ink/5"}`}>
                    {youAdded ? "you" : t.created_by} added
                  </span>
                  {t.assigned_to && (
                    <span className="px-2 py-0.5 rounded-full bg-accent-lav/15 text-accent-lav">
                      for {t.assigned_to === role ? "you" : t.assigned_to}
                    </span>
                  )}
                  {t.due_at && (
                    <span className={`px-2 py-0.5 rounded-full ${overdue ? "bg-red-100 text-red-600" : "bg-ink/5"}`}>
                      {overdue ? "overdue · " : "due "}{format(parseISO(t.due_at), "MMM d, h:mm a")}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => remove(t.id)} className="text-xs text-ink-mute hover:text-accent shrink-0">
                ×
              </button>
            </li>
          );
        })}
      </ul>

      {done.length > 0 && (
        <div className="mt-5 pt-4 border-t border-accent/10">
          <p className="text-xs uppercase tracking-widest text-ink-mute mb-2">recently done</p>
          <ul className="space-y-1">
            {done.map((t) => (
              <li key={t.id} className="text-sm text-ink-mute flex items-center gap-2">
                <span className="line-through">{t.title}</span>
                {t.done_by && (
                  <span className="text-[10px] text-accent">— {t.done_by === role ? "you" : t.done_by}</span>
                )}
                {t.done_at && (
                  <span className="text-[10px]">· {formatDistanceToNow(parseISO(t.done_at), { addSuffix: true })}</span>
                )}
                <button onClick={() => toggle(t)} className="text-[10px] text-ink-mute hover:text-accent ml-auto">
                  undo
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
