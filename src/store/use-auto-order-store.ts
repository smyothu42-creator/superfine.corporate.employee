import { create } from "zustand";

/**
 * Bridges the Auto-Order dashboard's controls up to the global Topbar, so the
 * nav header can carry the "Edit Auto Order" + "Stop ordering" actions and a
 * meal-pool count. The dashboard publishes this on mount and clears it on
 * unmount. `navTitle` lets the auto-order view set the page title per state
 * (Build Your Auto Order while picking, Auto Order Dashboard once active).
 */
export interface AutoOrderHeader {
  /** Number of meals in the rotation pool. */
  poolCount: number;
  /** Open the meal-picking / setup flow. */
  onEdit: () => void;
  /** Open the "How auto-order works" modal. */
  onHowItWorks: () => void;
  /** Turn off auto-ordering. Absent while paused (nothing to turn off). */
  onStop?: () => void;
}

interface AutoOrderHeaderState {
  header: AutoOrderHeader | null;
  setHeader: (header: AutoOrderHeader | null) => void;
  /** Contextual page title for the auto-order route (null = default). */
  navTitle: string | null;
  setNavTitle: (title: string | null) => void;
}

export const useAutoOrderStore = create<AutoOrderHeaderState>((set) => ({
  header: null,
  setHeader: (header) => set({ header }),
  navTitle: null,
  setNavTitle: (navTitle) => set({ navTitle }),
}));
