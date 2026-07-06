"use client";

import * as React from "react";
import { X, Plus, Minus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, cn } from "@/lib/utils";
import { buildCombos } from "@/data/menu";
import type { MenuItem, AddOnGroup } from "@/data/types";
import type { CartAddOn } from "@/store/use-cart-store";

interface AddOnModalProps {
  item: MenuItem;
  dateLabel: string;
  /** Confirm-button verb, e.g. "Add to order" (default) or "Add to auto order". */
  confirmLabel?: string;
  /** Show the quantity stepper (off for the Auto-Order picker, which is 1 each). */
  showQuantity?: boolean;
  /** Drop matching add-on groups from the combos (e.g. hide sides/beverages). */
  omitGroup?: (g: AddOnGroup) => boolean;
  /** Optional note under the header, e.g. "Add sides & drinks later at review." */
  footnote?: string;
  onClose: () => void;
  onConfirm: (addOns: CartAddOn[], qty: number, unitPrice: number) => void;
}

/**
 * Bottom-sheet combo picker. The item's add-on groups are pre-bundled into
 * whole combos (one option per group), so the user picks a single combo rather
 * than resolving protein / sauce / side separately. The first combo is selected
 * by default, so the "Add" button is ready immediately.
 */
export function AddOnModal({
  item,
  dateLabel,
  confirmLabel = "Add to order",
  showQuantity = true,
  omitGroup,
  footnote,
  onClose,
  onConfirm,
}: AddOnModalProps) {
  const combos = React.useMemo(() => buildCombos(item, omitGroup), [item, omitGroup]);
  const [comboId, setComboId] = React.useState(() => combos[0]?.id ?? "");
  const [qty, setQty] = React.useState(1);

  const combo = combos.find((c) => c.id === comboId) ?? combos[0];
  const resolved: CartAddOn[] = combo ? combo.selections : [];
  const unitPrice = item.price + (combo?.upcharge ?? 0);
  const canAdd = Boolean(combo);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={`Customize ${item.name}`}>
      <div className="absolute inset-0 bg-teal-deep/50" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full flex-col rounded-t-3xl border border-border bg-card shadow-raised sm:max-w-md sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-border p-5">
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight">{item.name}</h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">{item.description}</p>
            <p className="mt-1 text-2xs text-muted-foreground">For {dateLabel}</p>
            {footnote ? (
              <p className="mt-1.5 rounded-lg bg-teal-wash px-2 py-1 text-2xs font-medium text-teal-deep">
                {footnote}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full border border-border bg-card p-1.5 text-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-5">
          <div className="text-overline">Choose a combo</div>
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

        <div className="border-t border-border p-4">
          {showQuantity ? (
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[13px] font-semibold text-muted-foreground">Quantity</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="flex size-8 items-center justify-center rounded-full border border-border bg-card hover:bg-muted"
                >
                  <Minus className="size-3.5" />
                </button>
                <span className="w-6 text-center text-sm font-semibold nums">{qty}</span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => setQty((q) => q + 1)}
                  className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-teal-deep"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
            </div>
          ) : null}
          <Button
            block
            size="lg"
            disabled={!canAdd}
            onClick={() => onConfirm(resolved, qty, unitPrice)}
          >
            {confirmLabel} · {formatCurrency(unitPrice * qty)}
          </Button>
        </div>
      </div>
    </div>
  );
}
