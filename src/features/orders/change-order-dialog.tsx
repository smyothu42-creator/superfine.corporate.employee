"use client";

import * as React from "react";
import { X, ArrowLeftRight, Trash2, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FoodPhoto } from "@/components/menu/food-photo";
import { AddOnModal } from "@/components/menu/add-on-modal";
import { getItem, buildCombos, cleanOptionName } from "@/data/menu";
import { cn } from "@/lib/utils";
import type { Order, MenuItem } from "@/data/types";
import type { CartAddOn } from "@/store/use-cart-store";

export type OrderLineItem = Order["days"][number]["items"][number];

/** The customization a user applied to a meal from within the change popup. */
export interface AppliedCustomization {
  /** Resolved add-on labels, e.g. ["Brisket", "Extra chimichurri"]. */
  addOns: string[];
  /** New unit price incl. the chosen combo's upcharge. */
  price: number;
  /** Friendly combo label for the confirmation toast. */
  comboLabel: string;
}

/**
 * Reverse a line item's resolved add-on labels back into selectable options, so
 * the customizer can open pre-filled on the meal's current choices instead of
 * blank. Labels are stored as cleaned option names (see combo-builder), which is
 * what we match on.
 */
function addOnsFromLabels(item: MenuItem | undefined, labels: string[]): CartAddOn[] {
  if (!item) return [];
  const wanted = new Set(labels);
  const picked: CartAddOn[] = [];
  for (const g of item.addOns ?? []) {
    for (const o of g.options) {
      const name = cleanOptionName(o.name);
      if (wanted.has(name)) picked.push({ groupId: g.id, optionId: o.id, name, price: o.price });
    }
  }
  return picked;
}

/**
 * The change-order popup shown from My Orders. Each meal in the order carries its
 * own actions:
 *  - "Pick from menu" — hand off to the full menu page in editing mode for that meal.
 *  - "Remove" — drop that meal. Hidden when the order has a single meal (there'd
 *    be nothing left to keep) and always replaced by "Customize" on auto-orders.
 *  - "Customize" (auto-orders only) — opens the same individual-style AddOnModal
 *    used in Auto-Order setup, pre-filled with the meal's current choices so it's
 *    an edit, not a fresh start; confirming applies it and fires a toast.
 */
export function ChangeOrderDialog({
  items,
  dateLabel,
  isAuto = false,
  onPickFromMenu,
  onRemove,
  onCustomize,
  onClose,
}: {
  items: OrderLineItem[];
  dateLabel: string;
  /** Auto-order draft → the second action becomes "Customize" instead of "Remove". */
  isAuto?: boolean;
  onPickFromMenu: (item: OrderLineItem) => void;
  onRemove: (item: OrderLineItem) => void;
  onCustomize?: (item: OrderLineItem, choice: AppliedCustomization) => void;
  onClose: () => void;
}) {
  const [shown, setShown] = React.useState(false);
  // When set, the AddOnModal opens over the dialog to edit that meal's options.
  const [customizing, setCustomizing] = React.useState<OrderLineItem | null>(null);
  // Bumped after an applied customization so the (mutated) line item re-renders.
  const [, force] = React.useReducer((n: number) => n + 1, 0);

  React.useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        // Escape backs out of the customizer first, then closes the dialog.
        if (customizing) setCustomizing(null);
        else onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, customizing]);

  // Only a single meal left → removing it would empty the order, so hide Remove.
  const canRemove = items.length > 1;

  const custMenuItem = customizing ? getItem(customizing.itemId) : undefined;

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className={cn("absolute inset-0 bg-black/50 transition-opacity", shown ? "opacity-100" : "opacity-0")}
        />
        <div
          className={cn(
            "relative flex max-h-[80dvh] w-full max-w-[460px] flex-col rounded-t-3xl bg-card shadow-raised transition-all duration-300 sm:rounded-3xl",
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
                className="rounded-full border border-border bg-card touch-target p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-5">
            {items.map((it, idx) => {
              const menuItem = getItem(it.itemId);
              const hasCombos = menuItem ? buildCombos(menuItem).length > 0 : false;
              const showCustomize = isAuto && Boolean(onCustomize) && hasCombos;
              return (
                <div
                  key={`${it.itemId}-${idx}`}
                  className="rounded-2xl border border-border bg-card p-3"
                >
                  <div className="flex items-center gap-3">
                    <FoodPhoto
                      src={menuItem?.image}
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
                      <ArrowLeftRight className="size-3.5" /> Change Meal
                    </Button>
                    {showCustomize ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setCustomizing(it)}
                      >
                        <SlidersHorizontal className="size-3.5" /> Customize
                      </Button>
                    ) : !isAuto && canRemove ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-danger text-danger hover:bg-danger/10"
                        onClick={() => onRemove(it)}
                      >
                        <Trash2 className="size-3.5" /> Remove
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* The very same customization sheet as Auto-Order setup, opened pre-filled
          on this meal's current choices — an edit, not a fresh build. Quantity /
          "add another" are off: we're editing one existing order line, not
          adding meals. */}
      {customizing && custMenuItem ? (
        <AddOnModal
          item={custMenuItem}
          dateLabel={dateLabel}
          confirmLabel="Save customization"
          showQuantity={false}
          initialAddOns={addOnsFromLabels(custMenuItem, customizing.addOns)}
          onClose={() => setCustomizing(null)}
          onConfirm={(combos) => {
            const c = combos[0];
            if (c) {
              onCustomize?.(customizing, {
                addOns: c.addOns.map((a) => a.name),
                price: c.unitPrice,
                comboLabel: c.summary || customizing.name,
              });
              force();
            }
            setCustomizing(null);
          }}
        />
      ) : null}
    </>
  );
}
