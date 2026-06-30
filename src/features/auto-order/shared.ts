import { menu, getItem, itemHasAnyAllergen } from "@/data/menu";
import { me } from "@/data/me";
import { fromISODate } from "@/lib/dates";
import type { MenuItem } from "@/data/types";

export type AutoStatus = "active" | "paused" | "inactive";

/**
 * What to do when an auto-order pick is unavailable on a service day. The
 * setup flow only exposes these two — the system always rotates through the
 * employee's chosen pool, so "pick another favorite" is implicit.
 */
export type SoldOutBehavior = "skip" | "notify";

/**
 * Auto-Order config. Deliberately minimal: a pool of favorite meals plus the
 * unavailable-day rule. There is no per-date schedule here — the system builds
 * each day's draft order automatically 24h before its cutoff (see the draft
 * timing model), so the employee never picks "Monday = X, Tuesday = Y" upfront.
 */
export interface AutoConfig {
  status: AutoStatus;
  favorites: string[];
  soldOut: SoldOutBehavior;
}

/** Candidate meals for the favorites pool (no family-style). */
export const mealPool: MenuItem[] = menu.filter((m) => m.type === "individual");

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
