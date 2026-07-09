import { create } from "zustand";
import { me } from "@/data/me";

/**
 * The employee's editable dietary profile, as shown on the account page.
 *
 * Deliberately NOT wired into the menu's filter chips: the menu opens unfiltered
 * so a first visit shows the whole menu rather than a silently narrowed one. This
 * records what the employee told us, not what the menu is currently showing.
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
