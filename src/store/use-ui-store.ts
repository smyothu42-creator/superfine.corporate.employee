import { create } from "zustand";

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
  /** Demo-only subsidy-model switch behind the topbar budget pill. */
  subsidyMode: SubsidyMode;
  toggleSubsidyMode: () => void;
  /** Explainer modal shown when the model is switched. */
  subsidyModalOpen: boolean;
  closeSubsidyModal: () => void;
  /**
   * Feedback form shown from the floating action button (and anywhere else that
   * wants the general "rate a meal" form). `feedbackModalOrder` optionally
   * pre-fills the order number, mirroring the `/feedback?order=` deep link.
   */
  feedbackModalOpen: boolean;
  feedbackModalOrder: string | null;
  openFeedbackModal: (order?: string | null) => void;
  closeFeedbackModal: () => void;
  /**
   * Sign-in wall for guests reaching an account-only screen. `signInPromptNext`
   * remembers where they were headed so we can land them there once signed in.
   */
  signInPromptOpen: boolean;
  signInPromptNext: string | null;
  openSignInPrompt: (next?: string | null) => void;
  closeSignInPrompt: () => void;
  /**
   * Set for the length of a deliberate sign-out. Leaving an account-only screen
   * by signing out looks identical to a guest wandering onto one — both are
   * "no account, gated path" — but they want opposite endings: the wanderer
   * gets the menu with the prompt raised, the leaver gets the sign-in page.
   * `AccessGate` reads this to tell them apart and stand down for the latter.
   */
  signingOut: boolean;
  beginSignOut: () => void;
  endSignOut: () => void;
  /**
   * The branded screen that covers the gap between proving who you are and
   * landing in the app. It lives here rather than inside the sign-in flow
   * because it has to outlive that flow: signing in from the guest wall closes
   * the modal the form was rendered in, and signing in from `/login` navigates
   * away from the page it was rendered on. Either would unmount a locally-held
   * overlay at exactly the moment it is meant to be covering something.
   */
  authHandoff: { title: string; detail: string } | null;
  beginAuthHandoff: (handoff: { title: string; detail: string }) => void;
  endAuthHandoff: () => void;
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
  subsidyMode: "fixed",
  toggleSubsidyMode: () =>
    set((s) => ({
      subsidyMode: s.subsidyMode === "fixed" ? "percent" : "fixed",
      subsidyModalOpen: true,
    })),
  subsidyModalOpen: false,
  closeSubsidyModal: () => set({ subsidyModalOpen: false }),
  feedbackModalOpen: false,
  feedbackModalOrder: null,
  openFeedbackModal: (order = null) => set({ feedbackModalOpen: true, feedbackModalOrder: order }),
  closeFeedbackModal: () => set({ feedbackModalOpen: false, feedbackModalOrder: null }),
  signInPromptOpen: false,
  signInPromptNext: null,
  openSignInPrompt: (next = null) => set({ signInPromptOpen: true, signInPromptNext: next }),
  closeSignInPrompt: () => set({ signInPromptOpen: false, signInPromptNext: null }),
  signingOut: false,
  // Clearing the prompt on the way out matters: a gate may already have raised
  // it in the same tick the session dropped, and it would otherwise ride along
  // to the sign-in page as a dialog on top of the very form it duplicates.
  beginSignOut: () => set({ signingOut: true, signInPromptOpen: false, signInPromptNext: null }),
  endSignOut: () => set({ signingOut: false }),
  authHandoff: null,
  beginAuthHandoff: (authHandoff) => set({ authHandoff }),
  endAuthHandoff: () => set({ authHandoff: null }),
}));
