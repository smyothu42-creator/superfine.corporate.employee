/**
 * Service-day + cutoff logic for the multi-day ordering flow.
 *
 * The headline pain point this prototype fixes: the old system silently skipped
 * days that passed cutoff while still emailing "Order Confirmed". Here, cutoff
 * is computed up-front so the UI can warn BEFORE checkout and report per-day
 * status AFTER — never a silent skip.
 */

import { fromISODate, addDays, isoWeekday, toISODate } from "@/lib/dates";

/** This flow runs Monday–Friday (per the multi-day spec). */
export const SERVICE_DAY_NUMS = [1, 2, 3, 4, 5];

/** Individual-meal soft cutoff: 4:00 PM the day before delivery. */
export const SOFT_CUTOFF_HOUR = 16;

/** Company holidays (no service). One in range to exercise the calendar state. */
export const HOLIDAYS: Record<string, string> = {
  "2026-07-03": "Independence Day (obs.)",
};

/**
 * Demo "now" — pinned to today at 1:00 PM. This sits a few hours before the next
 * individual cutoff (4:00 PM today, for tomorrow's delivery), so the "N hours to
 * cutoff" urgency flag is demonstrable, while holidays and past days still
 * exercise the cutoff-passed states. In a real app this is just `new Date()`.
 * Call only on the client (after mount) to avoid SSR drift.
 */
export function demoNow() {
  const d = new Date();
  d.setHours(13, 0, 0, 0);
  return d;
}

/** The cutoff instant for a delivery date = 4:00 PM the prior calendar day. */
export function cutoffFor(deliveryISO: string) {
  const prev = addDays(fromISODate(deliveryISO), -1);
  prev.setHours(SOFT_CUTOFF_HOUR, 0, 0, 0);
  return prev;
}

export function isCutoffPassed(deliveryISO: string) {
  return demoNow() >= cutoffFor(deliveryISO);
}

export function isServiceDay(iso: string) {
  return SERVICE_DAY_NUMS.includes(isoWeekday(fromISODate(iso)));
}

export function isHoliday(iso: string) {
  return iso in HOLIDAYS;
}

/** A delivery date can be selected/ordered if it's a non-holiday service day. */
export function isOrderable(iso: string) {
  return isServiceDay(iso) && !isHoliday(iso);
}

/** The next `count` orderable days whose cutoff has NOT passed (for suggestions). */
export function nextOpenDays(fromISO: string, count: number) {
  const out: string[] = [];
  let cursor = fromISODate(fromISO);
  let guard = 0;
  while (out.length < count && guard < 60) {
    const iso = toISODate(cursor);
    if (isOrderable(iso) && !isCutoffPassed(iso)) out.push(iso);
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  return out;
}
