import { create } from "zustand";
import { findOrder } from "@/data/orders";

/**
 * A single piece of customer feedback, as the kitchen/admin would see it.
 *
 * `verified` is the trust signal the admin dashboard sorts on: a review is
 * verified only when its order number resolves to a real order (see
 * {@link findOrder}). Feedback with no order number, or an order number that
 * doesn't exist, is still kept — an unhappy guest at a shared family-style
 * lunch has something worth hearing even if they never placed the order — but
 * it lands as `verified: false` so staff can weigh it accordingly.
 */
export interface FeedbackEntry {
  id: string;
  /** The order this is linked to, once resolved — null when unverified. */
  orderId: string | null;
  /** Exactly what the customer typed, kept for the admin even when unresolved. */
  orderNumberEntered: string | null;
  rating: number;
  review: string;
  /** Filename of the attached photo (the file itself stays client-side). */
  photoName: string | null;
  /** True only when `orderId` resolved to a real order. */
  verified: boolean;
  /** Where the feedback came in from — a signed-in past order, or the public form. */
  source: "public" | "past-order";
  createdAt: string;
}

export interface SubmitFeedbackInput {
  orderNumber?: string | null;
  rating: number;
  review?: string;
  photoName?: string | null;
  source?: FeedbackEntry["source"];
}

interface FeedbackState {
  entries: FeedbackEntry[];
  /** Record a submission, resolving verification. Returns the stored entry. */
  submit: (input: SubmitFeedbackInput) => FeedbackEntry;
}

let seq = 0;

export const useFeedbackStore = create<FeedbackState>((set) => ({
  entries: [],
  submit: (input) => {
    const typed = input.orderNumber?.trim() || null;
    const matched = typed ? findOrder(typed) : undefined;

    const entry: FeedbackEntry = {
      id: `FB-${Date.now().toString(36)}-${seq++}`,
      orderId: matched?.id ?? null,
      orderNumberEntered: typed,
      rating: input.rating,
      review: input.review?.trim() ?? "",
      photoName: input.photoName ?? null,
      verified: Boolean(matched),
      source: input.source ?? "public",
      createdAt: new Date().toISOString(),
    };

    set((s) => ({ entries: [entry, ...s.entries] }));
    return entry;
  },
}));
