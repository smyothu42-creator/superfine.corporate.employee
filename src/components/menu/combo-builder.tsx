"use client";

import * as React from "react";
import { Check, Minus, Pencil, Plus, Trash2 } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { cleanOptionName, summarizeAddOns } from "@/data/menu";
import { OptionGroups } from "@/components/menu/option-groups";
import type { MenuItem, AddOnGroup } from "@/data/types";
import type { CartAddOn } from "@/store/use-cart-store";

/**
 * An individual meal is packed one plate at a time, so ordering three of a dish
 * is three separate packages — and each package gets its own protein, sauce and
 * side. Quantity therefore isn't a multiplier over one shared set of choices:
 * it's how many combos the user is building.
 *
 * This hook holds one selection map per combo. Raising the quantity appends an
 * empty combo; lowering it drops the last one. Nothing is pre-selected — a
 * default protein is a protein nobody chose — but a combo can be copied from the
 * one above it in a tap, which is how most people order multiples of a dish.
 *
 * We still never enumerate the combos for the user: three groups multiply out to
 * dozens of near-identical rows. Each combo is the same three short questions.
 */

/** groupId → selected optionIds. Single-select groups hold exactly one. */
type Picked = Record<string, string[]>;

/** One row of the builder: a set of choices, and how many of it to pack. */
interface ComboState {
  picked: Picked;
  qty: number;
}

export interface BuiltCombo {
  addOns: CartAddOn[];
  /** base + this combo's up-charges, for **one** package. */
  unitPrice: number;
  /** How many identical packages of this combo. */
  qty: number;
  /** "Chicken · Caesar Dressing · Garlic Bread", or "" while empty. */
  summary: string;
  complete: boolean;
  /** The first unanswered required group, e.g. "Protein". "" when complete. */
  missingLabel: string;
}

export function useComboBuilder(
  item: MenuItem,
  omitGroup?: (g: AddOnGroup) => boolean,
  initialAddOns?: CartAddOn[],
) {
  const groups = React.useMemo(
    () => (item.addOns ?? []).filter((g) => !omitGroup?.(g)),
    [item.addOns, omitGroup],
  );

  const emptyCombo = React.useCallback(
    (): ComboState => ({ picked: Object.fromEntries(groups.map((g) => [g.id, []])), qty: 1 }),
    [groups],
  );

  // The first combo can open pre-filled — used when *editing* an existing
  // customization (e.g. My Orders) so the sheet starts on the current choices
  // instead of blank. Only options that still exist in a shown group are seeded;
  // any later "add another" combo always starts empty via emptyCombo().
  const [combos, setCombos] = React.useState<ComboState[]>(() => {
    const first = emptyCombo();
    for (const a of initialAddOns ?? []) {
      const group = groups.find((g) => g.id === a.groupId);
      if (group && group.options.some((o) => o.id === a.optionId)) {
        first.picked[a.groupId] = [...(first.picked[a.groupId] ?? []), a.optionId];
      }
    }
    return [first];
  });
  /** Rows, not packages. Two of Combo 1 is one row. */
  const rows = combos.length;
  const meals = combos.reduce((sum, c) => sum + c.qty, 0);

  /**
   * Append another customization. With no argument it's a fresh, empty set of
   * questions ("Customize a new one"); given an index it's an independent copy of
   * that customization's current choices ("Repeat previous choices") that the
   * user can then tweak on its own — distinct from the quantity stepper, which
   * makes locked-identical packages of a single customization.
   */
  const addCombo = React.useCallback(
    (copyFrom?: number) => {
      setCombos((prev) => {
        const source = copyFrom != null ? prev[copyFrom] : undefined;
        const picked = source
          ? Object.fromEntries(Object.entries(source.picked).map(([id, opts]) => [id, [...opts]]))
          : Object.fromEntries(groups.map((g) => [g.id, []]));
        return [...prev, { picked, qty: 1 }];
      });
    },
    [groups],
  );

  /**
   * How many identical packages of one combo. Dropping to zero removes the row —
   * a combo you want none of is a combo you're deleting, and a stepper that
   * bottoms out at one makes you hunt for a separate bin icon to say so.
   */
  const setComboQty = React.useCallback((index: number, next: number) => {
    setCombos((prev) => {
      if (next >= 1) return prev.map((c, i) => (i === index ? { ...c, qty: next } : c));
      // Never leave the sheet with nothing to configure.
      if (prev.length === 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  function toggle(index: number, group: AddOnGroup, optionId: string) {
    setCombos((prev) =>
      prev.map((combo, i) => {
        if (i !== index) return combo;
        const current = combo.picked[group.id] ?? [];
        const pick = (ids: string[]) => ({ ...combo, picked: { ...combo.picked, [group.id]: ids } });
        if (group.select === "single") return pick([optionId]);
        if (current.includes(optionId)) return pick(current.filter((id) => id !== optionId));
        // At the cap, the newest pick pushes out the oldest rather than silently
        // doing nothing — a disabled checkbox with no explanation reads as a bug.
        const next = group.max && current.length >= group.max ? current.slice(1) : current;
        return pick([...next, optionId]);
      }),
    );
  }

  const built: BuiltCombo[] = combos.map(({ picked, qty }) => {
    const addOns: CartAddOn[] = groups.flatMap((g) =>
      (picked[g.id] ?? []).flatMap((optionId) => {
        const option = g.options.find((o) => o.id === optionId);
        // Store the cleaned label: the cart and the order lines print these names
        // verbatim, and "Extra brisket (+$4)" beside its own price reads as a typo.
        return option
          ? [{ groupId: g.id, optionId: option.id, name: cleanOptionName(option.name), price: option.price }]
          : [];
      }),
    );
    const missing = groups.filter((g) => g.required && (picked[g.id] ?? []).length === 0);
    return {
      addOns,
      unitPrice: item.price + addOns.reduce((sum, a) => sum + a.price, 0),
      qty,
      summary: summarizeAddOns(addOns),
      complete: missing.length === 0,
      missingLabel: missing[0]?.name ?? "",
    };
  });

  const firstIncomplete = built.findIndex((c) => !c.complete);
  const total = built.reduce((sum, c) => sum + c.unitPrice * c.qty, 0);

  return {
    groups,
    combos,
    built,
    rows,
    /** Packages in the cart if this sheet is confirmed as it stands. */
    meals,
    addCombo,
    setComboQty,
    toggle,
    total,
    /** Index of the first combo still missing a required answer, or -1. */
    firstIncomplete,
    valid: firstIncomplete === -1,
  };
}

/**
 * One combo's three questions. At quantity 1 the combo chrome is dropped
 * entirely — there's nothing to number, so the sheet is just Protein, Sauce,
 * Side. Past that, a finished combo folds down to its summary line so a stack of
 * five stays scannable on a phone.
 */
export function ComboBlock({
  index,
  solo,
  groups,
  picked,
  built,
  open,
  showPrice,
  onOpen,
  onToggle,
  onSave,
  onDelete,
  onSetQty,
}: {
  index: number;
  /** One row, one package: no numbering, no chrome — just the questions. */
  solo: boolean;
  groups: AddOnGroup[];
  picked: Picked;
  built: BuiltCombo;
  open: boolean;
  showPrice: boolean;
  onOpen: () => void;
  onToggle: (group: AddOnGroup, optionId: string) => void;
  onSave: () => void;
  /** Drop this combo entirely — the row and all its packages. */
  onDelete: () => void;
  onSetQty: (qty: number) => void;
}) {
  if (solo) {
    return <OptionGroups groups={groups} picked={picked} onToggle={onToggle} />;
  }

  if (!open) {
    return (
      // Not a <button>: the row holds a stepper and an edit control, and nesting
      // buttons inside a button is invalid and unclickable in equal measure.
      <div
        className={cn(
          "flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors",
          built.complete ? "border-border bg-muted/40" : "border-dashed border-border bg-card",
        )}
      >
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full text-2xs font-bold",
            built.complete ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground",
          )}
        >
          {built.complete ? <Check className="size-3.5" /> : index + 1}
        </span>

        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <span className="block text-[13px] font-semibold">Customization {index + 1}</span>
          {/* Every choice, named. "Chicken · Italian · Fries" is what the person
              is buying; a truncated line makes them open the combo to check. */}
          <span className="block text-2xs leading-relaxed text-muted-foreground">
            {built.complete ? built.summary : `Choose ${built.missingLabel.toLowerCase()}`}
          </span>
        </button>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <div className="flex items-center gap-2">
            {showPrice && built.complete ? (
              <span className="text-[13px] font-semibold nums">
                {formatCurrency(built.unitPrice * built.qty)}
              </span>
            ) : null}
            <button
              type="button"
              onClick={onOpen}
              aria-label={`Edit customization ${index + 1}`}
              className="touch-target rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Pencil className="size-3.5" />
            </button>
          </div>
          <QtyStepper
            qty={built.qty}
            label={`customization ${index + 1}`}
            onChange={onSetQty}
          />
        </div>
      </div>
    );
  }

  return (
    <section
      className={cn(
        "rounded-2xl border p-4",
        built.complete ? "border-border bg-card" : "border-primary/40 bg-teal-wash/30",
      )}
    >
      <header className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-full text-2xs font-bold",
              built.complete ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground",
            )}
          >
            {built.complete ? <Check className="size-3.5" /> : index + 1}
          </span>
          <h3 className="truncate font-display text-sm font-semibold tracking-tight">Customization {index + 1}</h3>
          <span className="shrink-0 text-2xs text-muted-foreground">Packed separately</span>
        </div>
        {/* Two icon actions instead of a text button: a tick to confirm the combo
            (collapsing it to its summary row, disabled until required groups are
            answered) and a bin to drop it outright. Keeping them compact leaves
            the combo's own choices the focus. */}
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onSave}
            disabled={!built.complete}
            aria-label={`Save customization ${index + 1}`}
            className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-teal-deep disabled:pointer-events-none disabled:opacity-40"
          >
            <Check className="size-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete customization ${index + 1}`}
            className="flex size-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </header>

      <OptionGroups groups={groups} picked={picked} onToggle={onToggle} />
    </section>
  );
}

/**
 * How many identical packages of one combo. Minus at one removes the combo
 * outright — see `setComboQty`.
 */
function QtyStepper({
  qty,
  label,
  onChange,
}: {
  qty: number;
  label: string;
  onChange: (qty: number) => void;
}) {
  return (
    // The −/+ pair sits shoulder to shoulder, so the `touch-target` trick is out:
    // two invisible 44px boxes would overlap and the upper one would swallow taps
    // meant for its neighbour. Grow the real target instead (same split the cart
    // line-item stepper uses): the button is a size-11 tap area with a size-7
    // disc painted inside it, and both collapse to size-7 once a precise pointer
    // is driving. The gap closes on touch so the wider buttons don't spread the
    // control out.
    <div className="flex shrink-0 items-center gap-0 sm:gap-1.5">
      <button
        type="button"
        aria-label={qty > 1 ? `One fewer ${label}` : `Remove ${label}`}
        onClick={() => onChange(qty - 1)}
        className="flex size-11 items-center justify-center sm:size-7"
      >
        <span className="flex size-7 items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-muted">
          {qty > 1 ? <Minus className="size-3" /> : <Trash2 className="size-3" />}
        </span>
      </button>
      <span className="w-5 text-center text-[13px] font-semibold nums" aria-live="polite">
        {qty}
      </span>
      <button
        type="button"
        aria-label={`One more ${label}`}
        onClick={() => onChange(qty + 1)}
        className="flex size-11 items-center justify-center sm:size-7"
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-teal-deep">
          <Plus className="size-3" />
        </span>
      </button>
    </div>
  );
}
