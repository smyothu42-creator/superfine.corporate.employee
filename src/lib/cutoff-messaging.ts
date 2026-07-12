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
import { WEEKDAY_LONG, fromISODate, formatDay } from "@/lib/dates";
import { cutoffFor, demoNow } from "@/lib/cutoff";

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
