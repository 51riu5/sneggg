"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { publicUrl } from "@/lib/storage";
import type { Memory, Role } from "@/lib/types";

interface Props {
  role: Role;
  basePath: "/snegu" | "/ribtu";
}

const LINES = [
  "soft little reminder of us.",
  "this day was beautiful.",
  "remember this?",
  "us, somewhere kind.",
  "a moment i love.",
  "saved for the heavy days."
];

function pickFor(today: string, count: number): number {
  let h = 0;
  for (const c of today) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return count > 0 ? h % count : 0;
}

export default function MemoryOfDay({ role, basePath }: Props) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/memories", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setMemories(d.memories ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return null;

  if (memories.length === 0) {
    return (
      <div className="card p-6 text-center">
        <p className="kicker">memories</p>
        <h3 className="font-serif text-2xl mt-2">no photos yet</h3>
        <p className="text-sm text-ink-soft italic mt-2 max-w-md mx-auto">
          {role === "ribtu"
            ? "upload some of us — a few photos a week, and one shows up here every day."
            : "ribtu hasn't added any yet. soon."}
        </p>
        <Link href={`${basePath}/memories`} className="btn-ghost mt-4 inline-flex">
          {role === "ribtu" ? "add photos" : "open memories"}
        </Link>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const idx = pickFor(today, memories.length);
  const m = memories[idx];
  const url = publicUrl(m.storage_path);
  const lineIdx = pickFor(today + "x", LINES.length);

  return (
    <Link
      href={`${basePath}/memories`}
      className="card overflow-hidden block group"
    >
      <div className="relative aspect-[4/3] sm:aspect-[16/9] bg-bg-1 overflow-hidden">
        <img
          src={url}
          alt={m.caption ?? "a memory"}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 text-white">
          <p className="font-serif italic text-lg sm:text-xl drop-shadow">
            {m.caption ?? LINES[lineIdx]}
          </p>
          {m.taken_on && (
            <p className="text-[11px] uppercase tracking-[0.25em] opacity-80 mt-1">
              {format(parseISO(m.taken_on), "MMM d, yyyy")}
            </p>
          )}
        </div>
        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur text-[10px] uppercase tracking-widest text-accent">
          memory of the day
        </div>
      </div>
    </Link>
  );
}
