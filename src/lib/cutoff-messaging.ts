/**
 * Cutoff messaging — the single source of truth for every "when must I order /
 * edit by" string in the app. Menu, cart, checkout and order views all read from
 * `cutoffInfo()` so the wording, thresholds and urgency colours stay identical no
 * matter where cutoff shows up.
 *
 * The rules it encodes:
 *  - individual   → order by 4 PM the day before delivery.
 *  - family style → order 72 hours before delivery.
 *  - < 5h left    → red "urgent" state ("5 hours left to order").
 *  - < 24h left   → amber "soon" state.
 *  - past cutoff  → "Locked for changes".
 */

import type { OrderType } from "@/data/types";
import { WEEKDAY_LONG, fromISODate, formatDay, toISODate, startOfToday } from "@/lib/dates";
import {
  cutoffFor,
  demoNow,
  isServiceDay,
  isHoliday,
  isCutoffPassed,
  HOLIDAYS,
} from "@/lib/cutoff";

/** ≤ this many ms left → red urgency. */
export const URGENT_MS = 5 * 60 * 60 * 1000;
/** ≤ this many ms left (but more than urgent) → amber "closing soon". */
export const SOON_MS = 24 * 60 * 60 * 1000;

export type CutoffState = "open" | "soon" | "urgent" | "locked";
export type CutoffTone = "neutral" | "warning" | "danger" | "locked";

export interface CutoffInfo {
  type: OrderType;
  deliveryISO: string;
  cutoffAt: Date;
  msLeft: number;
  state: CutoffState;
  locked: boolean;
  urgent: boolean;
  soon: boolean;
  tone: CutoffTone;

  /** "5 hours", "45 minutes" — the human gap to cutoff. */
  duration: string;
  /** "4:00 PM" — clock time of the cutoff. */
  cutoffTime: string;
  /** "Monday" — weekday the cutoff falls on. */
  cutoffDayLong: string;
  /** "Mon, Jul 6" — short cutoff date. */
  cutoffShort: string;
  /** "4:00 PM · Mon, Jul 6" — full, unambiguous cutoff stamp. */
  cutoffAbsolute: string;
  /** "Tuesday" — weekday of delivery. */
  deliveryDayLong: string;
  /** "Tue, Jul 7" — short delivery date. */
  deliveryShort: string;

  // ---- Ready-to-render copy (short, obvious, hard to miss) ----
  /** The bold line: adapts to state. */
  headline: string;
  /** One supporting sentence explaining the rule / lock. */
  helper: string;
  /** Always the countdown phrasing, e.g. "5 hours left to order". */
  urgencyLabel: string;
  /** Locked-state chip/label. */
  lockedLabel: string;
  /** One-day framing so users know it's NOT same-day. */
  deliveryLine: string;
}

/** "5 hours" / "1 hour 20 min" / "45 minutes" — mirrors the menu's phrasing. */
export function formatDuration(ms: number): string {
  const mins = Math.max(1, Math.round(ms / 60000));
  if (mins >= 120) return `${Math.round(mins / 60)} hours`;
  if (mins >= 60) {
    const rem = mins % 60;
    return rem ? `1 hour ${rem} min` : "1 hour";
  }
  return `${mins} minutes`;
}

/** How a calendar should offer one day, and what to say when it can't. */
export interface DayAvailability {
  selectable: boolean;
  /** True only for *time* closures — the day exists, its order cutoff went by.
   *  Those are the red days, and the only ones offered the kitchen's number. */
  cutoff: boolean;
  /** Empty when the day is open. */
  reason: string;
}

/**
 * Classify a delivery day for a calendar — the one function every date picker
 * asks, so a day that is closed is closed everywhere, for the same stated reason.
 *
 * Weekends and holidays are *structural* closures (grey). A weekday whose order
 * cutoff has passed is a *time* closure (red, with the reason and a way to call
 * the kitchen) — which covers today, since same-day is never orderable, and
 * tomorrow once today's 4 PM has gone by. Days before today are simply grey.
 */
export function dayAvailability(iso: string, type: OrderType): DayAvailability {
  const todayISO = toISODate(startOfToday());
  if (!isServiceDay(iso)) return { selectable: false, cutoff: false, reason: "Weekends are closed" };
  if (isHoliday(iso)) return { selectable: false, cutoff: false, reason: HOLIDAYS[iso] ?? "Holiday" };
  if (iso < todayISO) return { selectable: false, cutoff: false, reason: "This day has passed" };
  if (isCutoffPassed(iso, type)) {
    return {
      selectable: false,
      cutoff: true,
      reason:
        iso === todayISO
          ? "Same-day ordering is closed"
          : type === "family_style"
            ? "Order cutoff passed. Family-style closes 72 hours before delivery"
            : "Order cutoff passed. Closes 4 PM the day before delivery",
    };
  }
  return { selectable: true, cutoff: false, reason: "" };
}

/** Human description of the rule for a given order type. */
export function cutoffRule(type: OrderType): string {
  return type === "family_style"
    ? "Family-style orders lock 72 hours before delivery."
    : "Individual meals lock at 4 PM the day before delivery.";
}

/**
 * Resolve everything about a delivery date's cutoff. `lockedOverride` lets a
 * placed order force the locked state from its own `order.locked` flag rather
 * than recomputing from the clock. `context` swaps "order" → "edit" wording for
 * already-placed orders.
 */
export function cutoffInfo(
  deliveryISO: string,
  type: OrderType,
  opts: { lockedOverride?: boolean; context?: "order" | "edit" } = {},
): CutoffInfo {
  const context = opts.context ?? "order";
  const verb = context === "edit" ? "edit" : "order";
  const cutoffAt = cutoffFor(deliveryISO, type);
  const msLeft = cutoffAt.getTime() - demoNow().getTime();
  const locked = opts.lockedOverride ?? msLeft <= 0;

  const state: CutoffState = locked
    ? "locked"
    : msLeft <= URGENT_MS
      ? "urgent"
      : msLeft <= SOON_MS
        ? "soon"
        : "open";
  const tone: CutoffTone =
    state === "locked" ? "locked" : state === "urgent" ? "danger" : state === "soon" ? "warning" : "neutral";

  const cutoffDate = cutoffAt;
  const deliveryDate = fromISODate(deliveryISO);
  const cutoffTime = cutoffDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const cutoffDayLong = WEEKDAY_LONG[cutoffDate.getDay()];
  const cutoffShort = formatDay(cutoffDate);
  const cutoffAbsolute = `${cutoffTime} · ${cutoffShort}`;
  const deliveryDayLong = WEEKDAY_LONG[deliveryDate.getDay()];
  const deliveryShort = formatDay(deliveryDate);
  const duration = formatDuration(Math.max(0, msLeft));

  const urgencyLabel = `${duration} left to ${verb}`;
  const lockedLabel = "Locked for changes";

  // Headline: escalates with urgency; open state states the deadline plainly.
  const headline = locked
    ? lockedLabel
    : state === "urgent"
      ? urgencyLabel
      : state === "soon"
        ? `Closing soon: ${verb} by ${cutoffTime} ${cutoffDayLong}`
        : type === "family_style"
          ? `Order by ${cutoffShort}`
          : `Order by ${cutoffTime} ${cutoffDayLong}`;

  const helper = locked
    ? `This order is past its cutoff and can no longer be ${context === "edit" ? "edited" : "changed"}.`
    : cutoffRule(type);

  const deliveryLine = `Delivering ${deliveryDayLong}, ${deliveryShort.split(", ")[1] ?? deliveryShort}`;

  return {
    type,
    deliveryISO,
    cutoffAt,
    msLeft,
    state,
    locked,
    urgent: state === "urgent",
    soon: state === "soon",
    tone,
    duration,
    cutoffTime,
    cutoffDayLong,
    cutoffShort,
    cutoffAbsolute,
    deliveryDayLong,
    deliveryShort,
    headline,
    helper,
    urgencyLabel,
    lockedLabel,
    deliveryLine,
  };
}
