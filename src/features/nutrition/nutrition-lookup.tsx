"use client";

import * as React from "react";
import { Apple, LoaderCircle, ChevronDown, Check, SlidersHorizontal, X } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { PageHero } from "@/components/layout/standalone-page";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { OptionGroups, useItemOptions } from "@/components/menu/option-groups";
import { menu, getItem, hasRequiredAddOns } from "@/data/menu";
import { fetchNutrition } from "@/lib/nutrition";
import { useDialog } from "@/lib/use-dialog";
import { cn } from "@/lib/utils";
import type { MenuItem, Nutrition } from "@/data/types";

/**
 * In-app nutrition lookup — pick an item, resolve its options (a combo's label
 * depends on the exact combination), then "View nutrition" fetches and renders
 * the label in place. Nutrition is a general reference here, never tied to an
 * order. Rendered inside the `/nutrition` route's `StandalonePage` shell, and
 * carries that page's yellow title hero as the head of its own picker card.
 */
const LOOKUP_ITEMS: MenuItem[] = menu
  .filter((i) => i.type === "individual" && i.nutrition)
  .sort((a, b) => a.name.localeCompare(b.name));

export function NutritionLookup({ initialItemId }: { initialItemId?: string }) {
  const [selectedId, setSelectedId] = React.useState(
    initialItemId && getItem(initialItemId)?.type === "individual" ? initialItemId : "",
  );
  const item = selectedId ? getItem(selectedId) : undefined;

  return (
    <>
      {/* No overflow-hidden — it would clip the meal dropdown. `PageHero` rounds
          its own top corners instead so the yellow still fits the card. */}
      <Card>
        <PageHero
          icon={Apple}
          title="Check the nutrition of any meal"
          description="Pick a dish and build it exactly how you'd eat it. The label reflects the options you choose. No account or order needed."
        />

        <CardBody className="p-6 sm:p-7">
          <Label htmlFor="nutrition-item">Choose an item</Label>
          <MealCombobox
            id="nutrition-item"
            items={LOOKUP_ITEMS}
            value={selectedId}
            onValueChange={setSelectedId}
          />
        </CardBody>
      </Card>

      {/* Remount per item so option state is always fresh for the new dish. */}
      {item ? <ItemNutrition key={item.id} item={item} /> : null}
    </>
  );
}

/**
 * Themed, searchable single-select for the meal picker. Replaces the native
 * `<select>` (whose option list is OS-styled and unsearchable) with a dropdown
 * that matches the app's dropdowns — cream/white surface, teal selected
 * highlight — and filters as you type.
 *
 * One field, not two. The panel used to open its own search box directly under
 * the trigger, which put two identical-looking boxes on top of each other, both
 * ringed in teal, and left it to the reader to work out that the top one was
 * the answer and the bottom one the question. The field you press is the field
 * you type in.
 */
function MealCombobox({
  id,
  items,
  value,
  onValueChange,
}: {
  id?: string;
  items: MenuItem[];
  value: string;
  onValueChange: (id: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const ref = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  // Namespaces the list and its rows so `aria-activedescendant` has something
  // real to point at — see the search box below.
  const listId = React.useId();

  const selected = value ? items.find((i) => i.id === value) : undefined;

  /**
   * Close on outside click / Escape while open — and drop the half-typed query
   * with it, so the field goes back to reading as the meal that is chosen
   * rather than keeping the search that was abandoned.
   */
  React.useEffect(() => {
    if (!open) return;
    function shut() {
      setOpen(false);
      setQuery("");
    }
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) shut();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") shut();
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const q = query.trim().toLowerCase();
  const filtered = q ? items.filter((i) => i.name.toLowerCase().includes(q)) : items;

  // Keep the highlight in range as the query filters the list down.
  React.useEffect(() => {
    setActiveIndex((i) => (filtered.length === 0 ? 0 : Math.min(i, filtered.length - 1)));
  }, [filtered.length]);

  function choose(itemId: string) {
    onValueChange(itemId);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={ref} className="relative w-full">
      {/* The one field: reads as the chosen meal when shut, takes the typing
          when open. `role="combobox"` + `aria-activedescendant` is what makes
          the arrow keys audible — they move a highlight down the list, and
          without this a screen reader is never told which meal it landed on, so
          pressing Enter is a guess. */}
      <input
        id={id}
        ref={inputRef}
        type="text"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-autocomplete="list"
        aria-activedescendant={open && filtered.length ? `${listId}-opt-${activeIndex}` : undefined}
        autoComplete="off"
        spellCheck={false}
        /* Shut, the field *is* the answer. Open, the answer steps back to a
           placeholder — still on screen, and still ticked in the list — so the
           box is empty for the question being asked of it. */
        value={open ? query : (selected?.name ?? "")}
        placeholder={open ? (selected?.name ?? "Search meals…") : "Select a meal…"}
        onFocus={() => setOpen(true)}
        /* Focus alone isn't enough to reopen: choosing a meal leaves the caret
           right here, so the next press on the field fired no `focus` event and
           the list stayed shut. */
        onMouseDown={() => setOpen(true)}
        onChange={(e) => {
          setOpen(true);
          setQuery(e.target.value);
          setActiveIndex(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            if (!open) {
              setOpen(true);
              return;
            }
            setActiveIndex((i) => (filtered.length ? (i + 1) % filtered.length : 0));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => (filtered.length ? (i - 1 + filtered.length) % filtered.length : 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            const pick = filtered[activeIndex];
            if (open && pick) choose(pick.id);
          }
        }}
        className={cn(
          "h-11 w-full rounded-xl border bg-card pl-3.5 pr-10 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none sm:text-sm",
          open ? "border-primary ring-2 ring-ring/30" : "border-input hover:border-primary",
        )}
      />
      {/* Decorative: the field itself opens the list, and a second tab stop over
          a chevron is one more press between here and the meal. `mousedown`
          rather than `click` so the toggle beats the focus that would reopen
          it. */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        onMouseDown={(e) => {
          e.preventDefault();
          if (open) setOpen(false);
          else inputRef.current?.focus();
        }}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center"
      >
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div
          // See `use-dialog.ts`: an enclosing dialog leaves Escape alone while
          // this panel is up, so the press shuts the panel, not the dialog.
          data-escape-layer
          className="absolute top-full z-50 mt-2 w-full overflow-hidden rounded-2xl border border-border bg-card shadow-raised"
        >
          <div id={listId} role="listbox" aria-label="Meals" className="max-h-64 overflow-auto p-1.5">
            {filtered.map((i, idx) => {
              const active = i.id === value;
              const highlighted = idx === activeIndex;
              return (
                <button
                  key={i.id}
                  type="button"
                  id={`${listId}-opt-${idx}`}
                  role="option"
                  aria-selected={active}
                  // Driven by the arrow keys from the search box, so these are
                  // not separate tab stops — tabbing off the field should leave
                  // the picker, not walk a hundred meals one at a time.
                  tabIndex={-1}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(i.id)}
                  onMouseMove={() => setActiveIndex(idx)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-[13px] transition-colors",
                    active
                      ? "bg-teal-wash font-semibold text-teal-deep"
                      : highlighted
                        ? "bg-muted font-medium text-foreground"
                        : "font-medium text-foreground",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate">{i.name}</span>
                    {/* Flag meals that will ask for choices before a label. */}
                    {hasRequiredAddOns(i) ? (
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-2xs font-semibold text-muted-foreground">
                        Choose options
                      </span>
                    ) : null}
                  </span>
                  {active ? <Check className="size-4 shrink-0 text-primary" /> : null}
                </button>
              );
            })}
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-[13px] text-muted-foreground">No meals found.</p>
            ) : null}
          </div>

          {/* How many meals the typing left, said out loud. The list rewrites
              itself silently otherwise, and "No meals found." is only ever read
              by someone who goes looking for it — which is exactly what a person
              who cannot see the list has no reason to do. */}
          <p aria-live="polite" aria-atomic="true" className="sr-only">
            {filtered.length === 0
              ? "No meals found."
              : `${filtered.length} ${filtered.length === 1 ? "meal" : "meals"} available.`}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The option builder + result for one item. Required option groups must be
 * answered before "View nutrition" is enabled (a combo's label depends on the
 * combination); optional groups may be skipped.
 */
function ItemNutrition({ item }: { item: MenuItem }) {
  const { groups, picked, toggle, selections, valid, missingLabel, summary } = useItemOptions(item);
  const [result, setResult] = React.useState<Nutrition | null>(null);
  const [loading, setLoading] = React.useState(false);
  const hasOptions = groups.length > 0;
  // Items with options open the picker in a modal; open it straight away so the
  // choices are the first thing shown for a configurable dish.
  const [modalOpen, setModalOpen] = React.useState(hasOptions);
  // Which combination the current result belongs to — so changing an option
  // after viewing clears the stale label.
  const shownFor = React.useRef<string>("");

  const comboKey = selections.map((s) => s.optionId).join("|");
  React.useEffect(() => {
    if (result && comboKey !== shownFor.current) setResult(null);
  }, [comboKey, result]);

  // No options to pick? There's nothing to configure, so fetch and show the
  // label straight away instead of making the user press "View nutrition".
  React.useEffect(() => {
    if (!hasOptions) view();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function view() {
    if (!valid) return;
    setLoading(true);
    const n = await fetchNutrition(item, selections);
    shownFor.current = comboKey;
    setResult(n);
    setLoading(false);
    setModalOpen(false);
  }

  return (
    <Card>
      <CardBody>
        {hasOptions ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-display text-sm font-semibold tracking-tight">Build your meal</h2>
                <p className="mt-0.5 truncate text-2xs text-muted-foreground">
                  {summary || `Choose ${missingLabel.toLowerCase()} to view nutrition`}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setModalOpen(true)}>
                <SlidersHorizontal className="size-4" /> {valid ? "Edit options" : "Choose options"}
              </Button>
            </div>

            {result ? (
              <NutritionLabel item={item} nutrition={result} summary={summary} />
            ) : (
              <div className="mt-5">
                <Button
                  block
                  size="lg"
                  disabled={loading}
                  onClick={valid ? view : () => setModalOpen(true)}
                >
                  {loading ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" /> Fetching label…
                    </>
                  ) : (
                    <>
                      <Apple className="size-4" /> View nutrition
                    </>
                  )}
                </Button>
                {!valid ? (
                  <p className="mt-2 text-center text-2xs text-muted-foreground">
                    Choose {missingLabel.toLowerCase()} to view nutrition.
                  </p>
                ) : null}
              </div>
            )}
          </>
        ) : result ? (
          // No options: the label is fetched on mount and shown directly.
          <NutritionLabel item={item} nutrition={result} summary={summary} />
        ) : (
          <div className="flex items-center justify-center gap-2 py-6 text-[13px] text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" /> Fetching label…
          </div>
        )}
      </CardBody>

      {/* Options live in a modal for configurable dishes. */}
      {hasOptions && modalOpen ? (
        <OptionsModal
          item={item}
          groups={groups}
          picked={picked}
          onToggle={toggle}
          valid={valid}
          missingLabel={missingLabel}
          loading={loading}
          onView={view}
          onClose={() => setModalOpen(false)}
        />
      ) : null}
    </Card>
  );
}

/**
 * Modal picker for a configurable dish's option groups. Choosing required
 * options and pressing "View nutrition" fetches the label and closes the modal.
 */
function OptionsModal({
  item,
  groups,
  picked,
  onToggle,
  valid,
  missingLabel,
  loading,
  onView,
  onClose,
}: {
  item: MenuItem;
  groups: ReturnType<typeof useItemOptions>["groups"];
  picked: ReturnType<typeof useItemOptions>["picked"];
  onToggle: ReturnType<typeof useItemOptions>["toggle"];
  valid: boolean;
  missingLabel: string;
  loading: boolean;
  onView: () => void;
  onClose: () => void;
}) {
  // Mounted only while it's up, so it's open for its whole life.
  const dialog = useDialog({ open: true, onClose });

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-teal-deep/50" onClick={onClose} />
      {/* The dialog is the sheet, not the box that also holds the scrim, so the
          trap ends where the panel does. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Build ${item.name}`}
        {...dialog.props}
        className="relative z-10 flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-raised sm:max-w-md sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border p-5">
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight">{item.name}</h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {groups.some((g) => g.required)
                ? "Pick your options to see the nutrition."
                : "These options are optional."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full border border-control bg-card touch-target p-1.5 text-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <OptionGroups groups={groups} picked={picked} onToggle={onToggle} showPrices={false} />
        </div>

        <div className="border-t border-border p-5">
          <Button block size="lg" disabled={!valid || loading} onClick={onView}>
            {loading ? (
              <>
                <LoaderCircle className="size-4 animate-spin" /> Fetching label…
              </>
            ) : (
              <>
                <Apple className="size-4" /> View nutrition
              </>
            )}
          </Button>
          {!valid ? (
            <p className="mt-2 text-center text-2xs text-muted-foreground">
              Choose {missingLabel.toLowerCase()} to continue.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** A classic Nutrition Facts label rendered from the fetched values. */
function NutritionLabel({
  item,
  nutrition,
  summary,
}: {
  item: MenuItem;
  nutrition: Nutrition;
  summary: string;
}) {
  const rows: { label: string; value: string }[] = [
    { label: "Protein", value: `${nutrition.protein} g` },
    { label: "Total Carbohydrate", value: `${nutrition.carbs} g` },
    { label: "Total Fat", value: `${nutrition.fat} g` },
  ];
  return (
    <div className="mt-5">
      <div className="mx-auto max-w-xs rounded-xl border-2 border-foreground bg-card p-4 text-foreground">
        <p className="border-b-8 border-foreground pb-1 font-display text-2xl font-extrabold tracking-tight">
          Nutrition Facts
        </p>
        <p className="mt-1 text-[13px]">{item.name}</p>
        {summary ? <p className="text-2xs text-muted-foreground">Configured as: {summary}</p> : null}
        <p className="mt-1 text-2xs text-muted-foreground">Serving size: 1 meal</p>

        <div className="mt-2 flex items-end justify-between border-b-4 border-foreground pb-1">
          <span className="font-display text-lg font-extrabold">Calories</span>
          <span className="font-display text-3xl font-extrabold nums">{nutrition.calories}</span>
        </div>

        <dl className="mt-1 divide-y divide-border">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between py-1.5 text-[13px]">
              <dt className="font-semibold">{r.label}</dt>
              <dd className="nums">{r.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 border-t border-border pt-2 text-2xs text-muted-foreground">
          Values are estimates for the meal as configured. Not linked to any order.
        </p>
      </div>
    </div>
  );
}
