"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { orders } from "@/data/orders";

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

/**
 * The rating history a fresh visitor arrives with: everything already rated
 * except the most recent couple of deliveries.
 *
 * That shape is the realistic one — you rate lunch when the email lands, so the
 * backlog is always the last day or two — and it is the only one that shows
 * both states at once. An all-unrated history hides the settled state (the
 * green "Rated" pill, read-only stars, "you rated 1 meal from this order");
 * an all-rated one hides the thing the page exists to do.
 *
 * Seeded from `orders` rather than typed out because `lineId` encodes the
 * delivery date, and that date is re-anchored to the real calendar at load.
 * Everything here is deterministic — no `Math.random`, no `Date.now` — because
 * this runs at module init on both the server and the client, and a value that
 * differed between them would be a hydration mismatch.
 */
const UNRATED_RECENT = 2;
/** Rotated rather than fixed, so the demo isn't a column of identical 4s. */
const SEED_STARS = [5, 4, 5, 3, 4];

function seedRatings(): ItemRating[] {
  const delivered = orders
    .filter((o) => o.status === "delivered")
    .sort((a, b) => b.date.localeCompare(a.date));

  let n = 0;
  return delivered.slice(UNRATED_RECENT).flatMap((order) =>
    order.days.flatMap((day) =>
      day.items.map((item) => {
        const stars = SEED_STARS[n % SEED_STARS.length];
        n += 1;
        return {
          id: `rat-seed-${item.lineId}`,
          orderId: order.id,
          lineId: item.lineId,
          menuItemId: item.itemId,
          recipeVersion: item.recipeVersion,
          stars,
          tags: (stars >= 4 ? ["Flavour"] : ["Temperature"]) as RatingTag[],
          note: "",
          source: "account" as const,
          // Rated the evening it was delivered, which is when the email lands.
          ratedAt: `${day.date}T19:20:00.000Z`,
        };
      }),
    ),
  );
}

export const useRatingsStore = create<RatingsState>()(
  persist(
    (set, get) => ({
      ratings: seedRatings(),

      /**
       * Per-line results, never all-or-nothing: rating three meals when one is
       * already rated has to save the two and say so about the third. An
       * aborted batch would make someone re-enter work that was fine.
       *
       * One gate: has this line already got a rating? There used to be a second,
       * a 24-hour cookie lock, and it was removed rather than fixed. On the same
       * device the two agreed, so it decided nothing; where they disagreed — a
       * surviving cookie against a store with no such rating — it told someone
       * who had never rated a meal that they already had, showed them five empty
       * stars they couldn't press, and offered a 24-hour wait. Turning away real
       * feedback is a far worse failure than accepting a duplicate.
       */
      submit: ({ orderId, source, ratings }) => {
        const already = new Set(get().ratings.map((r) => r.lineId));
        const saved: ItemRating[] = [];

        const results: RatingResult[] = ratings.map((r) => {
          if (r.stars < 1 || r.stars > 5) return { lineId: r.lineId, status: "invalid" };
          if (already.has(r.lineId)) return { lineId: r.lineId, status: "locked" };
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

        if (saved.length) set((s) => ({ ratings: [...s.ratings, ...saved] }));
        return results;
      },

      forOrder: (orderId) => get().ratings.filter((r) => r.orderId === orderId),
    }),
    {
      name: "sfk:ratings",
      // Same treatment as every other persisted store: read localStorage only
      // after mount, so the server's list and the first client render agree.
      // See `StoreHydrator`.
      skipHydration: true,
      /**
       * Bumped when the seed above changed shape.
       *
       * Persisted state wins over initial state, so without this a browser that
       * had already accumulated ratings — every demo session does — would keep
       * showing them and never see the new seed. Every order read "Rated" for
       * exactly that reason. `migrate` throws the old list away and re-seeds
       * rather than trying to reconcile: these are demo ratings, not something
       * anyone needs kept.
       */
      version: 1,
      migrate: () => ({ ratings: seedRatings() }),
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
