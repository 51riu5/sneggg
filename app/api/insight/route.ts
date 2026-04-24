import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { analyseCycle, buildPeriodPrompt, buildRecoveryPrompt, callGemini } from "@/lib/ai";
import type { DailyLog, PeriodLog } from "@/lib/types";
import crypto from "crypto";

export async function POST(req: Request) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { kind } = await req.json().catch(() => ({ kind: "period" }));

  try {
    if (kind === "period") {
      const { data: periods } = await supabase
        .from("period_log")
        .select("*")
        .order("start_date", { ascending: false });

      const summary = analyseCycle((periods ?? []) as PeriodLog[]);
      const { data: recent } = await supabase
        .from("daily_log")
        .select("symptoms")
        .order("day", { ascending: false })
        .limit(7);
      const recentSymptoms = [
        ...new Set((recent ?? []).flatMap((r: { symptoms: string[] | null }) => r.symptoms ?? []))
      ];
      const prompt = buildPeriodPrompt(summary, (periods ?? []) as PeriodLog[], recentSymptoms);
      const hash = crypto.createHash("sha1").update(prompt).digest("hex");

      const { data: cached } = await supabase
        .from("ai_insight")
        .select("*")
        .eq("kind", "period")
        .eq("prompt_hash", hash)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cached) return NextResponse.json({ summary, response: cached.response, cached: true });

      const text = await callGemini(prompt);
      await supabase.from("ai_insight").insert({
        kind: "period",
        prompt_hash: hash,
        response: text
      });
      return NextResponse.json({ summary, response: text, cached: false });
    }

    if (kind === "recovery") {
      const { data: logs } = await supabase
        .from("daily_log")
        .select("*")
        .order("day", { ascending: false })
        .limit(14);
      const prompt = buildRecoveryPrompt((logs ?? []) as DailyLog[]);
      const hash = crypto.createHash("sha1").update(prompt).digest("hex");
      const { data: cached } = await supabase
        .from("ai_insight")
        .select("*")
        .eq("kind", "recovery")
        .eq("prompt_hash", hash)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cached) return NextResponse.json({ response: cached.response, cached: true });
      const text = await callGemini(prompt);
      await supabase.from("ai_insight").insert({ kind: "recovery", prompt_hash: hash, response: text });
      return NextResponse.json({ response: text, cached: false });
    }

    return NextResponse.json({ error: "unknown kind" }, { status: 400 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "something went wrong";
    console.error("[insight] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
