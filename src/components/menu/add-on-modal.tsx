"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X, Plus, Minus, Copy, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useComboBuilder, ComboBlock, type BuiltCombo } from "@/components/menu/combo-builder";
import { formatCurrency, cn } from "@/lib/utils";
import { program } from "@/data/program";
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
  /** Pre-select these add-ons on the first combo — opens the sheet on an existing
   *  customization to edit, rather than blank. */
  initialAddOns?: CartAddOn[];
  /** Render inline (no overlay/header/close) for the meal detail page's right
   *  column — same options + action bar as the popup, just placed in a card. */
  embedded?: boolean;
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
  initialAddOns,
  embedded = false,
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
  } = useComboBuilder(item, omitGroup, initialAddOns);
  /**
   * One *configuration* — regardless of how many packages of it. It stays as the
   * clean list of questions with a quantity stepper in the footer; the numbered
   * combo chrome only appears once there's a second, *different* combo. This is
   * what keeps "two of this meal" from looking like "start a different meal".
   */
  const solo = rows === 1;

  // Only one combo is expanded at a time. Finishing one advances to the next
  // unanswered combo, so building three in a row is three uninterrupted passes.
  const [open, setOpen] = React.useState(0);
  const blocks = React.useRef<(HTMLDivElement | null)[]>([]);
  // The "add another meal" chooser: a fresh block asking whether the next
  // customization repeats the previous choices or starts blank. Kept distinct
  // from the quantity stepper so "one more of this" and "a different one" never
  // share a control.
  const [pendingChoice, setPendingChoice] = React.useState(false);

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

  /** Reveal the "repeat vs. new" chooser in place, in the footer. */
  function openChooser() {
    setPendingChoice(true);
  }

  /**
   * Commit the chooser. `copyFrom` set (the last customization) repeats its
   * choices into an independent, tweakable copy; omitted, it opens a blank one.
   */
  function handleAddCustomization(copyFrom?: number) {
    const newIndex = rows;
    addCombo(copyFrom);
    setOpen(newIndex);
    setPendingChoice(false);
    // Anchor the scroll on the customization that just collapsed, not the new
    // one, so its summary row stays at the top with the fresh block opening below.
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
  // Keep one container noun the whole way through: whatever `confirmLabel` adds
  // to (order / auto order), the plural adds to the same place — never "order"
  // for one and "cart" for several.
  const ctaLabel = valid
    ? meals === 1
      ? `${confirmLabel}${money}`
      : `${confirmLabel} · ${meals} meals${money}`
    : rows === 1
      ? `Choose ${built[0].missingLabel}`
      : `Complete Customization ${firstIncomplete + 1}`;

  // Shared between the popup and the embedded (detail-page) render, so the two
  // can't drift.
  const optionsBody = groups.length ? (
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
  );

  /* The action bar, as pieces. Both renders show all of them and wire them to
     the same handlers — only the arrangement differs, because the popup is a
     448px sheet and the docked bar is as wide as the page. Composing from
     shared pieces is what keeps that a *layout* difference and nothing more. */

  /* Adding a *different* meal — the chooser expands in place. */
  const addAnother = (className?: string) =>
    showQuantity && groups.length ? (
      <AddAnotherSection
        className={className}
        pending={pendingChoice}
        canRepeat={Boolean(built[rows - 1]?.summary)}
        onOpenChooser={openChooser}
        onRepeat={() => handleAddCustomization(rows - 1)}
        onCustomizeNew={() => handleAddCustomization()}
        onCancel={() => setPendingChoice(false)}
      />
    ) : null;

  /* What the stepper does, in words. Hidden while the chooser is open: there it
     would answer a question nobody asked, next to one that's on screen. */
  const qtyNote = (className?: string) =>
    !showQuantity || !groups.length || pendingChoice ? null : (
      <p className={cn("text-2xs text-muted-foreground", className)}>
        {rows === 1 ? (
          <>
            Quantity makes more of{" "}
            <span className="font-semibold text-foreground">this exact meal</span>, each packed
            separately.
          </>
        ) : (
          `${meals} meals, packed separately — each customization has its own quantity above.`
        )}
      </p>
    );

  /* Quantity for this exact meal + the primary add action, always side by side:
     the stepper is what the button's count refers to. */
  const commitRow = (rowClassName: string, ctaClassName: string) => (
    <div className={cn("flex items-center gap-3", rowClassName)}>
      {/* Inline quantity — only for a single configuration; once there are
          several customizations, each carries its own stepper on its card. */}
      {showQuantity && groups.length && rows === 1 ? (
        <MealQtyStepper qty={built[0].qty} onChange={(n) => handleSetComboQty(0, n)} />
      ) : null}
      {/* One button in two strengths, never two different buttons: the coral
          pill at full strength once it can add, and checkout's waiting look —
          the same pill at half — while a question is open. "Not yet" then reads
          the same here as it does on "Add a delivery address".

          Half-strength but *not* `disabled`, which is the one thing it doesn't
          borrow from checkout: there, the button waits on an address only the
          user can supply, so there's nothing to tap it for. Here what's missing
          is a few rows up this very sheet, so the button stays a signpost — it
          takes the tap and jumps to the customization that's blocking. The
          hover override is what keeps that from leaking: without it the pill
          brightens under the cursor and starts claiming it's ready. */}
      <Button
        className={cn(ctaClassName, blocked && "opacity-50 hover:bg-coral")}
        size="lg"
        onClick={() => (blocked ? focusCombo(firstIncomplete) : onConfirm(built))}
      >
        <span className="truncate">{ctaLabel}</span>
      </Button>
    </div>
  );

  /* The popup stacks them in the sheet's own footer, which is already pinned
     above a scrolling body. At 448px there's no width to do anything else. */
  const actionBar = (
    <>
      {addAnother()}
      {qtyNote()}
      {commitRow("", "flex-1")}
    </>
  );

  // Inline on the meal detail page: no overlay/header/close — the page already
  // shows the name, photo and description. Same body + action bar as the popup.
  if (embedded) {
    return (
      <div className="space-y-4">
        {footnote ? (
          <p className="rounded-lg bg-teal-wash px-2 py-1 text-2xs font-medium text-teal-deep">
            {footnote}
          </p>
        ) : null}
        {meals > 1 ? (
          <p className="text-2xs text-muted-foreground">
            {rows === 1 ? (
              <>
                These choices apply to{" "}
                <span className="font-semibold text-foreground">all {meals} meals</span>, each
                packed separately.
              </>
            ) : (
              "Each customization is packed as its own meal, with its own choices."
            )}
          </p>
        ) : null}
        <div className="space-y-3">{optionsBody}</div>

        {/* Docked at the foot of the viewport, exactly as the popup keeps its
            footer above a scrolling body — the popup got that for free from the
            sheet's flex column, but inline the bar sat at the end of the card,
            so a meal with three option groups pushed Add below the fold and
            answering the last question left nothing to press.

            Same bar as checkout and the auto-order wizard, for the same reasons
            spelled out there: `fixed` (the shell's `main` has a bottom padding a
            `sticky` bar could never escape), opaque `bg-card` (the option rows
            ghost through anything less), `lg:left-[var(--sidebar-w)]` to clear
            the desktop rail, `bottom-dock` to rest on the phone tab bar, and
            `pb-safe` on the outer box only — it *sets* padding-bottom, so the
            bar's own padding has to live on a separate inner box or desktop
            (inset 0) silently loses it.

            The page reserves the scroll room this bar covers; see
            `item-detail-view.tsx`. */}
        <div className="bottom-dock pb-safe fixed inset-x-0 z-30 border-t border-border bg-card shadow-[0_-4px_16px_-8px_rgb(0_0_0/0.15)] lg:left-[var(--sidebar-w)]">
          {/* Stacked on a phone, two groups in a row once there's width: the
              way to add a *different* meal on one side, this meal's quantity
              and commit on the other.

              The row goes back to a stack while the chooser is open: expanded,
              "add another" is a panel of choices, not a button, and a panel
              can't sit in a row of controls pretending to be one. */}
          <div
            className={cn(
              "flex flex-col gap-2 px-4 py-3 sm:px-6 lg:px-8",
              !pendingChoice && "lg:flex-row lg:items-center lg:gap-4",
            )}
          >
            {addAnother("lg:w-auto lg:shrink-0 lg:px-5")}
            {/* The note sits directly over the stepper and the button at every
                width, because it's about them — it says what pressing + does.
                Between them in the row it read like a caption for the bar as a
                whole, floating nearer the "add a different customization" it
                exists to draw a line *against*.

                `lg:ml-auto` also covers a meal with nothing to choose: no
                chooser, no note, so there's no sibling to push the commit over
                and it would otherwise sit stranded on the left. */}
            <div className="flex flex-col gap-2 lg:ml-auto lg:shrink-0 lg:gap-1.5">
              {qtyNote()}
              {commitRow("", "min-w-0 flex-1 lg:flex-none lg:min-w-[16rem]")}
            </div>
          </div>
        </div>
      </div>
    );
  }

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
                {rows === 1 ? (
                  <>
                    These choices apply to{" "}
                    <span className="font-semibold text-foreground">all {meals} meals</span>, each
                    packed separately.
                  </>
                ) : (
                  "Each customization is packed as its own meal, with its own choices."
                )}
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

        <div className="flex-1 space-y-3 overflow-y-auto p-5">{optionsBody}</div>

        <div className="space-y-2.5 border-t border-border p-4">{actionBar}</div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Uber-Eats-style quantity pill for the single (solo) meal — more of this *exact*
 * combo, sitting inline beside the add button and matching its height. Minus is
 * disabled at one: there's always at least one meal being configured, and "none
 * of it" is what Close is for, not a stepper that turns into a bin. Once a second
 * combo exists, per-combo steppers on the cards take over (and those *do* remove
 * at one, since a second combo you want none of is a deletion).
 */
function MealQtyStepper({ qty, onChange }: { qty: number; onChange: (qty: number) => void }) {
  return (
    <div className="flex h-12 shrink-0 items-center gap-0.5 rounded-full border border-border bg-card px-1">
      <button
        type="button"
        aria-label="One fewer of this meal"
        disabled={qty <= 1}
        onClick={() => onChange(qty - 1)}
        className="flex size-10 items-center justify-center rounded-full text-foreground hover:bg-muted disabled:pointer-events-none disabled:opacity-30"
      >
        <Minus className="size-4" />
      </button>
      <span className="w-6 text-center text-base font-semibold nums" aria-live="polite">
        {qty}
      </span>
      <button
        type="button"
        aria-label="One more of this meal"
        onClick={() => onChange(qty + 1)}
        className="flex size-10 items-center justify-center rounded-full text-foreground hover:bg-muted"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

/**
 * The single entry point for adding a *different* meal. Collapsed, it's a quiet
 * dashed button; tapped, it opens a small chooser that makes the decision
 * explicit — repeat the previous customization's choices (an independent,
 * tweakable copy) or start a brand-new one from scratch. Both read as clearly
 * different from bumping quantity, which only ever repeats the exact same meal.
 */
function AddAnotherSection({
  pending,
  canRepeat,
  className,
  onOpenChooser,
  onRepeat,
  onCustomizeNew,
  onCancel,
}: {
  pending: boolean;
  /** The previous customization has choices to copy. */
  canRepeat: boolean;
  /** Sizing for the collapsed trigger, so a caller with width to spare can let
   *  it be a button instead of a full-width block. Never restyles it. */
  className?: string;
  onOpenChooser: () => void;
  onRepeat: () => void;
  onCustomizeNew: () => void;
  onCancel: () => void;
}) {
  if (!pending) {
    return (
      <button
        type="button"
        onClick={onOpenChooser}
        className={cn(
          "flex h-12 w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border bg-card text-[13px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          className,
        )}
      >
        <Plus className="size-4" /> Add a different customization
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-primary/40 bg-teal-wash/30 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-display text-sm font-semibold tracking-tight">Add another meal</h3>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel"
          className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="space-y-2">
        <button
          type="button"
          onClick={onRepeat}
          disabled={!canRepeat}
          className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary hover:bg-teal-wash/50 disabled:pointer-events-none disabled:opacity-50"
        >
          <Copy className="size-4 shrink-0 text-primary" />
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold">Repeat previous choices</span>
            <span className="block text-2xs text-muted-foreground">
              {canRepeat
                ? "Start from your last meal — tweak it if you like"
                : "Finish the meal above first"}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={onCustomizeNew}
          className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary hover:bg-teal-wash/50"
        >
          <SlidersHorizontal className="size-4 shrink-0 text-primary" />
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold">Customize a new one</span>
            <span className="block text-2xs text-muted-foreground">Start from scratch</span>
          </span>
        </button>
      </div>
    </div>
  );
}
