"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useComboBuilder, ComboBlock, type BuiltCombo } from "@/components/menu/combo-builder";
import { formatCurrency } from "@/lib/utils";
import { program } from "@/data/program";
import type { MenuItem, AddOnGroup } from "@/data/types";

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
  /** One entry per combo — each is packed and priced as its own package. */
  onConfirm: (combos: BuiltCombo[]) => void;
}

/**
 * Bottom-sheet customiser for one **individual meal**. The meal is configured a
 * section at a time — Protein, then Sauce, then Side — with every option on
 * screen, because each list is short enough to read at a glance.
 *
 * Quantity builds combos rather than multiplying one. Each plate is packed in
 * its own box, so two of a dish is two combos, each with its own protein, sauce
 * and side. Combo 1 is the whole sheet at quantity 1; past that, finished combos
 * fold to a summary line and the next one opens.
 *
 * It deliberately does NOT enumerate combos: three groups multiply out to dozens
 * of near-identical rows, and picking "Chicken · Ranch · Rice" from a wall of
 * them is harder than answering three small questions.
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
  const {
    groups,
    combos,
    built,
    rows,
    meals,
    addCombo,
    setComboQty,
    toggle,
    total,
    firstIncomplete,
    valid,
  } = useComboBuilder(item, omitGroup);
  /** One row holding one package: no numbering, no chrome, just the questions. */
  const solo = rows === 1 && combos[0].qty === 1;

  // Only one combo is expanded at a time. Finishing one advances to the next
  // unanswered combo, so building three in a row is three uninterrupted passes.
  const [open, setOpen] = React.useState(0);
  const blocks = React.useRef<(HTMLDivElement | null)[]>([]);

  function focusCombo(index: number) {
    setOpen(index);
    // Let the block expand before scrolling to it.
    requestAnimationFrame(() =>
      blocks.current[index]?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
    );
  }

  function handleToggle(index: number, group: AddOnGroup, optionId: string) {
    toggle(index, group, optionId);
    // Only a combo that was still open hands off — revising a finished combo
    // shouldn't yank the sheet away from what you're looking at.
    if (!group.required || built[index].complete || index + 1 >= rows) return;
    // Answering the last required group of a combo hands off to the next one.
    const stillMissing = groups.some(
      (g) => g.required && g.id !== group.id && (combos[index].picked[g.id] ?? []).length === 0,
    );
    if (!stillMissing && !built[index + 1].complete) {
      focusCombo(index + 1);
    }
  }

  function handleAddCombo() {
    const newIndex = rows;
    addCombo();
    setOpen(newIndex);
    // Anchor the scroll on the combo that just collapsed, not the new one, so
    // its summary row stays at the top of the sheet with the fresh combo opening
    // right below it — the user sees the combo they finished and the one they're
    // starting together, rather than the new combo alone.
    requestAnimationFrame(() =>
      blocks.current[newIndex - 1]?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }

  /** Saving a combo folds it down to its summary row — nothing stays expanded. */
  function handleSave(index: number) {
    if (open === index) setOpen(-1);
  }

  /** Removing the open combo would leave the sheet pointing past the last row. */
  function handleSetComboQty(index: number, next: number) {
    setComboQty(index, next);
    if (next < 1 && rows > 1 && open >= rows - 1) setOpen(Math.max(0, rows - 2));
  }

  /** The bin on a combo drops the whole row — quantity to zero, in one tap. */
  function handleDeleteCombo(index: number) {
    handleSetComboQty(index, 0);
  }

  /**
   * The button always says what's left to do, and never in red: name the open
   * question at quantity 1, name the unfinished combo past that, and only then
   * offer to add. Tapping it while incomplete jumps to the combo that's blocking.
   */
  const blocked = !valid;
  const money = program.showPrices ? ` · ${formatCurrency(total)}` : "";
  const ctaLabel = valid
    ? meals === 1
      ? `${confirmLabel}${money}`
      : `Add ${meals} meals to cart${money}`
    : rows === 1
      ? `Choose ${built[0].missingLabel}`
      : `Complete Combo ${firstIncomplete + 1}`;

  if (typeof document === "undefined") return null;

  // Portalled to <body>: rendered inline, any transformed/overflow ancestor in
  // the menu tree would become the containing block for this `fixed` overlay and
  // clip it below the viewport top. From the body it always covers the full screen.
  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Customize ${item.name} for ${dateLabel}`}
    >
      <div className="absolute inset-0 bg-teal-deep/50" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-raised sm:max-w-md sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-border p-5">
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight">{item.name}</h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">{item.description}</p>
            {meals > 1 ? (
              <p className="mt-1.5 text-2xs text-muted-foreground">
                Each combo is packed as its own meal. Choose for all {meals}.
              </p>
            ) : null}
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
            className="rounded-full border border-border bg-card touch-target p-1.5 text-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {groups.length ? (
            combos.map((combo, i) => (
              <div key={i} ref={(el) => { blocks.current[i] = el; }}>
                <ComboBlock
                  index={i}
                  solo={solo}
                  groups={groups}
                  picked={combo.picked}
                  built={built[i]}
                  open={open === i}
                  showPrice={program.showPrices}
                  onOpen={() => focusCombo(i)}
                  onToggle={(group, optionId) => handleToggle(i, group, optionId)}
                  onSave={() => handleSave(i)}
                  onDelete={() => handleDeleteCombo(i)}
                  onSetQty={(next) => handleSetComboQty(i, next)}
                />
              </div>
            ))
          ) : (
            <p className="text-[13px] text-muted-foreground">
              This meal comes as it is. Nothing to choose.
            </p>
          )}
        </div>

        <div className="border-t border-border p-4">
          {solo && built[0].summary ? (
            <p className="mb-3 truncate text-[13px] text-muted-foreground">
              <span className="font-semibold text-foreground">Your meal:</span> {built[0].summary}
            </p>
          ) : null}
          {/* Copies of one combo are its own row's stepper, and each combo carries
              its own bin — so removal lives on the combos, not here. This button
              only adds a combo with *different* choices, the one thing that needs
              a fresh set of questions. */}
          {showQuantity && groups.length ? (
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-2xs text-muted-foreground">
                {meals === 1 ? "1 meal" : `${meals} meals, packed separately`}
              </span>
              <button
                type="button"
                onClick={handleAddCombo}
                className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-2xs font-semibold text-foreground hover:bg-muted"
              >
                <Plus className="size-3.5" /> Build a new combo
              </button>
            </div>
          ) : null}
          {/* While something's unanswered the button is a signpost, not a dead
              end: it stays tappable and takes you to the combo that's blocking. */}
          <Button
            block
            size="lg"
            variant={blocked ? "ghost" : "default"}
            onClick={() => (blocked ? focusCombo(firstIncomplete) : onConfirm(built))}
          >
            {ctaLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
