import type { MenuItem, Nutrition } from "@/data/types";

/**
 * Nutrition lookup for a *configured* meal.
 *
 * Nutrition depends on the combination the customer builds — a bowl with beef
 * and a side of rice is not the same label as the same bowl with tofu and no
 * side — so the value is derived from the item's base facts plus a contribution
 * for each selected option, rather than a single static number per dish.
 *
 * There is no nutrition backend in this build, so {@link fetchNutrition}
 * simulates the network round-trip the real "View nutrition" call would make.
 * The per-option contribution is deterministic (hashed off the option id), so
 * the same combination always resolves to the same label.
 */

export interface NutritionSelection {
  optionId: string;
  price: number;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** A single option's contribution to the label — small, bounded, stable. */
function optionDelta(sel: NutritionSelection): Nutrition {
  const h = hash(sel.optionId);
  return {
    calories: 20 + (h % 141), // 20–160 kcal
    protein: (h >> 3) % 26, //   0–25 g
    carbs: (h >> 6) % 31, //     0–30 g
    fat: (h >> 9) % 17, //       0–16 g
  };
}

/** The item's base facts plus every selected option's contribution. */
export function nutritionFor(item: MenuItem, selections: NutritionSelection[]): Nutrition {
  const base: Nutrition = item.nutrition ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
  return selections.reduce<Nutrition>(
    (acc, sel) => {
      const d = optionDelta(sel);
      return {
        calories: acc.calories + d.calories,
        protein: acc.protein + d.protein,
        carbs: acc.carbs + d.carbs,
        fat: acc.fat + d.fat,
      };
    },
    { ...base },
  );
}

/**
 * Simulated fetch of the nutrition label for a configured meal. Resolves after
 * a short delay so the UI can show a loading state, exactly as a real request
 * to a nutrition service would.
 */
export function fetchNutrition(
  item: MenuItem,
  selections: NutritionSelection[],
): Promise<Nutrition> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(nutritionFor(item, selections)), 550);
  });
}
