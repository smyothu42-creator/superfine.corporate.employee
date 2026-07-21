"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { me } from "@/data/me";

/**
 * A corporate employee's chosen default delivery site among the company's
 * contract-locked addresses.
 *
 * The company owns *which* sites exist (that's `program.addresses`, read-only),
 * but which one an employee usually eats at is theirs to set — a Floor 3 vs
 * Floor 5 preference, not a contract term. Seeded from `me.defaultAddressId`
 * and persisted so the choice sticks the way the rest of the profile does.
 */
interface DefaultAddressState {
  defaultId: string;
  setDefault: (id: string) => void;
}

export const useDefaultAddressStore = create<DefaultAddressState>()(
  persist(
    (set) => ({
      defaultId: me.defaultAddressId,
      setDefault: (id) => set({ defaultId: id }),
    }),
    { name: "sfk:default-address" },
  ),
);
