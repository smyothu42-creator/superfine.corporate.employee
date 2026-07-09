"use client";

import * as React from "react";
import { X, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OptionGroups, useItemOptions } from "@/components/menu/option-groups";
import { formatCurrency } from "@/lib/utils";
import type { MenuItem, AddOnGroup } from "@/data/types";
import type { CartAddOn } from "@/store/use-cart-store";

interface AddOnModalProps {
  item: MenuItem;
  dateLabel: string;
  /** Confirm-button verb, e.g. "Add to order" (default) or "Add to auto order". */
  confirmLabel?: string;
  /** Show the quantity stepper (off for the Auto-Order picker, which is 1 each). */
  showQuantity?: boolean;
  /** Drop matching option groups (e.g. hide sides/beverages). */
  omitGroup?: (g: AddOnGroup) => boolean;
  /** Optional note under the header, e.g. "Add sides & drinks later at review." */
  footnote?: string;
  onClose: () => void;
  onConfirm: (addOns: CartAddOn[], qty: number, unitPrice: number) => void;
}

/**
 * Bottom-sheet customiser for one **individual meal**. The meal is configured a
 * section at a time — Protein, then Sauce, then Side — with every option on
 * screen, because each list is short enough to read at a glance.
 *
 * It deliberately does NOT enumerate combos: three groups multiply out to dozens
 * of near-identical rows, and picking "Chicken · Ranch · Rice" from a wall of
 * them is harder than answering three small questions. A second combination is
 * a second trip through this sheet, added as its own line.
 *
 * Family Style packages don't come through here: they're portioned by headcount,
 * so they open {@link FamilyStyleModal} instead.
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
  const { groups, picked, toggle, selections, unitPrice, valid, missingLabel, summary } =
    useItemOptions(item, omitGroup);
  const [qty, setQty] = React.useState(1);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Customize ${item.name} for ${dateLabel}`}
    >
      <div className="absolute inset-0 bg-teal-deep/50" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full flex-col rounded-t-3xl border border-border bg-card shadow-raised sm:max-w-md sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-border p-5">
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight">{item.name}</h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">{item.description}</p>
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

        <div className="flex-1 overflow-y-auto p-5">
          {groups.length ? (
            <OptionGroups groups={groups} picked={picked} onToggle={toggle} />
          ) : (
            <p className="text-[13px] text-muted-foreground">
              This meal comes as it is. Nothing to choose.
            </p>
          )}
        </div>

        <div className="border-t border-border p-4">
          {summary ? (
            <p className="mb-3 truncate text-[13px] text-muted-foreground">
              <span className="font-semibold text-foreground">Your meal:</span> {summary}
            </p>
          ) : null}
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
          {/* A required group with no answer names itself on the button, so the
              blocker is legible without scrolling back up to hunt for it. */}
          <Button
            block
            size="lg"
            disabled={!valid}
            onClick={() => onConfirm(selections, qty, unitPrice)}
          >
            {valid ? `${confirmLabel} · ${formatCurrency(unitPrice * qty)}` : `Choose ${missingLabel}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
