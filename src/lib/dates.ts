/**
 * Small date helpers for the ordering calendar and cutoff logic. All functions
 * are pure and operate on local time — the app is a single-region (SF) demo.
 */

export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WEEKDAY_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export function isoWeekday(date: Date) {
  const d = date.getDay();
  return d === 0 ? 7 : d;
}

export function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** "Mon, Jun 29" */
export function formatDay(date: Date) {
  return `${WEEKDAY_SHORT[date.getDay()]}, ${date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`;
}

/** "Monday, June 29" */
export function formatDayLong(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/** "Jun 29" */
export function formatShort(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function toISODate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

export function fromISODate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function isServiceDay(date: Date, serviceDayNums: number[]) {
  return serviceDayNums.includes(isoWeekday(date));
}

/**
 * The next `count` service days on/after `from` (skips weekends + non-service
 * days automatically — the User Flow's "blocked days are skipped").
 */
export function nextServiceDays(from: Date, serviceDayNums: number[], count: number) {
  const out: Date[] = [];
  let cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  let guard = 0;
  while (out.length < count && guard < 60) {
    if (isServiceDay(cursor, serviceDayNums)) out.push(new Date(cursor));
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  return out;
}

/** All service days within an inclusive [start, end] range. */
export function serviceDaysInRange(start: Date, end: Date, serviceDayNums: number[]) {
  const out: Date[] = [];
  let cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  let guard = 0;
  while (cursor <= end && guard < 120) {
    if (isServiceDay(cursor, serviceDayNums)) out.push(new Date(cursor));
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  return out;
}

/**
 * Whether an order for `deliveryDate` can still be placed/edited given a lead
 * time in hours (e.g. 24h hard cutoff). Compares against now.
 */
export function isBeforeCutoff(deliveryDate: Date, leadHours: number) {
  const cutoff = new Date(deliveryDate);
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setHours(cutoff.getHours() - leadHours);
  return new Date() < cutoff;
}
