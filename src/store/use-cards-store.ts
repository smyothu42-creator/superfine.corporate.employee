"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CardBrand } from "@/lib/card";

/**
 * The saved card — one per person, the card a returning customer's orders are
 * charged to instead of retyping sixteen digits every order.
 *
 * One, not a wallet. Every order on this product is charged the same way at the
 * same cutoff, so a list of cards only ever asked a question with one answer:
 * which of these is the real one. Saving a second card now *replaces* the first,
 * which is the same outcome as picking it from a list, minus the list.
 *
 * What's kept is what a receipt shows: brand, last four, expiry, and the name on
 * the card. The full number and the security code are never put in here, and so
 * never reach localStorage — a real integration exchanges them for a token at
 * the processor the moment the form is submitted, and this store holds the
 * display half of that. Corporate employees on a company invoice never touch it.
 */
export interface SavedCard {
  id: string;
  brand: CardBrand;
  /** Last four digits — the only part of the number kept. */
  last4: string;
  /** 1–12. */
  expMonth: number;
  /** Four digits, e.g. 2029. */
  expYear: number;
  name: string;
}

/** What the form collects; the id is the store's business. */
export type SavedCardInput = Omit<SavedCard, "id">;

interface CardsState {
  /** The card the next order is charged to, or null before one is added. */
  card: SavedCard | null;
  /** Save a card, replacing whatever was there. */
  save: (input: SavedCardInput) => void;
  /** Forget the card; the next order has to capture one again. */
  remove: () => void;
}

let seq = 0;
function newId() {
  seq += 1;
  return `card-${seq}-${Math.round(Math.random() * 1e6)}`;
}

export const useCardsStore = create<CardsState>()(
  persist(
    (set) => ({
      card: null,
      save: (input) => set({ card: { ...input, id: newId() } }),
      remove: () => set({ card: null }),
    }),
    {
      name: "sfk:cards",
      // Same treatment as the cart and the address book: read localStorage only
      // after mount (via StoreHydrator), so the server's empty wallet and the
      // client's first render agree.
      skipHydration: true,
      version: 2,
      /**
       * v1 kept `{ cards: [], selectedId }`. Anyone carrying that in
       * localStorage keeps the card they had selected — dropping it would log
       * them out of their own payment method for a change they never made.
       */
      migrate: (state, version) => {
        if (version >= 2) return state as CardsState;
        const old = state as { cards?: SavedCard[]; selectedId?: string | null };
        const cards = old?.cards ?? [];
        const kept = cards.find((c) => c.id === old?.selectedId) ?? cards[0] ?? null;
        return { card: kept } as CardsState;
      },
    },
  ),
);
