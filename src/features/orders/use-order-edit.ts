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
 * order and restores the stashed cart; `discard` (and leaving the menu, which is
 * treated the same way) just restores it. Leaving mid-edit discards the change —
 * it never leaks the order's meals into the next order.
 */
export function useOrderEdit() {
  const router = useRouter();
  const cart = useCartStore();
  const updateOrder = useOrdersStore((s) => s.update);
  const editingOrderId = useOrderEditStore((s) => s.editingOrderId);
  const editActive = useOrderEditStore((s) => s.active);
  const begin = useOrderEditStore((s) => s.begin);
  const retarget = useOrderEditStore((s) => s.retarget);
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

  /** The shared teardown: put the pre-edit cart back and end the session. */
  function revertAndEnd() {
    const { snapshot } = useOrderEditStore.getState();
    if (snapshot) cart.restore(snapshot);
    else cart.clear();
    end();
    closeCart();
  }

  /**
   * Discard the edit because the user is leaving the menu. The leave popup has
   * already confirmed and the guard navigates them onward, so this just reverts
   * the cart, ends the session, and notes it — no second confirm, no redirect.
   * Leaving is a discard: the order stays exactly as it was.
   */
  function abandonEdit() {
    const { editingOrderId: id } = useOrderEditStore.getState();
    revertAndEnd();
    if (id) toast.info("Edit discarded", `${id} was left unchanged.`);
  }

  function saveEdit() {
    const { editingOrderId: id } = useOrderEditStore.getState();
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
    revertAndEnd();
    toast.success("Order updated", `Your changes to ${id} have been saved.`);
    router.push(`/orders/${id}`);
  }

  async function discardEdit() {
    const { editingOrderId: id } = useOrderEditStore.getState();
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
    revertAndEnd();
    if (id) {
      toast.info("Edit discarded", `${id} was left unchanged.`);
      router.push(`/orders/${id}`);
    }
  }

  /**
   * "Continue editing" from the banner — reopens the edit workspace on the menu.
   * The edit is always live here (the order's meals are still in the cart), so
   * this just refocuses the order's day, returns to the menu, and reopens the cart.
   */
  function resumeEdit() {
    const { editingOrderId: id } = useOrderEditStore.getState();
    const order = id ? useOrdersStore.getState().get(id) : undefined;
    if (order) requestFocusDay(order.date);
    router.push("/menu");
    openCart();
  }

  return { editingOrderId, editActive, beginEdit, saveEdit, discardEdit, resumeEdit, abandonEdit };
}
