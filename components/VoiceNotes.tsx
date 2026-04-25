"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { supabase } from "@/lib/supabase";
import { publicUrl } from "@/lib/storage";
import { uploadFile } from "@/lib/upload";
import type { Role, VoiceNote } from "@/lib/types";

interface Props {
  role: Role;
}

const MAX_SECONDS = 60;

function fmt(s: number): string {
  const mm = Math.max(0, Math.floor(s / 60));
  const ss = Math.max(0, s % 60);
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function pickMime(): { mime: string; ext: string } {
  if (typeof window === "undefined") return { mime: "audio/webm", ext: "webm" };
  const candidates = [
    { mime: "audio/webm;codecs=opus", ext: "webm" },
    { mime: "audio/webm", ext: "webm" },
    { mime: "audio/mp4", ext: "m4a" },
    { mime: "audio/ogg;codecs=opus", ext: "ogg" }
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c.mime)) return c;
  }
  return { mime: "", ext: "webm" };
}

export default function VoiceNotes({ role }: Props) {
  const [voices, setVoices] = useState<VoiceNote[]>([]);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewExt, setPreviewExt] = useState("webm");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<number | null>(null);
  const stopTimeoutRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    const r = await fetch("/api/voices", { cache: "no-store" });
    const d = await r.json();
    setVoices(d.voices ?? []);
  }, []);

  useEffect(() => {
    refresh();
    const ch = supabase
      .channel("voices")
      .on("postgres_changes", { event: "*", schema: "public", table: "voice_note" }, () => refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [refresh]);

  const cleanupPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewBlob(null);
    setPreviewUrl(null);
    setCaption("");
  };

  const cleanupStream = () => {
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (stopTimeoutRef.current) {
      window.clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    mediaRef.current = null;
  };

  const start = async () => {
    setHint(null);
    cleanupPreview();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const { mime, ext } = pickMime();
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime || "audio/webm" });
        if (blob.size > 0) {
          const url = URL.createObjectURL(blob);
          setPreviewBlob(blob);
          setPreviewExt(ext);
          setPreviewUrl(url);
        }
        setRecording(false);
        cleanupStream();
      };
      mediaRef.current = rec;
      setSeconds(0);
      rec.start();
      setRecording(true);
      tickRef.current = window.setInterval(() => {
        setSeconds((s) => {
          const next = s + 1;
          if (next >= MAX_SECONDS) {
            stop();
            return MAX_SECONDS;
          }
          return next;
        });
      }, 1000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setHint(`couldn't access mic — ${msg.slice(0, 80)}`);
      cleanupStream();
      setRecording(false);
    }
  };

  const stop = () => {
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stop();
    } else {
      cleanupStream();
      setRecording(false);
    }
  };

  useEffect(() => () => {
    cleanupStream();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const send = async () => {
    if (!previewBlob) return;
    setUploading(true);
    setHint(null);
    try {
      const { storagePath } = await uploadFile(previewBlob, "voices", previewExt, previewBlob.type);
      const r = await fetch("/api/voices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storage_path: storagePath,
          duration_seconds: seconds,
          caption: caption.trim() || null
        })
      });
      if (!r.ok) {
        const text = await r.text();
        throw new Error(text);
      }
      cleanupPreview();
      setSeconds(0);
      setHint("sent ❤");
      setTimeout(() => setHint(null), 2200);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setHint(`couldn't send: ${msg.slice(0, 100)}`);
    }
    setUploading(false);
  };

  const onPlay = async (v: VoiceNote) => {
    if (v.to_user === role && !v.seen) {
      await fetch("/api/voices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: v.id, played: true })
      });
    }
  };

  const remove = async (id: string) => {
    if (!confirm("delete this voice note?")) return;
    await fetch(`/api/voices?id=${id}`, { method: "DELETE" });
  };

  const inbox = voices.filter((v) => v.to_user === role);
  const outbox = voices.filter((v) => v.from_user === role);

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <p className="kicker">record</p>
            <h3 className="font-serif text-2xl mt-2">a little voice note</h3>
            <p className="text-xs text-ink-mute italic">up to 60 seconds · sent to {role === "snegu" ? "ribtu" : "snegu"}</p>
          </div>
          <span className="font-script text-3xl text-accent tabular-nums">{fmt(seconds)}</span>
        </div>

        {!previewBlob ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {!recording ? (
              <button onClick={start} className="btn-primary flex-1 sm:flex-none">
                <span className="w-2.5 h-2.5 rounded-full bg-white/90" />
                <span className="ml-2">start recording</span>
              </button>
            ) : (
              <>
                <button onClick={stop} className="btn-primary flex-1 sm:flex-none">
                  stop
                </button>
                <span className="flex items-center gap-2 text-sm text-accent">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  recording…
                </span>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <audio src={previewUrl ?? undefined} controls className="w-full" />
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="add a soft caption (optional)"
              className="w-full rounded-full bg-white border border-accent/20 px-4 py-2.5 focus:outline-none focus:border-accent text-sm"
            />
            <div className="flex flex-wrap gap-2">
              <button onClick={send} disabled={uploading} className="btn-primary disabled:opacity-50">
                {uploading ? "sending…" : "send"}
              </button>
              <button
                onClick={() => {
                  cleanupPreview();
                  setSeconds(0);
                }}
                className="btn-ghost"
              >
                redo
              </button>
            </div>
          </div>
        )}
        {hint && <p className="mt-3 text-sm text-accent italic">{hint}</p>}
      </section>

      <section className="card p-6">
        <p className="kicker">received</p>
        <h3 className="font-serif text-2xl mt-2 mb-4">
          {inbox.length === 0 ? "nothing yet" : "for you"}
        </h3>
        <ul className="space-y-3">
          {inbox.map((v) => (
            <VoiceRow key={v.id} v={v} role={role} onPlay={onPlay} onDelete={remove} />
          ))}
        </ul>
      </section>

      {outbox.length > 0 && (
        <section className="card p-6">
          <p className="kicker">sent</p>
          <h3 className="font-serif text-2xl mt-2 mb-4">from you</h3>
          <ul className="space-y-3">
            {outbox.map((v) => (
              <VoiceRow key={v.id} v={v} role={role} onPlay={onPlay} onDelete={remove} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function VoiceRow({
  v,
  role,
  onPlay,
  onDelete
}: {
  v: VoiceNote;
  role: Role;
  onPlay: (v: VoiceNote) => void;
  onDelete: (id: string) => void;
}) {
  const url = publicUrl(v.storage_path);
  const fromMe = v.from_user === role;
  const isUnseen = v.to_user === role && !v.seen;
  return (
    <li
      className={`rounded-2xl p-4 border ${
        isUnseen ? "border-accent bg-accent/5" : "border-white/60 bg-white/70"
      }`}
    >
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-[11px] uppercase tracking-widest text-ink-mute">
          {fromMe ? "you" : v.from_user} · {formatDistanceToNow(parseISO(v.created_at), { addSuffix: true })}
          {v.duration_seconds ? ` · ${v.duration_seconds}s` : ""}
          {isUnseen && <span className="ml-2 text-accent">new</span>}
        </p>
        {fromMe && (
          <button onClick={() => onDelete(v.id)} className="text-xs text-ink-mute hover:text-accent">
            delete
          </button>
        )}
      </div>
      {v.caption && <p className="font-serif italic text-sm text-ink-soft mb-2">"{v.caption}"</p>}
      <audio src={url} controls className="w-full" onPlay={() => onPlay(v)} preload="metadata" />
    </li>
  );
}
