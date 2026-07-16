"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X, Plus, Minus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  minGuestsFor,
  pricePerGuestFor,
  servingsRequired,
  servingUnit,
  familyStyleTotal,
} from "@/data/menu";
import { formatCurrency, cn } from "@/lib/utils";
import type { MenuItem, ServingGroup } from "@/data/types";
import type { CartServing } from "@/store/use-cart-store";

/** groupId → optionId → servings assigned. */
type Quantities = Record<string, Record<string, number>>;

interface FamilyStyleModalProps {
  item: MenuItem;
  dateLabel: string;
  /** Render inline (no overlay/header/close) for the meal detail page's right
   *  column — same configurator + action bar as the popup. */
  embedded?: boolean;
  onClose: () => void;
  onConfirm: (
    guests: number,
    servings: CartServing[],
    totalPrice: number,
  ) => void;
}

/**
 * Open every group on zero. Choosing which dishes feed the table is the whole
 * decision here, so we never make it for them — the per-group chip says how many
 * servings are still owed, and Add stays disabled until they've picked them.
 */
function seedQuantities(groups: ServingGroup[]): Quantities {
  return Object.fromEntries(
    groups.map((g) => [
      g.id,
      Object.fromEntries(g.options.map((o) => [o.id, 0])),
    ]),
  );
}

/**
 * The Family Style configurator. Set a headcount, then say how many of each
 * dish. The headcount decides both the price and how many servings each group
 * owes, so it sits at the top and everything below reacts to it.
 *
 * This is what separates it from an individual meal: there you pick one plate
 * and configure it; here you buy a headcount and divide it up.
 */
export function FamilyStyleModal({
  item,
  dateLabel,
  embedded = false,
  onClose,
  onConfirm,
}: FamilyStyleModalProps) {
  const minGuests = minGuestsFor(item);
  const perGuest = pricePerGuestFor(item);
  const groups = item.servingGroups ?? [];
  const required = groups.filter((g) => g.perGuest > 0);
  const extras = groups.filter((g) => g.perGuest === 0);

  const [guests, setGuests] = React.useState(minGuests);
  const [quantities, setQuantities] = React.useState<Quantities>(() =>
    seedQuantities(groups),
  );

  /**
   * Changing the headcount changes what every required group owes. Adding guests
   * just raises the target — the extra servings are the user's to place, same as
   * the first ones. Dropping guests can strand servings above the new target, so
   * trim them off the biggest option first and keep going until the group fits;
   * one option rarely holds the whole reduction.
   */
  function changeGuests(next: number) {
    if (next < minGuests) return;
    setGuests(next);
    setQuantities((prev) => {
      const updated = { ...prev };
      for (const g of required) {
        const counts = { ...prev[g.id] };
        const target = servingsRequired(g, next);
        let over =
          g.options.reduce((sum, o) => sum + (counts[o.id] ?? 0), 0) - target;
        if (over <= 0) continue;

        while (over > 0) {
          const biggest = [...g.options].sort(
            (a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0),
          )[0];
          const held = counts[biggest.id] ?? 0;
          if (held === 0) break; // nothing left to take; guard against a spin
          const taken = Math.min(held, over);
          counts[biggest.id] = held - taken;
          over -= taken;
        }
        updated[g.id] = counts;
      }
      return updated;
    });
  }

  /**
   * A required group can never hold more than the headcount owes it, so a raise
   * is clamped to whatever room its siblings leave — typing 50 into a group that
   * owes 6 lands on 6, not on an error the user has to go back and undo.
   * Optional extras (perGuest 0) have no ceiling to hit.
   */
  function setQty(groupId: string, optionId: string, qty: number) {
    setQuantities((prev) => {
      const counts = prev[groupId] ?? {};
      const group = groups.find((g) => g.id === groupId);
      let next = Math.max(0, Math.floor(qty) || 0);

      if (group && group.perGuest > 0) {
        const others = group.options.reduce(
          (sum, o) => (o.id === optionId ? sum : sum + (counts[o.id] ?? 0)),
          0,
        );
        next = Math.min(
          next,
          Math.max(0, servingsRequired(group, guests) - others),
        );
      }
      return { ...prev, [groupId]: { ...counts, [optionId]: next } };
    });
  }

  const assignedIn = (group: ServingGroup) =>
    group.options.reduce(
      (sum, o) => sum + (quantities[group.id]?.[o.id] ?? 0),
      0,
    );

  const unbalanced = required.filter(
    (g) => assignedIn(g) !== servingsRequired(g, guests),
  );
  const valid = unbalanced.length === 0;
  const total = familyStyleTotal(item, guests, quantities);

  // Scroll the blocked CTA's target group into view — the same "the button is a
  // signpost, never a dead end" pattern the individual-meal sheet uses.
  const groupRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  function scrollToGroup(id: string) {
    groupRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function confirm() {
    const servings: CartServing[] = groups.flatMap((group) =>
      group.options
        .filter((o) => (quantities[group.id]?.[o.id] ?? 0) > 0)
        .map((o) => ({
          groupId: group.id,
          groupName: group.name,
          optionId: o.id,
          name: o.name,
          qty: quantities[group.id][o.id],
          unit: group.unit ?? "serving",
        })),
    );
    onConfirm(guests, servings, total);
  }

  // Shared between the popup and the embedded (detail-page) render.
  const configBody = (
    <>
      {/* Headcount sets the price and every serving total below it. */}
      <section className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
            <div className="min-w-0">
              <h3 className="font-display text-sm font-semibold tracking-tight">
                Quantity
              </h3>
              <p className="mt-0.5 text-2xs text-muted-foreground">
                {formatCurrency(perGuest)} each · {minGuests} minimum
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                aria-label="Decrease quantity"
                disabled={guests <= minGuests}
                onClick={() => changeGuests(guests - 1)}
                className="flex size-11 items-center justify-center rounded-full sm:size-9 border border-border bg-card hover:bg-muted disabled:opacity-30"
              >
                <Minus className="size-4" />
              </button>
              <span className="w-9 text-center font-display text-lg font-semibold nums">
                {guests}
              </span>
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() => changeGuests(guests + 1)}
                className="flex size-11 items-center justify-center rounded-full sm:size-9 bg-primary text-primary-foreground hover:bg-teal-deep"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </section>

          {/* Protein and Sauce are peer groups, so the heading sits above both. */}
          {required.length ? (
            <h3 className="font-display text-sm font-semibold tracking-tight">
              Choose your entrees
            </h3>
          ) : null}

          {required.map((group) => (
            <div key={group.id} ref={(el) => { groupRefs.current[group.id] = el; }}>
              <ServingGroupPicker
                group={group}
                guests={guests}
                quantities={quantities[group.id] ?? {}}
                assigned={assignedIn(group)}
                onSetQty={(optionId, qty) => setQty(group.id, optionId, qty)}
              />
            </div>
          ))}

          {extras.map((group) => (
            <div key={group.id} ref={(el) => { groupRefs.current[group.id] = el; }}>
              <ServingGroupPicker
                group={group}
                guests={guests}
                quantities={quantities[group.id] ?? {}}
                assigned={assignedIn(group)}
                onSetQty={(optionId, qty) => setQty(group.id, optionId, qty)}
              />
            </div>
          ))}

      {!groups.length ? (
        <p className="text-[13px] text-muted-foreground">
          Ready to serve. Just set the headcount and add it.
        </p>
      ) : null}
    </>
  );

  const footerBar = (
    <>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <span className="text-[13px] text-muted-foreground">
          {guests} × {formatCurrency(perGuest)}
        </span>
        <span className="font-display text-lg font-semibold nums">
          {formatCurrency(total)}
        </span>
      </div>
      {/* Name the groups that don't balance. A greyed-out button with no
          reason sends the user hunting up the sheet for the one chip that
          isn't green. */}
      {!valid ? (
        <p className="mb-3 text-2xs font-medium text-coral-deep">
          {unbalanced
            .map((g) => `${g.name} (${assignedIn(g)}/${servingsRequired(g, guests)})`)
            .join(", ")}{" "}
          {unbalanced.length === 1 ? "still needs" : "still need"} balancing.
        </p>
      ) : null}
      {/* Same button treatment as the individual-meal sheet: coral when it's
          ready to add, and a tappable ghost signpost — not a dead greyed
          button — while a group still needs balancing, jumping to that group. */}
      <Button
        block
        size="lg"
        variant={valid ? "default" : "ghost"}
        onClick={() => (valid ? confirm() : scrollToGroup(unbalanced[0].id))}
      >
        {valid ? `Add to order · ${formatCurrency(total)}` : `Balance ${unbalanced[0].name}`}
      </Button>
    </>
  );

  // Inline on the meal detail page: no overlay/header/close — the page already
  // shows the name, photo and description. Same configurator + action bar.
  if (embedded) {
    return (
      <div className="space-y-6">
        {configBody}
        <div className="border-t border-border pt-4">{footerBar}</div>
      </div>
    );
  }

  if (typeof document === "undefined") return null;

  // Portalled to <body> so a transformed/overflow ancestor in the menu tree can't
  // become the containing block for this `fixed` overlay and clip its top edge.
  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Configure ${item.name} for ${dateLabel}`}
    >
      <div className="absolute inset-0 bg-teal-deep/50" onClick={onClose} />
      <div className="relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-raised sm:max-w-md sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-border p-5">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold tracking-tight">{item.name}</h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">{item.description}</p>
            {/* What comes with every package. Small check-marked chips so the
                sides read as "in the box" at a glance, without competing with
                the headcount and entree choices below. (The full-page detail
                view shows it in more detail up top.) */}
            {item.includedItems?.length ? (
              <div className="mt-2">
                <span className="text-2xs font-semibold text-muted-foreground">
                  Also included
                </span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {item.includedItems.map((inc) => (
                    <span
                      key={inc.name}
                      className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-2xs font-medium text-foreground"
                    >
                      <Check className="size-3 shrink-0 text-primary" />
                      {inc.name}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full border border-border bg-card touch-target p-1.5 text-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">{configBody}</div>

        <div className="border-t border-border p-4">{footerBar}</div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * One choice group. Laid out like the individual meal's option groups: a plain
 * heading over a list of rows, no card around it. The chip on the right is the
 * only status the group needs, so it carries the whole "are you done here"
 * answer on its own.
 */
function ServingGroupPicker({
  group,
  guests,
  quantities,
  assigned,
  onSetQty,
}: {
  group: ServingGroup;
  guests: number;
  quantities: Record<string, number>;
  assigned: number;
  onSetQty: (optionId: string, qty: number) => void;
}) {
  const optional = group.perGuest === 0;
  const target = servingsRequired(group, guests);
  const remaining = target - assigned;
  const balanced = remaining === 0;

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-sm font-semibold tracking-tight">
            {group.name}
          </h3>
          {group.helper ? (
            <p className="mt-0.5 text-2xs text-muted-foreground">
              {group.helper}
            </p>
          ) : null}
        </div>

        {optional ? (
          <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-2xs font-bold text-muted-foreground">
            Optional
          </span>
        ) : (
          /* Assigned over required, always both numbers. "3 more to pick" told
             you the gap but never the target, so a group you'd overshot and a
             group you'd barely started read the same at a glance. */
          <span
            aria-label={`${assigned} of ${target} ${servingUnit(group, target)} assigned`}
            className={cn(
              "flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-2xs font-bold nums",
              balanced
                ? "bg-success-bg text-success"
                : "bg-success-bg/60 text-success",
            )}
          >
            {balanced ? <Check className="size-3" /> : null}
            {assigned} / {target}
          </span>
        )}
      </div>


      <div className="space-y-1.5">
        {group.options.map((option) => {
          const qty = quantities[option.id] ?? 0;
          return (
            <div
              key={option.id}
              className={cn(
                "rounded-xl border p-3 transition-colors",
                qty > 0
                  ? "border-primary bg-teal-wash"
                  : "border-border bg-card hover:bg-muted/50",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium">
                    {option.name}
                  </p>
                  {option.upchargePerServing > 0 ? (
                    <p className="mt-0.5 text-2xs font-semibold text-foreground">
                      +{formatCurrency(option.upchargePerServing)} each
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    aria-label={`Fewer ${option.name}`}
                    disabled={qty === 0}
                    onClick={() => onSetQty(option.id, qty - 1)}
                    className="flex size-11 items-center justify-center rounded-full sm:size-8 border border-border bg-card hover:bg-muted disabled:opacity-30"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <input
                    type="number"
                    min={0}
                    max={optional ? undefined : qty + remaining}
                    inputMode="numeric"
                    aria-label={`${option.name} ${servingUnit(group, 2)}`}
                    value={qty}
                    onChange={(e) =>
                      onSetQty(option.id, Number(e.target.value) || 0)
                    }
                    className="w-12 rounded-lg border border-border bg-card py-1 text-center text-sm font-semibold nums outline-none focus:border-primary [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    aria-label={`More ${option.name}`}
                    // The group is full: raising this option would have to steal
                    // from a sibling, and picking that victim isn't ours to do.
                    disabled={!optional && remaining <= 0}
                    onClick={() => onSetQty(option.id, qty + 1)}
                    className="flex size-11 items-center justify-center rounded-full sm:size-8 bg-primary text-primary-foreground hover:bg-teal-deep disabled:opacity-30"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
              </div>

            </div>
          );
        })}
      </div>
    </section>
  );
}
