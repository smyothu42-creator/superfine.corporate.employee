"use client";

import * as React from "react";
import { X, ArrowLeftRight, Trash2, SlidersHorizontal, ChevronLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FoodPhoto } from "@/components/menu/food-photo";
import { getItem, buildCombos, comboAddOnLabels } from "@/data/menu";
import { formatCurrency, cn } from "@/lib/utils";
import type { Order, MenuCombo } from "@/data/types";

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
 * The change-order popup shown from My Orders. Each meal in the order carries its
 * own actions:
 *  - "Pick from menu" — hand off to the full menu page in editing mode for that meal.
 *  - "Remove" — drop that meal. Hidden when the order has a single meal (there'd
 *    be nothing left to keep) and always replaced by "Customize" on auto-orders.
 *  - "Customize" (auto-orders only) — swap this dialog in place to the meal's
 *    combo options; picking one applies it and fires a confirmation toast.
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
  // When set, the dialog swaps its list for that meal's combo options in place.
  const [customizing, setCustomizing] = React.useState<{ item: OrderLineItem; idx: number } | null>(null);
  // Bumped after an applied customization so the (mutated) line item re-renders.
  const [, force] = React.useReducer((n: number) => n + 1, 0);

  React.useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        // Escape backs out of the combo view first, then closes the dialog.
        if (customizing) setCustomizing(null);
        else onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, customizing]);

  // Only a single meal left → removing it would empty the order, so hide Remove.
  const canRemove = items.length > 1;

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
          "relative flex max-h-[80dvh] w-full max-w-[460px] flex-col rounded-t-3xl bg-card shadow-raised transition-all duration-300 sm:rounded-3xl",
          shown ? "translate-y-0 sm:opacity-100" : "translate-y-full sm:translate-y-2 sm:opacity-0",
        )}
      >
        <div className="shrink-0 px-4 pt-3">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-border sm:hidden" />
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2">
              {customizing ? (
                <button
                  type="button"
                  onClick={() => setCustomizing(null)}
                  aria-label="Back"
                  className="-ml-1 mt-0.5 rounded-full border border-border bg-card touch-target p-1.5 text-muted-foreground hover:bg-muted"
                >
                  <ChevronLeft className="size-4" />
                </button>
              ) : null}
              <div>
                <h3 className="font-display text-lg font-semibold leading-tight">
                  {customizing ? "Customize meal" : "Change your order"}
                </h3>
                <p className="text-[13px] text-muted-foreground">
                  {customizing ? customizing.item.name : dateLabel}
                </p>
              </div>
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

        {customizing ? (
          <CustomizePanel
            item={customizing.item}
            onApply={(choice) => {
              onCustomize?.(customizing.item, choice);
              force();
              setCustomizing(null);
            }}
          />
        ) : (
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
                        onClick={() => setCustomizing({ item: it, idx })}
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
        )}
      </div>
    </div>
  );
}

/**
 * In-place combo picker swapped into the change dialog for an auto-order meal.
 * Selecting a combo applies it immediately (and closes back to the list) — the
 * current add-ons are pre-selected so the user sees where they are starting from.
 */
function CustomizePanel({
  item,
  onApply,
}: {
  item: OrderLineItem;
  onApply: (choice: AppliedCustomization) => void;
}) {
  const menuItem = getItem(item.itemId);
  const combos = React.useMemo(() => (menuItem ? buildCombos(menuItem) : []), [menuItem]);
  // Pre-select the combo matching the meal's current add-ons, else the first.
  const currentKey = [...item.addOns].sort().join("|");
  const initial =
    combos.find((c) => comboAddOnLabels(c).sort().join("|") === currentKey)?.id ?? combos[0]?.id ?? "";
  const [comboId, setComboId] = React.useState(initial);

  const basePrice = menuItem?.price ?? item.price;
  const selected = combos.find((c) => c.id === comboId) ?? combos[0];

  function apply(c: MenuCombo) {
    onApply({
      addOns: comboAddOnLabels(c),
      price: basePrice + c.upcharge,
      comboLabel: c.name,
    });
  }

  return (
    <div className="mt-3 flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4">
        <div className="text-overline">Choose your options</div>
        {combos.map((c) => {
          const checked = c.id === comboId;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setComboId(c.id)}
              className={cn(
                "flex w-full items-start justify-between gap-3 rounded-xl border p-3 text-left text-[13px] transition-colors",
                checked ? "border-primary bg-teal-wash" : "border-border bg-card hover:bg-muted/50",
              )}
            >
              <span className="flex min-w-0 items-start gap-2.5">
                <span
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
                    checked ? "border-primary bg-primary text-primary-foreground" : "border-border",
                  )}
                >
                  {checked ? <Check className="size-3.5" /> : null}
                </span>
                <span className="min-w-0">
                  <span className="font-medium">{c.name}</span>
                  <span className="mt-1 block space-y-0.5">
                    {c.includes.map((inc) => (
                      <span key={inc.group} className="block text-2xs text-muted-foreground">
                        <span className="font-semibold text-foreground/70">{inc.group}:</span> {inc.item}
                      </span>
                    ))}
                  </span>
                </span>
              </span>
              {c.upcharge > 0 ? (
                <span className="shrink-0 font-semibold nums">+{formatCurrency(c.upcharge)}</span>
              ) : (
                <span className="shrink-0 text-2xs text-muted-foreground">included</span>
              )}
            </button>
          );
        })}
      </div>
      <div className="shrink-0 border-t border-border p-4">
        <Button block size="lg" disabled={!selected} onClick={() => selected && apply(selected)}>
          Apply customization
        </Button>
      </div>
    </div>
  );
}
