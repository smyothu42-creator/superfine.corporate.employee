"use client";

import * as React from "react";
import { X, UtensilsCrossed, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FoodPhoto } from "@/components/menu/food-photo";
import { getItem } from "@/data/menu";
import { cn } from "@/lib/utils";
import type { Order } from "@/data/types";

export type OrderLineItem = Order["days"][number]["items"][number];

/**
 * The change-order popup shown from My Orders. Each meal in the order carries its
 * own two actions:
 *  - "Pick from menu" — hand off to the full menu page in editing mode for that meal.
 *  - "Remove" — drop that meal.
 */
export function ChangeOrderDialog({
  items,
  dateLabel,
  onPickFromMenu,
  onRemove,
  onClose,
}: {
  items: OrderLineItem[];
  dateLabel: string;
  onPickFromMenu: (item: OrderLineItem) => void;
  onRemove: (item: OrderLineItem) => void;
  onClose: () => void;
}) {
  const [shown, setShown] = React.useState(false);

  React.useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={cn("absolute inset-0 bg-black/50 transition-opacity", shown ? "opacity-100" : "opacity-0")}
      />
      <div
        className={cn(
          "relative flex max-h-[80vh] w-full max-w-[460px] flex-col rounded-t-3xl bg-card shadow-raised transition-all duration-300 sm:rounded-3xl",
          shown ? "translate-y-0 sm:opacity-100" : "translate-y-full sm:translate-y-2 sm:opacity-0",
        )}
      >
        <div className="shrink-0 px-4 pt-3">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-border sm:hidden" />
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-display text-lg font-semibold leading-tight">Change your order</h3>
              <p className="text-[13px] text-muted-foreground">{dateLabel}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-full border border-border bg-card p-1.5 text-muted-foreground hover:bg-muted"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-5">
          {items.map((it, idx) => (
            <div
              key={`${it.itemId}-${idx}`}
              className="rounded-2xl border border-border bg-card p-3"
            >
              <div className="flex items-center gap-3">
                <FoodPhoto
                  src={getItem(it.itemId)?.image}
                  alt={it.name}
                  className="size-12 shrink-0 rounded-xl"
                  iconClassName="size-4"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {it.name} ×{it.qty}
                  </p>
                  {it.addOns.length ? (
                    <p className="truncate text-2xs text-muted-foreground">{it.addOns.join(" · ")}</p>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Button size="sm" className="flex-1" onClick={() => onPickFromMenu(it)}>
                  <UtensilsCrossed className="size-3.5" /> Pick from menu
                </Button>
                <Button size="sm" variant="outline" className="flex-1 text-danger" onClick={() => onRemove(it)}>
                  <Trash2 className="size-3.5" /> Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
