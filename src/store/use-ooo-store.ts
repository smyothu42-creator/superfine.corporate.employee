import { create } from "zustand";

/**
 * Out-of-office state, driven from the Topbar toggle on the Orders page and read
 * by the Orders view to show the alert banner. Picking a date range marks the
 * employee away; auto-orders are paused for that window.
 */
interface OOOState {
  active: boolean;
  /** Individually picked out-of-office days (sorted ISO dates). */
  dates: string[];
  set: (dates: string[]) => void;
  clear: () => void;
}

export const useOOOStore = create<OOOState>((set) => ({
  active: false,
  dates: [],
  set: (dates) => set({ active: dates.length > 0, dates }),
  clear: () => set({ active: false, dates: [] }),
}));
