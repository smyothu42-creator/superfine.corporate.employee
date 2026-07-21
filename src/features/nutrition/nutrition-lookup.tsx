"use client";

import * as React from "react";
import { Apple, LoaderCircle, ChevronDown, Search, Check, SlidersHorizontal, X } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
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
 * order. Rendered both in the standalone `/nutrition` route and in the sidebar's
 * nutrition modal, so the content stays identical wherever it's opened.
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
      {/* No overflow-hidden — it would clip the meal dropdown. The header rounds
          its own top corners instead so the yellow still fits the card. */}
      <Card>
        {/* Lemon-yellow hero header, mirroring the Auto-Order box: a white-wash
            icon chip, title, and a supporting line. */}
        <div className="rounded-t-2xl bg-hero-yellow px-6 py-8 text-teal-deep">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-white/40">
            <Apple className="size-6" />
          </span>
          <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight">
            Check the nutrition of any meal
          </h1>
          <p className="mt-1 text-sm">
            Pick a dish and build it exactly how you&apos;d eat it. The label reflects the options
            you choose. No account or order needed.
          </p>
        </div>

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
 * highlight — and a type-to-filter search box inside the panel.
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

  const selected = value ? items.find((i) => i.id === value) : undefined;

  // Close on outside click / Escape while open.
  React.useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Focus the search box as the panel opens so you can type immediately.
  React.useEffect(() => {
    if (open) inputRef.current?.focus();
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
      {/* Trigger — styled to match the native Select it replaces. */}
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-11 w-full items-center justify-between gap-2 rounded-xl border bg-card pl-3.5 pr-3 text-base text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 sm:text-sm",
          open ? "border-primary ring-2 ring-ring/30" : "border-input hover:border-primary/40",
        )}
      >
        <span className={cn("truncate", !selected && "text-muted-foreground")}>
          {selected ? selected.name : "Select a meal…"}
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>

      {open ? (
        <div className="absolute top-full z-50 mt-2 w-full overflow-hidden rounded-2xl border border-border bg-card shadow-raised">
          {/* Search box inside the panel. */}
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              aria-label="Search meals"
              placeholder="Search meals…"
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActiveIndex((i) => (filtered.length ? (i + 1) % filtered.length : 0));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActiveIndex((i) => (filtered.length ? (i - 1 + filtered.length) % filtered.length : 0));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  const pick = filtered[activeIndex];
                  if (pick) choose(pick.id);
                }
              }}
              className="h-11 min-w-0 flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground/70 outline-none sm:text-sm"
            />
          </div>

          <div role="listbox" className="max-h-64 overflow-auto p-1.5">
            {filtered.map((i, idx) => {
              const active = i.id === value;
              const highlighted = idx === activeIndex;
              return (
                <button
                  key={i.id}
                  type="button"
                  role="option"
                  aria-selected={active}
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
            className="rounded-full border border-border bg-card touch-target p-1.5 text-foreground hover:bg-muted"
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
