import type { DailyLog } from "./types";
import { differenceInCalendarDays, parseISO } from "date-fns";

// Consider a day "cared for" when she's done the bare minimum:
//   2+ cups of water AND 1+ meal OR any checklist item ticked
export function isCaredDay(log: DailyLog | null | undefined): boolean {
  if (!log) return false;
  if ((log.cups ?? 0) >= 2 && (log.meals?.length ?? 0) >= 1) return true;
  if ((log.checklist?.length ?? 0) >= 1) return true;
  return false;
}

export function currentStreak(logs: DailyLog[]): number {
  if (!logs.length) return 0;
  const byDay = new Map(logs.map((l) => [l.day, l]));
  let streak = 0;
  const today = new Date();
  for (let offset = 0; offset < 365; offset++) {
    const d = new Date(today);
    d.setDate(today.getDate() - offset);
    const key = d.toISOString().slice(0, 10);
    const log = byDay.get(key);
    if (isCaredDay(log)) {
      streak++;
    } else if (offset === 0) {
      // grace: if today hasn't been completed yet, don't break streak
      continue;
    } else {
      break;
    }
  }
  return streak;
}

export function longestStreak(logs: DailyLog[]): number {
  if (!logs.length) return 0;
  const caredDays = logs
    .filter((l) => isCaredDay(l))
    .map((l) => l.day)
    .sort();
  let best = 0;
  let cur = 0;
  let prev: string | null = null;
  for (const day of caredDays) {
    if (prev && differenceInCalendarDays(parseISO(day), parseISO(prev)) === 1) {
      cur++;
    } else {
      cur = 1;
    }
    if (cur > best) best = cur;
    prev = day;
  }
  return best;
}
