import { create } from "zustand";
import { orders as seedOrders } from "@/data/orders";
import type { Order } from "@/data/types";

/**
 * The user's orders, made reactive.
 *
 * The seed data in {@link seedOrders} is a static module array — fine for a read
 * only demo, but the "edit a placed order" flow needs saved changes to actually
 * show up in My Orders and on the order-detail page. So the list lives here as
 * zustand state that those views subscribe to; {@link OrdersState.update} patches
 * one order in place and the subscribers re-render.
 *
 * Not persisted: edits last for the session and reset to the seed on reload,
 * matching the rest of this prototype (checkout is visual-only too). The in
 * progress *edit session* — which day you're editing, and the cart to restore —
 * is what persists, in {@link useOrderEditStore}.
 */
interface OrdersState {
  orders: Order[];
  /** Look up a single order by id from the live list. */
  get: (id: string) => Order | undefined;
  /** Merge a partial patch into one order, replacing it so subscribers update. */
  update: (id: string, patch: Partial<Order>) => void;
}

export const useOrdersStore = create<OrdersState>((set, get) => ({
  orders: seedOrders,
  get: (id) => get().orders.find((o) => o.id === id),
  update: (id, patch) =>
    set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)) })),
}));
