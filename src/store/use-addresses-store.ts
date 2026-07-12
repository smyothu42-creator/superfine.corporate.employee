"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * An individual's saved delivery addresses — their personal address book.
 *
 * Corporate employees deliver to contract-locked company sites (see
 * `data/program` addresses) and never touch this. An individual, by contrast,
 * owns their addresses: they can add a few (Home, Work…), edit them, and pick
 * which one is the default. Fields mirror the checkout `DeliveryDetails` so the
 * two speak the same shape.
 */
export interface SavedAddress {
  id: string;
  /** Friendly name, e.g. "Home" or "Work". */
  label: string;
  street: string;
  apt: string;
  city: string;
  zip: string;
  phone: string;
  instructions: string;
  isDefault: boolean;
}

/** The editable fields — id and default flag are managed by the store. */
export type AddressInput = Omit<SavedAddress, "id" | "isDefault">;

interface AddressesState {
  addresses: SavedAddress[];
  /** Add a new address. The first one added becomes the default automatically. */
  add: (input: AddressInput) => void;
  /** Overwrite the editable fields of an existing address. */
  update: (id: string, input: AddressInput) => void;
  /** Remove an address; if it was the default, the first remaining takes over. */
  remove: (id: string) => void;
  /** Make one address the default (clears the flag on the others). */
  setDefault: (id: string) => void;
}

let seq = 0;
function newId() {
  seq += 1;
  return `addr-${seq}-${Math.round(Math.random() * 1e6)}`;
}

export const useAddressesStore = create<AddressesState>()(
  persist(
    (set) => ({
      addresses: [],
      add: (input) =>
        set((s) => ({
          addresses: [
            ...s.addresses,
            { ...input, id: newId(), isDefault: s.addresses.length === 0 },
          ],
        })),
      update: (id, input) =>
        set((s) => ({
          addresses: s.addresses.map((a) => (a.id === id ? { ...a, ...input } : a)),
        })),
      remove: (id) =>
        set((s) => {
          const next = s.addresses.filter((a) => a.id !== id);
          // If the default was removed, promote the first remaining address so
          // there's always exactly one default when the book is non-empty.
          if (next.length && !next.some((a) => a.isDefault)) next[0].isDefault = true;
          return { addresses: next };
        }),
      setDefault: (id) =>
        set((s) => ({
          addresses: s.addresses.map((a) => ({ ...a, isDefault: a.id === id })),
        })),
    }),
    {
      name: "sfk:addresses",
      // Match the session/cart stores: read localStorage only after mount
      // (via StoreHydrator) so the server's empty list and the client's first
      // render agree, avoiding a hydration mismatch.
      skipHydration: true,
    },
  ),
);
