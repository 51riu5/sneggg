import { format, startOfMonth, endOfMonth, eachDayOfInterval, addDays, differenceInCalendarDays } from "date-fns";

export const today = () => format(new Date(), "yyyy-MM-dd");

export const humanDate = (d: string | Date) => format(new Date(d), "MMM d");

export const humanLongDate = (d: string | Date) => format(new Date(d), "EEEE, MMM d");

export function monthDays(refDate: Date): string[] {
  const start = startOfMonth(refDate);
  const end = endOfMonth(refDate);
  return eachDayOfInterval({ start, end }).map((d) => format(d, "yyyy-MM-dd"));
}

export function daysAgo(isoDate: string): number {
  return differenceInCalendarDays(new Date(), new Date(isoDate));
}

export function addDaysIso(isoDate: string, days: number): string {
  return format(addDays(new Date(isoDate), days), "yyyy-MM-dd");
}
