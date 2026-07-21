"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CardBrand } from "@/lib/card";

/**
 * An individual's saved cards — the wallet a returning customer picks from
 * instead of retyping sixteen digits every order.
 *
 * What's kept is what a receipt shows: brand, last four, expiry, and the name
 * on the card. The full number and the security code are never put in here, and
 * so never reach localStorage — a real integration exchanges them for a token
 * at the processor the moment the form is submitted, and this store holds the
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
  /** Billing ZIP, kept for the address check on the next charge. */
  zip: string;
}

/** What the form collects; the id is the store's business. */
export type SavedCardInput = Omit<SavedCard, "id">;

interface CardsState {
  cards: SavedCard[];
  /** The card the next order is charged to, or null before one is added. */
  selectedId: string | null;
  /** Save a card and make it the one being charged. */
  add: (input: SavedCardInput) => void;
  /** Charge a different saved card. */
  select: (id: string) => void;
  /** Forget a card; if it was selected, the first remaining takes over. */
  remove: (id: string) => void;
}

let seq = 0;
function newId() {
  seq += 1;
  return `card-${seq}-${Math.round(Math.random() * 1e6)}`;
}

export const useCardsStore = create<CardsState>()(
  persist(
    (set) => ({
      cards: [],
      selectedId: null,
      // Just-added is just-selected: nobody fills in a card form to then go
      // hunting for the row it created.
      add: (input) =>
        set((s) => {
          const card: SavedCard = { ...input, id: newId() };
          return { cards: [...s.cards, card], selectedId: card.id };
        }),
      select: (id) => set({ selectedId: id }),
      remove: (id) =>
        set((s) => {
          const cards = s.cards.filter((c) => c.id !== id);
          const selectedId =
            s.selectedId === id ? (cards[0]?.id ?? null) : s.selectedId;
          return { cards, selectedId };
        }),
    }),
    {
      name: "sfk:cards",
      // Same treatment as the cart and the address book: read localStorage only
      // after mount (via StoreHydrator), so the server's empty wallet and the
      // client's first render agree.
      skipHydration: true,
    },
  ),
);
