import type { DailyLog, PeriodLog } from "./types";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_MODELS = ["gemini-flash-latest", "gemini-2.5-flash", "gemini-2.0-flash"];

interface CycleSummary {
  averageCycleLength: number | null;
  averagePeriodLength: number | null;
  predictedNextStart: string | null;
  predictedFertileWindow: [string, string] | null;
  commonSymptoms: string[];
}

export function analyseCycle(periods: PeriodLog[]): CycleSummary {
  const sorted = [...periods].sort((a, b) => a.start_date.localeCompare(b.start_date));
  const cycleLens: number[] = [];
  const periodLens: number[] = [];
  const symptomCount = new Map<string, number>();

  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    if (p.end_date) {
      const len = (new Date(p.end_date).getTime() - new Date(p.start_date).getTime()) / 86400000 + 1;
      if (len > 0 && len < 20) periodLens.push(len);
    }
    if (i > 0) {
      const prev = sorted[i - 1];
      const cl = (new Date(p.start_date).getTime() - new Date(prev.start_date).getTime()) / 86400000;
      if (cl > 15 && cl < 60) cycleLens.push(cl);
    }
    (p.symptoms ?? []).forEach((s) => symptomCount.set(s, (symptomCount.get(s) ?? 0) + 1));
  }

  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
  const averageCycleLength = avg(cycleLens);
  const averagePeriodLength = avg(periodLens);

  let predictedNextStart: string | null = null;
  let predictedFertileWindow: [string, string] | null = null;
  const last = sorted[sorted.length - 1];
  if (last && averageCycleLength) {
    const next = new Date(last.start_date);
    next.setDate(next.getDate() + Math.round(averageCycleLength));
    predictedNextStart = next.toISOString().slice(0, 10);

    const ovulation = new Date(next);
    ovulation.setDate(ovulation.getDate() - 14);
    const fertileStart = new Date(ovulation);
    fertileStart.setDate(ovulation.getDate() - 5);
    const fertileEnd = new Date(ovulation);
    fertileEnd.setDate(ovulation.getDate() + 1);
    predictedFertileWindow = [
      fertileStart.toISOString().slice(0, 10),
      fertileEnd.toISOString().slice(0, 10)
    ];
  }

  const commonSymptoms = [...symptomCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k]) => k);

  return {
    averageCycleLength,
    averagePeriodLength,
    predictedNextStart,
    predictedFertileWindow,
    commonSymptoms
  };
}

async function tryGeminiModel(model: string, key: string, prompt: string): Promise<string> {
  const url = `${GEMINI_BASE}/${model}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.75, topP: 0.95, maxOutputTokens: 900 },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
      ]
    })
  });
  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`Gemini ${model} ${res.status}: ${text}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  const out = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!out) throw new Error(`Gemini ${model} returned no content`);
  return out as string;
}

export async function callGemini(prompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY not set — get one free at https://aistudio.google.com/app/apikey");
  }
  const errors: string[] = [];
  for (const model of GEMINI_MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        return await tryGeminiModel(model, key, prompt);
      } catch (e) {
        const err = e as Error & { status?: number };
        errors.push(err.message);
        if (err.status === 503 && attempt === 1) {
          await new Promise((r) => setTimeout(r, 800));
          continue;
        }
        break;
      }
    }
  }
  throw new Error(`All Gemini models failed. Last errors: ${errors.slice(-3).join(" | ")}`);
}

export function buildPeriodPrompt(summary: CycleSummary, periods: PeriodLog[], recentSymptoms: string[]): string {
  return `You are a kind, warm, informed companion (not a doctor). You are writing a short, caring analysis for Snegu about her menstrual cycle, in simple language. Always gentle, never alarming. Always add a small note to "consult her doctor if anything feels off."

DATA
- Recorded cycles: ${periods.length}
- Average cycle length: ${summary.averageCycleLength?.toFixed(1) ?? "not enough data"} days
- Average period length: ${summary.averagePeriodLength?.toFixed(1) ?? "not enough data"} days
- Predicted next start: ${summary.predictedNextStart ?? "not enough data"}
- Predicted fertile window: ${summary.predictedFertileWindow ? summary.predictedFertileWindow.join(" to ") : "not enough data"}
- Most common symptoms: ${summary.commonSymptoms.join(", ") || "none logged"}
- Symptoms in the last few days: ${recentSymptoms.join(", ") || "none"}

WRITE
1. A gentle 1-paragraph overview (4-6 sentences) — warm, reassuring, in second person ("you").
2. 3 short bullet "things to notice this cycle" — practical and soft (nutrition, sleep, iron, warm water, etc.).
3. 1 line about when to consider seeing a doctor — non-scary.
4. Sign off with: "— with love".

Keep total under 220 words. No markdown headers. No medical jargon.`;
}

export function buildRecoveryPrompt(logs: DailyLog[]): string {
  const recent = logs.slice(0, 7);
  const avgCups = recent.length ? recent.reduce((a, b) => a + (b.cups ?? 0), 0) / recent.length : 0;
  const avgMeals = recent.length ? recent.reduce((a, b) => a + (b.meals?.length ?? 0), 0) / recent.length : 0;
  const moods = recent.map((l) => l.mood).filter(Boolean);
  const symptoms = [...new Set(recent.flatMap((l) => l.symptoms ?? []))];

  return `You are a kind companion writing a short recovery check-in for Snegu, who is recovering from tonsillitis and had a fainting episode due to low BP/low sugar. Tone: warm, encouraging, non-medical, honest but never harsh.

DATA (last 7 days)
- Avg water: ${avgCups.toFixed(1)} / 10 cups
- Avg meals: ${avgMeals.toFixed(1)} / 5
- Moods: ${moods.join(", ") || "not logged"}
- Reported symptoms: ${symptoms.join(", ") || "none"}

WRITE
- 1 paragraph (4-6 sentences) in second person reflecting on how the week went.
- 2-3 very small, specific things to do this week.
- End with "— yours, always".
- Under 180 words. No markdown headers. No medical jargon.`;
}
