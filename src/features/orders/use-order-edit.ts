"use client";

import { useRouter } from "next/navigation";
import { toast } from "@/store/use-toast-store";
import { confirm } from "@/store/use-confirm-store";
import { useCartStore } from "@/store/use-cart-store";
import { useOrdersStore } from "@/store/use-orders-store";
import { useOrderEditStore } from "@/store/use-order-edit-store";
import { useUiStore } from "@/store/use-ui-store";
import type { Order, OrderDay } from "@/data/types";

/**
 * Orchestrates the "edit a placed order" session — the glue between the cart,
 * the reactive orders store, and the persisted edit-session store.
 *
 * The model: editing reuses the normal menu + cart, but as a bounded session.
 * `begin` stashes the current cart and loads the order's meals; the user edits
 * with the ordinary menu/cart controls; `save` writes the cart back onto the
 * order and restores the stashed cart; `discard` just restores it. Because the
 * session is persisted, leaving mid-edit keeps it resumable rather than leaking
 * the order's meals into the next order.
 */
export function useOrderEdit() {
  const router = useRouter();
  const cart = useCartStore();
  const updateOrder = useOrdersStore((s) => s.update);
  const editingOrderId = useOrderEditStore((s) => s.editingOrderId);
  const editActive = useOrderEditStore((s) => s.active);
  const begin = useOrderEditStore((s) => s.begin);
  const retarget = useOrderEditStore((s) => s.retarget);
  const pause = useOrderEditStore((s) => s.pause);
  const resume = useOrderEditStore((s) => s.resume);
  const end = useOrderEditStore((s) => s.end);
  const requestFocusDay = useUiStore((s) => s.requestFocusDay);
  const openCart = useUiStore((s) => s.openCart);
  const closeCart = useUiStore((s) => s.closeCart);

  /** A frozen copy of the cart right now — what an edit stashes and later restores. */
  function snapCart() {
    return {
      items: cart.items,
      windows: cart.windows,
      payment: cart.payment,
      addressId: cart.addressId,
      packaging: cart.packaging,
      pickupWindow: cart.pickupWindow,
      specialPickup: cart.specialPickup,
    };
  }

  async function beginEdit(order: Order) {
    const state = useOrderEditStore.getState();
    if (state.editingOrderId && state.editingOrderId !== order.id) {
      // Already editing a different order — switching abandons those changes.
      const ok = await confirm({
        title: "Switch to a different order?",
        description: `You're still editing ${state.editingOrderId}. Switching will discard those unsaved changes.`,
        confirmLabel: "Switch",
      });
      if (!ok) return;
      // Keep the original snapshot (the real cart from before any editing began).
      retarget(order.id);
    } else if (!state.editingOrderId) {
      // Fresh edit: stash whatever is in the cart so we can hand it back later.
      begin(order.id, snapCart());
    }
    cart.loadOrder(order);
    requestFocusDay(order.date);
    router.push("/menu");
    // Editing happens in the cart, so open it by default — the order's meals and
    // the Save / Discard controls are right there, with the menu behind it.
    openCart();
  }

  /**
   * Park the edit without ending it: put the pre-edit cart back (so the menu is a
   * clean new-order flow) and mark the session inactive. The banner's "Continue
   * editing" reloads the order's meals later. Used when the user leaves the menu
   * mid-edit.
   */
  function pauseEdit() {
    const { snapshot } = useOrderEditStore.getState();
    if (snapshot) cart.restore(snapshot);
    else cart.clear();
    pause();
    closeCart();
  }

  function saveEdit() {
    const { editingOrderId: id, snapshot } = useOrderEditStore.getState();
    if (!id) return;
    if (cart.count() === 0) {
      toast.warning("Add a meal first", "An order needs at least one meal, or cancel it from the order page.");
      return;
    }
    const existing = useOrdersStore.getState().get(id);
    const fallbackWindow = existing?.days[0]?.deliveryWindow ?? "12:00 PM – 12:30 PM";
    const dates = cart.dates();
    const days: OrderDay[] = dates.map((date) => ({
      date,
      deliveryWindow: cart.windows[date] ?? fallbackWindow,
      items: cart.itemsForDate(date).map((l) => ({
        itemId: l.itemId,
        name: l.name,
        qty: l.qty,
        addOns: l.addOns.map((a) => a.name),
        price: l.unitPrice,
      })),
    }));
    updateOrder(id, {
      days,
      date: dates[0] ?? existing?.date ?? "",
      subtotal: cart.subtotal(),
      subsidy: cart.totalSubsidy(),
      employeePaid: cart.totalEmployeePaid(),
      payment: cart.payment,
    });
    if (snapshot) cart.restore(snapshot);
    end();
    closeCart();
    toast.success("Order updated", `Your changes to ${id} have been saved.`);
    router.push(`/orders/${id}`);
  }

  async function discardEdit() {
    const { editingOrderId: id, snapshot, active } = useOrderEditStore.getState();
    // Discarding throws away unsaved edits, so confirm first.
    const ok = await confirm({
      title: "Discard your changes?",
      description: id
        ? `Your unsaved changes to ${id} will be lost. The order stays exactly as it was.`
        : "Your unsaved changes will be lost.",
      confirmLabel: "Discard changes",
      cancelLabel: "Keep editing",
      tone: "danger",
    });
    if (!ok) return;
    // Only put the pre-edit cart back if the workspace is still loaded. When
    // paused the cart is already the new-order flow (and may hold fresh work), so
    // restoring the old snapshot would wipe it — just end the parked session.
    if (active && snapshot) cart.restore(snapshot);
    end();
    closeCart();
    if (id) {
      toast.info("Edit discarded", `${id} was left unchanged.`);
      if (active) router.push(`/orders/${id}`);
    }
  }

  /**
   * Resume a parked edit: re-stash the current (new-order) cart so it survives
   * to save/discard, reload the order's meals, and land back on the locked menu.
   * Safe to call while already active — it then just reopens the workspace.
   */
  function resumeEdit() {
    const { editingOrderId: id, active } = useOrderEditStore.getState();
    if (!active) {
      const order = id ? useOrdersStore.getState().get(id) : undefined;
      resume(snapCart());
      if (order) {
        cart.loadOrder(order);
        requestFocusDay(order.date);
      }
    } else {
      const first = cart.dates()[0];
      if (first) requestFocusDay(first);
    }
    router.push("/menu");
    openCart();
  }

  return { editingOrderId, editActive, beginEdit, saveEdit, discardEdit, resumeEdit, pauseEdit };
}
