"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { supabase } from "@/lib/supabase";
import { publicUrl } from "@/lib/storage";
import { uploadFile } from "@/lib/upload";
import type { Memory, Role } from "@/lib/types";

interface Props {
  role: Role;
}

export default function MemoriesGallery({ role }: Props) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [active, setActive] = useState<Memory | null>(null);
  const [editingCaption, setEditingCaption] = useState<string>("");
  const [takenOn, setTakenOn] = useState<string>("");
  const fileInput = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const r = await fetch("/api/memories", { cache: "no-store" });
    const d = await r.json();
    setMemories(d.memories ?? []);
  }, []);

  useEffect(() => {
    refresh();
    const ch = supabase
      .channel("memories")
      .on("postgres_changes", { event: "*", schema: "public", table: "memory" }, () => refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [refresh]);

  const onPick = () => fileInput.current?.click();

  const onFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setUploading(true);
    let i = 0;
    for (const file of Array.from(files)) {
      i++;
      setProgress(`uploading ${i} of ${files.length}…`);
      try {
        if (!file.type.startsWith("image/")) continue;
        if (file.size > 10 * 1024 * 1024) {
          setProgress(`${file.name} is too big (>10MB) — skipped`);
          continue;
        }
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const { storagePath } = await uploadFile(file, "memories", ext, file.type);
        await fetch("/api/memories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storage_path: storagePath,
            taken_on: new Date(file.lastModified || Date.now()).toISOString().slice(0, 10)
          })
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setProgress(`error: ${msg.slice(0, 80)}`);
      }
    }
    setUploading(false);
    setProgress(null);
    if (fileInput.current) fileInput.current.value = "";
  };

  const saveActive = async () => {
    if (!active) return;
    await fetch("/api/memories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: active.id, caption: editingCaption, taken_on: takenOn || null })
    });
    setActive(null);
  };

  const togglePin = async (m: Memory) => {
    await fetch("/api/memories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: m.id, pinned: !m.pinned })
    });
  };

  const remove = async (id: string) => {
    if (!confirm("delete this memory? this can't be undone.")) return;
    await fetch(`/api/memories?id=${id}`, { method: "DELETE" });
    setActive(null);
  };

  return (
    <div className="space-y-6">
      <section className="card p-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <p className="kicker">add photos</p>
          <p className="font-serif text-lg mt-1">
            jpg, png, webp · up to 10mb each · upload many at once
          </p>
          {progress && <p className="text-xs text-accent italic mt-1">{progress}</p>}
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
        <button onClick={onPick} disabled={uploading} className="btn-primary disabled:opacity-50">
          {uploading ? "uploading…" : "+ add photos"}
        </button>
      </section>

      {memories.length === 0 && !uploading && (
        <div className="card p-10 text-center">
          <p className="font-serif italic text-ink-soft">
            no memories yet. drop a few photos in here — they'll show up on her dashboard, one each day.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {memories.map((m) => {
          const url = publicUrl(m.storage_path);
          return (
            <button
              key={m.id}
              onClick={() => {
                setActive(m);
                setEditingCaption(m.caption ?? "");
                setTakenOn(m.taken_on ?? "");
              }}
              className="relative aspect-square rounded-2xl overflow-hidden group bg-bg-1"
            >
              <img
                src={url}
                alt={m.caption ?? "memory"}
                className="absolute inset-0 w-full h-full object-cover transition group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition" />
              {m.pinned && (
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-accent text-white text-[10px] uppercase tracking-widest">
                  pinned
                </span>
              )}
              {m.caption && (
                <span className="absolute inset-x-2 bottom-2 text-white text-xs font-serif italic line-clamp-2 text-left opacity-0 group-hover:opacity-100 transition">
                  {m.caption}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {active && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setActive(null)}
        >
          <div
            className="bg-cream rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto chat-scroll"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <img
                src={publicUrl(active.storage_path)}
                alt={active.caption ?? "memory"}
                className="w-full max-h-[60vh] object-contain bg-bg-2"
              />
              <button
                onClick={() => setActive(null)}
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-ink"
                aria-label="close"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-4">
              <label className="block">
                <span className="text-xs uppercase tracking-widest text-ink-mute">caption</span>
                <input
                  value={editingCaption}
                  onChange={(e) => setEditingCaption(e.target.value)}
                  placeholder="say something soft about this one…"
                  className="mt-1 w-full rounded-xl bg-white border border-accent/20 px-3 py-2 focus:outline-none focus:border-accent"
                />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-widest text-ink-mute">taken on</span>
                <input
                  type="date"
                  value={takenOn}
                  onChange={(e) => setTakenOn(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-white border border-accent/20 px-3 py-2 focus:outline-none focus:border-accent"
                />
              </label>
              <p className="text-xs text-ink-mute">
                added by {active.uploaded_by === role ? "you" : active.uploaded_by} ·{" "}
                {format(parseISO(active.created_at), "MMM d, yyyy")}
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <button onClick={saveActive} className="btn-primary text-sm">save</button>
                <button onClick={() => togglePin(active)} className="btn-ghost text-sm">
                  {active.pinned ? "unpin" : "pin (show more often)"}
                </button>
                <button onClick={() => remove(active.id)} className="text-sm text-ink-mute hover:text-accent ml-auto">
                  delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
