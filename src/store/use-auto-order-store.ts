import { create } from "zustand";

/**
 * Bridges the Auto-Order dashboard's weekly summary + toggle up to the global
 * Topbar, so the nav header can adapt per feature (Total/Budget/Remaining and
 * the Auto-Order switch on the dashboard, cart elsewhere). The dashboard
 * publishes this on mount and clears it on unmount.
 */
export interface AutoOrderHeader {
  total: number;
  budget: number;
  remaining: number;
  paused: boolean;
  onToggle: (next: boolean) => void;
}

interface AutoOrderHeaderState {
  header: AutoOrderHeader | null;
  setHeader: (header: AutoOrderHeader | null) => void;
}

export const useAutoOrderStore = create<AutoOrderHeaderState>((set) => ({
  header: null,
  setHeader: (header) => set({ header }),
}));
