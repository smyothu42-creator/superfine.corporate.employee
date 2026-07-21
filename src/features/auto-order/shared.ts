import { menu, getItem, itemHasAnyAllergen } from "@/data/menu";
import { me } from "@/data/me";
import { fromISODate } from "@/lib/dates";
import type { MenuItem } from "@/data/types";
import type { CartAddOn } from "@/store/use-cart-store";

export type AutoStatus = "active" | "paused" | "inactive";

/**
 * What to do when an auto-order pick is unavailable on a service day. The
 * setup flow only exposes these two — the system always rotates through the
 * employee's chosen pool, so "pick another favorite" is implicit.
 */
export type SoldOutBehavior = "skip" | "notify";

/**
 * Auto-Order config: a pool of favorite meals, the customizations chosen for
 * them, which weekdays to order on, plus the unavailable-day rule.
 *
 * `days` is a weekly recurring rule, not a calendar. Which meal lands on which
 * day is still ours to decide — the system rotates the pool and builds each
 * draft 48h before its cutoff — so the employee never picks "Monday = X,
 * Tuesday = Y". They only say *whether* Monday is a day they eat here at all,
 * which is the part we can't infer and they'd otherwise have to fix by
 * cancelling a draft every week.
 */
export interface AutoConfig {
  status: AutoStatus;
  favorites: string[];
  /**
   * ISO weekday numbers (1 = Mon) to auto-order on. Always a subset of the
   * company's service days — ordering on a day the kitchen doesn't deliver
   * isn't a thing, so the picker only ever offers those.
   */
  days: number[];
  /**
   * Add-ons chosen for a favorite during setup, kept and re-applied to every
   * future draft. Keyed by meal id; absent = ordered as-is. Sides & beverages
   * are intentionally NOT captured here — those are added later at review.
   */
  customizations?: Record<string, CartAddOn[]>;
  soldOut: SoldOutBehavior;
}

const WEEKDAY_LABELS: Record<number, string> = {
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
  7: "Sun",
};

/** The days the picker offers, in week order: the working week, Mon–Fri. */
export const selectableAutoDays: number[] = [1, 2, 3, 4, 5];

/** Everything the company serves — what a fresh setup starts from. */
export const DEFAULT_AUTO_DAYS = selectableAutoDays;

export function weekdayLabel(day: number) {
  return WEEKDAY_LABELS[day] ?? "";
}

/**
 * Selected days as prose ("Mon, Wed & Fri"), collapsing to "Every weekday" when
 * nothing is excluded — spelling out the full week is noise.
 */
export function formatAutoDays(days: number[]) {
  const picked = selectableAutoDays.filter((d) => days.includes(d));
  if (!picked.length) return "No days selected";
  if (picked.length === selectableAutoDays.length) return "Every weekday";
  const labels = picked.map(weekdayLabel);
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(", ")} & ${labels[labels.length - 1]}`;
}

/** Candidate meals for the favorites pool (no family-style). */
export const mealPool: MenuItem[] = menu.filter((m) => m.type === "individual");

/**
 * Item categories excluded from Auto-Order setup. Sides and beverages aren't
 * part of the core rotation — the employee adds them per-draft at review, so
 * the setup grid stays focused on main meals.
 */
export const SETUP_EXCLUDED_CATEGORIES = ["Sides", "Beverages"];

/** Main meals selectable during setup — sides & beverages filtered out. */
export const setupMealPool: MenuItem[] = mealPool.filter(
  (m) => !SETUP_EXCLUDED_CATEGORIES.includes(m.category),
);

/**
 * Does an item collide with the employee's saved allergens? Uses the same
 * matcher as the menu so auto-order hides exactly what the menu hides.
 */
export function hasAllergen(item: MenuItem) {
  return itemHasAnyAllergen(item, me.allergens);
}

/** Allergy-safe favorites only. */
export function safeFavorites(ids: string[]) {
  return ids.filter((id) => {
    const item = getItem(id);
    return item && !hasAllergen(item);
  });
}

export function shortDate(iso: string) {
  return fromISODate(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
