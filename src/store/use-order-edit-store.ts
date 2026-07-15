import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, PackagingChoice } from "@/store/use-cart-store";
import type { PaymentChoice } from "@/data/types";

/** A frozen copy of the cart, taken before an edit so it can be put back. */
export interface CartSnapshot {
  items: CartItem[];
  windows: Record<string, string>;
  payment: PaymentChoice;
  addressId: string;
  packaging: PackagingChoice;
  pickupWindow: string | null;
  specialPickup: boolean;
}

/**
 * The "editing a placed order" session. Editing borrows the real cart as its
 * working surface, so before it starts we stash whatever was in the cart here
 * ({@link snapshot}) and remember which order is being edited
 * ({@link editingOrderId}). Saving or discarding restores the snapshot, so a new
 * order the user had half-built is never lost, and an abandoned edit never leaks
 * its meals into the next order.
 *
 * Persisted (key `sfk:order-edit`) so the session — and the banner offering to
 * resume or discard it — survives a reload or navigating away, exactly like the
 * cart it shadows. Rehydrated by {@link StoreHydrator} after first paint.
 */
interface OrderEditState {
  /** The order currently being edited, or null when not editing. */
  editingOrderId: string | null;
  /** The pre-edit cart, restored on save/discard. */
  snapshot: CartSnapshot | null;
  /**
   * Whether the edit *workspace* is loaded into the cart right now. An edit
   * session can be **paused**: `editingOrderId` stays set (so the banner can
   * offer to resume) while `active` is false, meaning the order's meals have
   * been taken back out of the cart and the menu behaves as a fresh order flow.
   * Resuming reloads the meals and re-locks the date.
   */
  active: boolean;
  begin: (orderId: string, snapshot: CartSnapshot) => void;
  /** Switch which order is being edited without disturbing the stored snapshot. */
  retarget: (orderId: string) => void;
  /** Park the session: the caller has taken the order's meals out of the cart. */
  pause: () => void;
  /** Reactivate a paused session, re-stashing the current cart as the new snapshot. */
  resume: (snapshot: CartSnapshot) => void;
  end: () => void;
}

export const useOrderEditStore = create<OrderEditState>()(
  persist(
    (set) => ({
      editingOrderId: null,
      snapshot: null,
      active: false,
      begin: (orderId, snapshot) => set({ editingOrderId: orderId, snapshot, active: true }),
      retarget: (orderId) => set({ editingOrderId: orderId, active: true }),
      pause: () => set({ active: false }),
      resume: (snapshot) => set({ snapshot, active: true }),
      end: () => set({ editingOrderId: null, snapshot: null, active: false }),
    }),
    {
      name: "sfk:order-edit",
      // Same reason as the cart: restore after mount, never during first render,
      // so the server (which has no session) and the client agree on render 1.
      skipHydration: true,
    },
  ),
);
