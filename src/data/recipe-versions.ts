/**
 * The current recipe version of each meal on the menu.
 *
 * A meal's recipe changes — the kitchen reformulates a sauce, swaps a grain,
 * fixes a portion. Every order line pins the version it was cooked from, and
 * every rating copies that pin, so "did the new sauce land?" is a comparison
 * between two populations of ratings rather than a guess about a moving average.
 *
 * Unlisted meals are version 1: never reformulated. Bump the number here when a
 * recipe actually changes, and leave the old ratings alone — they are the
 * "before" half of the comparison, and rewriting them destroys the only record
 * of what the previous recipe scored.
 */
export const RECIPE_VERSIONS: Record<string, number> = {
  // Reformulated in the July drop — the gochujang was cut back after repeated
  // "too spicy" notes. The before/after view keys off exactly this bump.
  bibimbap: 2,
  "veggie-bibimbap": 2,
};

/** The version a line should pin when the order is placed. */
export function currentRecipeVersion(itemId: string): number {
  return RECIPE_VERSIONS[itemId] ?? 1;
}
