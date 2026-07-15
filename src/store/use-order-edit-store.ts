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
   * Whether an edit is in progress — the order's meals are loaded into the cart
   * and the menu is locked to the order's day(s). True from {@link begin} until
   * {@link end}; the UI (menu lock, cart styling, checkout CTA) keys off it.
   */
  active: boolean;
  begin: (orderId: string, snapshot: CartSnapshot) => void;
  /** Switch which order is being edited without disturbing the stored snapshot. */
  retarget: (orderId: string) => void;
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
