"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/store/use-toast-store";
import { useUiStore } from "@/store/use-ui-store";
import { ChangeOrderDialog } from "./change-order-dialog";
import { fromISODate, formatDay } from "@/lib/dates";
import type { Order } from "@/data/types";

/**
 * Shared "change a placed order" flow, used by both the My Orders list card and
 * the order-detail page so a single "Change" button always opens the same popup.
 * The popup offers two actions:
 *  - "Pick from menu" — seed the cart with the order's items, record the editing
 *    context and hand off to the main menu page (editing mode).
 *  - "Remove" — drop the order.
 *
 * Returns `startChange` (wire to your button) and `sheets` (render once).
 */
export function useChangeOrder(order: Order) {
  const router = useRouter();
  const startEditingOrder = useUiStore((s) => s.startEditingOrder);

  const items = order.days.flatMap((d) => d.items);
  const [open, setOpen] = React.useState(false);

  const changeWeekday = fromISODate(order.date).toLocaleDateString("en-US", { weekday: "long" });
  const changeDateLabel = `${changeWeekday}, ${formatDay(fromISODate(order.date))}`;

  function startChange() {
    setOpen(true);
  }

  const sheets = open ? (
    <ChangeOrderDialog
      items={items}
      dateLabel={changeDateLabel}
      onClose={() => setOpen(false)}
      onRemove={(it) => {
        setOpen(false);
        toast.success("Meal removed", `${it.name} removed from ${order.id}.`);
        router.push("/orders");
      }}
      onPickFromMenu={(it) => {
        // Enter "change this meal" mode and hand off to the menu. Picking a meal
        // there opens a confirm dialog — no cart involved.
        startEditingOrder({
          orderId: order.id,
          date: order.date,
          originalItemId: it.itemId,
          originalItemName: it.name,
          itemId: it.itemId,
          itemName: it.name,
          dateLabel: changeDateLabel,
        });
        setOpen(false);
        router.push("/menu");
      }}
    />
  ) : null;

  return { startChange, sheets };
}
