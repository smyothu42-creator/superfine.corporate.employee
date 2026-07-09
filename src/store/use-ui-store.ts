import { create } from "zustand";

/**
 * Context for the "edit a placed order from the full menu" flow. Set when the
 * user picks "Select from full menu" in the change-order popup, then read by the
 * menu (to focus the edited day + show the editing banner) and the cart (badge).
 */
export interface EditingOrderContext {
  orderId: string;
  /** ISO day being edited. */
  date: string;
  /** The original meal being replaced (fixed — drives the "from → to" summary). */
  originalItemId: string;
  originalItemName: string;
  /** The current selection (starts equal to the original, becomes the new pick). */
  itemId: string;
  itemName: string;
  /** Human label, e.g. "Tuesday, Jul 7". */
  dateLabel: string;
}

/**
 * Which subsidy contract the topbar budget indicator is showing. `fixed` is
 * Neptune's real contract ($15/day cap); `percent` is a demo-only preview of
 * how the same screen reads for a share-of-order contract.
 */
export type SubsidyMode = "fixed" | "percent";

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
  /**
   * Cross-view request to focus a specific day on /menu (e.g. the cart's
   * "Order for this day" on an empty planned day). Null = no pending request.
   */
  focusDayRequested: string | null;
  requestFocusDay: (iso: string) => void;
  clearFocusDay: () => void;
  /** Slide-in cart side panel. */
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  /** Active "edit a placed order from the full menu" context (null = not editing). */
  editingOrder: EditingOrderContext | null;
  startEditingOrder: (ctx: EditingOrderContext) => void;
  clearEditingOrder: () => void;
  /** Demo-only subsidy-model switch behind the topbar budget pill. */
  subsidyMode: SubsidyMode;
  toggleSubsidyMode: () => void;
  /** Explainer modal shown when the model is switched. */
  subsidyModalOpen: boolean;
  closeSubsidyModal: () => void;
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
  focusDayRequested: null,
  requestFocusDay: (iso) => set({ focusDayRequested: iso }),
  clearFocusDay: () => set({ focusDayRequested: null }),
  cartOpen: false,
  setCartOpen: (cartOpen) => set({ cartOpen }),
  openCart: () => set({ cartOpen: true }),
  closeCart: () => set({ cartOpen: false }),
  toggleCart: () => set((s) => ({ cartOpen: !s.cartOpen })),
  editingOrder: null,
  startEditingOrder: (editingOrder) => set({ editingOrder }),
  clearEditingOrder: () => set({ editingOrder: null }),
  subsidyMode: "fixed",
  toggleSubsidyMode: () =>
    set((s) => ({
      subsidyMode: s.subsidyMode === "fixed" ? "percent" : "fixed",
      subsidyModalOpen: true,
    })),
  subsidyModalOpen: false,
  closeSubsidyModal: () => set({ subsidyModalOpen: false }),
}));
