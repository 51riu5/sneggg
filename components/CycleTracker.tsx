"use client";

import { useEffect, useState } from "react";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import type { Flow, PeriodLog } from "@/lib/types";

const SYMPTOMS = ["cramps", "headache", "bloating", "tender", "fatigue", "nausea", "mood swings", "back pain", "acne", "craving"];
const FLOWS: Flow[] = ["light", "medium", "heavy"];

interface CycleAnalysis {
  averageCycleLength: number | null;
  averagePeriodLength: number | null;
  predictedNextStart: string | null;
  predictedFertileWindow: [string, string] | null;
  commonSymptoms: string[];
}

export default function CycleTracker({ editable = false }: { editable?: boolean }) {
  const [periods, setPeriods] = useState<PeriodLog[]>([]);
  const [insight, setInsight] = useState<string | null>(null);
  const [summary, setSummary] = useState<CycleAnalysis | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);

  const [startDate, setStartDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState<string>("");
  const [flow, setFlow] = useState<Flow | "">("");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const refresh = async () => {
    const r = await fetch("/api/period", { cache: "no-store" });
    const d = await r.json();
    setPeriods(d.periods ?? []);
  };

  useEffect(() => {
    refresh();
  }, []);

  const toggleSymptom = (s: string) => {
    setSymptoms((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const save = async () => {
    const body = {
      start_date: startDate,
      end_date: endDate || null,
      flow: flow || null,
      symptoms,
      notes
    };
    await fetch("/api/period", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    setEndDate("");
    setFlow("");
    setSymptoms([]);
    setNotes("");
    refresh();
  };

  const remove = async (id: string) => {
    if (!confirm("remove this entry?")) return;
    await fetch(`/api/period?id=${id}`, { method: "DELETE" });
    refresh();
  };

  const ask = async () => {
    setLoadingAI(true);
    setInsight(null);
    const r = await fetch("/api/insight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "period" })
    });
    const d = await r.json();
    setLoadingAI(false);
    if (d.error) {
      setInsight("couldn't reach the ai just now. try again in a bit.");
      return;
    }
    setSummary(d.summary ?? null);
    setInsight(d.response ?? null);
  };

  const last = periods[0];
  const daysSince = last ? differenceInCalendarDays(new Date(), parseISO(last.start_date)) : null;

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-3 gap-4">
        <Pill label="cycles logged" value={String(periods.length)} />
        <Pill label="last period started" value={last ? format(parseISO(last.start_date), "MMM d") : "—"} />
        <Pill label="days since" value={daysSince !== null ? `${daysSince} day${daysSince === 1 ? "" : "s"}` : "—"} />
      </div>

      {editable && (
        <div className="card p-6">
          <h3 className="font-serif text-2xl mb-4">log a cycle</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs uppercase tracking-widest text-ink-mute">start date</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 w-full rounded-xl bg-white border border-accent/20 px-3 py-2 focus:outline-none focus:border-accent"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-widest text-ink-mute">end date (optional)</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 w-full rounded-xl bg-white border border-accent/20 px-3 py-2 focus:outline-none focus:border-accent"
              />
            </label>
          </div>

          <div className="mt-4">
            <p className="text-xs uppercase tracking-widest text-ink-mute mb-2">flow</p>
            <div className="flex gap-2">
              {FLOWS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFlow(flow === f ? "" : f)}
                  className={`px-4 py-2 rounded-full text-sm border transition ${
                    flow === f
                      ? "bg-gradient-to-r from-accent to-accent-lav text-white border-transparent"
                      : "bg-white border-accent/25 hover:-translate-y-0.5"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs uppercase tracking-widest text-ink-mute mb-2">symptoms</p>
            <div className="flex flex-wrap gap-2">
              {SYMPTOMS.map((s) => {
                const on = symptoms.includes(s);
                return (
                  <button
                    key={s}
                    onClick={() => toggleSymptom(s)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition ${
                      on ? "bg-accent text-white border-transparent" : "bg-white border-accent/25"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="anything else you want to note (optional)"
            className="mt-4 w-full rounded-xl bg-white border border-accent/20 px-3 py-2 text-sm focus:outline-none focus:border-accent min-h-20"
          />

          <div className="mt-5 flex justify-end">
            <button onClick={save} className="btn-primary">save entry</button>
          </div>
        </div>
      )}

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-2xl">ai cycle insight</h3>
          <button onClick={ask} disabled={loadingAI} className="btn-ghost text-sm disabled:opacity-50">
            {loadingAI ? "thinking…" : summary ? "refresh" : "ask"}
          </button>
        </div>
        {!insight && !loadingAI && (
          <p className="text-ink-soft italic">
            tap "ask" — the ai will look at your logged cycles and give a soft, short summary. more entries = better insight.
          </p>
        )}
        {loadingAI && <p className="text-ink-soft italic">gathering your rhythm…</p>}
        {insight && (
          <div className="space-y-4">
            {summary && (
              <div className="grid sm:grid-cols-4 gap-3 text-sm">
                <Pill compact label="avg cycle" value={summary.averageCycleLength ? `${summary.averageCycleLength.toFixed(0)}d` : "—"} />
                <Pill compact label="avg period" value={summary.averagePeriodLength ? `${summary.averagePeriodLength.toFixed(0)}d` : "—"} />
                <Pill compact label="next likely" value={summary.predictedNextStart ? format(parseISO(summary.predictedNextStart), "MMM d") : "—"} />
                <Pill compact label="fertile window" value={summary.predictedFertileWindow ? summary.predictedFertileWindow.map((d) => format(parseISO(d), "MMM d")).join(" – ") : "—"} />
              </div>
            )}
            <div className="font-serif text-lg leading-relaxed whitespace-pre-wrap">
              {insight}
            </div>
          </div>
        )}
      </div>

      <div className="card p-6">
        <h3 className="font-serif text-2xl mb-4">history</h3>
        {periods.length === 0 ? (
          <p className="text-ink-soft italic">no entries yet — whenever you're ready.</p>
        ) : (
          <ul className="space-y-2">
            {periods.map((p) => (
              <li key={p.id} className="flex items-baseline justify-between gap-3 border-b border-accent/10 pb-2 last:border-none">
                <div>
                  <p className="font-serif text-lg">
                    {format(parseISO(p.start_date), "MMM d, yyyy")}
                    {p.end_date && ` → ${format(parseISO(p.end_date), "MMM d")}`}
                  </p>
                  <p className="text-xs text-ink-mute">
                    {p.flow ? `${p.flow} flow` : ""}{p.flow && p.symptoms?.length ? " · " : ""}
                    {p.symptoms?.join(", ")}
                  </p>
                  {p.notes && <p className="text-sm italic text-ink-soft mt-1">"{p.notes}"</p>}
                </div>
                {editable && (
                  <button onClick={() => remove(p.id)} className="text-xs text-ink-mute hover:text-accent">
                    remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Pill({ label, value, compact }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className={`card ${compact ? "p-3" : "p-5"}`}>
      <p className={`kicker ${compact ? "text-[10px]" : ""}`}>{label}</p>
      <p className={`font-serif ${compact ? "text-lg" : "text-2xl"} text-accent ${compact ? "mt-1" : "mt-2"}`}>{value}</p>
    </div>
  );
}
