/**
 * Service-day + cutoff logic for the multi-day ordering flow.
 *
 * The headline pain point this prototype fixes: the old system silently skipped
 * days that passed cutoff while still emailing "Order Confirmed". Here, cutoff
 * is computed up-front so the UI can warn BEFORE checkout and report per-day
 * status AFTER — never a silent skip.
 */

import { fromISODate, addDays, isoWeekday, toISODate, startOfToday } from "@/lib/dates";
import type { OrderType } from "@/data/types";

/** This flow runs Monday–Friday (per the multi-day spec). */
export const SERVICE_DAY_NUMS = [1, 2, 3, 4, 5];

/** Individual-meal soft cutoff: 4:00 PM the day before delivery. */
export const SOFT_CUTOFF_HOUR = 16;

/** Family-style orders lock 72 hours before delivery. */
export const FAMILY_CUTOFF_HOURS = 72;

/**
 * Minimum lead time before delivery, in whole days, by order type:
 *  - individual  → order at least 1 day ahead (never same-day).
 *  - family_style → order at least 3 days ahead (the current three days are closed).
 */
export const MIN_LEAD_DAYS: Record<OrderType, number> = {
  individual: 1,
  family_style: 3,
};

/**
 * Reference hour used to anchor the family-style "72 hours before delivery"
 * window — 72h before 4 PM on the delivery day. Matching the individual cutoff
 * hour keeps the two lead windows consistent: family closes exactly three days
 * out at 4 PM (so ordering three days ahead always works), individual one day.
 */
export const NOMINAL_DELIVERY_HOUR = 16;

/** Company holidays (no service). One in range to exercise the calendar state. */
export const HOLIDAYS: Record<string, string> = {
  "2026-07-03": "Independence Day (obs.)",
};

/**
 * "Now" for all cutoff math — the real wall-clock time. Cutoff/lead windows are
 * evaluated against this, so the calendar reflects the actual current time (e.g.
 * once today's 4 PM individual cutoff passes, tomorrow closes). Call on the
 * client (after mount) so server/client renders agree around cutoff boundaries.
 */
export function demoNow() {
  return new Date();
}

/**
 * The cutoff instant for a delivery date, by order type:
 *  - individual  → 4:00 PM the prior calendar day.
 *  - family_style → 72 hours before noon on the delivery day.
 */
export function cutoffFor(deliveryISO: string, type: OrderType = "individual") {
  if (type === "family_style") {
    const delivery = fromISODate(deliveryISO);
    delivery.setHours(NOMINAL_DELIVERY_HOUR, 0, 0, 0);
    return new Date(delivery.getTime() - FAMILY_CUTOFF_HOURS * 3_600_000);
  }
  const prev = addDays(fromISODate(deliveryISO), -1);
  prev.setHours(SOFT_CUTOFF_HOUR, 0, 0, 0);
  return prev;
}

export function isCutoffPassed(deliveryISO: string, type: OrderType = "individual") {
  return demoNow() >= cutoffFor(deliveryISO, type);
}

/**
 * Earliest delivery date orderable for a type — today + its minimum lead days.
 * Individual → tomorrow; family-style → three days out.
 */
export function earliestDeliveryDate(type: OrderType) {
  return addDays(startOfToday(), MIN_LEAD_DAYS[type]);
}

/**
 * Is this delivery date too soon to order for the given type? True inside the
 * lead window — today for individual; today + next two days for family-style.
 */
export function isTooSoon(iso: string, type: OrderType) {
  return fromISODate(iso) < earliestDeliveryDate(type);
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

/**
 * The next `count` orderable days for a type: a non-holiday service day that's
 * past its lead window and whose cutoff hasn't passed (for suggestions/defaults).
 */
export function nextOpenDays(fromISO: string, count: number, type: OrderType = "individual") {
  const out: string[] = [];
  let cursor = fromISODate(fromISO);
  let guard = 0;
  while (out.length < count && guard < 60) {
    const iso = toISODate(cursor);
    if (isOrderable(iso) && !isTooSoon(iso, type) && !isCutoffPassed(iso, type)) out.push(iso);
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  return out;
}
