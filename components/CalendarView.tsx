"use client";

import { useEffect, useMemo, useState } from "react";
import { addMonths, format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isToday, parseISO } from "date-fns";
import { currentStreak, longestStreak, isCaredDay } from "@/lib/streak";
import type { DailyLog } from "@/lib/types";

export default function CalendarView({ editable = false }: { editable?: boolean }) {
  const [ref, setRef] = useState<Date>(new Date());
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  const monthStart = startOfMonth(ref);
  const monthEnd = endOfMonth(ref);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  useEffect(() => {
    const from = format(gridStart, "yyyy-MM-dd");
    const to = format(gridEnd, "yyyy-MM-dd");
    fetch(`/api/daily?from=${from}&to=${to}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setLogs(d.logs ?? []));
  }, [gridStart.getTime(), gridEnd.getTime()]);

  const byDay = useMemo(() => new Map(logs.map((l) => [l.day, l])), [logs]);

  const selectedLog = selected ? byDay.get(selected) : null;

  const streak = currentStreak(logs);
  const best = longestStreak(logs);

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-3 gap-4">
        <Stat label="current streak" value={`${streak} day${streak === 1 ? "" : "s"}`} note={streak ? "you are showing up" : "today's a fresh start"} />
        <Stat label="longest streak" value={`${best} days`} note="every day counted" />
        <Stat label="days logged" value={`${logs.length}`} note="look how far you've come" />
      </div>

      <div className="card p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setRef((r) => addMonths(r, -1))} className="w-9 h-9 rounded-full bg-white border border-accent/20 hover:bg-accent hover:text-white transition">‹</button>
          <h2 className="font-serif text-2xl">{format(ref, "MMMM yyyy")}</h2>
          <button onClick={() => setRef((r) => addMonths(r, 1))} className="w-9 h-9 rounded-full bg-white border border-accent/20 hover:bg-accent hover:text-white transition">›</button>
        </div>

        <div className="grid grid-cols-7 text-[11px] uppercase tracking-widest text-ink-mute mb-2">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <div key={i} className="text-center py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {days.map((d) => {
            const iso = format(d, "yyyy-MM-dd");
            const log = byDay.get(iso);
            const cared = isCaredDay(log);
            const inMonth = isSameMonth(d, ref);
            const todayFlag = isToday(d);
            return (
              <button
                key={iso}
                onClick={() => setSelected(iso)}
                className={`aspect-square rounded-xl relative flex items-center justify-center text-sm transition ${
                  inMonth ? "" : "opacity-35"
                } ${
                  selected === iso ? "ring-2 ring-accent" : ""
                } ${
                  cared
                    ? "bg-gradient-to-br from-accent/20 to-accent-lav/20 text-ink"
                    : "bg-white/70 hover:bg-white"
                }`}
              >
                <span className={todayFlag ? "font-semibold text-accent" : ""}>{format(d, "d")}</span>
                {cared && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-accent" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedLog && <DaySummary log={selectedLog} />}
      {selected && !selectedLog && (
        <div className="card p-5 text-center text-ink-mute italic">
          nothing logged for {format(parseISO(selected), "MMM d")}. that's okay — some days just pass quietly.
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="card p-5">
      <p className="kicker">{label}</p>
      <p className="font-serif text-3xl text-accent mt-2">{value}</p>
      <p className="text-sm text-ink-soft italic mt-1">{note}</p>
    </div>
  );
}

function DaySummary({ log }: { log: DailyLog }) {
  return (
    <div className="card p-6">
      <div className="flex items-baseline justify-between">
        <h3 className="font-serif text-2xl">{format(parseISO(log.day), "EEEE, MMM d")}</h3>
        {log.mood && <span className="text-sm text-ink-soft italic">felt: {log.mood}</span>}
      </div>
      <div className="grid sm:grid-cols-3 gap-4 mt-4 text-sm">
        <div>
          <p className="text-ink-mute">water</p>
          <p className="font-serif text-xl text-accent">{log.cups ?? 0} / 10</p>
        </div>
        <div>
          <p className="text-ink-mute">meals</p>
          <p className="font-serif text-xl text-accent">{log.meals?.length ?? 0} / 5</p>
        </div>
        <div>
          <p className="text-ink-mute">checklist</p>
          <p className="font-serif text-xl text-accent">{log.checklist?.length ?? 0} done</p>
        </div>
      </div>
      {log.notes && <p className="mt-4 font-serif italic text-ink-soft">"{log.notes}"</p>}
    </div>
  );
}
