import { menu, getItem } from "@/data/menu";
import { me } from "@/data/me";
import { program } from "@/data/program";
import { startOfToday, addDays, toISODate, fromISODate } from "@/lib/dates";
import { isCutoffPassed } from "@/lib/cutoff";
import type { MenuItem } from "@/data/types";

/** Auto-order runs Monday–Friday (per the spec's Neptune Corp service week). */
export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export type RotationStrategy = "round-robin" | "same" | "smart" | "manual";
export type ReminderTiming = "1-day" | "2-hours" | "none";
export type SoldOutBehavior = "next-favorite" | "skip" | "notify";
export type AutoStatus = "active" | "paused" | "inactive";

export type DayStatus = "confirmed" | "review" | "skipped" | "sold-out" | "day-off";

export interface PlanDay {
  dateISO: string;
  weekday: Weekday;
  itemId?: string;
  /** Set when the auto-pick was swapped out (sold out / allergy / manual). */
  originalItemId?: string;
  /** Additional meals bundled on the same day (multi-order days). */
  extraItemIds?: string[];
  status: DayStatus;
  userModified: boolean;
  /** True after a sold-out swap is confirmed — Superfine Kitchen is reviewing it. */
  kitchenReview?: boolean;
}

/** All meal ids ordered for a day — primary pick plus any bundled extras. */
export function dayMealIds(day: PlanDay): string[] {
  return [day.itemId, ...(day.extraItemIds ?? [])].filter(Boolean) as string[];
}

export interface AutoConfig {
  status: AutoStatus;
  strategy: RotationStrategy;
  favorites: string[];
  schedule: Weekday[];
  reminder: ReminderTiming;
  soldOut: SoldOutBehavior;
}

/** Candidate meals for the favorites pool (no family-style). */
export const mealPool: MenuItem[] = menu.filter((m) => m.type === "individual");

/** Does an item collide with the employee's allergens? (allergy-safe mode) */
export function hasAllergen(item: MenuItem) {
  if (!me.allergens.length) return false;
  const text = `${item.allergens} ${item.ingredients ?? ""}`.toLowerCase();
  return me.allergens.some((a) => text.includes(a.toLowerCase()));
}

/** Allergy-safe favorites only. */
export function safeFavorites(ids: string[]) {
  return ids.filter((id) => {
    const item = getItem(id);
    return item && !hasAllergen(item);
  });
}

/** The Mon–Fri dates of the week containing today. */
export function thisWeekDates(): string[] {
  const today = startOfToday();
  const lead = (today.getDay() + 6) % 7; // days since Monday
  const monday = addDays(today, -lead);
  return [0, 1, 2, 3, 4].map((i) => toISODate(addDays(monday, i)));
}

const WEEKDAY_FROM_INDEX: Weekday[] = ["Mon", "Tue", "Wed", "Thu", "Fri"];

/**
 * Generate a week plan from the config. Round-robin (or "same") across the
 * scheduled days, skipping allergy-unsafe meals. Days whose cutoff already
 * passed are "confirmed" (locked); upcoming days are "review". For the demo we
 * flag one upcoming day as sold-out so the edge case is reachable.
 */
export function generateWeek(config: AutoConfig, soldOutDate?: string, weekOffset = 0): PlanDay[] {
  const base = thisWeekDates();
  const dates =
    weekOffset === 0
      ? base
      : base.map((iso) => toISODate(addDays(fromISODate(iso), 7 * weekOffset)));
  const pool = safeFavorites(config.favorites);
  let cursor = 0;

  return dates.map((dateISO, i) => {
    const weekday = WEEKDAY_FROM_INDEX[i];
    if (!config.schedule.includes(weekday)) {
      return { dateISO, weekday, status: "day-off", userModified: false };
    }
    if (!pool.length) {
      return { dateISO, weekday, status: "review", userModified: false };
    }
    const slot = cursor;
    const itemId = config.strategy === "same" ? pool[0] : pool[slot % pool.length];
    cursor += 1;

    let status: DayStatus = isCutoffPassed(dateISO) ? "confirmed" : "review";
    if (soldOutDate && dateISO === soldOutDate && status === "review") status = "sold-out";

    // Demo: a couple of days bundle 2–3 meals so the multi-order UI is reachable.
    const extraCount = status === "sold-out" || config.strategy === "same" ? 0 : slot === 1 ? 1 : slot === 3 ? 2 : 0;
    const extraItemIds =
      extraCount && pool.length > 1
        ? Array.from({ length: extraCount }, (_, k) => pool[(slot + 1 + k) % pool.length]).filter(
            (id) => id !== itemId,
          )
        : undefined;

    return { dateISO, weekday, itemId, extraItemIds, status, userModified: false };
  });
}

export function weekTotal(days: PlanDay[]) {
  return days.reduce((sum, d) => {
    if (d.status === "skipped" || d.status === "day-off") return sum;
    return sum + dayMealIds(d).reduce((s, id) => s + (getItem(id)?.price ?? 0), 0);
  }, 0);
}

/** Per-day subsidy is capped; weekly budget = subsidy × scheduled days. */
export function weeklyBudget(config: AutoConfig) {
  return program.subsidyPerDay * config.schedule.length;
}

export function shortDate(iso: string) {
  return fromISODate(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
