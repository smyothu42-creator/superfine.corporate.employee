"use client";

import { useOrderEdit } from "./use-order-edit";
import type { Order } from "@/data/types";

/**
 * "Change a placed order" — wired to the Edit / Change-order buttons on the My
 * Orders list card and the order-detail page.
 *
 * There's no separate replacement/tutorial flow. Clicking it opens a bounded
 * *edit session* (see {@link useOrderEdit}): the order's meals are loaded into
 * the cart and the user is dropped on the ordinary menu, where they remove, swap,
 * re-customize or add items and then Save or Discard from the cart. The session
 * is isolated (their in-progress cart is stashed and restored) and resumable, so
 * leaving mid-edit never mixes the order's meals into a new one.
 *
 * Returns `startChange` — wire it to your button.
 */
export function useChangeOrder(order: Order) {
  const { beginEdit } = useOrderEdit();
  return { startChange: () => beginEdit(order) };
}
