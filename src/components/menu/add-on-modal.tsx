"use client";

import * as React from "react";
import { X, Plus, Minus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, cn } from "@/lib/utils";
import type { MenuItem, AddOnGroup } from "@/data/types";
import type { CartAddOn } from "@/store/use-cart-store";

interface AddOnModalProps {
  item: MenuItem;
  dateLabel: string;
  onClose: () => void;
  onConfirm: (addOns: CartAddOn[], qty: number, unitPrice: number) => void;
}

type Selection = Record<string, string[]>; // groupId -> optionIds

function initialSelection(groups: AddOnGroup[]): Selection {
  const sel: Selection = {};
  for (const g of groups) {
    // Pre-select the first option of a required single group (sensible default).
    sel[g.id] = g.required && g.select === "single" ? [g.options[0].id] : [];
  }
  return sel;
}

/**
 * Bottom-sheet add-on picker. Mandatory groups must be resolved before the
 * "Add" button enables (the User Flow's "Choose the required add-ons first"),
 * while optional groups are the "Customize" path. Forced selection via a bottom
 * sheet is exactly the pattern called for in the design sessions.
 */
export function AddOnModal({ item, dateLabel, onClose, onConfirm }: AddOnModalProps) {
  const groups = item.addOns ?? [];
  const [sel, setSel] = React.useState<Selection>(() => initialSelection(groups));
  const [qty, setQty] = React.useState(1);

  function toggle(group: AddOnGroup, optionId: string) {
    setSel((prev) => {
      const current = prev[group.id] ?? [];
      if (group.select === "single") {
        return { ...prev, [group.id]: [optionId] };
      }
      // multi
      if (current.includes(optionId)) {
        return { ...prev, [group.id]: current.filter((id) => id !== optionId) };
      }
      if (group.max && current.length >= group.max) return prev; // cap reached
      return { ...prev, [group.id]: [...current, optionId] };
    });
  }

  const resolved: CartAddOn[] = groups.flatMap((g) =>
    (sel[g.id] ?? []).map((optId) => {
      const opt = g.options.find((o) => o.id === optId)!;
      return { groupId: g.id, optionId: opt.id, name: opt.name, price: opt.price };
    }),
  );

  const addOnTotal = resolved.reduce((s, a) => s + a.price, 0);
  const unitPrice = item.price + addOnTotal;

  const unmet = groups.filter((g) => {
    if (!g.required) return false;
    const n = (sel[g.id] ?? []).length;
    if (g.select === "single") return n < 1;
    const need = g.max ?? 1;
    return n < need; // required multi must hit its target count (e.g. "choose 2")
  });
  const canAdd = unmet.length === 0;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={`Customize ${item.name}`}>
      <div className="absolute inset-0 bg-teal-deep/50" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full flex-col rounded-t-3xl border border-border bg-card shadow-raised sm:max-w-md sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-border p-5">
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight">{item.name}</h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">{item.description}</p>
            <p className="mt-1 text-2xs text-muted-foreground">For {dateLabel}</p>
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

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {groups.map((group) => {
            const current = sel[group.id] ?? [];
            return (
              <fieldset key={group.id}>
                <legend className="flex w-full items-center justify-between">
                  <span className="text-overline">{group.name}</span>
                  {group.required ? (
                    <Badge tone="warning">Required</Badge>
                  ) : (
                    <Badge tone="neutral">Optional{group.max ? ` · up to ${group.max}` : ""}</Badge>
                  )}
                </legend>
                <div className="mt-2 space-y-2">
                  {group.options.map((opt) => {
                    const checked = current.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => toggle(group, opt.id)}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left text-[13px] transition-colors",
                          checked ? "border-primary bg-teal-wash" : "border-border bg-card hover:bg-muted/50",
                        )}
                      >
                        <span className="flex items-center gap-2.5">
                          <span
                            className={cn(
                              "flex size-5 shrink-0 items-center justify-center border",
                              group.select === "single" ? "rounded-full" : "rounded-md",
                              checked ? "border-primary bg-primary text-primary-foreground" : "border-border",
                            )}
                          >
                            {checked ? <Check className="size-3.5" /> : null}
                          </span>
                          {opt.name}
                        </span>
                        {opt.price > 0 ? (
                          <span className="font-semibold nums">+{formatCurrency(opt.price)}</span>
                        ) : (
                          <span className="text-2xs text-muted-foreground">included</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}
        </div>

        <div className="border-t border-border p-4">
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
          <Button
            block
            size="lg"
            disabled={!canAdd}
            onClick={() => onConfirm(resolved, qty, unitPrice)}
          >
            {canAdd ? (
              <>Add to order · {formatCurrency(unitPrice * qty)}</>
            ) : (
              <>Choose {unmet[0].name.toLowerCase()}</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
