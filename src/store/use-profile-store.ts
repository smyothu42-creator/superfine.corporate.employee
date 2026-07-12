import { create } from "zustand";
import { me } from "@/data/me";

/**
 * The user's editable dietary profile, shared by Account & Profile and the
 * menu's filter chips. Both surfaces read and write this store, so the Dietary
 * preferences on the account page and the menu's Dietary / Allergens filters
 * always mirror each other — editing either updates the other. Applies to every
 * account type (individual or corporate); it isn't gated on the session.
 */
interface ProfileState {
  /** Dietary preferences to REQUIRE, e.g. Vegetarian. */
  dietary: string[];
  /** Allergens to AVOID. */
  allergens: string[];
  setDietary: (dietary: string[]) => void;
  setAllergens: (allergens: string[]) => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  dietary: me.dietary,
  allergens: me.allergens,
  setDietary: (dietary) => set({ dietary }),
  setAllergens: (allergens) => set({ allergens }),
}));
