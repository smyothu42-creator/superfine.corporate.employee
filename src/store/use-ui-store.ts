import { create } from "zustand";

/**
 * Global UI state (chrome / shell). Kept separate from domain stores so layout
 * concerns don't re-render data views.
 */
interface UiState {
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  toggleMobileNav: () => void;
  /** ISO date the menu is currently ordering for — drives the topbar budget. */
  activeOrderDate: string;
  setActiveOrderDate: (iso: string) => void;
  /** Service days planned in a multi-day order — drives "days remaining". */
  plannedDays: string[];
  setPlannedDays: (days: string[]) => void;
  /** Cross-view request to (re)open the multi-day date-range picker on /menu. */
  rangePickerRequested: boolean;
  requestRangePicker: () => void;
  clearRangePicker: () => void;
  /** Slide-in cart side panel. */
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  mobileNavOpen: false,
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
  toggleMobileNav: () => set((s) => ({ mobileNavOpen: !s.mobileNavOpen })),
  activeOrderDate: "",
  setActiveOrderDate: (activeOrderDate) => set({ activeOrderDate }),
  plannedDays: [],
  setPlannedDays: (plannedDays) => set({ plannedDays }),
  rangePickerRequested: false,
  requestRangePicker: () => set({ rangePickerRequested: true }),
  clearRangePicker: () => set({ rangePickerRequested: false }),
  cartOpen: false,
  setCartOpen: (cartOpen) => set({ cartOpen }),
  openCart: () => set({ cartOpen: true }),
  closeCart: () => set({ cartOpen: false }),
  toggleCart: () => set((s) => ({ cartOpen: !s.cartOpen })),
}));
