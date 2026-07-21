"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { lock, lockedAmong } from "@/lib/rating-lock";

/**
 * Item-level ratings.
 *
 * Separate from {@link useFeedbackStore} on purpose, and not by accident of
 * file layout: a rating is an opinion about a recipe, and the feedback store
 * carries service failures — a wrong order, a refund to chase. Merging them
 * would bury refund requests in a ratings inbox and poison the recipe analytics
 * with complaints about a late driver.
 *
 * Stands in for the `item_ratings` table. The submit path mirrors the API it
 * would call — a batch in, a per-line result out — so swapping the body of
 * `submit` for a `fetch` is the whole migration.
 */

/** What someone can say about a meal beyond the number. */
export const RATING_TAGS = ["Portion", "Temperature", "Flavour", "Freshness"] as const;
export type RatingTag = (typeof RATING_TAGS)[number];

export interface ItemRating {
  id: string;
  orderId: string;
  /** The line rated — see `OrderItem.lineId`. */
  lineId: string;
  /** Denormalised for aggregation across orders. */
  menuItemId: string;
  /** The recipe as delivered, copied from the line and never from the live menu. */
  recipeVersion: number;
  /** 1–5. */
  stars: number;
  tags: RatingTag[];
  /** Optional, ≤200 chars. Back-end only — never rendered to other customers. */
  note: string;
  /** Which door it came in by. */
  source: "public_link" | "account";
  ratedAt: string;
}

/** One line's worth of a submission. */
export interface RatingInput {
  lineId: string;
  menuItemId: string;
  recipeVersion: number;
  stars: number;
  tags?: RatingTag[];
  note?: string;
}

/** Per-line outcome. A batch never fails as a whole — see `submit`. */
export type RatingResult = { lineId: string; status: "saved" | "locked" | "invalid" };

interface RatingsState {
  ratings: ItemRating[];
  submit: (args: {
    orderId: string;
    source: ItemRating["source"];
    ratings: RatingInput[];
  }) => RatingResult[];
  /** Every rating this device/account has left on an order. */
  forOrder: (orderId: string) => ItemRating[];
}

let seq = 0;
function newId() {
  seq += 1;
  return `rat-${seq}-${Math.round(Math.random() * 1e6)}`;
}

export const useRatingsStore = create<RatingsState>()(
  persist(
    (set, get) => ({
      ratings: [],

      /**
       * Per-line results, never all-or-nothing: rating three meals when one is
       * already locked has to save the two and say so about the third. An
       * aborted batch would make someone re-enter work that was fine.
       *
       * Two gates, cheapest first — the cookie lock (no write at all), then the
       * store's own "this line already has a rating" check, which is what holds
       * when the cookie has been cleared.
       */
      submit: ({ orderId, source, ratings }) => {
        const locked = lockedAmong(ratings.map((r) => r.lineId));
        const already = new Set(get().ratings.map((r) => r.lineId));
        const saved: ItemRating[] = [];

        const results: RatingResult[] = ratings.map((r) => {
          if (r.stars < 1 || r.stars > 5) return { lineId: r.lineId, status: "invalid" };
          if (locked.has(r.lineId) || already.has(r.lineId)) {
            return { lineId: r.lineId, status: "locked" };
          }
          saved.push({
            id: newId(),
            orderId,
            lineId: r.lineId,
            menuItemId: r.menuItemId,
            recipeVersion: r.recipeVersion,
            stars: r.stars,
            tags: r.tags ?? [],
            note: (r.note ?? "").slice(0, 200),
            source,
            ratedAt: new Date().toISOString(),
          });
          return { lineId: r.lineId, status: "saved" };
        });

        if (saved.length) {
          set((s) => ({ ratings: [...s.ratings, ...saved] }));
          // Locks are set only for what actually landed — a rejected line must
          // not be locked out of a retry it never got.
          lock(saved.map((r) => r.lineId));
        }
        return results;
      },

      forOrder: (orderId) => get().ratings.filter((r) => r.orderId === orderId),
    }),
    {
      name: "sfk:ratings",
      // Same treatment as every other persisted store: read localStorage only
      // after mount, so the server's empty list and the first client render
      // agree. See `StoreHydrator`.
      skipHydration: true,
    },
  ),
);

/* ---------------------------------------------------------------------- */
/* Rollups — what the admin views are built from                           */
/* ---------------------------------------------------------------------- */

export interface RatingRollup {
  menuItemId: string;
  recipeVersion: number;
  count: number;
  avg: number;
  /** Index 0 = one star … index 4 = five. */
  histogram: [number, number, number, number, number];
  tagCounts: Record<string, number>;
  lastRatedAt: string | null;
}

/**
 * Below this, a rating is a sample of one loud opinion rather than a signal, and
 * showing it as an average invites decisions that the next five ratings reverse.
 * Public surfaces must read {@link displayableRating}, which enforces it.
 */
export const MIN_RATINGS_TO_DISPLAY = 5;

/**
 * Aggregate by meal *and recipe version*. Keying on the version is what makes
 * "did the reformulation land?" a lookup of two rows rather than an argument
 * about a moving average that silently mixes both recipes together.
 */
export function rollup(ratings: ItemRating[]): RatingRollup[] {
  const byKey = new Map<string, ItemRating[]>();
  ratings.forEach((r) => {
    const k = `${r.menuItemId}__${r.recipeVersion}`;
    byKey.set(k, [...(byKey.get(k) ?? []), r]);
  });

  return [...byKey.values()].map((group) => {
    const histogram: RatingRollup["histogram"] = [0, 0, 0, 0, 0];
    const tagCounts: Record<string, number> = {};
    group.forEach((r) => {
      histogram[r.stars - 1] += 1;
      r.tags.forEach((t) => {
        tagCounts[t] = (tagCounts[t] ?? 0) + 1;
      });
    });
    const sum = group.reduce((n, r) => n + r.stars, 0);
    return {
      menuItemId: group[0].menuItemId,
      recipeVersion: group[0].recipeVersion,
      count: group.length,
      avg: Math.round((sum / group.length) * 10) / 10,
      histogram,
      tagCounts,
      lastRatedAt: group.map((r) => r.ratedAt).sort().at(-1) ?? null,
    };
  });
}

/**
 * What a *customer-facing* surface is allowed to show for a meal: the average
 * across every recipe version, or null while the sample is too thin. Returns
 * null rather than the number, so a caller can't render "1.0 ★ (1)" by ignoring
 * a count field — the threshold decision is made here, once.
 */
export function displayableRating(
  ratings: ItemRating[],
  menuItemId: string,
): { avg: number; count: number } | null {
  const mine = ratings.filter((r) => r.menuItemId === menuItemId);
  if (mine.length < MIN_RATINGS_TO_DISPLAY) return null;
  const sum = mine.reduce((n, r) => n + r.stars, 0);
  return { avg: Math.round((sum / mine.length) * 10) / 10, count: mine.length };
}
